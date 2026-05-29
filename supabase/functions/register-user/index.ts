import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_DOMAIN = "mitratech.com";

async function triggerConfirmationEmail(
  adminClient: ReturnType<typeof createClient>,
  email: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<{ ok: boolean; error?: string }> {
  // Use the Supabase Auth REST API directly to resend the confirmation email.
  // The admin JS client does not expose a "resend confirmation" method, but the
  // REST endpoint POST /auth/v1/admin/users/:id/send-email handles this.
  // Instead we generate the link via generateLink which also triggers a native
  // Supabase email send when called through the REST API with send_email=true.
  //
  // Simplest reliable approach: call the resend endpoint via the REST API.
  const { data: usersData } = await adminClient.auth.admin.listUsers();
  const user = usersData?.users?.find((u) => u.email === email);
  if (!user) return { ok: false, error: "User not found" };

  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}/resend-confirmation`, {
    method: "POST",
    headers: {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    // Fallback: generate link and send via Supabase's own email system
    // by calling the public signUp endpoint which triggers the confirmation flow
    const fallback = await fetch(`${supabaseUrl}/auth/v1/resend`, {
      method: "POST",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "signup", email }),
    });
    if (!fallback.ok) {
      const errText = await fallback.text();
      return { ok: false, error: errText };
    }
  }

  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { email?: string; password?: string; full_name?: string; resend?: boolean };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = String(body?.email ?? "").trim().toLowerCase();
    if (!email) {
      return new Response(JSON.stringify({ error: '"email" is required' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailDomain = email.split("@")[1]?.toLowerCase();
    if (emailDomain !== ALLOWED_DOMAIN) {
      return new Response(
        JSON.stringify({ error: `Access restricted to @${ALLOWED_DOMAIN} email addresses only.` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[register-user] Missing required env vars");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (body?.resend === true) {
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u) => u.email === email);

      if (!existingUser) {
        return new Response(JSON.stringify({ error: "No account found for this email." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (existingUser.email_confirmed_at) {
        return new Response(JSON.stringify({ error: "This email is already confirmed." }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await triggerConfirmationEmail(adminClient, email, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      if (!result.ok) {
        console.error("[register-user] resend confirmation error:", result.error);
        return new Response(JSON.stringify({ error: result.error ?? "Failed to resend confirmation email" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const password = String(body?.password ?? "");
    const fullName = String(body?.full_name ?? "").trim();

    if (!password || password.length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!fullName) {
      return new Response(JSON.stringify({ error: "Full name is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "An account with this email already exists." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Creating with email_confirm: false causes Supabase to send its own
    // native confirmation email using the configured auth email template.
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { full_name: fullName },
    });

    if (createError || !createData?.user) {
      console.error("[register-user] createUser error:", createError);
      return new Response(
        JSON.stringify({ error: createError?.message ?? "Failed to create account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = createData.user.id;

    const { error: profileError } = await adminClient.from("profiles").insert({
      id: userId,
      email: email,
      full_name: fullName,
    });

    if (profileError) {
      console.error("[register-user] profile insert error:", profileError);
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Failed to create user profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Trigger the native Supabase confirmation email via the resend endpoint.
    const emailResult = await triggerConfirmationEmail(adminClient, email, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    if (!emailResult.ok) {
      console.error("[register-user] confirmation email error:", emailResult.error);
      // Non-fatal: user was created successfully, they can request a resend.
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[register-user] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
