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

    const messages = [{
      role: 'system',
      content: `You are the Heart English speaking coach for an adult Korean learner.\nSituation: ${scenario}\nYour role: ${aiRole}\nTarget expression: "${targetExpression}"\nLearner goal: ${studentGoal}\n\nFor the learner's latest spoken English, do four things:\n1) Preserve the learner's intended meaning and rewrite it into natural spoken English. Do not make it unnecessarily advanced.\n2) Give one very short encouraging Korean note focused on usefulness/naturalness, not grammar lecturing.\n3) Decide whether the learner successfully used the target expression or a valid inflected/filled version of it.\n4) Continue the role-play naturally with ONE short English response or follow-up question that gives the learner another reason to speak.\n\nReturn ONLY valid JSON with exactly these keys:\n{"polished":"...","feedbackKo":"...","usedTarget":true,"reply":"..."}\nKeep polished to 1-2 sentences, feedbackKo to one short sentence, reply to 1-2 short sentences. Do not add explanations outside JSON.`
    }];

    for (const item of history) {
      if (!item || !['assistant','user'].includes(item.role)) continue;
      messages.push({ role: item.role, content: String(item.content || '').slice(0, 1000) });
    }
    messages.push({ role: 'user', content: userText });

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.45,
        response_format: { type: 'json_object' },
        messages
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'OpenAI error' });
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}');
    return res.status(200).json({
      polished: String(parsed.polished || userText).trim(),
      feedbackKo: String(parsed.feedbackKo || '좋아요. 자연스럽게 잘 이어갔어요.').trim(),
      usedTarget: Boolean(parsed.usedTarget),
      reply: String(parsed.reply || 'Tell me a little more.').trim()
    });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
