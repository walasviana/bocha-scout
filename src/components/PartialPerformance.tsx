import { CaretDown, ChartBar, Target, User } from '@phosphor-icons/react';
import { useState } from 'react';
import FoundationRadar from './FoundationRadar';
import { calcStats, regularEnds, formatDuration } from '../lib/scoutData';

export default function PartialPerformance({plays, gameType, athlete, opponent, athleteColor, scoutMode, isHistory}: any) {
  const [filter, setFilter] = useState('Geral');
  const [comparisonOpen,setComparisonOpen]=useState(false);
  const ends = [...new Set<string>([...regularEnds(gameType), ...plays.map((p: any) => p.end)])];
  const groups=['Vermelho','Azul'].map(color=>({id:color,color,name:color===athleteColor?athlete:opponent,plays:plays.filter((p:any)=>p.color===color)}));
  const isLive = !isHistory && scoutMode !== 'recorded';
  const title = isHistory ? 'Desempenho por parcial' : scoutMode === 'recorded' ? 'Desempenho da partida gravada' : 'Desempenho ao vivo';

  return <section className={`partial-performance${isLive ? ' is-live-performance' : ''}`}>
    <div className="performance-toolbar">
      <h3><ChartBar weight="fill" aria-hidden="true" /><span className="performance-title">{title}</span></h3>
      <div className="partial-tabs end-filter" aria-label="Filtrar desempenho por parcial">
        {['Geral', ...ends].map(end => <button type="button" key={end} aria-pressed={filter === end} onClick={() => setFilter(end)}>{end}</button>)}
      </div>
      {!isHistory && plays.length > 0 && <button type="button" className="performance-details-toggle" aria-expanded={comparisonOpen} onClick={()=>setComparisonOpen(open=>!open)}>Ver detalhes <CaretDown aria-hidden="true" weight="bold" /></button>}
    </div>

    <div className="partial-sides">{groups.map(group => {
      const s = calcStats(filter==='Geral'?group.plays:group.plays.filter((p:any)=>p.end===filter));
      return <article className={`performance-athlete performance-${group.color === "Vermelho" ? "red" : "blue"}`} key={group.id} style={{borderTop: `4px solid ${group.color === 'Vermelho' ? '#ff172c' : '#0075ff'}`}}>
        <header className="performance-athlete-heading"><div><strong>{group.name}</strong><small>{group.color} · {filter}</small></div><User weight="fill" aria-hidden="true" /></header>
        <div className="performance-kpis">
          <div className="performance-kpi performance-kpi-precision"><Target aria-hidden="true"/><span>Precisão</span><b>{s.total ? s.accuracy.toFixed(0)+'%' : '—'}</b></div>
          <div className="performance-kpi performance-kpi-efficiency"><ChartBar weight="fill" aria-hidden="true"/><span>Eficiência</span><b>{s.total ? s.efficiency.toFixed(0)+'%' : '—'}</b></div>
        </div>
        <div className="performance-results"><div><b>{s.acertos}</b><span>Acerto</span></div><div><b>{s.funcionais}</b><span>Funcional</span></div><div><b>{s.erros}</b><span>Erro</span></div></div>
        {s.timedPlays > 0 && <span className="performance-duration">Tempo médio: {formatDuration(s.averageDurationMs)}{s.timedPlays ? ' ('+s.timedPlays+' jogadas)' : ''}</span>}
      </article>;
    })}</div>

    {!isHistory && comparisonOpen && <div className="live-foundation-comparison is-open">
      <FoundationRadar series={groups} gameType={gameType} selectedEnd={filter} hideFilters/>
    </div>}
  </section>;
}
