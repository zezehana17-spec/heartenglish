import OpenAI, { toFile } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VIDEO_URL = "https://voa-video-ns.akamaized.net/pangeavideo/2021/02/7/7a/7a055fd0-0345-41e4-b24d-37df1736f3d1_240p.mp4?cb=edc3e694c&download=1";

export async function GET() {
  try {
    const r = await fetch(VIDEO_URL);
    if (!r.ok) throw new Error(`VOA fetch failed: ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    const file = await toFile(buf, "voa-budget-cuts.mp4", { type: "video/mp4" });
    const tr = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"]
    });
    const segments = (tr.segments || []).filter(s => (s.start ?? 0) < 45).map(s => ({
      start: s.start,
      end: s.end,
      text: s.text
    }));
    return Response.json({ text: tr.text, segments });
  } catch (e) {
    return Response.json({ error: e.message || "failed" }, { status: 500 });
  }
}
