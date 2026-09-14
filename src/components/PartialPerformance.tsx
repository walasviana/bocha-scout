import { ChartBar, Target, User } from '@phosphor-icons/react';
import { useState } from 'react';
import FoundationRadar from './FoundationRadar';
import { calcStats, regularEnds, formatDuration, participants } from '../lib/scoutData';
export default function PartialPerformance({plays, gameType, athlete, opponent, athleteColor, scoutMode, isHistory}: any) {
  const [filter, setFilter] = useState('Geral');
  const [comparisonOpen,setComparisonOpen]=useState(false);
  const ends = [...new Set<string>([...regularEnds(gameType), ...plays.map((p: any) => p.end)])];
  const groups=['Vermelho','Azul'].map(color=>({id:color,color,name:color===athleteColor?athlete:opponent,plays:plays.filter((p:any)=>p.color===color)}));
  return <section className="partial-performance">
    <h3><ChartBar weight="fill" aria-hidden="true" />{isHistory ? 'Desempenho por parcial' : scoutMode === 'recorded' ? 'Desempenho da partida gravada' : 'Desempenho ao vivo'}</h3>
    <div className="partial-tabs end-filter" aria-label="Filtrar desempenho por parcial">
      {['Geral', ...ends].map(end => <button type="button" key={end} aria-pressed={filter === end} onClick={() => setFilter(end)}>{end}</button>)}
    </div>
    <div className="partial-sides">{groups.map(group => {
      const s = calcStats(filter==='Geral'?group.plays:group.plays.filter(p=>p.end===filter));
      return <article className={`performance-athlete performance-${group.color === "Vermelho" ? "red" : "blue"}`} key={group.id} style={{borderTop: `4px solid ${group.color === 'Vermelho' ? '#dc2626' : '#2563eb'}`}}>
        <header className="performance-athlete-heading"><div><strong>{group.name}</strong><small>{group.color} · {filter}</small></div><User weight="fill" aria-hidden="true" /></header>
        <div className="performance-metric"><Target aria-hidden="true"/><strong>Eficiência</strong><b>{s.total ? s.efficiency.toFixed(1)+'%' : '—'}</b></div>
        <div className="performance-metric"><ChartBar weight="fill" aria-hidden="true"/><strong>Precisão</strong><span>{s.total ? s.accuracy.toFixed(1)+'% · ' : ''}{s.total} jogadas</span></div>
        <div className="performance-results"><div><b>{s.acertos}</b><span>Acerto</span></div><div><b>{s.funcionais}</b><span>Funcional</span></div><div><b>{s.erros}</b><span>Erro</span></div></div>
        <span className="performance-duration">Tempo médio: {formatDuration(s.averageDurationMs)}{s.timedPlays ? ' ('+s.timedPlays+' jogadas)' : ''}</span>
      </article>;
    })}</div>
    {!isHistory&&<details className="live-foundation-comparison" onToggle={e=>setComparisonOpen(e.currentTarget.open)}>
      <summary>Comparar fundamentos <span>{filter} · vermelho e azul</span></summary>
      {comparisonOpen&&<FoundationRadar series={groups} gameType={gameType} selectedEnd={filter} hideFilters/>}
    </details>}
  </section>;
}
