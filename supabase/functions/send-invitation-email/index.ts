import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from "npm:resend@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FROM_ADDRESS = "Mitratech UX Lab <onboarding@resend.dev>";

type SendInvitationEmailInput = {
  to: string;
  subject: string;
  inviteMessage: string;
  htmlMessage?: string;
  replyTo?: string;
};

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

    let input: SendInvitationEmailInput;
    try {
      input = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const to = String(input?.to ?? "").trim();
    const subject = String(input?.subject ?? "").trim();
    const inviteMessage = String(input?.inviteMessage ?? "").trim();

    if (!to) {
      return new Response(JSON.stringify({ error: '"to" is required' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!subject) {
      return new Response(JSON.stringify({ error: '"subject" is required' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!inviteMessage) {
      return new Response(JSON.stringify({ error: '"inviteMessage" is required' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("[send-invitation-email] Missing RESEND_API_KEY");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[send-invitation-email] Sending to=${to}, subject="${subject}"`);

    const resend = new Resend(RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      html: input.htmlMessage ?? `<p>${inviteMessage.replace(/\n/g, "<br>")}</p>`,
      text: inviteMessage,
    });

    if (error) {
      console.error("[send-invitation-email] Resend error:", error);
      return new Response(JSON.stringify({ error: "Failed to send email", details: String(error) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[send-invitation-email] Sent successfully, id=${data?.id}`);
    return new Response(JSON.stringify({ id: data?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-invitation-email] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
