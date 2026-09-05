export const config={api:{bodyParser:false}};
function norm(s){return String(s||'').toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9' ]+/g,' ').replace(/\s+/g,' ').trim()}
function words(s){return norm(s).split(' ').filter(Boolean)}
function distance(a,b){const m=a.length,n=b.length,d=Array.from({length:m+1},()=>Array(n+1).fill(0));for(let i=0;i<=m;i++)d[i][0]=i;for(let j=0;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n]}
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 try{
  const apiKey=process.env.OPENAI_API_KEY;if(!apiKey)return res.status(500).json({error:'OPENAI_API_KEY missing'});
  const target=decodeURIComponent(String(req.query?.target||'')).slice(0,500);if(!target)return res.status(400).json({error:'target required'});
  const chunks=[];for await(const c of req)chunks.push(Buffer.isBuffer(c)?c:Buffer.from(c));const audio=Buffer.concat(chunks);if(!audio.length)return res.status(400).json({error:'Empty audio'});
  const contentType=String(req.headers['content-type']||'audio/webm').split(';')[0];const ext=contentType.includes('mp4')?'m4a':contentType.includes('ogg')?'ogg':'webm';
  const form=new FormData();form.append('file',new Blob([audio],{type:contentType}),`speech.${ext}`);form.append('model','gpt-4o-mini-transcribe');form.append('language','en');form.append('prompt',target);
  const r=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`},body:form});const d=await r.json();if(!r.ok)return res.status(r.status).json({error:d?.error?.message||'Transcription failed'});
  const heard=String(d?.text||'').trim();const tw=words(target),hw=words(heard);const dist=distance(tw,hw);const denom=Math.max(tw.length,hw.length,1);const score=Math.max(0,Math.round((1-dist/denom)*100));
  let feedback='한 번 더 또박또박 말해보세요.';if(score>=95)feedback='아주 또렷하게 들렸어요.';else if(score>=80)feedback='잘 들렸어요. 거의 정확합니다.';else if(score>=60)feedback='대부분 잘 들렸어요. 빠진 단어나 연결 발음을 한 번 더 확인해보세요.';
  return res.status(200).json({target,heard,score,feedback});
 }catch(e){return res.status(500).json({error:String(e?.message||e)});}
}
