import {CorrectionPreview} from './AccountNotifications';
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
// PATCH: notification-bell-admin-v22
// PATCH: admin-ui-review-v20
// PATCH: admin-teams-uppercase-v14
// PATCH: admin-approval-v15
// PATCH: super-admin-panel-v17
// PATCH: scout-approval-notifications-v18

const CLASSES = ['BC1', 'BC2', 'BC3', 'BC4'];
const GENDERS = ['Masculino', 'Feminino'];
const TEAM_DIVISIONS = ['Equipe BC1/BC2', 'Par BC3', 'Par BC4'];
const TEAM_ENTITY_TYPES = ['Pais', 'Clube'];

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 18, boxShadow: '0 8px 24px rgba(15,23,42,.06)' };
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', minHeight: 44, border: '1px solid #cbd5e1', borderRadius: 11, fontSize: 14, background: '#fff' };
const button: React.CSSProperties = { border: 0, borderRadius: 10, padding: '9px 12px', minHeight: 40, fontWeight: 800, cursor: 'pointer' };

function fmt(value?: string | null) {
  if (!value) return '-';
  try { return new Date(value).toLocaleString('pt-BR'); } catch { return value; }
}

export default function AdminPanel({ onClose, initialTab = 'overview',isSuperAdmin=false,onDataHost }: { onClose: () => void; initialTab?: 'overview' | 'notifications';isSuperAdmin?:boolean;onDataHost:(el:HTMLDivElement|null)=>void }) {
  const [tab, setTab] = useState<'overview' | 'accounts' | 'athletes' | 'teams' | 'notifications' | 'audit' | 'data'>(initialTab);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [teamEntries, setTeamEntries] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [teamDivisionFilter, setTeamDivisionFilter] = useState('Todos');
  const [teamTypeFilter, setTeamTypeFilter] = useState('Todos');
  const [teamForm, setTeamForm] = useState({ name: '', entity_type: 'Pais', division: 'Equipe BC1/BC2', country: '' });
  const [editingTeam, setEditingTeam] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('Todos');
  const [genderFilter, setGenderFilter] = useState('Todos');
  const [editing, setEditing] = useState<any | null>(null);

  async function loadAll() {
    setLoading(true);
    setMessage('');
    try {
      const [statsRes, usersRes, athletesRes, teamRes, notificationsRes, auditRes] = await Promise.all([
        supabase.rpc('admin_stats'),
        supabase.rpc('admin_list_users'),
        supabase.from('athletes').select('id,name,class,gender,country,uf,observations,created_by,created_at,updated_at,approval_status').order('name'),
        supabase.from('boccia_team_entries').select('id,name,entity_type,division,country,created_by,created_at,updated_at,approval_status').order('division').order('name'),
        supabase.from('admin_notifications').select('id,source_type,source_id,requester_id,title,message,status,created_at,resolved_at,resolved_by,change_data').order('created_at', { ascending: false }),
        supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100),
      ]);
      if (statsRes.error) throw statsRes.error;
      if (usersRes.error) throw usersRes.error;
      if (athletesRes.error) throw athletesRes.error;
      if (teamRes.error) throw teamRes.error;
      if (notificationsRes.error) throw notificationsRes.error;
      if (auditRes.error) throw auditRes.error;
      setStats(statsRes.data?.[0] || {});
      setUsers(usersRes.data || []);
      setAthletes(athletesRes.data || []);
      setTeamEntries(teamRes.data || []);
      setNotifications(notificationsRes.data || []);
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
    return (q.length > 0 || classFilter !== 'Todos' || genderFilter !== 'Todos') && matchesText && matchesClass && matchesGender;
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
      new_name: editing.name.trim().toLocaleUpperCase('pt-BR'),
      new_class: editing.class,
      new_gender: editing.gender || null,
      new_country: editing.country || null,
      new_uf: editing.uf || null,
      new_observations: editing.observations || null,
    });
    if (error) return setMessage(error.message);
    setEditing(null);
    window.dispatchEvent(new Event('boccia-catalog-updated'));
    await loadAll();
    setMessage(isSuperAdmin ? 'Dados do atleta atualizados.' : 'Correção enviada para aprovação do Super Admin.');
  }

  async function setAthleteApproval(athlete: any, status: 'approved' | 'rejected') {
    const { error } = await supabase.rpc('admin_set_athlete_approval', { target_athlete_id: athlete.id, new_status: status });
    if (error) return setMessage(error.message);
    await loadAll();
  }

  async function deleteAthlete(athlete: any) {
    if (!window.confirm(`Excluir definitivamente o atleta ${athlete.name}?`)) return;
    const { error } = await supabase.rpc('admin_delete_athlete', { target_athlete_id: athlete.id });
    if (error) return setMessage(error.message);
    await loadAll();
  }

  const visibleTeamEntries = useMemo(() => teamEntries.filter(item => {
    const q = teamSearch.trim().toLowerCase();
    const textOk = !q || [item.name, item.country, item.division, item.entity_type].some(v => String(v || '').toLowerCase().includes(q));
    const divisionOk = teamDivisionFilter === 'Todos' || item.division === teamDivisionFilter;
    const typeOk = teamTypeFilter === 'Todos' || item.entity_type === teamTypeFilter;
    return textOk && divisionOk && typeOk;
  }), [teamEntries, teamSearch, teamDivisionFilter, teamTypeFilter]);

  async function addTeamEntry() {
    if (!teamForm.name.trim()) return setMessage('Informe o nome do país ou clube.');
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase.from('boccia_team_entries').insert({
      name: teamForm.name.trim().toLocaleUpperCase('pt-BR'),
      entity_type: teamForm.entity_type,
      division: teamForm.division,
      country: teamForm.country.trim() || null,
      created_by: authData.user?.id || null,
    });
    if (error) return setMessage(error.message);
    setTeamForm({ name: '', entity_type: 'Pais', division: 'Equipe BC1/BC2', country: '' });
    await loadAll();
  }

  async function saveTeamEntry() {
    if (!editingTeam?.name?.trim()) return setMessage('Informe o nome do país ou clube.');
    const { error } = await supabase.from('boccia_team_entries').update({
      name: editingTeam.name.trim().toLocaleUpperCase('pt-BR'),
      entity_type: editingTeam.entity_type,
      division: editingTeam.division,
      country: editingTeam.country?.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', editingTeam.id);
    if (error) return setMessage(error.message);
    setEditingTeam(null);
    await loadAll();
  }

  async function setTeamApproval(item: any, status: 'approved' | 'rejected') {
    const { error } = await supabase.rpc('admin_set_team_entry_approval', { target_entry_id: item.id, new_status: status });
    if (error) return setMessage(error.message);
    await loadAll();
  }

  const pendingNotifications = notifications.filter(n => n.status === 'pending' && (n.source_type !== 'athlete_edit' || isSuperAdmin));

  async function resolveNotification(item: any, status: 'approved' | 'rejected') {
    let error: any = null;
    if (item.source_type === 'athlete_edit') {
      ({error}=await supabase.rpc('resolve_athlete_correction',{notification_id:item.id,new_status:status}));
    } else if (item.source_type === 'athlete') {
      ({ error } = await supabase.rpc('admin_set_athlete_approval', { target_athlete_id: item.source_id, new_status: status }));
    } else if (item.source_type === 'team_entry') {
      ({ error } = await supabase.rpc('admin_set_team_entry_approval', { target_entry_id: item.source_id, new_status: status }));
    } else if (item.source_type === 'scout') {
      ({ error } = await supabase.rpc('admin_set_scout_approval', { target_session_id: item.source_id, new_status: status }));
    }
    if (error) return setMessage(error.message);
    window.dispatchEvent(new Event('boccia-catalog-updated'));
    await loadAll();
  }

  async function deleteTeamEntry(item: any) {
    if (!window.confirm(`Excluir definitivamente ${item.name} de ${item.division}?`)) return;
    const { error } = await supabase.from('boccia_team_entries').delete().eq('id', item.id);
    if (error) return setMessage(error.message);
    await loadAll();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'linear-gradient(180deg,#f8fafc 0%,#eef2f6 100%)', overflowY: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 18 }}>
        <div style={{ ...card, background: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div><div style={{ fontSize: 25, fontWeight: 900 }}>Painel do Administrador</div><div style={{ color: '#cbd5e1', marginTop: 4 }}>Contas, atletas e auditoria do Bocha Scout</div></div>
          <button onClick={() => { onClose(); }} style={{ ...button, background: '#fff', color: '#0f172a' }}>Fechar</button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', overflowX: 'auto', position: 'sticky', top: 8, zIndex: 20, background: 'rgba(248,250,252,.95)', backdropFilter: 'blur(10px)', padding: 8, borderRadius: 14, margin: '14px 0', boxShadow: '0 6px 18px rgba(15,23,42,.06)' }}>
          {[['overview','Visão geral'],['accounts','Contas'],['athletes','Atletas'],['teams','Pares/Equipes'],['audit','Auditoria'],['notifications','Notificações'],...(isSuperAdmin ? [['data','Dados']] : [])].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id as any)} style={{ ...button, background: tab === id ? '#0f172a' : '#cbd5e1', color: tab === id ? '#fff' : '#0f172a' }}>{label}</button>
          ))}
          <button onClick={loadAll} style={{ ...button, background: '#15803d', color: '#fff' }}>Atualizar</button>
        </div>

        {tab === 'data' && isSuperAdmin && <div ref={onDataHost}/>}
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
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{u.role === 'super_admin' ? 'Super Admin' : u.role === 'admin' ? 'Administrador' : 'Usuário'}<div style={{ fontSize: 12, color: '#64748b' }}>{u.profile_type || '-'}</div></td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{fmt(u.created_at)}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{fmt(u.last_sign_in_at)}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{u.athlete_count || 0}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{u.is_blocked ? 'Bloqueada' : 'Ativa'}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {u.role === 'super_admin' ? <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Conta protegida</span> : <>
                <button onClick={() => changeBlock(u)} style={{ ...button, background: u.is_blocked ? '#15803d' : '#f59e0b', color: '#fff' }}>{u.is_blocked ? 'Desbloquear' : 'Bloquear'}</button>
                <button onClick={() => changeRole(u)} style={{ ...button, background: '#475569', color: '#fff' }}>{u.role === 'admin' ? 'Tornar usuário' : 'Tornar admin'}</button>
                <button onClick={() => deleteUser(u)} style={{ ...button, background: '#b91c1c', color: '#fff' }}>Excluir</button>
                </>}
              </div></td>
            </tr>)}</tbody>
          </table></div>
        </div>}

        {!loading && tab === 'athletes' && <div style={card}>
          <h2 style={{ marginTop: 0 }}>Atletas</h2><p>Busque um nome ou escolha classe/gênero para listar atletas. Mostrando até 50 resultados; refine os filtros se necessário.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8, marginBottom: 12 }}>
            <input placeholder="Buscar nome, país, UF ou conta" value={search} onChange={e => setSearch(e.target.value)} style={input} />
            <select value={classFilter} onChange={e => setClassFilter(e.target.value)} style={input}><option>Todos</option>{CLASSES.map(x => <option key={x}>{x}</option>)}</select>
            <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)} style={input}><option>Todos</option>{GENDERS.map(x => <option key={x}>{x}</option>)}</select>
          </div>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead><tr>{['Atleta','Classe','Gênero','País/UF','Cadastrado por','Status','Ações'].map(x => <th key={x} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid #cbd5e1' }}>{x}</th>)}</tr></thead>
            <tbody>{visibleAthletes.slice(0,50).map(a => <tr key={a.id}>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}><strong>{a.name}</strong></td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{a.class}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{a.gender || '-'}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{a.country || '-'}{a.uf ? `/${a.uf}` : ''}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{a.created_by ? ownerById[a.created_by] || 'Conta' : 'Base oficial'}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{a.approval_status === 'pending' ? 'Pendente' : a.approval_status === 'rejected' ? 'Rejeitado' : 'Aprovado'}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{a.approval_status === 'pending' && <><button onClick={() => setAthleteApproval(a, 'approved')} style={{ ...button, background: '#15803d', color: '#fff' }}>Aprovar</button><button onClick={() => setAthleteApproval(a, 'rejected')} style={{ ...button, background: '#f59e0b', color: '#fff' }}>Rejeitar</button></>}<button onClick={() => setEditing({ ...a })} style={{ ...button, background: '#2563eb', color: '#fff' }}>Editar</button><button onClick={() => deleteAthlete(a)} style={{ ...button, background: '#b91c1c', color: '#fff' }}>Excluir</button></div></td>
            </tr>)}</tbody>
          </table></div>
        </div>}

        {!loading && tab === 'teams' && <div style={card}>
          <h2 style={{ marginTop: 0 }}>Pares / Equipes</h2>
          <p style={{ color: '#64748b', marginTop: -4 }}>Gerencie países e clubes disponíveis em Equipe BC1/BC2, Par BC3 e Par BC4.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 8, marginBottom: 12 }}>
            <input placeholder="Nome do país ou clube" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value.toLocaleUpperCase('pt-BR') })} style={input} />
            <select value={teamForm.entity_type} onChange={e => setTeamForm({ ...teamForm, entity_type: e.target.value })} style={input}>{TEAM_ENTITY_TYPES.map(x => <option key={x}>{x}</option>)}</select>
            <select value={teamForm.division} onChange={e => setTeamForm({ ...teamForm, division: e.target.value })} style={input}>{TEAM_DIVISIONS.map(x => <option key={x}>{x}</option>)}</select>
            <input placeholder="País (opcional para clube)" value={teamForm.country} onChange={e => setTeamForm({ ...teamForm, country: e.target.value })} style={input} />
            <button onClick={addTeamEntry} style={{ ...button, background: '#15803d', color: '#fff' }}>Adicionar</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8, marginBottom: 12 }}>
            <input placeholder="Buscar nome, país ou divisão" value={teamSearch} onChange={e => setTeamSearch(e.target.value)} style={input} />
            <select value={teamDivisionFilter} onChange={e => setTeamDivisionFilter(e.target.value)} style={input}><option>Todos</option>{TEAM_DIVISIONS.map(x => <option key={x}>{x}</option>)}</select>
            <select value={teamTypeFilter} onChange={e => setTeamTypeFilter(e.target.value)} style={input}><option>Todos</option>{TEAM_ENTITY_TYPES.map(x => <option key={x}>{x}</option>)}</select>
          </div>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead><tr>{['Nome','Tipo','Divisão','País','Status','Ações'].map(x => <th key={x} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid #cbd5e1' }}>{x}</th>)}</tr></thead>
            <tbody>{visibleTeamEntries.map(item => <tr key={item.id}>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}><strong>{item.name}</strong></td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{item.entity_type}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{item.division}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{item.country || '-'}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{item.approval_status === 'pending' ? 'Pendente' : item.approval_status === 'rejected' ? 'Rejeitado' : 'Aprovado'}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{item.approval_status === 'pending' && <><button onClick={() => setTeamApproval(item, 'approved')} style={{ ...button, background: '#15803d', color: '#fff' }}>Aprovar</button><button onClick={() => setTeamApproval(item, 'rejected')} style={{ ...button, background: '#f59e0b', color: '#fff' }}>Rejeitar</button></>}<button onClick={() => setEditingTeam({ ...item })} style={{ ...button, background: '#2563eb', color: '#fff' }}>Editar</button><button onClick={() => deleteTeamEntry(item)} style={{ ...button, background: '#b91c1c', color: '#fff' }}>Excluir</button></div></td>
            </tr>)}</tbody>
          </table></div>
        </div>}

        {!loading && tab === 'notifications' && <div style={card}>
          <h2 style={{ marginTop: 0 }}>Notificações e aprovações</h2>
          <p style={{ color: '#64748b' }}>Pedidos de atletas, pares/equipes e Scouts enviados por contas comuns.</p>
          {pendingNotifications.length === 0 ? <p>Nenhum pedido pendente.</p> : pendingNotifications.map(item => <div key={item.id} style={{ padding: '12px 0', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <strong>{item.title}</strong><CorrectionPreview data={item.change_data}/>
              <div style={{ color: '#475569', marginTop: 3 }}>{item.message || '-'}</div>
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>Solicitado por: {ownerById[item.requester_id] || 'Conta'} · {fmt(item.created_at)}</div>
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              <button onClick={() => resolveNotification(item, 'approved')} style={{ ...button, background: '#15803d', color: '#fff' }}>Aprovar</button>
              <button onClick={() => resolveNotification(item, 'rejected')} style={{ ...button, background: '#b91c1c', color: '#fff' }}>Rejeitar</button>
            </div>
          </div>)}
        </div>}

        {!loading && tab === 'audit' && <div style={card}>
          <h2 style={{ marginTop: 0 }}>Auditoria</h2>
          {audit.length === 0 ? <p>Nenhuma alteração administrativa registrada ainda.</p> : audit.map(item => <div key={item.id} style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}><strong>{item.action}</strong> · {item.entity_type} <span style={{ color: '#64748b' }}>· {fmt(item.created_at)}</span><div style={{ fontSize: 12, color: '#64748b' }}>{item.entity_id || ''}</div></div>)}
        </div>}
      </div>

      {editingTeam && <div style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(15,23,42,.55)', display: 'grid', placeItems: 'center', padding: 16 }}>
        <div style={{ ...card, width: 'min(560px,100%)' }}>
          <h2 style={{ marginTop: 0 }}>Editar país / clube</h2>
          <div style={{ display: 'grid', gap: 9 }}>
            <input value={editingTeam.name || ''} onChange={e => setEditingTeam({ ...editingTeam, name: e.target.value.toLocaleUpperCase('pt-BR') })} style={input} placeholder="Nome" />
            <select value={editingTeam.entity_type || 'Pais'} onChange={e => setEditingTeam({ ...editingTeam, entity_type: e.target.value })} style={input}>{TEAM_ENTITY_TYPES.map(x => <option key={x}>{x}</option>)}</select>
            <select value={editingTeam.division || 'Equipe BC1/BC2'} onChange={e => setEditingTeam({ ...editingTeam, division: e.target.value })} style={input}>{TEAM_DIVISIONS.map(x => <option key={x}>{x}</option>)}</select>
            <input value={editingTeam.country || ''} onChange={e => setEditingTeam({ ...editingTeam, country: e.target.value })} style={input} placeholder="País" />
            <div style={{ display: 'flex', gap: 8 }}><button onClick={saveTeamEntry} style={{ ...button, background: '#15803d', color: '#fff', flex: 1 }}>Salvar alterações</button><button onClick={() => setEditingTeam(null)} style={{ ...button, background: '#cbd5e1', color: '#0f172a', flex: 1 }}>Cancelar</button></div>
          </div>
        </div>
      </div>}

      {editing && <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15,23,42,.55)', display: 'grid', placeItems: 'center', padding: 16 }}>
        <div style={{ ...card, width: 'min(560px,100%)' }}>
          <h2 style={{ marginTop: 0 }}>Editar atleta</h2><p>{isSuperAdmin ? "As alterações serão aplicadas ao salvar." : "As alterações serão enviadas ao Super Admin para aprovação."}</p>
          <div style={{ display: 'grid', gap: 9 }}>
            <input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value.toLocaleUpperCase('pt-BR') })} style={input} placeholder="Nome" />
            <select value={editing.class || ''} onChange={e => setEditing({ ...editing, class: e.target.value })} style={input}>{CLASSES.map(x => <option key={x}>{x}</option>)}</select>
            <select value={editing.gender || ''} onChange={e => setEditing({ ...editing, gender: e.target.value })} style={input}><option value="">Gênero não informado</option>{GENDERS.map(x => <option key={x}>{x}</option>)}</select>
            <input value={editing.country || ''} onChange={e => setEditing({ ...editing, country: e.target.value })} style={input} placeholder="País" />
            <input value={editing.uf || ''} onChange={e => setEditing({ ...editing, uf: e.target.value })} style={input} placeholder="UF" />
            <textarea value={editing.observations || ''} onChange={e => setEditing({ ...editing, observations: e.target.value })} style={{ ...input, minHeight: 80 }} placeholder="Observações" />
            <div style={{ display: 'flex', gap: 8 }}><button onClick={saveAthlete} style={{ ...button, background: '#15803d', color: '#fff', flex: 1 }}>{isSuperAdmin ? "Salvar alterações" : "Enviar para aprovação"}</button><button onClick={() => setEditing(null)} style={{ ...button, background: '#cbd5e1', color: '#0f172a', flex: 1 }}>Cancelar</button></div>
          </div>
        </div>
      </div>}
    </div>
  );
}
