export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY missing' });

    const chunks = [];
    for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const audio = Buffer.concat(chunks);
    if (!audio.length) return res.status(400).json({ error: 'Empty audio' });
    if (audio.length > 12 * 1024 * 1024) return res.status(413).json({ error: 'Audio too large' });

    const contentType = String(req.headers['content-type'] || 'audio/webm').split(';')[0];
    const ext = contentType.includes('mp4') ? 'm4a' : contentType.includes('ogg') ? 'ogg' : 'webm';
    const form = new FormData();
    form.append('file', new Blob([audio], { type: contentType }), `speech.${ext}`);
    form.append('model', 'gpt-4o-mini-transcribe');
    form.append('language', 'en');

    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'Transcription failed' });

    return res.status(200).json({ text: String(data?.text || '').trim() });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
