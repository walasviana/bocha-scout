import {useState} from 'react';
import FoundationRadar from './FoundationRadar';

export function comparisonAthletes(sessions:any[]){
 const result=new Map<string,{id:string;name:string;plays:any[]}>();
 const add=(id:string,name:string,plays:any[])=>{if(!id||!plays.length)return;const old=result.get(id);if(old)old.plays.push(...plays);else result.set(id,{id,name,plays:[...plays]});};
 for(const s of sessions){const plays=s.plays||[];if(s.gameType==='Individual'||!s.gameType){for(const color of ['Vermelho','Azul']){const home=color===s.athleteColor;const id=home?s.athleteId:s.opponentId;const name=home?s.athlete:s.opponent;add(id||`legacy:${s.ownerUserId}:${name}`,name,plays.filter((p:any)=>p.color===color));}}else {for(const id of new Set(plays.map((p:any)=>p.playerId).filter(Boolean))){const pp=plays.filter((p:any)=>p.playerId===id);add(String(id),pp[0].playerName||String(id),pp);}}}
 return [...result.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}

export default function AthleteComparison({sessions,standalone=false}:{sessions:any[];standalone?:boolean}){
 const [first,setFirst]=useState(''),[second,setSecond]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState('');
 if(!standalone)return null;
 const options=comparisonAthletes(sessions.filter(s=>(!from||s.date>=from)&&(!to||s.date<=to)));
 const selected=[options.find(a=>a.id===first),options.find(a=>a.id===second&&a.id!==first)].filter(Boolean);
 return <section className="comparison-panel comparison-standalone">
  <p>Selecione um atleta para visualizar seu desempenho ou dois atletas para comparar. Somente registros disponíveis nesta conta entram no comparador.</p>
  <div className="comparison-fields">
   <label>De<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
   <label>Até<input type="date" min={from} value={to} onChange={e=>setTo(e.target.value)}/></label>
   {[first,second].map((value,i)=><label key={i}>{i?'Comparar com (opcional)':'Atleta'}<select value={options.some(a=>a.id===value)?value:''} onChange={e=>i?setSecond(e.target.value):setFirst(e.target.value)}><option value="">{i?'Somente um atleta':'Selecione'}</option>{options.filter(a=>i===0||a.id!==first).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>)}
  </div>
  {selected.length>0?<FoundationRadar series={selected.map((a,i)=>({name:a!.name,plays:a!.plays,color:selected.length===1?'Roxo':i?'Amarelo':'Roxo'}))}/>:<div className="comparison-empty">Selecione um atleta com jogadas registradas no período.</div>}
 </section>;
}
