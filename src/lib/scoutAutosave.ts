import {supabase} from './supabase';

export function localUser() {
  try {return JSON.parse(localStorage.getItem('sb-whufbagsxtdzekooamxf-auth-token') || 'null')?.user || null;} catch {return null;}
}
const prefix='bocha-offline-v1:';
const key=(owner:string,id:string)=>`${prefix}${owner}:${id}`;
export function readDraft(owner:string) {
  try {
    const id=localStorage.getItem(`${prefix}active:${owner}`);
    if(!id)return null;
    const item=JSON.parse(localStorage.getItem(key(owner,id)) || 'null');
    return item?.state==='active' ? item : null;
  }catch{return null;}
}
export function saveDraft(owner:string,id:string,payload:any,state='active') {
  const k=key(owner,id);
  const previous=JSON.parse(localStorage.getItem(k) || 'null');
  if(previous?.state==='closed')return;
  const item={id,owner_id:owner,revision:Math.max(Date.now(),(previous?.revision || 0)+1),state,payload:state==='closed'?null:payload,pending:true};
  localStorage.setItem(k,JSON.stringify(item));
  if(state==='active')localStorage.setItem(`${prefix}active:${owner}`,id);
  else if(localStorage.getItem(`${prefix}active:${owner}`)===id)localStorage.removeItem(`${prefix}active:${owner}`);
}
export function queueSession(owner:string,row:any) {
  localStorage.setItem(`${prefix}session:${owner}:${row.id}`,JSON.stringify(row));
}
const running=new Set<string>();
async function bounded<T>(request:PromiseLike<T>):Promise<T> {
  let timer:ReturnType<typeof setTimeout>;
  try{return await Promise.race([Promise.resolve(request),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Conexão indisponível')),10000);})]);}
  finally{clearTimeout(timer!);}
}
export async function flushAutosave(owner:string) {
  if(!owner || !navigator.onLine || running.has(owner))return;
  running.add(owner);
  try {
    const {data}=await bounded(supabase.auth.getSession());
    if(data.session?.user.id!==owner)return;
    for(const k of Object.keys(localStorage).filter(k=>k.startsWith(`${prefix}${owner}:`) || k.startsWith(`${prefix}session:${owner}:`))) {
      const raw=localStorage.getItem(k);if(!raw)continue;
      const item=JSON.parse(raw);
      if(k.startsWith(`${prefix}session:`)) {
        const {error}=await bounded(supabase.from('scout_sessions').upsert(item,{onConflict:'id'}));
        if(!error && localStorage.getItem(k)===raw)localStorage.removeItem(k);
      }else if(item.pending){
        const {error}=await bounded(supabase.rpc('write_scout_draft',{draft_id:item.id,draft_revision:item.revision,draft_state:item.state,draft_payload:item.payload}));
        if(!error && localStorage.getItem(k)===raw) {
          if(item.state==='closed')localStorage.removeItem(k);
          else localStorage.setItem(k,JSON.stringify({...item,pending:false}));
        }
      }
    }
  }catch(error){console.error('Sincronização será tentada novamente',error);}finally{running.delete(owner);}
}

export function listenAutosave(owner:string) {
  const sync=()=>void flushAutosave(owner);
  const timer=setInterval(sync,10000);
  window.addEventListener('online',sync);window.addEventListener('focus',sync);
  const {data}=supabase.auth.onAuthStateChange(()=>{setTimeout(sync,0);});
  sync();
  return ()=>{clearInterval(timer);window.removeEventListener('online',sync);window.removeEventListener('focus',sync);data.subscription.unsubscribe();};
}
