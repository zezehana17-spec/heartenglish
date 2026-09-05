export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const lines = Array.isArray(req.body?.lines) ? req.body.lines.map(v => String(v || '').trim()).filter(Boolean).slice(0, 20) : [];
    if (!lines.length) return res.status(400).json({ error: 'lines required' });
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY missing' });

    const prompt = `You are preparing adult Korean English-learning material from an authentic interview.\nTranslate each English line naturally into Korean, preserving tone and meaning. Also extract exactly 3 useful natural English chunks that actually appear verbatim in the supplied lines.\nReturn ONLY valid JSON with this shape:\n{\"translations\":[\"...\"],\"expressions\":[{\"phrase\":\"...\",\"meaningKo\":\"...\"}]}\nThe translations array must have exactly ${lines.length} items in the same order.\nDo not invent phrases that are not in the lines.\n\nLINES:\n${lines.map((x,i)=>`${i+1}. ${x}`).join('\n')}`;

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Return only valid JSON. Be concise and accurate.' },
          { role: 'user', content: prompt }
        ]
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'OpenAI error' });
    const raw = data?.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.translations) || parsed.translations.length !== lines.length) {
      return res.status(500).json({ error: 'translation format mismatch' });
    }
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
