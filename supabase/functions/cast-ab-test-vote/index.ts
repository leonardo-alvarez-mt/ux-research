import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CastVoteInput {
  batchId: string;
  optionId: string;
  comment?: string;
}

interface VoteSubmission {
  batchId: string;
  optionId: string;
  comment: string;
}

function getClientIp(req: Request): string {
  const headers = req.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "0.0.0.0"
  );
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

    let input: CastVoteInput;
    try {
      input = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const batchId = String(input?.batchId ?? "").trim();
    const optionId = String(input?.optionId ?? "").trim();
    const comment = String(input?.comment ?? "").trim();

    if (!batchId) {
      return new Response(JSON.stringify({ error: "batchId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!optionId) {
      return new Response(JSON.stringify({ error: "optionId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[cast-ab-test-vote] Missing env vars");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the batch exists and belongs to a published test
    const { data: batch, error: batchError } = await supabase
      .from("ab_test_batches")
      .select(`
        id,
        ab_tests!inner ( id, status )
      `)
      .eq("id", batchId)
      .maybeSingle();

    if (batchError) {
      console.error("[cast-ab-test-vote] Batch lookup error:", batchError);
      return new Response(JSON.stringify({ error: "Failed to verify batch" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!batch) {
      return new Response(JSON.stringify({ error: "Batch not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const testData = batch.ab_tests as { id: string; status: string };
    if (testData.status !== "published") {
      return new Response(JSON.stringify({ error: "This test is no longer accepting votes" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the option belongs to this batch
    const { data: option, error: optionError } = await supabase
      .from("ab_test_options")
      .select("id")
      .eq("id", optionId)
      .eq("batch_id", batchId)
      .maybeSingle();

    if (optionError) {
      console.error("[cast-ab-test-vote] Option lookup error:", optionError);
      return new Response(JSON.stringify({ error: "Failed to verify option" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!option) {
      return new Response(JSON.stringify({ error: "Invalid option for this batch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const voterIp = getClientIp(req);

    // Upsert the vote (one per IP per batch)
    const { data: vote, error: voteError } = await supabase
      .from("ab_test_votes")
      .upsert(
        {
          batch_id: batchId,
          option_id: optionId,
          comment,
          voter_ip: voterIp,
          voter_id: null,
        },
        { onConflict: "batch_id,voter_ip" }
      )
      .select()
      .maybeSingle();

    if (voteError) {
      console.error("[cast-ab-test-vote] Vote upsert error:", voteError);
      const msg = voteError.message ?? "";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        return new Response(JSON.stringify({ error: "You have already voted on this batch" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Failed to submit vote" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ vote }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[cast-ab-test-vote] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
