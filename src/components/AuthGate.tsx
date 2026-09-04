import React, { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import AdminPanel from './AdminPanel';
import AthleteRegistrationPanel from './AthleteRegistrationPanel';

const PROFILE_TYPES = ['Técnico', 'Atleta', 'Professor', 'Outro'];

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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAthleteRegistration, setShowAthleteRegistration] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', fullName: '', username: '', country: 'Brasil', club: '', roleType: 'Técnico',
  });

  async function loadProfile(nextUser: User | null) {
    if (!nextUser) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase.from('profiles').select('id,name,username,country,club,profile_type,role,is_blocked').eq('id', nextUser.id).maybeSingle();
    if (!error) setProfile(data || null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const nextUser = data.session?.user ?? null;
      setUser(nextUser);
      await loadProfile(nextUser);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      await loadProfile(nextUser);
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

  if (loading) return <div style={{ padding: 30, fontFamily: 'Arial, sans-serif' }}>Carregando Bocha Scout...</div>;

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: 20, fontFamily: 'Arial, sans-serif' }}>
        <div style={{ maxWidth: 480, margin: '30px auto', background: '#fff', borderRadius: 16, padding: 22, boxShadow: '0 10px 30px rgba(15,23,42,.08)' }}>
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
            </>}
            <input style={fieldStyle()} type="email" placeholder="E-mail" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input style={fieldStyle()} type="password" placeholder="Senha" minLength={6} required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            {message && <div style={{ padding: 10, borderRadius: 8, background: '#f8fafc', color: '#475569', fontSize: 14 }}>{message}</div>}
            <button disabled={busy} style={{ padding: 13, border: 0, borderRadius: 10, background: '#15803d', color: '#fff', fontSize: 16, fontWeight: 800 }}>
              {busy ? 'Aguarde...' : mode === 'login' ? 'Entrar no Bocha Scout' : 'Criar minha conta'}
            </button>
          </form>
          <p style={{ color: '#64748b', fontSize: 12, marginTop: 15 }}>O acesso fica salvo neste aparelho até você sair da conta.</p>
        </div>
      </div>
    );
  }

  if (profile?.is_blocked) {
    return <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'grid', placeItems: 'center', padding: 20, fontFamily: 'Arial, sans-serif' }}><div style={{ background: '#fff', padding: 24, borderRadius: 16, maxWidth: 520 }}><h2>Acesso bloqueado</h2><p>Esta conta foi bloqueada pelo administrador do Bocha Scout.</p><button onClick={() => supabase.auth.signOut()} style={{ border: 0, borderRadius: 9, background: '#0f172a', color: '#fff', padding: '10px 14px', fontWeight: 800 }}>Sair</button></div></div>;
  }

  const meta = user.user_metadata || {};
  const isAdmin = profile?.role === 'admin';

  return (
    <div>
      <div style={{ background: '#0f172a', color: '#fff', padding: '8px 14px', fontFamily: 'Arial, sans-serif', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13 }}>
          <strong>{profile?.name || meta.full_name || meta.username || user.email}</strong>
          {(profile?.club || meta.club) ? ` · ${profile?.club || meta.club}` : ''} {(profile?.country || meta.country) ? ` · ${profile?.country || meta.country}` : ''}
          {isAdmin ? ' · Administrador' : ''}
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          <button onClick={() => setShowAthleteRegistration(true)} style={{ border: '1px solid #16a34a', background: '#15803d', color: '#fff', borderRadius: 8, padding: '7px 10px', fontWeight: 700 }}>Cadastrar atleta</button>
          {isAdmin && <button onClick={() => setShowAdmin(true)} style={{ border: '1px solid #93c5fd', background: '#1d4ed8', color: '#fff', borderRadius: 8, padding: '7px 10px', fontWeight: 700 }}>Painel Admin</button>}
          <button onClick={() => supabase.auth.signOut()} style={{ border: '1px solid #475569', background: '#1e293b', color: '#fff', borderRadius: 8, padding: '7px 10px', fontWeight: 700 }}>Sair</button>
        </div>
      </div>
      {children}
      {showAthleteRegistration && <AthleteRegistrationPanel user={user} onClose={() => setShowAthleteRegistration(false)} />}
      {showAdmin && isAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </div>
  );
}
