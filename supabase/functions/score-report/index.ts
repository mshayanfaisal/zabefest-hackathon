// Supabase Edge Function: score-report
// AI severity scoring for civic reports via the Gemini API (free tier).
// Deploy:  supabase functions deploy score-report
// Secrets: supabase secrets set GEMINI_KEY=...   (SUPABASE_URL / SERVICE_ROLE auto-injected)
//
// Called fire-and-forget by the mobile app right after a report is inserted.
// On any failure it does nothing — the DB rule-based severity default stands.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL = "gemini-2.0-flash";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { report_id, description, category, sub_type } = await req.json();
    if (!report_id) {
      return Response.json({ error: "report_id required" }, { status: 400, headers: corsHeaders });
    }

    const apiKey = Deno.env.get("GEMINI_KEY");
    if (!apiKey) {
      return Response.json({ error: "GEMINI_KEY not set" }, { status: 500, headers: corsHeaders });
    }

    const prompt = `You are a civic issue prioritization system for Karachi, Pakistan.
Analyze this citizen-reported issue and respond with JSON only (no markdown, no code fences).

Category: ${category}
Sub-type: ${sub_type}
Description: "${description ?? ""}"

Respond with exactly this JSON shape:
{
  "score": <integer 1-10, where 10 = immediate life threat, 1 = minor cosmetic issue>,
  "reason": "<one short sentence explaining the score>",
  "department": "<one of: KMC | KWSB | KE | Police | Rangers | PDMA | SSWMB>"
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: `gemini ${res.status}: ${errText}` }, { status: 502, headers: corsHeaders });
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "{}";
    const parsed = JSON.parse(text);

    const score = Math.max(1, Math.min(10, parseInt(parsed.score, 10) || 5));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await supabase
      .from("reports")
      .update({
        severity_score: score,
        severity_reason: parsed.reason ?? null,
        department: parsed.department ?? null,
      })
      .eq("id", report_id);

    return Response.json(
      { score, reason: parsed.reason, department: parsed.department },
      { headers: corsHeaders },
    );
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500, headers: corsHeaders });
  }
});
