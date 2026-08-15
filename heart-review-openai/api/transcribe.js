import OpenAI, { toFile } from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request) {
  try {
    const buffer = Buffer.from(await request.arrayBuffer());
    if (!buffer.length) return Response.json({ error: "Empty audio" }, { status: 400 });
    const contentType = request.headers.get("content-type") || "audio/webm";
    const file = await toFile(buffer, "recording.webm", { type: contentType });
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "gpt-4o-mini-transcribe",
      language: "en"
    });
    return Response.json({ text: transcription.text });
  } catch (e) {
    return Response.json({ error: e.message || "Transcription failed" }, { status: 500 });
  }
}
