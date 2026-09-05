const fs = require('fs');
const path = 'src/components/AuthGate.tsx';
let s = fs.readFileSync(path, 'utf8');

s = s.replace("const [mode, setMode] = useState<'login' | 'register'>('login');", "const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');\n  const [acceptedLegal, setAcceptedLegal] = useState(false);\n  const [showLegal, setShowLegal] = useState<'terms' | 'privacy' | null>(null);\n  const [showAccount, setShowAccount] = useState(false);");

s = s.replace("const [showAthleteRegistration, setShowAthleteRegistration] = useState(false);", "const [showAthleteRegistration, setShowAthleteRegistration] = useState(false);\n  const [accountForm, setAccountForm] = useState({ name: '', country: '', club: '' });");

s = s.replace("async function submit(e: React.FormEvent) {", `async function recoverPassword() {
    setBusy(true); setMessage('');
    try {
      if (!form.email.trim()) throw new Error('Informe seu e-mail.');
      const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), { redirectTo: window.location.origin });
      if (error) throw error;
      setMessage('Enviamos as instruções de recuperação para o seu e-mail.');
    } catch (err) { setMessage(err?.message || 'Não foi possível enviar a recuperação.'); }
    finally { setBusy(false); }
  }

  async function saveAccount() {
    if (!user) return;
    setBusy(true); setMessage('');
    try {
      const { error } = await supabase.from('profiles').update({ name: accountForm.name.trim(), country: accountForm.country.trim(), club: accountForm.club.trim() }).eq('id', user.id);
      if (error) throw error;
      await loadProfile(user); setShowAccount(false);
    } catch (err) { setMessage(err?.message || 'Não foi possível atualizar sua conta.'); }
    finally { setBusy(false); }
  }

  async function submit(e: React.FormEvent) {`);

s = s.replace("if (mode === 'login') {", "if (mode === 'forgot') { await recoverPassword(); return; }\n      if (mode === 'login') {");
s = s.replace("if (!form.fullName.trim() || !form.username.trim() || !form.country.trim()) {", "if (!acceptedLegal) throw new Error('Você precisa aceitar os Termos de Uso e a Política de Privacidade.');\n        if (!form.fullName.trim() || !form.username.trim() || !form.country.trim()) {");
s = s.replace("role_type: form.roleType,", "role_type: form.roleType,\n              role: 'user',\n              legal_version: '2026-09-05',\n              legal_accepted_at: new Date().toISOString(),");

s = s.replace("{mode === 'register' && <>\n", "{mode === 'register' && <>\n");
s = s.replace("</>}\n            <input style={fieldStyle()} type=\"email\"", `</>}
            <input style={fieldStyle()} type="email"`);
s = s.replace("<input style={fieldStyle()} type=\"password\" placeholder=\"Senha\" minLength={6} required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />", `<input style={fieldStyle()} type="password" placeholder="Senha" minLength={6} required={mode !== 'forgot'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            {mode === 'register' && <label style={{ display:'flex', gap:9, alignItems:'flex-start', fontSize:13, color:'#475569' }}><input type="checkbox" checked={acceptedLegal} onChange={e => setAcceptedLegal(e.target.checked)} /><span>Li e concordo com os <button type="button" onClick={() => setShowLegal('terms')} style={{border:0,background:'none',padding:0,textDecoration:'underline',color:'#1d4ed8'}}>Termos de Uso</button> e com a <button type="button" onClick={() => setShowLegal('privacy')} style={{border:0,background:'none',padding:0,textDecoration:'underline',color:'#1d4ed8'}}>Política de Privacidade</button>.</span></label>}
            {mode === 'login' && <button type="button" onClick={() => { setMode('forgot'); setMessage(''); }} style={{border:0,background:'none',color:'#1d4ed8',textDecoration:'underline',justifySelf:'start'}}>Esqueci minha senha</button>}`);
s = s.replace("{busy ? 'Aguarde...' : mode === 'login' ? 'Entrar no Bocha Scout' : 'Criar minha conta'}", "{busy ? 'Aguarde...' : mode === 'login' ? 'Entrar no Bocha Scout' : mode === 'forgot' ? 'Enviar recuperação' : 'Criar minha conta'}");

s = s.replace("<p style={{ color: '#64748b', fontSize: 12, marginTop: 15 }}>O acesso fica salvo neste aparelho até você sair da conta.</p>", `<p style={{ color: '#64748b', fontSize: 12, marginTop: 15 }}>O acesso fica salvo neste aparelho até você sair da conta.</p>
          {mode === 'forgot' && <button onClick={() => {setMode('login');setMessage('')}} style={{border:0,background:'none',color:'#1d4ed8'}}>Voltar ao login</button>}
          {showLegal && <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,.6)',display:'grid',placeItems:'center',padding:16,zIndex:1000}}><div style={{background:'#fff',maxWidth:720,maxHeight:'82vh',overflowY:'auto',padding:22,borderRadius:14}}><h2>{showLegal === 'terms' ? 'Termos de Uso — Bocha Scout' : 'Política de Privacidade — Bocha Scout'}</h2><p><strong>Última atualização: 05 de setembro de 2026</strong></p>{showLegal === 'terms' ? <><p>O Bocha Scout é uma ferramenta para registro, organização e análise de treinos, competições, atletas, scouts e indicadores esportivos.</p><p>O usuário deve fornecer dados verdadeiros, proteger sua conta e utilizar a plataforma de forma lícita. Contas novas são contas padrão; permissões administrativas somente podem ser concedidas posteriormente por usuário autorizado.</p><p>Quem cadastrar dados de atletas é responsável por possuir autorização ou outra base legal adequada. Para crianças e adolescentes devem ser observadas as regras aplicáveis e o melhor interesse do menor.</p><p>Os scouts são registros técnicos feitos pelos usuários e não substituem resultados ou classificações oficiais. O acesso poderá ser bloqueado em caso de uso indevido ou risco à segurança.</p><p>O serviço poderá ser atualizado e futuramente oferecer planos pagos, sem cobrança sem informação prévia e concordância aplicável.</p><p>O tratamento de dados pessoais observará a LGPD. Estes termos poderão ser atualizados, com novo aceite quando necessário.</p></> : <><p>O Bocha Scout trata dados necessários à conta e às funções esportivas, como nome, e-mail, estado/país, clube, tipo de perfil, dados de atletas, scouts, resultados e estatísticas.</p><p>Os dados são usados para autenticação, registro e consulta de scouts, estatísticas, administração, recuperação de acesso e segurança. Dados pessoais não são comercializados.</p><p>Dados de crianças e adolescentes devem ser tratados considerando seu melhor interesse e as autorizações ou bases legais aplicáveis.</p><p>Fornecedores tecnológicos podem processar dados somente quando necessários à operação. Senhas são geridas pelo sistema de autenticação e não ficam disponíveis em texto legível aos administradores.</p><p>O titular poderá solicitar acesso, correção, bloqueio, anonimização ou eliminação quando cabível, nos termos da LGPD. Dados poderão ser conservados quando houver obrigação ou fundamento legal.</p><p>Esta política poderá ser atualizada e, quando necessário, será solicitado novo aceite.</p></>}<button onClick={() => setShowLegal(null)} style={{padding:'10px 14px',border:0,borderRadius:8,background:'#0f172a',color:'#fff',fontWeight:700}}>Fechar</button></div></div>}`);

s = s.replace("const isAdmin = profile?.role === 'admin';", "const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';");
s = s.replace("<button onClick={() => supabase.auth.signOut()}", `<button onClick={() => { setAccountForm({name: profile?.name || '', country: profile?.country || '', club: profile?.club || ''}); setShowAccount(true); }} style={{ border:'1px solid #94a3b8', background:'#334155', color:'#fff', borderRadius:8, padding:'7px 10px', fontWeight:700 }}>Minha conta</button>
          <button onClick={() => supabase.auth.signOut()}`);
s = s.replace("{children}\n      {showAthleteRegistration", `{children}
      {showAccount && <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,.6)',display:'grid',placeItems:'center',padding:16,zIndex:1000}}><div style={{background:'#fff',width:'min(460px,100%)',padding:22,borderRadius:14,fontFamily:'Arial,sans-serif'}}><h2>Minha conta</h2><div style={{display:'grid',gap:10}}><input style={fieldStyle()} placeholder="Nome" value={accountForm.name} onChange={e=>setAccountForm({...accountForm,name:e.target.value})}/><input style={fieldStyle()} placeholder="Estado / País" value={accountForm.country} onChange={e=>setAccountForm({...accountForm,country:e.target.value})}/><input style={fieldStyle()} placeholder="Clube ou instituição" value={accountForm.club} onChange={e=>setAccountForm({...accountForm,club:e.target.value})}/><div style={{display:'flex',gap:8}}><button disabled={busy} onClick={saveAccount} style={{padding:'10px 14px',border:0,borderRadius:8,background:'#15803d',color:'#fff',fontWeight:700}}>Salvar</button><button onClick={()=>setShowAccount(false)} style={{padding:'10px 14px',border:0,borderRadius:8}}>Cancelar</button></div><button onClick={()=>setShowLegal('terms')} style={{border:0,background:'none',color:'#1d4ed8',textAlign:'left'}}>Termos de Uso</button><button onClick={()=>setShowLegal('privacy')} style={{border:0,background:'none',color:'#1d4ed8',textAlign:'left'}}>Política de Privacidade</button></div></div></div>}
      {showAthleteRegistration`);

fs.writeFileSync(path, s);
console.log('v27 account/privacy patch applied');
