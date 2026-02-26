import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") ?? "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

function generateClaimToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function createSpreadsheet(
  accessToken: string,
  title: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string } | null> {
  try {
    const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: { title },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.spreadsheetId) return null;
    return {
      spreadsheetId: data.spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}`,
    };
  } catch (_) {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "auth_url") {
      const surveyId = url.searchParams.get("survey_id") ?? "";
      const appUrl = url.searchParams.get("app_url") ?? "";
      const surveyTitle = url.searchParams.get("survey_title") ?? "";
      const redirectUri = `${SUPABASE_URL}/functions/v1/google-sheets-oauth?action=callback`;

      const state = btoa(JSON.stringify({ survey_id: surveyId, app_url: appUrl, survey_title: surveyTitle }));

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", SCOPES);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", state);

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "callback") {
      const code = url.searchParams.get("code");
      const stateParam = url.searchParams.get("state") ?? "";
      const errorParam = url.searchParams.get("error");

      if (errorParam || !code) {
        let state: { survey_id: string; app_url: string; survey_title?: string } = { survey_id: "", app_url: "" };
        try { state = JSON.parse(atob(stateParam)); } catch (_) { /* ignore */ }
        const errRedirect = new URL(state.app_url || "/");
        errRedirect.searchParams.set("sheets_error", errorParam ?? "no_code");
        errRedirect.searchParams.set("survey_id", state.survey_id);
        return Response.redirect(errRedirect.toString(), 302);
      }

      let state: { survey_id: string; app_url: string; survey_title?: string } = { survey_id: "", app_url: "" };
      try {
        state = JSON.parse(atob(stateParam));
      } catch (_) {
        return new Response("Invalid state", { status: 400 });
      }

      const redirectUri = `${SUPABASE_URL}/functions/v1/google-sheets-oauth?action=callback`;

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        const errRedirect = new URL(state.app_url || "/");
        errRedirect.searchParams.set("sheets_error", tokenData.error);
        errRedirect.searchParams.set("survey_id", state.survey_id);
        return Response.redirect(errRedirect.toString(), 302);
      }

      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      const claimToken = generateClaimToken();

      const surveyTitle = state.survey_title ?? "Survey Responses";
      const sheetTitle = `${surveyTitle} - Responses`;
      const created = await createSpreadsheet(tokenData.access_token, sheetTitle);

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from("google_oauth_pending_tokens").insert({
        survey_id: state.survey_id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token ?? "",
        expires_at: expiresAt,
        claim_token: claimToken,
        spreadsheet_id: created?.spreadsheetId ?? null,
        spreadsheet_url: created?.spreadsheetUrl ?? null,
      });

      const appRedirect = new URL(state.app_url || "/");
      appRedirect.searchParams.set("sheets_connected", "1");
      appRedirect.searchParams.set("survey_id", state.survey_id);
      appRedirect.searchParams.set("claim_token", claimToken);

      return Response.redirect(appRedirect.toString(), 302);
    }

    if (action === "refresh") {
      const authHeader = req.headers.get("Authorization") ?? "";
      const userToken = authHeader.replace("Bearer ", "");

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { survey_id, refresh_token } = body;

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          refresh_token,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          grant_type: "refresh_token",
        }),
      });

      const tokenData = await tokenRes.json();
      if (tokenData.error) {
        return new Response(JSON.stringify({ error: tokenData.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      await supabase
        .from("survey_google_sheets_connections")
        .update({
          google_access_token: tokenData.access_token,
          token_expires_at: expiresAt,
        })
        .eq("survey_id", survey_id)
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ access_token: tokenData.access_token, expires_at: expiresAt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
