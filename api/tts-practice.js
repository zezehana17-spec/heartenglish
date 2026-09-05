export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'POST only'});
  try{
    const apiKey=process.env.OPENAI_API_KEY;
    if(!apiKey) return res.status(500).json({error:'OPENAI_API_KEY missing'});
    const text=String(req.body?.text||'').trim().slice(0,500);
    if(!text) return res.status(400).json({error:'text required'});
    const r=await fetch('https://api.openai.com/v1/audio/speech',{
      method:'POST',
      headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({model:'gpt-4o-mini-tts',voice:'coral',input:text,format:'mp3'})
    });
    if(!r.ok){const d=await r.text();return res.status(r.status).json({error:d||'TTS failed'});}
    const ab=await r.arrayBuffer();
    res.setHeader('Content-Type','audio/mpeg');
    res.setHeader('Cache-Control','public, max-age=86400');
    return res.status(200).send(Buffer.from(ab));
  }catch(e){return res.status(500).json({error:String(e?.message||e)});}
}
