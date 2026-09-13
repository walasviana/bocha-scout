import { useState } from 'react';
import FoundationRadar from './FoundationRadar';
import { calcStats, regularEnds, formatDuration, participants } from '../lib/scoutData';
export default function PartialPerformance({plays, gameType, athlete, opponent, athleteColor, scoutMode, isHistory}: any) {
  const [filter, setFilter] = useState('Geral');
  const [comparisonOpen,setComparisonOpen]=useState(false);
  const ends = [...new Set<string>([...regularEnds(gameType), ...plays.map((p: any) => p.end)])];
  const groups=['Vermelho','Azul'].map(color=>({id:color,color,name:color===athleteColor?athlete:opponent,plays:plays.filter((p:any)=>p.color===color)}));
  return <section className="partial-performance">
    <h3>{isHistory ? 'Desempenho por parcial' : scoutMode === 'recorded' ? 'Desempenho da partida gravada' : 'Desempenho ao vivo'}</h3>
    <div className="partial-tabs end-filter" aria-label="Filtrar desempenho por parcial">
      {['Geral', ...ends].map(end => <button type="button" key={end} aria-pressed={filter === end} onClick={() => setFilter(end)}>{end}</button>)}
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
    {!isHistory&&<details className="live-foundation-comparison" onToggle={e=>setComparisonOpen(e.currentTarget.open)}>
      <summary>Comparar fundamentos <span>{filter} · vermelho e azul</span></summary>
      {comparisonOpen&&<FoundationRadar series={groups} gameType={gameType} selectedEnd={filter} hideFilters/>}
    </details>}
  </section>;
}
