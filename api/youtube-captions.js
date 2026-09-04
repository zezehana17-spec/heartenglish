export default async function handler(req, res) {
  try {
    const videoId = String(req.query.v || '').trim();
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      return res.status(400).json({ error: 'invalid video id' });
    }
    const watch = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9'
      }
    });
    const html = await watch.text();
    const marker = '"captionTracks":';
    const i = html.indexOf(marker);
    if (i < 0) return res.status(404).json({ error: 'captions not found' });
    let p = i + marker.length;
    let depth = 0, inString = false, esc = false, end = -1;
    for (let j = p; j < html.length; j++) {
      const c = html[j];
      if (inString) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inString = false;
        continue;
      }
      if (c === '"') { inString = true; continue; }
      if (c === '[') depth++;
      else if (c === ']') {
        depth--;
        if (depth === 0) { end = j + 1; break; }
      }
    }
    if (end < 0) return res.status(500).json({ error: 'caption track parse failed' });
    const tracks = JSON.parse(html.slice(p, end));
    const track = tracks.find(t => t.languageCode === 'en' && !t.kind) || tracks.find(t => t.languageCode === 'en') || tracks[0];
    if (!track?.baseUrl) return res.status(404).json({ error: 'english captions not found', tracks: tracks.map(t => ({ languageCode: t.languageCode, name: t.name?.simpleText, kind: t.kind })) });
    const cap = await fetch(track.baseUrl + '&fmt=json3');
    const data = await cap.json();
    const segments = [];
    for (const e of data.events || []) {
      if (!e.segs || e.tStartMs == null) continue;
      const text = e.segs.map(s => s.utf8 || '').join('').replace(/\n/g, ' ').trim();
      if (!text) continue;
      segments.push({ start: e.tStartMs / 1000, dur: (e.dDurationMs || 0) / 1000, text });
    }
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ videoId, language: track.languageCode, name: track.name?.simpleText || '', segments });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
