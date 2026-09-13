import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
import AppIcon from './AppIcon';
export const confirmationURL=()=>window.location.origin+'/?auth=confirm';
const initialQuery=new URLSearchParams(window.location.search),initialHash=new URLSearchParams(window.location.hash.slice(1));
export const confirmationRequested=initialQuery.get('auth')==='confirm'||initialQuery.has('token_hash')||initialHash.get('type')==='signup';
let verification:Promise<boolean>|undefined;
function verify(){
 if(!verification)verification=(async()=>{
  if(initialQuery.has('error')||initialHash.has('error'))return false;
  const token_hash=initialQuery.get('token_hash');
  if(token_hash){const {error}=await supabase.auth.verifyOtp({token_hash,type:'email'});return !error;}
  const {data,error}=await supabase.auth.getUser();return !error&&!!data.user?.email_confirmed_at;
 })();return verification;
}
export default function EmailConfirmation({pendingEmail='',onClose}:{pendingEmail?:string;onClose:()=>void}){
 const [status,setStatus]=useState(pendingEmail?'pending':'checking'),[email,setEmail]=useState(pendingEmail),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[cooldown,setCooldown]=useState(0);
 useEffect(()=>{if(pendingEmail)return;let active=true;void verify().then(ok=>{if(active){setStatus(ok?'success':'error');window.history.replaceState(null,'','/');}}).catch(()=>{if(active)setStatus('error');});return()=>{active=false;};},[pendingEmail]);
 useEffect(()=>{if(!cooldown)return;const t=setTimeout(()=>setCooldown(c=>Math.max(0,c-1)),1000);return()=>clearTimeout(t);},[cooldown]);
 async function resend(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage('');try{const {error}=await supabase.auth.resend({type:'signup',email:email.trim(),options:{emailRedirectTo:confirmationURL()}});if(error)throw error;setMessage('Se houver uma confirmação pendente, você receberá um novo e-mail.');setCooldown(60);}catch{setMessage('Não foi possível reenviar agora. Aguarde um pouco e tente novamente.');}finally{setBusy(false);}}
 return <main className="hub-auth" style={{minHeight:'100vh',padding:20,boxSizing:'border-box'}}><section className="email-confirmation"><AppIcon name={status==='success'?'check':'mail'} size={44}/><strong className="welcome-eyebrow">BOCHA SCOUT</strong><h1>{status==='checking'?'Confirmando seu e-mail…':status==='success'?'E-mail confirmado!':status==='pending'?'Confira seu e-mail':'Não foi possível confirmar'}</h1><p>{status==='success'?'Sua conta está pronta. Vamos começar?':status==='error'?'O link pode ter expirado ou já ter sido utilizado. Você pode tentar entrar ou solicitar outro e-mail.':'Abra a mensagem do Bocha Scout e toque em Confirmar meu e-mail. Confira também a caixa de spam.'}</p>
 {['pending','error'].includes(status)&&<form onSubmit={resend}><label>E-mail<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="friendly-button" disabled={busy||cooldown>0}>{busy?'Enviando…':cooldown?`Aguarde ${cooldown}s`:'Reenviar confirmação'}</button></form>}
 <p role="status">{message}</p>{status!=='checking'&&<button className="friendly-button" onClick={onClose}>{status==='success'?'Entrar no Bocha Scout':'Voltar para entrar'}</button>}</section></main>;
}
