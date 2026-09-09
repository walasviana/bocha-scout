import React,{useState} from 'react';
import {supabase} from '../lib/supabase';
export default function PasswordRecovery({reset,onClose}:{reset:boolean;onClose:()=>void}) {
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage('');try{
   if(reset){
     if(password!==confirm)throw new Error('As senhas precisam ser iguais.');
     const {error}=await supabase.auth.updateUser({password});if(error)throw error;
     setPassword('');setConfirm('');setDone(true);setMessage('Senha alterada com sucesso.');
   }else{
     const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+'/'});if(error)throw error;
     setMessage('Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha. Confira também a pasta de spam.');
   }
 }catch(e:any){setMessage(e.message || 'Não foi possível concluir. Solicite um novo link e tente novamente.');}finally{setBusy(false);}}
 const field={padding:12,border:'1px solid #cbd5e1',borderRadius:9,fontSize:16};
 return <div style={{minHeight:'100vh',background:'#f1f5f9',padding:20,fontFamily:'Arial,sans-serif'}}><div style={{maxWidth:460,margin:'40px auto',padding:24,borderRadius:16,background:'#fff'}}><h1 style={{fontSize:24}}>{reset?'Criar nova senha':'Recuperar senha'}</h1>
 {!done && <form onSubmit={submit} style={{display:'grid',gap:12}}>{reset?<><label>Nova senha<input style={{...field,width:'100%',boxSizing:'border-box'}} type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Confirmar nova senha<input style={{...field,width:'100%',boxSizing:'border-box'}} type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><small>Use pelo menos 8 caracteres.</small></>:<label>E-mail da conta<input style={{...field,width:'100%',boxSizing:'border-box'}} type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>}<button disabled={busy} style={{...field,background:'#15803d',color:'#fff'}}>{busy?'Aguarde...':reset?'Salvar nova senha':'Enviar link de recuperação'}</button></form>}
 {message && <p role="status">{message}</p>}<button disabled={busy} onClick={onClose} style={{...field,marginTop:14}}>{done?'Continuar':'Voltar'}</button>
 </div></div>;
}
