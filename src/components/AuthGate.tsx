import {localUser} from '../lib/scoutAutosave';
import AccountNotifications from './AccountNotifications';
import PasswordRecovery from './PasswordRecovery';
import {DataPanelContext} from './DataPanelContext';
import React, { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
// PATCH: notification-bell-auth-v22
// PATCH: auth-ui-review-v20
import AdminPanel from './AdminPanel';
import AthleteRegistrationPanel from './AthleteRegistrationPanel';
import TeamRegistrationPanel from './TeamRegistrationPanel';
// PATCH: super-admin-v17
// PATCH: approval-workflow-v15
import ProfilePanel from './ProfilePanel';

const PROFILE_TYPES = ['Técnico', 'Atleta', 'Professor', 'Outro'];
const TERMS_VERSION = '2026-09-08';
const TERMS_TEXT = `1. Finalidade e conta. O Bocha Scout permite cadastrar atletas e registrar e analisar partidas de bocha. Ao criar uma conta, informe dados verdadeiros, proteja sua senha e use somente uma conta à qual tenha autorização de acesso.

2. Dados dos atletas. Cadastre somente informações necessárias à atividade esportiva, com autorização para seu uso. Não inclua laudos, documentos, contatos privados ou outros dados sensíveis no campo de observações. Para crianças e adolescentes, obtenha autorização do responsável antes de cadastrar informações.

3. Quem pode ver. Os cadastros aprovados de atletas ficam disponíveis às contas da plataforma. Contas comuns consultam as partidas registradas por elas. Administradores e o superadministrador podem consultar registros para gestão e aprovação. Ao exportar um PDF ou backup, você se responsabiliza por compartilhar o arquivo somente com pessoas autorizadas.

4. Correções e aprovação. O superadministrador pode corrigir cadastros. Alterações propostas por administradores aguardam sua aprovação. Pedidos, decisões e alterações podem ser registrados para acompanhamento. O cadastro ou pedido pode ser rejeitado quando houver informações incorretas ou uso inadequado.

5. Uso responsável. É proibido usar a plataforma para expor, constranger ou discriminar pessoas, acessar contas alheias, divulgar informações sem autorização ou prejudicar o serviço. Violações podem resultar em bloqueio ou exclusão da conta pela administração.

6. Análises e disponibilidade. Os indicadores dependem das jogadas informadas e podem conter erros de registro. Confira os resultados antes de utilizá-los. As análises apoiam o trabalho esportivo e não constituem avaliação médica nem certificação de classificação esportiva. O serviço pode passar por manutenção.

7. Correção e exclusão de dados. Solicite à administração do Bocha Scout a revisão, correção ou exclusão de seus dados. A administração poderá precisar confirmar sua identidade e avaliar os registros envolvidos antes de atender à solicitação.

8. Aceite. Ao marcar a caixa de aceite e criar a conta, você declara ter lido estes termos. A versão e a data do aceite são registradas junto ao cadastro. Mudanças nestes termos serão identificadas por uma nova versão.`;

function fieldStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid #cbd5e1',
    fontSize: 16,
    boxSizing: 'border-box',
    background: '#fff',
  };
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(()=>localUser());
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(()=>!localUser());
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState<'overview' | 'notifications'>('overview');
  const [dataHost,setDataHost]=useState<HTMLElement|null>(null);
  const [recovery,setRecovery]=useState(/type=recovery/.test(window.location.hash));
  const [requestRecovery,setRequestRecovery]=useState(false);
  const [showAthleteRegistration, setShowAthleteRegistration] = useState(false);
  const [showTeamRegistration, setShowTeamRegistration] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', fullName: '', username: '', country: 'Brasil', club: '', roleType: 'Técnico',
  });

  async function loadProfile(nextUser: User | null) {
    if (!nextUser) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase.from('profiles').select('id,name,username,country,uf,club,profile_type,role,is_blocked').eq('id', nextUser.id).maybeSingle();
    if (!error) setProfile(data || null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const nextUser = data.session?.user ?? (!navigator.onLine ? localUser() : null);
      setUser(nextUser);
      await loadProfile(nextUser);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') setRecovery(true);
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setTimeout(() => { void loadProfile(nextUser); }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (error) throw error;
      } else {
        if (!form.fullName.trim() || !form.username.trim() || !form.country.trim()) {
          throw new Error('Preencha nome, usuário e país.');
        }
        if (!acceptedTerms) throw new Error('Você precisa ler e aceitar os Termos de Uso.');
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: {
              full_name: form.fullName.trim(),
              username: form.username.trim(),
              country: form.country.trim(),
              club: form.club.trim(),
              role_type: form.roleType,
              terms_version: TERMS_VERSION,
              terms_accepted_at: new Date().toISOString(),
            },
          },
        });
        if (error) throw error;
        if (!data.session) setMessage('Conta criada. Se o projeto estiver exigindo confirmação de e-mail, confirme para entrar.');
      }
    } catch (err: any) {
      setMessage(err?.message || 'Não foi possível concluir.');
    } finally {
      setBusy(false);
    }
  }

  if (recovery || requestRecovery) return <PasswordRecovery reset={recovery} onClose={() => {setRecovery(false);setRequestRecovery(false);window.history.replaceState(null,'',window.location.pathname);}}/>;

  if (loading) return <div style={{ padding: 30, fontFamily: 'Arial, sans-serif' }}>Carregando Bocha Scout...</div>;

  if (!user) {
    return (
      <div className='hub-auth' style={{ minHeight: '100vh', background: '#f1f5f9', padding: 20, fontFamily: 'Arial, sans-serif' }}>
        <div style={{ maxWidth: 480, margin: '30px auto', background: '#fff', borderRadius: 20, padding: 'clamp(20px,4vw,28px)', border: '1px solid #e2e8f0', boxShadow: '0 18px 50px rgba(15,23,42,.10)' }}>
          <div style={{ color: '#0f172a', fontWeight: 900, fontSize: 28 }}>BOCHA SCOUT</div>
          <div style={{ color: '#64748b', marginTop: 4, marginBottom: 20 }}>Scout técnico de Bocha Paralímpica</div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <button onClick={() => { setMode('login'); setMessage(''); }} style={{ flex: 1, padding: 11, border: 0, borderRadius: 10, background: mode === 'login' ? '#0f172a' : '#e2e8f0', color: mode === 'login' ? '#fff' : '#0f172a', fontWeight: 700 }}>Entrar</button>
            <button onClick={() => { setMode('register'); setMessage(''); }} style={{ flex: 1, padding: 11, border: 0, borderRadius: 10, background: mode === 'register' ? '#15803d' : '#e2e8f0', color: mode === 'register' ? '#fff' : '#0f172a', fontWeight: 700 }}>Criar conta</button>
          </div>

          <form onSubmit={submit} style={{ display: 'grid', gap: 11 }}>
            {mode === 'register' && <>
              <input style={fieldStyle()} placeholder="Nome completo" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
              <input style={fieldStyle()} placeholder="Nome de usuário" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
              <input style={fieldStyle()} placeholder="País" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
              <input style={fieldStyle()} placeholder="Clube ou instituição (opcional)" value={form.club} onChange={e => setForm({ ...form, club: e.target.value })} />
              <select style={fieldStyle()} value={form.roleType} onChange={e => setForm({ ...form, roleType: e.target.value })}>
                {PROFILE_TYPES.map(x => <option key={x}>{x}</option>)}
              </select>
              <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', color: '#334155', fontSize: 14 }}>
                <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} style={{ marginTop: 3 }} />
                <span>Li e aceito os <button type="button" onClick={() => setShowTerms(true)} style={{ border: 0, padding: 0, background: 'transparent', color: '#15803d', textDecoration: 'underline', fontWeight: 700 }}>Termos de Uso</button>.</span>
              </label>
            </>}
            <input style={fieldStyle()} type="email" placeholder="E-mail" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input style={fieldStyle()} type="password" placeholder="Senha" minLength={6} required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            {message && <div style={{ padding: 10, borderRadius: 8, background: '#f8fafc', color: '#475569', fontSize: 14 }}>{message}</div>}
            <button disabled={busy} style={{ padding: 13, border: 0, borderRadius: 10, background: '#15803d', color: '#fff', fontSize: 16, fontWeight: 800 }}>
              {busy ? 'Aguarde...' : mode === 'login' ? 'Entrar no Bocha Scout' : 'Criar minha conta'}
            </button>
          </form>
          {mode === 'login' && <button type="button" onClick={()=>setRequestRecovery(true)} style={{marginTop:14,border:0,background:'transparent',color:'#1d4ed8',cursor:'pointer'}}>Esqueci minha senha</button>}
          <p style={{ color: '#64748b', fontSize: 12, marginTop: 15 }}>O acesso fica salvo neste aparelho até você sair da conta.</p>
        </div>
        {showTerms && <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.7)', zIndex: 11000, padding: 18, overflowY: 'auto' }}>
          <div style={{ maxWidth: 620, margin: '35px auto', background: '#fff', borderRadius: 16, padding: 22 }}>
            <h2 style={{ marginTop: 0 }}>Termos de Uso do Bocha Scout</h2>
            {TERMS_TEXT.split('\n\n').map((paragraph, index) => <p key={index} style={{ color: '#334155', lineHeight: 1.55 }}>{paragraph}</p>)}
            <button type="button" onClick={() => setShowTerms(false)} style={{ width: '100%', padding: 12, border: 0, borderRadius: 10, background: '#0f172a', color: '#fff', fontWeight: 800 }}>Fechar termos</button>
          </div>
        </div>}
      </div>
    );
  }

  if (profile?.is_blocked) {
    return <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'grid', placeItems: 'center', padding: 20, fontFamily: 'Arial, sans-serif' }}><div style={{ background: '#fff', padding: 24, borderRadius: 16, maxWidth: 520 }}><h2>Acesso bloqueado</h2><p>Esta conta foi bloqueada pelo administrador do Bocha Scout.</p><button onClick={() => supabase.auth.signOut()} style={{ border: 0, borderRadius: 9, background: '#0f172a', color: '#fff', padding: '10px 14px', fontWeight: 800 }}>Sair</button></div></div>;
  }

  const meta = user.user_metadata || {};
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isSuperAdmin = profile?.role === 'super_admin';

  return (
    <div>
      <div className="account-toolbar" style={{ background: '#0f172a', color: '#fff', padding: '9px 14px', fontFamily: 'Inter, Arial, sans-serif', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 9997, boxShadow: '0 5px 18px rgba(15,23,42,.18)' }}>
        <div style={{ fontSize: 13 }}>
          <strong>{profile?.name || meta.full_name || meta.username || user.email}</strong>
          {(profile?.club || meta.club) ? ` · ${profile?.club || meta.club}` : ''} {(profile?.country || meta.country) ? ` · ${profile?.country || meta.country}` : ''}
          {isSuperAdmin ? ' · Super Admin' : isAdmin ? ' · Administrador' : ''}
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          <button onClick={() => setShowAthleteRegistration(true)} style={{ border: '1px solid #16a34a', background: '#15803d', color: '#fff', borderRadius: 8, padding: '7px 10px', fontWeight: 700 }}>Cadastrar atleta</button>
          <button onClick={() => setShowTeamRegistration(true)} style={{ border: '1px solid #60a5fa', background: '#2563eb', color: '#fff', borderRadius: 8, padding: '7px 10px', fontWeight: 700 }}>Cadastrar Pares/Equipes</button>
          <AccountNotifications key={user.id} userId={user.id} role={profile?.role || 'user'}/>
          {isAdmin && <button onClick={() => { setAdminInitialTab('overview'); setShowAdmin(true); }} style={{ border: '1px solid #93c5fd', background: '#1d4ed8', color: '#fff', borderRadius: 8, padding: '7px 10px', fontWeight: 700 }}>Painel Admin</button>}
          <button onClick={() => setShowProfile(true)} style={{ border: '1px solid #94a3b8', background: '#334155', color: '#fff', borderRadius: 8, padding: '7px 10px', fontWeight: 700 }}>Meu perfil</button>
          <button onClick={() => supabase.auth.signOut()} style={{ border: '1px solid #475569', background: '#1e293b', color: '#fff', borderRadius: 8, padding: '7px 10px', fontWeight: 700 }}>Sair</button>
        </div>
      </div>
      <DataPanelContext.Provider key={user.id} value={dataHost}>{children}</DataPanelContext.Provider>
      {showAthleteRegistration && <AthleteRegistrationPanel user={user} onClose={() => setShowAthleteRegistration(false)} />}
      {showTeamRegistration && <TeamRegistrationPanel user={user} onClose={() => setShowTeamRegistration(false)} />}
      {showAdmin && isAdmin && <AdminPanel isSuperAdmin={isSuperAdmin} onDataHost={setDataHost} initialTab={adminInitialTab} onClose={() => setShowAdmin(false)} />}
      {showProfile && <ProfilePanel user={user} profile={profile} onSaved={loadProfile} onClose={() => setShowProfile(false)} />}
    </div>
  );
}
