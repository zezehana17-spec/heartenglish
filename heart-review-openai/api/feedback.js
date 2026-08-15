import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request) {
  try {
    const body = await request.json();
    const { script, transcript, topic = "" } = body;
    if (!script || !transcript) return Response.json({ error: "Missing script or transcript" }, { status: 400 });

    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input: [
        {
          role: "system",
          content: `You are a supportive advanced English speaking coach.
Compare the student's intended script with the speech transcript.
Important: transcription is not a perfect pronunciation scorer. Do not invent precise pronunciation scores.
Focus on omitted/changed words or phrases, grammar mistakes visible in the transcript, and phrases that may need pronunciation practice because they were repeatedly transcribed differently.
Give only the most important feedback. Preserve the student's own script and voice.`
        },
        {
          role: "user",
          content: `Topic: ${topic}\n\nINTENDED SCRIPT:\n${script}\n\nTRANSCRIPT:\n${transcript}`
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "speaking_feedback",
          strict: true,
          schema: {
            type: "object",
            properties: {
              match_summary: { type: "string" },
              strength: { type: "string" },
              corrections: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 3 },
              practice_focus: { type: "string" },
              upgraded_version: { type: "string" }
            },
            required: ["match_summary","strength","corrections","practice_focus","upgraded_version"],
            additionalProperties: false
          }
        }
      }
    });
    return Response.json(JSON.parse(response.output_text));
  } catch (e) {
    return Response.json({ error: e.message || "Feedback failed" }, { status: 500 });
  }
}
