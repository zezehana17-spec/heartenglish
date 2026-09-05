export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const body = req.body || {};
    const scenario = String(body.scenario || '').slice(0, 1200);
    const aiRole = String(body.aiRole || 'Conversation partner').slice(0, 200);
    const targetExpression = String(body.targetExpression || '').slice(0, 200);
    const studentGoal = String(body.studentGoal || '').slice(0, 600);
    const userText = String(body.userText || '').trim().slice(0, 1200);
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    if (!userText) return res.status(400).json({ error: 'userText required' });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY missing' });

    const messages = [
      {
        role: 'system',
        content: `You are an English role-play partner for an adult Korean learner. Stay strictly inside the situation. Your role is ${aiRole}. The target expression is "${targetExpression}". The learner goal is: ${studentGoal}. Situation: ${scenario}. Keep each reply natural, short, and conversational: 1-2 sentences maximum. Do not lecture or explain grammar during the role-play. If the learner has not used the target expression yet, naturally create another chance for them to use it. If they did use it, continue the conversation naturally. Return ONLY JSON: {"reply":"...","usedTarget":true|false,"nudgeKo":"..."}. nudgeKo should be empty unless a tiny Korean hint would help the learner continue.`
      }
    ];

    for (const item of history) {
      if (!item || !['assistant','user'].includes(item.role)) continue;
      messages.push({ role: item.role, content: String(item.content || '').slice(0, 1000) });
    }
    messages.push({ role: 'user', content: userText });

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages
      })
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'OpenAI error' });
    const raw = data?.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);
    return res.status(200).json({
      reply: String(parsed.reply || '').trim(),
      usedTarget: Boolean(parsed.usedTarget),
      nudgeKo: String(parsed.nudgeKo || '').trim()
    });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
