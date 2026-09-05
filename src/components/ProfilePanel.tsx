import React, { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const PROFILE_TYPES = ['Técnico', 'Atleta', 'Professor', 'Outro'];
const field: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 16, boxSizing: 'border-box' };

export default function ProfilePanel({ user, profile, onSaved, onClose }: { user: User; profile: any; onSaved: (user: User) => Promise<void>; onClose: () => void }) {
  const label = profile?.profile_type === 'tecnico' ? 'Técnico' : profile?.profile_type === 'atleta' ? 'Atleta' : profile?.profile_type === 'professor' ? 'Professor' : 'Outro';
  const [form, setForm] = useState({ name: profile?.name || '', country: profile?.country || 'Brasil', uf: profile?.uf || '', club: profile?.club || '', profileType: label });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('');
    const normalizedType = form.profileType === 'Técnico' ? 'tecnico' : form.profileType.toLowerCase();
    const { error } = await supabase.rpc('update_own_profile', {
      new_name: form.name.trim(), new_country: form.country.trim(), new_uf: form.uf.trim(), new_club: form.club.trim(), new_profile_type: normalizedType,
    });
    if (error) setMessage(error.message);
    else { await onSaved(user); setMessage('Dados atualizados com sucesso.'); }
    setBusy(false);
  }

  return <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.7)', zIndex: 10000, padding: 18, overflowY: 'auto' }}>
    <form onSubmit={save} style={{ maxWidth: 520, margin: '35px auto', background: '#fff', borderRadius: 16, padding: 22, display: 'grid', gap: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><h2 style={{ margin: 0 }}>Editar meu perfil</h2><button type="button" onClick={onClose}>Fechar</button></div>
      <input style={field} placeholder="Nome completo" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      <input style={field} placeholder="País" required value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
      <input style={field} placeholder="Estado (UF)" maxLength={2} value={form.uf} onChange={e => setForm({ ...form, uf: e.target.value.toUpperCase() })} />
      <input style={field} placeholder="Clube ou instituição" value={form.club} onChange={e => setForm({ ...form, club: e.target.value })} />
      <select style={field} value={form.profileType} onChange={e => setForm({ ...form, profileType: e.target.value })}>{PROFILE_TYPES.map(x => <option key={x}>{x}</option>)}</select>
      {message && <div style={{ padding: 10, borderRadius: 8, background: '#f1f5f9', color: '#334155' }}>{message}</div>}
      <button disabled={busy} style={{ padding: 13, border: 0, borderRadius: 10, background: '#15803d', color: '#fff', fontWeight: 800 }}>{busy ? 'Salvando...' : 'Salvar alterações'}</button>
    </form>
  </div>;
}
