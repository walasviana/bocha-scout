import React, { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const DIVISIONS = ['Equipe BC1/BC2', 'Par BC3', 'Par BC4'];
const ENTITY_TYPES = ['Pais', 'Clube'];
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: 9, fontSize: 14, background: '#fff' };
const button: React.CSSProperties = { border: 0, borderRadius: 9, padding: '10px 12px', fontWeight: 800, cursor: 'pointer' };

export default function TeamRegistrationPanel({ user, onClose }: { user: User; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', entityType: 'Clube', division: 'Equipe BC1/BC2', country: 'Brasil' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    if (!form.name.trim()) return setMessage('Informe o nome do país ou clube.');
    setBusy(true);
    const { error } = await supabase.from('boccia_team_entries').insert({
      name: form.name.trim().toLocaleUpperCase('pt-BR'),
      entity_type: form.entityType,
      division: form.division,
      country: form.country.trim() || null,
      created_by: user.id,
    });
    setBusy(false);
    if (error) {
      if (error.code === '23505') return setMessage('Esse país ou clube já está cadastrado nessa categoria.');
      return setMessage(error.message);
    }
    setMessage('Cadastro enviado para aprovação do administrador.');
    setForm({ name: '', entityType: 'Clube', division: 'Equipe BC1/BC2', country: 'Brasil' });
  }

  return <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(15,23,42,.55)', display: 'grid', placeItems: 'center', padding: 16, fontFamily: 'Arial, sans-serif' }}>
    <div style={{ background: '#fff', borderRadius: 15, padding: 18, width: 'min(560px,100%)', maxHeight: '90vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <div><h2 style={{ margin: 0 }}>Cadastrar Pares / Equipes</h2><div style={{ color: '#64748b', marginTop: 4 }}>O cadastro fica pendente até aprovação do administrador.</div></div>
        <button onClick={onClose} style={{ ...button, background: '#e2e8f0', color: '#0f172a' }}>Fechar</button>
      </div>
      <form onSubmit={submit} style={{ display: 'grid', gap: 10, marginTop: 16 }}>
        <input style={input} placeholder="Nome do país ou clube" value={form.name} onChange={e => setForm({ ...form, name: e.target.value.toLocaleUpperCase('pt-BR') })} />
        <select style={input} value={form.entityType} onChange={e => setForm({ ...form, entityType: e.target.value })}>{ENTITY_TYPES.map(x => <option key={x}>{x}</option>)}</select>
        <select style={input} value={form.division} onChange={e => setForm({ ...form, division: e.target.value })}>{DIVISIONS.map(x => <option key={x}>{x}</option>)}</select>
        <input style={input} placeholder="País" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
        {message && <div style={{ padding: 10, borderRadius: 8, background: message.includes('aprovação') ? '#ecfdf5' : '#fef2f2', color: message.includes('aprovação') ? '#166534' : '#991b1b' }}>{message}</div>}
        <button disabled={busy} style={{ ...button, background: '#2563eb', color: '#fff', fontSize: 15 }}>{busy ? 'Enviando...' : 'Enviar para aprovação'}</button>
      </form>
    </div>
  </div>;
}
