import {calcStats, durationOf, formatDuration, modeLabel, playName, positionLabel, sessionEnds, sideName, participants} from './scoutData';
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
  text('RELATÓRIO TÉCNICO DA PARTIDA',W-26,27,13,true,[255,255,255],'right');
  text(`${session.date || 'Data não informada'} · ${session.sessionKind || ''} · ${session.gameType || ''} · ${modeLabel(session)}`,W-26,46,8,false,[184,200,218],'right');
  text(`Conta: ${session.ownerDisplay || 'Conta responsável'}`,W-26,64,8,false,[184,200,218],'right');
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
    text(score ? `${session.athleteColor==='Vermelho'?a:o} - ${session.athleteColor==='Azul'?a:o}`:'—',x,153,9,true,navy,'center');
    text(`V ${rs.total?rs.efficiency.toFixed(0)+'%':'—'} · A ${bs.total?bs.efficiency.toFixed(0)+'%':'—'}`,x,168,7,false,navy,'center');
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
    section('FUNDAMENTOS UTILIZADOS',x,304,cw,tone);
    const names=[...new Set<string>(plays.map((p:any)=>p.play))];
    names.forEach((name,i)=>{const st=calcStats(plays.filter((p:any)=>p.play===name)),y=341+i*16;
      text(name,x+9,y,7.5);text(`${st.total}x · ${st.acertos}A / ${st.funcionais}F / ${st.erros}E · ${st.efficiency.toFixed(0)}%`,x+cw-9,y,7.5,true,muted,'right');
    });
  });
  text('Acerto = 100%, Funcional = 50%, Erro = 0%. Tempo ausente não entra na média. Histórico completo nas próximas páginas.',26,H-18,7,false,muted);
  const groups=participants(session);
  const individualGroups=session.gameType!=='Individual' && groups.some(g=>g.plays.some(p=>p.playerId));
  if(individualGroups) {
    for(let offset=0;offset<groups.length;offset+=2) {
      doc.addPage();section('ATLETAS · DESEMPENHO POR PARCIAL',26,24,W-52);
      groups.slice(offset,offset+2).forEach((g,i)=>{
        const x=26+i*(cw+gap),tone=g.color==='Vermelho'?red:blue,st=calcStats(g.plays);
        text(fit(g.name,cw-18,11).slice(0,2).join('\n'),x+9,66,11,true,tone);
        text(`${g.color} · Eficiência ${st.efficiency.toFixed(1)}% · ${st.total} jogadas`,x+9,98,9,true);
        text(`Acerto ${st.acertos} (${st.total?(st.acertos/st.total*100).toFixed(1):0}%) · Funcional ${st.funcionais} (${st.total?(st.funcionais/st.total*100).toFixed(1):0}%) · Erro ${st.erros} (${st.total?(st.erros/st.total*100).toFixed(1):0}%)`,x+9,115,8);
        text(`Tempo médio: ${formatDuration(st.averageDurationMs)}`,x+9,132,8);
        ends.forEach((end,j)=>{const es=calcStats(g.plays.filter(p=>p.end===end));text(`${end}: ${es.total?es.efficiency.toFixed(1)+'%':'—'} · ${es.total} jogadas`,x+9,154+j*14,8);});
        const fy=170+ends.length*14;
        section('FUNDAMENTOS DO ATLETA',x,fy,cw,tone);
        [...new Set<string>(g.plays.map(p=>p.play))].forEach((name,j)=>{const ps=calcStats(g.plays.filter(p=>p.play===name));text(`${name} · ${ps.total}x · ${ps.efficiency.toFixed(1)}%`,x+9,fy+38+j*15,8);});
      });
    }
  }
  let y=0;
  const widths=[32,66,151,42,139,67,190,100];
  const cols=['Nº','Parcial','Atleta / lado','Bola','Fundamento','Resultado','Posição da branca','Tempo'];
  const newHistoryPage=()=>{doc.addPage();section('HISTÓRICO COMPLETO DA PARTIDA',26,24,W-52);y=66;let x=26;cols.forEach((c,i)=>{text(c,x+4,y,8,true);x+=widths[i];});y+=18;};
  newHistoryPage();
  (session.plays||[]).forEach((p:any,i:number)=>{
    const values=[String(i+1),p.end,`${playName(session,p)} · ${p.color}`,p.ball,p.play,p.result,positionLabel(p),formatDuration(durationOf(p))];
    const lines=values.map((v,i)=>fit(v,widths[i]-8,8));
    const height=Math.max(...lines.map(l=>l.length))*10+10;
    if(y+height>H-30)newHistoryPage();
    let x=26;lines.forEach((l,i)=>{text(l.join('\n'),x+4,y,8);x+=widths[i];});
    y+=height;doc.setDrawColor(225,232,240);doc.line(26,y-7,W-26,y-7);
  });
  if(!session.plays?.length)text('Nenhuma jogada registrada.',30,y);
  const maps=individualGroups ? groups.map(g=>({name:g.name,color:g.color,data:positionStats(g.plays)})) : ['Vermelho','Azul'].map(color=>({name:sideName(session,color),color,data:positionStats((session.plays||[]).filter((p:any)=>p.color===color))}));
  for(let i=0;i<maps.length;i+=2)appendHeatmapReport(doc,maps.slice(i,i+2));
  for(let i=1;i<=doc.getNumberOfPages();i++){doc.setPage(i);text(`${i} / ${doc.getNumberOfPages()}`,W-26,H-8,6,false,muted,'right');}
  return doc;
}
