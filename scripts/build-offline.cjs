const fs=require('fs'),path=require('path'),crypto=require('crypto');
const dir=path.resolve(__dirname,'../dist');
function walk(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(p,x.name)):[path.join(p,x.name)]);}
const files=walk(dir).filter(p=>!p.endsWith('sw.js')&&!p.endsWith('_headers'));
const version=crypto.createHash('sha256').update(files.map(p=>fs.readFileSync(p)).join('')).digest('hex').slice(0,16);
const assets=files.map(p=>'/'+path.relative(dir,p).replaceAll('\\','/'));
fs.writeFileSync(path.join(dir,'sw.js'),`const CACHE='bocha-shell-${version}';const ASSETS=${JSON.stringify(assets)};
const clientScripts=new Map();
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
// Keep assets used by open matches. Clean old shells only after every window reports its build.
self.addEventListener('message',e=>{
 if(e.data?.type!=='BOCHA_CLIENT_READY'||!e.source?.id||!Array.isArray(e.data.scripts)||!e.data.scripts.length)return;
 clientScripts.set(e.source.id,e.data.scripts);
 e.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  if(!windows.length||windows.some(w=>!clientScripts.has(w.id)))return;
  const used=windows.flatMap(w=>clientScripts.get(w.id));
  for(const key of await caches.keys()){
   if(!key.startsWith('bocha-shell-')||key===CACHE)continue;
   const c=await caches.open(key);
   if(!(await Promise.all(used.map(script=>c.match(script)))).some(Boolean))await caches.delete(key);
  }
 })());
});
async function navigation(request){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),4000);
 try{const response=await fetch(request,{cache:'no-store',signal:controller.signal});if(response.ok&&response.headers.get('content-type')?.includes('text/html'))return response;}catch{}
 finally{clearTimeout(timer);}
 const cached=await (await caches.open(CACHE)).match('/index.html');
 return cached||Response.error();
}
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;
 if(e.request.mode==='navigate'){e.respondWith(navigation(e.request));return;}
 if(ASSETS.includes(u.pathname)||u.pathname.startsWith('/assets/'))e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});`);
fs.writeFileSync(path.join(dir,'_headers'),'/sw.js\n  Cache-Control: no-store\n/\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n');
console.log('Offline shell prepared: '+assets.length+' assets');
