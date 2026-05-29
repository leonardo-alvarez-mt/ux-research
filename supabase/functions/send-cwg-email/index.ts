import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from "npm:resend@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FROM_ADDRESS = "Mitratech UX Lab <onboarding@resend.dev>";

type SendCwgEmailInput = {
  type: string;
  to: string[];
  cc?: string[];
  subject: string;
  plainMessage: string;
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

    let input: SendCwgEmailInput;
    try {
      input = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const to = Array.isArray(input?.to) ? input.to.filter(Boolean) : [];
    const cc = Array.isArray(input?.cc) ? input.cc.filter(Boolean) : [];
    const subject = String(input?.subject ?? "").trim();
    const plainMessage = String(input?.plainMessage ?? "").trim();

    if (to.length === 0) {
      return new Response(JSON.stringify({ error: '"to" must have at least one recipient' }), {
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
    if (!plainMessage) {
      return new Response(JSON.stringify({ error: '"plainMessage" is required' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("[send-cwg-email] Missing RESEND_API_KEY");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[send-cwg-email] type=${input.type}, to=${to.join(",")}, cc=${cc.join(",")}, subject="${subject}"`);

    const resend = new Resend(RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      ...(cc.length > 0 ? { cc } : {}),
      subject,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      html: input.htmlMessage ?? `<p>${plainMessage.replace(/\n/g, "<br>")}</p>`,
      text: plainMessage,
    });

    if (error) {
      console.error("[send-cwg-email] Resend error:", error);
      return new Response(JSON.stringify({ error: "Failed to send email", details: String(error) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[send-cwg-email] Sent successfully, id=${data?.id}`);
    return new Response(JSON.stringify({ id: data?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-cwg-email] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
