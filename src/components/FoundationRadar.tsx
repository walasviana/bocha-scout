import {useEffect,useMemo,useRef,useState} from 'react';
import {drawRadar,radarData,usedFoundations,radarColor,type RadarSeries} from '../lib/foundationRadar';
import {regularEnds} from '../lib/scoutData';
import './FoundationRadar.css';
type Props={series:RadarSeries[];gameType?:string;selectedEnd?:string;hideFilters?:boolean};
export default function FoundationRadar({series,gameType,selectedEnd,hideFilters=false}:Props){
 const canvas=useRef<HTMLCanvasElement>(null),[localEnd,setEnd]=useState('Geral');
 const end=selectedEnd??localEnd;
 const visible=useMemo(()=>series.map(s=>({...s,plays:end==='Geral'?s.plays:s.plays.filter(p=>p.end===end)})),[series,end]);
 const axes=useMemo(()=>usedFoundations(visible),[visible]);
 const rows=useMemo(()=>radarData(visible,axes),[visible,axes]);
 useEffect(()=>{if(canvas.current)drawRadar(canvas.current,visible,axes);},[visible,axes]);
 return <section className="foundation-radar foundation-radar-panel" aria-label="Análise de fundamentos">
 <header className="radar-heading"><div><span className="radar-eyebrow">{series.length>1?'COMPARAÇÃO':'ANÁLISE'} · {end}</span><h3>Fundamentos em jogo</h3></div><span className="radar-count">{axes.length} {axes.length===1?'fundamento':'fundamentos'}</span></header>
 {gameType&&!hideFilters&&selectedEnd===undefined&&<div className="partial-tabs end-filter" aria-label="Parcial dos fundamentos">{['Geral',...new Set([...regularEnds(gameType),...series.flatMap(s=>s.plays.map(p=>p.end)).filter(Boolean)])].map(e=><button type="button" key={e} aria-pressed={end===e} onClick={()=>setEnd(e)}>{e}</button>)}</div>}
 <div className="radar-series-list">{visible.map((s,i)=>{const total=rows.reduce((sum,row)=>sum+row.values[i].total,0);return <div className="radar-series-card" key={`${s.name}-${i}`} style={{borderTopColor:radarColor(s.color)}}><strong style={{color:radarColor(s.color)}}>{s.name}</strong><span>{total} {total===1?'jogada':'jogadas'} · {i?'Pontos vazados':'Pontos preenchidos'}</span></div>;})}</div>
 {axes.length>0?<><div className="radar-chart-surface"><canvas ref={canvas} role="img" aria-label={`${axes.length<3?'Comparação em barras':'Radar de fundamentos'}, ${end}, escala de 0 a 100%.`}/></div>
 <p className="radar-help">Somente fundamentos utilizados na seleção atual. Sem ponto significa <strong>sem dados</strong>, não 0%.</p>
 <div className="radar-accessible-values" aria-label="Dados do gráfico">{rows.map(row=><div key={row.name}><strong>{row.name}</strong>{row.values.map((v,i)=><span key={i} style={{color:radarColor(series[i].color)}}>{series[i].name}: <b>{v.value===null?'sem dados':`${v.value.toFixed(1)}%`}</b>{v.value!==null&&` · ${v.total} ${v.total===1?'jogada':'jogadas'}`}</span>)}</div>)}</div></>:<div className="radar-empty"><strong>Nenhum fundamento registrado</strong><p>Os fundamentos aparecerão aqui conforme as jogadas forem registradas. Você também pode consultar outra parcial ou período.</p></div>}
 <div className="radar-scoring" aria-label="Cálculo de desempenho"><span>Acerto <b>100%</b></span><span>Funcional <b>50%</b></span><span>Erro <b>0%</b></span></div>
 </section>;
}
