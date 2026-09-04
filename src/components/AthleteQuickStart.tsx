import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

type Athlete = {
  id: string;
  name: string;
  class: string;
  country: string | null;
  uf: string | null;
};

type Props = {
  onContinue: () => void;
};

const CLASSES = ['BC1', 'BC2', 'BC3', 'BC4'];
const LOCAL_ATHLETES_KEY = 'bochaScout.athletes.v1';

function normalize(value: string | null | undefined) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function AthleteQuickStart({ onContinue }: Props) {
  const [mode, setMode] = useState<'national' | 'international'>('national');
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [athleteClass, setAthleteClass] = useState('');
  const [country, setCountry] = useState('');
  const [uf, setUf] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const [{ data: athleteData, error: athleteError }, { data: authData }] = await Promise.all([
        supabase.from('athletes').select('id,name,class,country,uf').order('name'),
        supabase.auth.getUser(),
      ]);

      if (!active) return;
      if (athleteError) {
        setMessage('Não foi possível carregar os atletas.');
        setLoading(false);
        return;
      }
      setAthletes((athleteData || []) as Athlete[]);

      const user = authData.user;
      if (user) {
        const { data: favData } = await supabase
          .from('user_favorite_athletes')
          .select('athlete_id')
          .eq('user_id', user.id);
        if (active) setFavorites(new Set((favData || []).map((x: any) => x.athlete_id)));
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setCountry('');
    setUf('');
  }, [mode]);

  const countries = useMemo(() => Array.from(new Set(athletes.map(a => a.country).filter(Boolean) as string[])).sort(), [athletes]);
  const ufs = useMemo(() => Array.from(new Set(athletes.filter(a => normalize(a.country) === 'brasil').map(a => a.uf).filter(Boolean) as string[])).sort(), [athletes]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return athletes
      .filter(a => mode === 'international' || normalize(a.country) === 'brasil')
      .filter(a => !q || normalize(a.name).includes(q))
      .filter(a => !athleteClass || a.class === athleteClass)
      .filter(a => mode !== 'international' || !country || a.country === country)
      .filter(a => mode !== 'national' || !uf || a.uf === uf)
      .sort((a, b) => {
        const favDiff = Number(favorites.has(b.id)) - Number(favorites.has(a.id));
        return favDiff || a.name.localeCompare(b.name, 'pt-BR');
      });
  }, [athletes, favorites, mode, query, athleteClass, country, uf]);

  async function toggleFavorite(athleteId: string) {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;

    const next = new Set(favorites);
    if (next.has(athleteId)) {
      const { error } = await supabase.from('user_favorite_athletes').delete().eq('user_id', user.id).eq('athlete_id', athleteId);
      if (!error) next.delete(athleteId);
    } else {
      const { error } = await supabase.from('user_favorite_athletes').insert({ user_id: user.id, athlete_id: athleteId });
      if (!error) next.add(athleteId);
    }
    setFavorites(next);
  }

  function chooseAthlete(a: Athlete) {
    let saved: any[] = [];
    try { saved = JSON.parse(localStorage.getItem(LOCAL_ATHLETES_KEY) || '[]'); } catch { saved = []; }
    const localAthlete = {
      id: a.id,
      name: a.name,
      athleteClass: a.class,
      observations: [a.country, a.uf].filter(Boolean).join(' · '),
      country: a.country,
      uf: a.uf,
    };
    const without = saved.filter(x => x.id !== a.id);
    localStorage.setItem(LOCAL_ATHLETES_KEY, JSON.stringify([localAthlete, ...without]));
    localStorage.setItem('bochaScout.quickStartAthleteId', a.id);
    onContinue();
  }

  return (
    <div style={{ maxWidth: 760, margin: '24px auto', padding: 16, fontFamily: 'Arial, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 18, boxShadow: '0 8px 28px rgba(15,23,42,.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0 }}>🔍 Buscar atleta</h2>
            <div style={{ color: '#64748b', marginTop: 4 }}>Escolha o atleta antes de iniciar o scout.</div>
          </div>
          <button onClick={onContinue} style={{ border: 0, borderRadius: 10, padding: '10px 12px', background: '#64748b', color: '#fff', fontWeight: 700 }}>Ir direto ao Bocha Scout</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18 }}>
          <button onClick={() => setMode('national')} style={{ padding: 12, border: 0, borderRadius: 10, fontWeight: 800, background: mode === 'national' ? '#15803d' : '#e2e8f0', color: mode === 'national' ? '#fff' : '#0f172a' }}>Nacional</button>
          <button onClick={() => setMode('international')} style={{ padding: 12, border: 0, borderRadius: 10, fontWeight: 800, background: mode === 'international' ? '#2563eb' : '#e2e8f0', color: mode === 'international' ? '#fff' : '#0f172a' }}>Internacional</button>
        </div>

        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="🔍 Digite o nome do atleta" style={{ width: '100%', boxSizing: 'border-box', marginTop: 12, padding: '12px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 16 }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8, marginTop: 8 }}>
          <select value={athleteClass} onChange={e => setAthleteClass(e.target.value)} style={{ padding: 11, borderRadius: 10, border: '1px solid #cbd5e1' }}>
            <option value="">Todas as classes</option>
            {CLASSES.map(c => <option key={c}>{c}</option>)}
          </select>
          {mode === 'national' ? (
            <select value={uf} onChange={e => setUf(e.target.value)} style={{ padding: 11, borderRadius: 10, border: '1px solid #cbd5e1' }}>
              <option value="">Todos os estados</option>
              {ufs.map(x => <option key={x}>{x}</option>)}
            </select>
          ) : (
            <select value={country} onChange={e => setCountry(e.target.value)} style={{ padding: 11, borderRadius: 10, border: '1px solid #cbd5e1' }}>
              <option value="">Todos os países</option>
              {countries.map(x => <option key={x}>{x}</option>)}
            </select>
          )}
        </div>

        {message && <div style={{ marginTop: 12, padding: 10, background: '#fef2f2', borderRadius: 8 }}>{message}</div>}
        {loading ? <p>Carregando atletas...</p> : (
          <div style={{ marginTop: 12, maxHeight: '55vh', overflowY: 'auto' }}>
            <div style={{ color: '#64748b', fontSize: 13, marginBottom: 6 }}>{filtered.length} atleta(s)</div>
            {filtered.slice(0, 150).map(a => (
              <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '42px 1fr auto', gap: 8, alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid #e2e8f0' }}>
                <button aria-label="Favoritar atleta" onClick={() => toggleFavorite(a.id)} style={{ border: 0, background: 'transparent', fontSize: 24, cursor: 'pointer' }}>{favorites.has(a.id) ? '⭐' : '☆'}</button>
                <button onClick={() => chooseAthlete(a)} style={{ textAlign: 'left', border: 0, background: 'transparent', padding: 0, cursor: 'pointer' }}>
                  <strong>{a.name}</strong>
                  <div style={{ color: '#64748b', fontSize: 13 }}>{a.class} · {a.country || 'País não informado'}{a.uf ? ` · ${a.uf}` : ''}</div>
                </button>
                <button onClick={() => chooseAthlete(a)} style={{ border: 0, borderRadius: 8, padding: '8px 10px', background: '#0f172a', color: '#fff', fontWeight: 700 }}>Selecionar</button>
              </div>
            ))}
            {filtered.length > 150 && <div style={{ padding: 12, color: '#64748b', fontSize: 13 }}>Refine a busca para ver mais resultados.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
