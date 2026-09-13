import { useState } from 'react';
import { calcStats, regularEnds, formatDuration, participants } from '../lib/scoutData';
export default function PartialPerformance({plays, gameType, athlete, opponent, athleteColor, scoutMode, isHistory}: any) {
  const [filter, setFilter] = useState('Geral');
  const ends = [...new Set<string>([...regularEnds(gameType), ...plays.map((p: any) => p.end)])];
  const groups=participants({plays,athlete,opponent,athleteColor});
  return <section className="partial-performance">
    <h3>{isHistory ? 'Desempenho por parcial' : scoutMode === 'recorded' ? 'Desempenho da partida gravada' : 'Desempenho ao vivo'}</h3>
    <div className="partial-tabs" aria-label="Filtrar desempenho por parcial">
      {['Geral', ...ends].map(end => <button type="button" key={end} aria-pressed={filter === end} onClick={() => setFilter(end)}>{end.replace('End ', '')}{end.startsWith('End ') ? 'ª' : ''}</button>)}
    </div>
    <div className="partial-sides">{groups.map(group => {
      const s = calcStats(filter==='Geral'?group.plays:group.plays.filter(p=>p.end===filter));
      return <article key={group.id} style={{borderTop: `4px solid ${group.color === 'Vermelho' ? '#dc2626' : '#2563eb'}`}}>
        <strong>{group.name}</strong><small>{group.color} · {filter.replace('End ', 'Parcial ')}</small>
        <b>{s.total ? `${s.efficiency.toFixed(1)}%` : '—'} <small>eficiência</small></b>
        <span>{s.total ? `${s.accuracy.toFixed(1)}%` : '—'} precisão · {s.total} jogadas</span>
        <span>{s.acertos} Acerto · {s.funcionais} Funcional · {s.erros} Erro</span>
        <span>Tempo médio: {formatDuration(s.averageDurationMs)}{s.timedPlays ? ` (${s.timedPlays} jogadas)` : ''}</span>
      </article>;
    })}</div>
  </section>;
}
