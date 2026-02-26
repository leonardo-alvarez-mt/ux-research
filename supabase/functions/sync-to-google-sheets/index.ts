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

const NON_ANSWER_TYPES = new Set([
  "welcome_screen",
  "statement",
  "end_screen",
]);

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_at: string }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Token refresh failed: ${data.error}`);
  return {
    access_token: data.access_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}

function formatAnswerValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(" | ");
  if (value === null || value === undefined) return "";
  return String(value);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
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
    const { survey_id } = body;

    if (!survey_id) {
      return new Response(JSON.stringify({ error: "survey_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conn, error: connError } = await supabase
      .from("survey_google_sheets_connections")
      .select("*")
      .eq("survey_id", survey_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (connError || !conn) {
      return new Response(JSON.stringify({ error: "No Google Sheets connection found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = conn.google_access_token;
    if (conn.token_expires_at && new Date(conn.token_expires_at) <= new Date(Date.now() + 60000)) {
      const refreshed = await refreshAccessToken(conn.google_refresh_token);
      accessToken = refreshed.access_token;
      await supabase
        .from("survey_google_sheets_connections")
        .update({ google_access_token: refreshed.access_token, token_expires_at: refreshed.expires_at })
        .eq("id", conn.id);
    }

    const { data: questionsRaw } = await supabase
      .from("survey_questions")
      .select("*")
      .eq("survey_id", survey_id)
      .order("sort_order", { ascending: true });

    const questions = (questionsRaw ?? []).filter((q: { type: string }) => !NON_ANSWER_TYPES.has(q.type));

    let responsesQuery = supabase
      .from("survey_responses")
      .select("*")
      .eq("survey_id", survey_id)
      .order("submitted_at", { ascending: true });

    if (conn.last_synced_at) {
      responsesQuery = responsesQuery.gt("submitted_at", conn.last_synced_at);
    }

    const { data: responses } = await responsesQuery;

    const spreadsheetId = conn.spreadsheet_id;
    const sheetName = conn.sheet_name || "Sheet1";
    const range = `${sheetName}!A1`;

    const isFirstSync = !conn.last_synced_at;
    const newRows: string[][] = [];

    if (isFirstSync) {
      const headerRow = ["Submitted At", ...questions.map((q: { title: string }) => q.title || "Untitled")];
      newRows.push(headerRow);
    }

    if (responses && responses.length > 0) {
      const responseIds = responses.map((r: { id: string }) => r.id);
      const { data: answers } = await supabase
        .from("survey_response_answers")
        .select("*")
        .in("response_id", responseIds);

      const answerMap = new Map<string, Map<string, unknown>>();
      for (const ans of answers ?? []) {
        if (!answerMap.has(ans.response_id)) {
          answerMap.set(ans.response_id, new Map());
        }
        answerMap.get(ans.response_id)!.set(ans.question_id, ans.answer?.value);
      }

      for (const response of responses) {
        const row: string[] = [new Date(response.submitted_at).toLocaleString()];
        for (const q of questions) {
          const val = answerMap.get(response.id)?.get(q.id);
          row.push(formatAnswerValue(val));
        }
        newRows.push(row);
      }
    }

    if (newRows.length > 0) {
      const appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values: newRows }),
        }
      );

      if (!appendRes.ok) {
        const errText = await appendRes.text();
        console.error("Sheets API error:", errText);
        return new Response(JSON.stringify({ error: `Sheets API error: ${errText}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    await supabase
      .from("survey_google_sheets_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", conn.id);

    return new Response(JSON.stringify({ success: true, rows_synced: newRows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
