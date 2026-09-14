import {Bell} from '@phosphor-icons/react/dist/csr/Bell';
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const labels: Record<string,string> = {name:'Nome',class:'Classe',gender:'Gênero',country:'País',uf:'UF',observations:'Observações'};
export function CorrectionPreview({data}: {data:any}) {
  if (!data) return null;
  return <dl>{Object.entries(labels).filter(([key]) => data.before?.[key] !== data.after?.[key]).map(([key,label]) => <div key={key}><dt style={{fontWeight:700}}>{label}</dt><dd style={{margin:'2px 0 8px'}}>{data.before?.[key] || 'Não informado'} → <strong>{data.after?.[key] || 'Não informado'}</strong></dd></div>)}</dl>;
}

export default function AccountNotifications({userId,role}: {userId:string;role:string}) {
 const [items,setItems]=useState<any[]>([]), [reads,setReads]=useState<any[]>([]), [open,setOpen]=useState(false), [error,setError]=useState(''), [busy,setBusy]=useState(false);
 const [count,setCount]=useState(0);
 const isAdmin=['admin','super_admin'].includes(role);
 async function load() {
   const [n,r,c]=await Promise.all([supabase.from('admin_notifications').select('*').order('created_at',{ascending:false}),supabase.from('notification_reads').select('notification_id,status').eq('user_id',userId),supabase.rpc('account_notification_count')]);
   if(n.error || r.error || c.error) {setError('Não foi possível atualizar as notificações. Tente novamente.');return;}
   setItems(n.data || []);setReads(r.data || []);setCount(Number(c.data || 0));setError('');
 }
 useEffect(()=>{setItems([]);setReads([]);void load();const timer=setInterval(load,30000);window.addEventListener('focus',load);return()=>{clearInterval(timer);window.removeEventListener('focus',load);};},[userId,role]);
 const canDecide=(n:any)=>isAdmin && n.status==='pending' && (n.source_type!=='athlete_edit' || role==='super_admin');
 const unread=(n:any)=>n.requester_id===userId && !reads.some(r=>r.notification_id===n.id && r.status===n.status);
 const visible=items.filter(n=>canDecide(n) || n.requester_id===userId);
 async function markRead(n:any) {
   setBusy(true);
   const {error}=await supabase.from('notification_reads').upsert({user_id:userId,notification_id:n.id,status:n.status},{onConflict:'user_id,notification_id,status',ignoreDuplicates:true});
   if(error)setError(error.message);else await load();setBusy(false);
 }
 async function decide(n:any,status:string) {
   setBusy(true);setError('');
   const calls:Record<string,[string,any]>={athlete:['admin_set_athlete_approval',{target_athlete_id:n.source_id,new_status:status}],team_entry:['admin_set_team_entry_approval',{target_entry_id:n.source_id,new_status:status}],scout:['admin_set_scout_approval',{target_session_id:n.source_id,new_status:status}],athlete_edit:['resolve_athlete_correction',{notification_id:n.id,new_status:status}]};
   const call=calls[n.source_type];
   if(!call){setError('Tipo de pedido desconhecido.');setBusy(false);return;}
   const {error}=await supabase.rpc(call[0],call[1]);if(error)setError(error.message);else {window.dispatchEvent(new Event('boccia-catalog-updated'));await load();}setBusy(false);
 }
 const btn={padding:'8px 12px',borderRadius:8,border:'1px solid #cbd5e1',cursor:'pointer'};
 return <>
 <button className="home-notification" title={error || 'Notificações'} aria-label={`Notificações: ${count} pendentes ou não lidas`} onClick={()=>{setOpen(true);void load();}} style={{...btn,position:'relative',background:'#1e293b',color:'#fff',fontSize:18}}><Bell size={27} weight="regular"/><span style={{position:'absolute',top:-7,right:-7,background:error?'#b45309':'#dc2626',color:'#fff',borderRadius:20,minWidth:19,fontSize:12,padding:'2px 4px'}}>{error?'!':count>99?'99+':count}</span></button>
 {open && <div role="dialog" aria-modal="true" aria-label="Notificações" style={{position:'fixed',inset:0,zIndex:12000,background:'rgba(15,23,42,.7)',overflowY:'auto',padding:18,color:'#0f172a'}}><div style={{maxWidth:720,margin:'20px auto',background:'#fff',padding:22,borderRadius:16}}>
 <div style={{display:'flex',justifyContent:'space-between',gap:12}}><h2>Notificações</h2><button style={btn} onClick={()=>setOpen(false)}>Fechar</button></div>
 {error && <p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
 <button style={btn} disabled={busy} onClick={load}>Atualizar</button>
 {!visible.length && <p>Nenhuma notificação para esta conta.</p>}
 {visible.map(n=><article key={n.id} style={{padding:'16px 0',borderBottom:'1px solid #e2e8f0'}}><strong>{n.title}</strong><p>{n.message}</p><p>{({pending:'Aguardando aprovação',approved:'Aprovado',rejected:'Rejeitado'} as any)[n.status]} · {new Date(n.created_at).toLocaleString('pt-BR')}</p><CorrectionPreview data={n.change_data}/>
 {canDecide(n)?<div style={{display:'flex',gap:8}}><button style={{...btn,background:'#15803d',color:'#fff'}} disabled={busy} onClick={()=>decide(n,'approved')}>Aprovar</button><button style={btn} disabled={busy} onClick={()=>decide(n,'rejected')}>Rejeitar</button></div>:unread(n)?<button style={btn} disabled={busy} onClick={()=>markRead(n)}>Marcar como lida</button>:<small>Lida</small>}
 </article>)}
 </div></div>}
 </>;
}
