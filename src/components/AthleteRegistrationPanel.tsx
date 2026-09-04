import React, { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const CLASSES = ['BC1', 'BC2', 'BC3', 'BC4'];
const GENDERS = ['Masculino', 'Feminino'];
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: 9, fontSize: 14, background: '#fff' };
const button: React.CSSProperties = { border: 0, borderRadius: 9, padding: '10px 12px', fontWeight: 800, cursor: 'pointer' };

export default function AthleteRegistrationPanel({ user, onClose }: { user: User; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', athleteClass: '', gender: '', country: 'Brasil', uf: '', observations: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    if (!form.name.trim() || !form.athleteClass) return setMessage('Informe o nome e a classe do atleta.');
    setBusy(true);
    const { error } = await supabase.from('athletes').insert({
      name: form.name.trim(),
      class: form.athleteClass,
      gender: form.gender || null,
      country: form.country.trim() || null,
      uf: form.uf.trim().toUpperCase() || null,
      observations: form.observations.trim() || null,
      created_by: user.id,
    });
    setBusy(false);
    if (error) return setMessage(error.message);
    setMessage('Atleta cadastrado com sucesso.');
    setForm({ name: '', athleteClass: '', gender: '', country: 'Brasil', uf: '', observations: '' });
  }

  return <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(15,23,42,.55)', display: 'grid', placeItems: 'center', padding: 16, fontFamily: 'Arial, sans-serif' }}>
    <div style={{ background: '#fff', borderRadius: 15, padding: 18, width: 'min(560px,100%)', maxHeight: '90vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}><div><h2 style={{ margin: 0 }}>Cadastrar atleta</h2><div style={{ color: '#64748b', marginTop: 4 }}>Contas comuns podem cadastrar atletas. Edição e exclusão ficam restritas ao administrador.</div></div><button onClick={() => { onClose(); if (message.includes('sucesso')) window.location.reload(); }} style={{ ...button, background: '#e2e8f0', color: '#0f172a' }}>Fechar</button></div>
      <form onSubmit={submit} style={{ display: 'grid', gap: 10, marginTop: 16 }}>
        <input style={input} placeholder="Nome completo do atleta" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <select style={input} value={form.athleteClass} onChange={e => setForm({ ...form, athleteClass: e.target.value })}><option value="">Selecione a classe</option>{CLASSES.map(x => <option key={x}>{x}</option>)}</select>
        <select style={input} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option value="">Gênero não informado</option>{GENDERS.map(x => <option key={x}>{x}</option>)}</select>
        <input style={input} placeholder="País" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
        <input style={input} placeholder="UF (opcional)" maxLength={2} value={form.uf} onChange={e => setForm({ ...form, uf: e.target.value })} />
        <textarea style={{ ...input, minHeight: 80 }} placeholder="Observações (opcional)" value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} />
        {message && <div style={{ padding: 10, borderRadius: 8, background: message.includes('sucesso') ? '#ecfdf5' : '#fef2f2', color: message.includes('sucesso') ? '#166534' : '#991b1b' }}>{message}</div>}
        <button disabled={busy} style={{ ...button, background: '#15803d', color: '#fff', fontSize: 15 }}>{busy ? 'Salvando...' : 'Cadastrar atleta'}</button>
      </form>
    </div>
  </div>;
}
