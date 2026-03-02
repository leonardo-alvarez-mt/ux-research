import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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

function buildMimeEmail(to: string, subject: string, plain: string, html: string): string {
  const boundary = "----=_Part_mitratech_" + Math.random().toString(36).slice(2);
  const lines: string[] = [];
  lines.push("MIME-Version: 1.0");
  lines.push(`To: ${to}`);
  lines.push(`Subject: ${subject}`);
  lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
  lines.push("");
  lines.push(`--${boundary}`);
  lines.push("Content-Type: text/plain; charset=UTF-8");
  lines.push("Content-Transfer-Encoding: base64");
  lines.push("");
  lines.push(encodeBase64Utf8(plain));
  lines.push("");
  lines.push(`--${boundary}`);
  lines.push("Content-Type: text/html; charset=UTF-8");
  lines.push("Content-Transfer-Encoding: base64");
  lines.push("");
  lines.push(encodeBase64Utf8(html));
  lines.push("");
  lines.push(`--${boundary}--`);
  return lines.join("\r\n");
}

function buildHtmlEmail(confirmUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Confirm your Mitratech UX Lab account</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="https://grc-ux-lab.netlify.app/MitratechUXsvg.svg" alt="Mitratech UX Lab" height="36" style="display:block;" />
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:40px 40px 36px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">Confirm your account</h1>
              <p style="margin:0 0 28px;font-size:14px;color:#64748b;text-align:center;line-height:1.6;">
                You're almost there! Click the button below to verify your email address and activate your Mitratech UX Lab account.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="${confirmUrl}"
                       style="display:inline-block;background:#1a56db;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.01em;">
                      Confirm Email Address
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;text-align:center;line-height:1.5;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0;font-size:12px;color:#64748b;text-align:center;word-break:break-all;line-height:1.6;">
                <a href="${confirmUrl}" style="color:#1a56db;text-decoration:underline;">${confirmUrl}</a>
              </p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 20px;" />
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
                If you didn't create a Mitratech UX Lab account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:20px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                &copy; ${new Date().getFullYear()} Mitratech Holdings, Inc. All Rights Reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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

    let body: { email: string };
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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const PICA_SECRET_KEY = Deno.env.get("PICA_SECRET_KEY");
    const PICA_GMAIL_CONNECTION_KEY = Deno.env.get("PICA_GMAIL_CONNECTION_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PICA_SECRET_KEY || !PICA_GMAIL_CONNECTION_KEY) {
      console.error("[send-signup-confirmation] Missing required env vars");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "signup",
      email,
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("[send-signup-confirmation] generateLink error:", linkError);
      return new Response(JSON.stringify({ error: "Failed to generate confirmation link", details: linkError?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const confirmUrl = linkData.properties.action_link;

    const plainText = `Confirm your Mitratech UX Lab account\n\nClick the link below to verify your email address:\n\n${confirmUrl}\n\nIf you didn't create this account, you can safely ignore this email.\n\n© ${new Date().getFullYear()} Mitratech Holdings, Inc.`;
    const htmlContent = buildHtmlEmail(confirmUrl);

    const mime = buildMimeEmail(email, "Confirm your Mitratech UX Lab account", plainText, htmlContent);
    const raw = base64UrlEncodeUtf8(mime);

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
    console.log(`[send-signup-confirmation] Pica response: status=${resp.status}, body=${text}`);

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "Failed to send email", details: text }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-signup-confirmation] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
