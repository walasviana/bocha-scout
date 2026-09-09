const fs=require('fs'),path=require('path'),crypto=require('crypto');
const dir=path.resolve(__dirname,'../dist');
function walk(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(p,x.name)):[path.join(p,x.name)]);}
const files=walk(dir).filter(p=>!p.endsWith('sw.js')&&!p.endsWith('_headers'));
const version=crypto.createHash('sha256').update(files.map(p=>fs.readFileSync(p)).join('')).digest('hex').slice(0,16);
const assets=files.map(p=>'/'+path.relative(dir,p).replaceAll('\\','/'));
fs.writeFileSync(path.join(dir,'sw.js'),`const CACHE='bocha-shell-${version}';const ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('bocha-shell-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;if(e.request.mode==='navigate'){e.respondWith(caches.open(CACHE).then(c=>c.match('/index.html')).then(r=>r||fetch(e.request)));return;}if(ASSETS.includes(u.pathname))e.respondWith(caches.open(CACHE).then(c=>c.match(u.pathname)).then(r=>r||fetch(e.request)));});`);
fs.writeFileSync(path.join(dir,'_headers'),'/sw.js\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n');
console.log('Offline shell prepared: '+assets.length+' assets');
