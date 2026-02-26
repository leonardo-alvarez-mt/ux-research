import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type SendInvitationEmailInput = {
  to: string;
  subject: string;
  inviteMessage: string;
  htmlMessage?: string;
  replyTo?: string;
};

function encodeBase64Utf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64UrlEncodeUtf8(input: string): string {
  return encodeBase64Utf8(input)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildMimeEmail(payload: SendInvitationEmailInput): string {
  const boundary = "----=_Part_mitratech_" + Math.random().toString(36).slice(2);

  const lines: string[] = [];
  lines.push("MIME-Version: 1.0");
  lines.push(`To: ${payload.to}`);
  lines.push(`Subject: ${payload.subject}`);
  if (payload.replyTo) lines.push(`Reply-To: ${payload.replyTo}`);
  lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
  lines.push("");

  lines.push(`--${boundary}`);
  lines.push("Content-Type: text/plain; charset=UTF-8");
  lines.push("Content-Transfer-Encoding: base64");
  lines.push("");
  lines.push(encodeBase64Utf8(payload.inviteMessage));
  lines.push("");

  if (payload.htmlMessage) {
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/html; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: base64");
    lines.push("");
    lines.push(encodeBase64Utf8(payload.htmlMessage));
    lines.push("");
  }

  lines.push(`--${boundary}--`);

  return lines.join("\r\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
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

    console.log(`[send-invitation-email] Request received: to=${to}, subject="${subject}"`);

    const PICA_SECRET_KEY = Deno.env.get("PICA_SECRET_KEY");
    const PICA_GMAIL_CONNECTION_KEY = Deno.env.get("PICA_GMAIL_CONNECTION_KEY");

    if (!PICA_SECRET_KEY || !PICA_GMAIL_CONNECTION_KEY) {
      console.error("[send-invitation-email] Missing env vars");
      return new Response(
        JSON.stringify({ error: "Missing env vars: PICA_SECRET_KEY and PICA_GMAIL_CONNECTION_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mime = buildMimeEmail({
      to,
      subject,
      inviteMessage,
      htmlMessage: input.htmlMessage,
      replyTo: input.replyTo,
    });
    const raw = base64UrlEncodeUtf8(mime);

    console.log(`[send-invitation-email] Calling Pica API...`);

    const resp = await fetch("https://api.picaos.com/v1/passthrough/users/me/messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-pica-secret": PICA_SECRET_KEY,
        "x-pica-connection-key": PICA_GMAIL_CONNECTION_KEY,
        "x-pica-action-id": "conn_mod_def::F_JeJ_A_TKg::cc2kvVQQTiiIiLEDauy6zQ",
      },
      body: JSON.stringify({ raw }),
    });

    const text = await resp.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    console.log(`[send-invitation-email] Pica API responded: status=${resp.status}, body=${text}`);

    if (!resp.ok) {
      console.error("[send-invitation-email] Pica API error:", resp.status, text);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: data }),
        { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = data as Record<string, unknown>;
    return new Response(
      JSON.stringify({ id: result?.id, threadId: result?.threadId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
