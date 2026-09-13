import {useEffect,useRef,useState} from 'react';
import {drawRadar,radarData,foundations,radarColor,type RadarSeries} from '../lib/foundationRadar';
import {regularEnds} from '../lib/scoutData';
export default function FoundationRadar({series,gameType}:{series:RadarSeries[];gameType?:string}){
 const canvas=useRef<HTMLCanvasElement>(null),[end,setEnd]=useState('Geral');
 const visible=series.map(s=>({...s,plays:end==='Geral'?s.plays:s.plays.filter(p=>p.end===end)}));
 useEffect(()=>{if(canvas.current)drawRadar(canvas.current,visible);},[series,end]);
 return <section className="foundation-radar"><h3>Fundamentos · desempenho</h3>
 {gameType&&<div className="partial-tabs end-filter">{['Geral',...new Set([...regularEnds(gameType),...series.flatMap(s=>s.plays.map(p=>p.end)).filter(Boolean)])].map(e=><button key={e} aria-pressed={end===e} onClick={()=>setEnd(e)}>{e}</button>)}</div>}
 <div className="radar-legend">{series.map((s,i)=><span key={i} style={{color:radarColor(s.color)}}><b>{i?'◯':'●'} {s.name}</b></span>)}</div>
 <canvas ref={canvas} role="img" aria-label="Radar de fundamentos, escala de 0 a 100%. Valores disponíveis em Detalhes do gráfico."/>
 <p>Acerto 100% · Funcional 50% · Erro 0%. Ausência de ponto significa sem dados.</p>
 <details><summary>Detalhes do gráfico</summary><div className="radar-values">{radarData(visible,foundations).map(row=><div key={row.name}><strong>{row.name}</strong>{row.values.map((v,i)=><span key={i} style={{color:radarColor(series[i].color)}}>{series[i].name}: {v.value===null?'sem dados':`${v.value.toFixed(1)}% · ${v.total} jogadas`}</span>)}</div>)}</div></details>
 </section>;
}
