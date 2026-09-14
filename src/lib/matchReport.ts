import {drawRadar,matchSeries,usedFoundations} from './foundationRadar';
import {calcStats, formatDuration, modeLabel, sessionEnds, sideName, participants} from './scoutData';
import {appendHeatmapReport} from './courtHeatmap';

/** One report renderer for saved sessions and the match just completed. */
export async function createMatchReport(session: any, positionStats: (plays:any[])=>any) {
  const {jsPDF} = await import('jspdf');
  const doc = new jsPDF({unit:'pt',format:'a4',orientation:'landscape'});
  const W=doc.internal.pageSize.getWidth(), H=doc.internal.pageSize.getHeight();
  const navy=[6,45,84], muted=[96,116,142], red=[239,65,72], blue=[22,128,244];
  const text=(value:any,x:number,y:number,size=9,bold=false,color=navy,align:any='left')=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(color[0],color[1],color[2]);doc.text(String(value??''),x,y,{align});};
  const fit=(value:any,width:number,size=9)=>{doc.setFontSize(size);return doc.splitTextToSize(String(value??''),width);};
  const section=(label:string,x:number,y:number,w:number,color=navy)=>{doc.setFillColor(color[0],color[1],color[2]);doc.roundedRect(x,y,w,22,5,5,'F');text(label,x+9,y+15,9,true,[255,255,255]);};
  doc.setFillColor(6,45,84);doc.rect(0,0,W,78,'F');
  text('BOCHA',26,31,23,true,[255,255,255]);text('SCOUT',112,31,23,true,[250,204,21]);
  text('RELATÓRIO TÉCNICO DA PARTIDA',W-26,24,13,true,[255,255,255],'right');
  text(session.competitionName ? `PARTIDA · ${session.competitionName}` : 'PARTIDA',W-26,42,10,true,[255,255,255],'right');
  text(`${session.date || 'Data não informada'} · ${session.sessionKind || ''} · ${session.gameType || ''} · ${modeLabel(session)}`,W-26,57,7,false,[184,200,218],'right');
  text(`Conta: ${session.ownerDisplay || 'Conta responsável'}${session.competitionPhase ? ` · Fase: ${session.competitionPhase}` : ''}`,W-26,70,7,false,[184,200,218],'right');
  doc.setFillColor(244,247,250);doc.roundedRect(26,90,W-52,99,12,12,'F');
  const redName=sideName(session,'Vermelho'),blueName=sideName(session,'Azul');
  text(fit(redName,260,10).slice(0,2).join('\n'),48,110,10,true,red);
  text(fit(blueName,260,10).slice(0,2).join('\n'),W-48,110,10,true,blue,'right');
  const redScore=session.athleteColor==='Vermelho'?session.totalAthlete:session.totalOpponent;
  const blueScore=session.athleteColor==='Azul'?session.totalAthlete:session.totalOpponent;
  text(`${redScore ?? 0}`,W/2-25,120,26,true,red,'right');text('×',W/2,120,20,false,muted,'center');text(`${blueScore ?? 0}`,W/2+25,120,26,true,blue);
  // Each score and both efficiency percentages share a column.
  const ends=sessionEnds(session);
  const cell=(W-96)/Math.max(1,ends.length);
  ends.forEach((end,i)=>{
    const x=48+cell*(i+.5), score=session.scores?.[end];
    const rs=calcStats((session.plays||[]).filter((p:any)=>p.end===end&&p.color==='Vermelho'));
    const bs=calcStats((session.plays||[]).filter((p:any)=>p.end===end&&p.color==='Azul'));
    text(end.replace('End ','E').replace('Tie-Break','TB'),x,139,7,true,muted,'center');
    const a=score?.athlete,o=score?.opponent;
    text(score ? session.athleteColor==='Vermelho'?a:o : '—',x-9,153,9,true,red,'right');text('×',x,153,8,false,muted,'center');text(score ? session.athleteColor==='Azul'?a:o : '—',x+9,153,9,true,blue);
    text(rs.total?rs.efficiency.toFixed(0)+'%':'—',x-6,168,7,true,red,'right');text(bs.total?bs.efficiency.toFixed(0)+'%':'—',x+6,168,7,true,blue);
  });
  text('Eficiência por parcial · V = vermelho · A = azul · — = sem jogadas',W/2,182,6,false,muted,'center');
  const gap=12,cw=(W-52-gap)/2;
  ['Vermelho','Azul'].forEach((color,index)=>{
    const x=26+index*(cw+gap),tone=index?blue:red;
    const plays=(session.plays||[]).filter((p:any)=>p.color===color),s=calcStats(plays);
    section(color,x,201,cw,tone);
    text(`Eficiência ${s.efficiency.toFixed(1)}% · Precisão ${s.accuracy.toFixed(1)}% · ${s.total} jogadas`,x+9,239,9,true);
    const counts=[['Acerto',s.acertos],['Funcional',s.funcionais],['Erro',s.erros]];
    counts.forEach(([label,count],i)=>{const cx=x+9+i*(cw-18)/3;text(label,cx,258,8,true);text(`${count} · ${s.total?(Number(count)/s.total*100).toFixed(1):'0.0'}%`,cx,273,10);});
    text(`Tempo médio: ${formatDuration(s.averageDurationMs)} · ${s.timedPlays} medições`,x+9,291,8,false,muted);
  });
  section('FUNDAMENTOS · COMPARAÇÃO',26,304,W-52);
  const radarSides=matchSeries(session);
  const radarAxes=usedFoundations(radarSides);
  const addRadar=(series:any[],x:number,y:number,w:number)=>{const c=document.createElement('canvas');drawRadar(c,series,radarAxes);doc.addImage(c.toDataURL('image/png'),'PNG',x,y,w,w*570/720);};
  text(fit(redName,190,8).slice(0,2).join(' '),130,342,8,true,red,'center');text('Vermelho × Azul',W/2,342,9,true,navy,'center');text(fit(blueName,190,8).slice(0,2).join(' '),W-130,342,8,true,blue,'center');
  addRadar([radarSides[0]],26,355,215);addRadar(radarSides,W/2-140,342,280);addRadar([radarSides[1]],W-241,355,215);
  text('Acerto = 100%, Funcional = 50%, Erro = 0%. Tempo ausente não entra na média. Histórico de jogadas disponível no aplicativo.',26,H-18,7,false,muted);
  const maps=matchSeries(session).map(g=>({name:g.name,color:g.color,data:positionStats(g.plays)}));
  for(let i=0;i<maps.length;i+=2)appendHeatmapReport(doc,maps.slice(i,i+2));
  for(let i=1;i<=doc.getNumberOfPages();i++){doc.setPage(i);text(`${i} / ${doc.getNumberOfPages()}`,W-26,H-8,6,false,muted,'right');}
  return doc;
}
