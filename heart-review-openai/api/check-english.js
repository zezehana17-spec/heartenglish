import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request) {
  try {
    const { text, context = "" } = await request.json();
    if (!text?.trim()) return Response.json({ error: "Missing text" }, { status: 400 });

    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input: [
        {
          role: "system",
          content: "You are an English conversation teacher. Correct only clear spelling, grammar, article, preposition, word-form, and obvious naturalness issues. Preserve the learner's original meaning and wording as much as possible. Do not unnecessarily upgrade vocabulary. Return concise Korean explanation."
        },
        {
          role: "user",
          content: `Context: ${context}\nLearner text: ${text}`
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "english_check",
          strict: true,
          schema: {
            type: "object",
            properties: {
              original: { type: "string" },
              corrected: { type: "string" },
              note: { type: "string" }
            },
            required: ["original","corrected","note"],
            additionalProperties: false
          }
        }
      }
    });
    return Response.json(JSON.parse(response.output_text));
  } catch (e) {
    return Response.json({ error: e.message || "English check failed" }, { status: 500 });
  }
}
