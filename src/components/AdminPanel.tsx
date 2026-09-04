import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const CLASSES = ['BC1', 'BC2', 'BC3', 'BC4'];
const GENDERS = ['Masculino', 'Feminino'];

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16 };
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 9, fontSize: 14, background: '#fff' };
const button: React.CSSProperties = { border: 0, borderRadius: 9, padding: '9px 11px', fontWeight: 800, cursor: 'pointer' };

function fmt(value?: string | null) {
  if (!value) return '-';
  try { return new Date(value).toLocaleString('pt-BR'); } catch { return value; }
}

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'overview' | 'accounts' | 'athletes' | 'audit'>('overview');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('Todos');
  const [genderFilter, setGenderFilter] = useState('Todos');
  const [editing, setEditing] = useState<any | null>(null);

  async function loadAll() {
    setLoading(true);
    setMessage('');
    try {
      const [statsRes, usersRes, athletesRes, auditRes] = await Promise.all([
        supabase.rpc('admin_stats'),
        supabase.rpc('admin_list_users'),
        supabase.from('athletes').select('id,name,class,gender,country,uf,observations,created_by,created_at,updated_at').order('name'),
        supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100),
      ]);
      if (statsRes.error) throw statsRes.error;
      if (usersRes.error) throw usersRes.error;
      if (athletesRes.error) throw athletesRes.error;
      if (auditRes.error) throw auditRes.error;
      setStats(statsRes.data?.[0] || {});
      setUsers(usersRes.data || []);
      setAthletes(athletesRes.data || []);
      setAudit(auditRes.data || []);
    } catch (err: any) {
      setMessage(err?.message || 'Não foi possível carregar o painel administrativo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  const ownerById = useMemo(() => Object.fromEntries(users.map(u => [u.id, u.email || u.name || u.username || 'Conta'])), [users]);
  const visibleAthletes = useMemo(() => athletes.filter(a => {
    const q = search.trim().toLowerCase();
    const matchesText = !q || [a.name, a.country, a.uf, ownerById[a.created_by]].some(v => String(v || '').toLowerCase().includes(q));
    const matchesClass = classFilter === 'Todos' || a.class === classFilter;
    const matchesGender = genderFilter === 'Todos' || a.gender === genderFilter;
    return matchesText && matchesClass && matchesGender;
  }), [athletes, search, classFilter, genderFilter, ownerById]);

  async function changeBlock(user: any) {
    const { error } = await supabase.rpc('admin_set_user_blocked', { target_user_id: user.id, blocked: !user.is_blocked });
    if (error) return setMessage(error.message);
    await loadAll();
  }

  async function changeRole(user: any) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Alterar ${user.email || user.name} para ${newRole === 'admin' ? 'Administrador' : 'Usuário'}?`)) return;
    const { error } = await supabase.rpc('admin_set_user_role', { target_user_id: user.id, new_role: newRole });
    if (error) return setMessage(error.message);
    await loadAll();
  }

  async function deleteUser(user: any) {
    if (!window.confirm(`Excluir definitivamente a conta ${user.email || user.name}?`)) return;
    const { error } = await supabase.rpc('admin_delete_user', { target_user_id: user.id });
    if (error) return setMessage(error.message);
    await loadAll();
  }

  async function saveAthlete() {
    if (!editing?.name?.trim() || !editing?.class) return setMessage('Nome e classe são obrigatórios.');
    const { error } = await supabase.rpc('admin_update_athlete', {
      target_athlete_id: editing.id,
      new_name: editing.name.trim(),
      new_class: editing.class,
      new_gender: editing.gender || null,
      new_country: editing.country || null,
      new_uf: editing.uf || null,
      new_observations: editing.observations || null,
    });
    if (error) return setMessage(error.message);
    setEditing(null);
    await loadAll();
  }

  async function deleteAthlete(athlete: any) {
    if (!window.confirm(`Excluir definitivamente o atleta ${athlete.name}?`)) return;
    const { error } = await supabase.rpc('admin_delete_athlete', { target_athlete_id: athlete.id });
    if (error) return setMessage(error.message);
    await loadAll();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#f1f5f9', overflowY: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: 18 }}>
        <div style={{ ...card, background: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div><div style={{ fontSize: 25, fontWeight: 900 }}>Painel do Administrador</div><div style={{ color: '#cbd5e1', marginTop: 4 }}>Contas, atletas e auditoria do Bocha Scout</div></div>
          <button onClick={() => { onClose(); window.location.reload(); }} style={{ ...button, background: '#fff', color: '#0f172a' }}>Fechar e atualizar</button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0' }}>
          {[['overview','Visão geral'],['accounts','Contas'],['athletes','Atletas'],['audit','Auditoria']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id as any)} style={{ ...button, background: tab === id ? '#0f172a' : '#cbd5e1', color: tab === id ? '#fff' : '#0f172a' }}>{label}</button>
          ))}
          <button onClick={loadAll} style={{ ...button, background: '#15803d', color: '#fff' }}>Atualizar</button>
        </div>

        {message && <div style={{ ...card, borderColor: '#fecaca', background: '#fef2f2', color: '#991b1b', marginBottom: 12 }}>{message}</div>}
        {loading ? <div style={card}>Carregando...</div> : null}

        {!loading && tab === 'overview' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
          <div style={card}><div style={{ color: '#64748b' }}>Contas cadastradas</div><div style={{ fontSize: 34, fontWeight: 900 }}>{stats.total_accounts ?? 0}</div></div>
          <div style={card}><div style={{ color: '#64748b' }}>Contas ativas</div><div style={{ fontSize: 34, fontWeight: 900 }}>{stats.active_accounts ?? 0}</div></div>
          <div style={card}><div style={{ color: '#64748b' }}>Contas bloqueadas</div><div style={{ fontSize: 34, fontWeight: 900 }}>{stats.blocked_accounts ?? 0}</div></div>
          <div style={card}><div style={{ color: '#64748b' }}>Atletas cadastrados</div><div style={{ fontSize: 34, fontWeight: 900 }}>{stats.total_athletes ?? 0}</div></div>
        </div>}

        {!loading && tab === 'accounts' && <div style={card}>
          <h2 style={{ marginTop: 0 }}>Contas</h2>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead><tr>{['Conta','Perfil','Criada em','Último acesso','Atletas','Status','Ações'].map(x => <th key={x} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid #cbd5e1' }}>{x}</th>)}</tr></thead>
            <tbody>{users.map(u => <tr key={u.id}>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}><strong>{u.name || u.username || '-'}</strong><div style={{ color: '#64748b', fontSize: 12 }}>{u.email}</div></td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{u.role === 'admin' ? 'Administrador' : 'Usuário'}<div style={{ fontSize: 12, color: '#64748b' }}>{u.profile_type || '-'}</div></td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{fmt(u.created_at)}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{fmt(u.last_sign_in_at)}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{u.athlete_count || 0}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{u.is_blocked ? 'Bloqueada' : 'Ativa'}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={() => changeBlock(u)} style={{ ...button, background: u.is_blocked ? '#15803d' : '#f59e0b', color: '#fff' }}>{u.is_blocked ? 'Desbloquear' : 'Bloquear'}</button>
                <button onClick={() => changeRole(u)} style={{ ...button, background: '#475569', color: '#fff' }}>{u.role === 'admin' ? 'Tornar usuário' : 'Tornar admin'}</button>
                <button onClick={() => deleteUser(u)} style={{ ...button, background: '#b91c1c', color: '#fff' }}>Excluir</button>
              </div></td>
            </tr>)}</tbody>
          </table></div>
        </div>}

        {!loading && tab === 'athletes' && <div style={card}>
          <h2 style={{ marginTop: 0 }}>Atletas</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            <input placeholder="Buscar nome, país, UF ou conta" value={search} onChange={e => setSearch(e.target.value)} style={input} />
            <select value={classFilter} onChange={e => setClassFilter(e.target.value)} style={input}><option>Todos</option>{CLASSES.map(x => <option key={x}>{x}</option>)}</select>
            <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)} style={input}><option>Todos</option>{GENDERS.map(x => <option key={x}>{x}</option>)}</select>
          </div>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead><tr>{['Atleta','Classe','Gênero','País/UF','Cadastrado por','Ações'].map(x => <th key={x} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid #cbd5e1' }}>{x}</th>)}</tr></thead>
            <tbody>{visibleAthletes.map(a => <tr key={a.id}>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}><strong>{a.name}</strong></td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{a.class}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{a.gender || '-'}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{a.country || '-'}{a.uf ? `/${a.uf}` : ''}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{a.created_by ? ownerById[a.created_by] || 'Conta' : 'Base oficial'}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}><div style={{ display: 'flex', gap: 6 }}><button onClick={() => setEditing({ ...a })} style={{ ...button, background: '#2563eb', color: '#fff' }}>Editar</button><button onClick={() => deleteAthlete(a)} style={{ ...button, background: '#b91c1c', color: '#fff' }}>Excluir</button></div></td>
            </tr>)}</tbody>
          </table></div>
        </div>}

        {!loading && tab === 'audit' && <div style={card}>
          <h2 style={{ marginTop: 0 }}>Auditoria</h2>
          {audit.length === 0 ? <p>Nenhuma alteração administrativa registrada ainda.</p> : audit.map(item => <div key={item.id} style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}><strong>{item.action}</strong> · {item.entity_type} <span style={{ color: '#64748b' }}>· {fmt(item.created_at)}</span><div style={{ fontSize: 12, color: '#64748b' }}>{item.entity_id || ''}</div></div>)}
        </div>}
      </div>

      {editing && <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15,23,42,.55)', display: 'grid', placeItems: 'center', padding: 16 }}>
        <div style={{ ...card, width: 'min(560px,100%)' }}>
          <h2 style={{ marginTop: 0 }}>Editar atleta</h2>
          <div style={{ display: 'grid', gap: 9 }}>
            <input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} style={input} placeholder="Nome" />
            <select value={editing.class || ''} onChange={e => setEditing({ ...editing, class: e.target.value })} style={input}>{CLASSES.map(x => <option key={x}>{x}</option>)}</select>
            <select value={editing.gender || ''} onChange={e => setEditing({ ...editing, gender: e.target.value })} style={input}><option value="">Gênero não informado</option>{GENDERS.map(x => <option key={x}>{x}</option>)}</select>
            <input value={editing.country || ''} onChange={e => setEditing({ ...editing, country: e.target.value })} style={input} placeholder="País" />
            <input value={editing.uf || ''} onChange={e => setEditing({ ...editing, uf: e.target.value })} style={input} placeholder="UF" />
            <textarea value={editing.observations || ''} onChange={e => setEditing({ ...editing, observations: e.target.value })} style={{ ...input, minHeight: 80 }} placeholder="Observações" />
            <div style={{ display: 'flex', gap: 8 }}><button onClick={saveAthlete} style={{ ...button, background: '#15803d', color: '#fff', flex: 1 }}>Salvar alterações</button><button onClick={() => setEditing(null)} style={{ ...button, background: '#cbd5e1', color: '#0f172a', flex: 1 }}>Cancelar</button></div>
          </div>
        </div>
      </div>}
    </div>
  );
}
