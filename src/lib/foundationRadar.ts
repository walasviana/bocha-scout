import {calcStats, sideName} from './scoutData';
export const foundations=['Saída de jogo','Aproximação','Tirar bola da ZP','Batida','Aérea','Mover branca','Dobrar bola',"Pingo d'água",'Bola de defesa','Tabela','Sobrepor','Empurrar bola na ZP','Falta'];
export type RadarSeries={name:string;color:string;plays:any[]};
export function matchSeries(session:any):RadarSeries[]{return ['Azul','Vermelho'].map(color=>({name:sideName(session,color)||color,color,plays:(session.plays||[]).filter((p:any)=>p.color===color)}));}
export function usedFoundations(series:RadarSeries[]){
 const used=new Set<string>(series.flatMap(s=>s.plays.filter(p=>['Acerto','Funcional','Erro'].includes(p.result)&&typeof p.play==='string'&&p.play.trim()).map(p=>p.play)));
 return [...foundations.filter(name=>used.has(name)),...Array.from(used).filter(name=>!foundations.includes(name)).sort((a,b)=>a.localeCompare(b,'pt-BR'))];
}
export function radarData(series:RadarSeries[], axes=usedFoundations(series)){return axes.map(name=>({name,values:series.map(s=>{const st=calcStats(s.plays.filter(p=>p.play===name));return {total:st.total,value:st.total?st.efficiency:null};})}));}
export const radarColor=(color:string)=>{
 const c=String(color||'').toLowerCase();
 if(c==='roxo'||c==='purple') return '#7c3aed';
 if(c==='amarelo'||c==='yellow') return '#eab308';
 if(c==='azul'||c==='blue') return '#1673e8';
 return '#e34250';
};
export function drawRadar(canvas:HTMLCanvasElement,series:RadarSeries[],axes=usedFoundations(series)){
 canvas.width=720;canvas.height=570;const ctx=canvas.getContext('2d');if(!ctx)return;
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,720,570);const cx=360,cy=282,r=180,n=axes.length;
 if(n===0){ctx.fillStyle='#60738c';ctx.textAlign='center';ctx.font='24px Arial';ctx.fillText('Sem fundamentos registrados',360,260);ctx.font='18px Arial';ctx.fillText('Selecione outra parcial ou período.',360,296);return;}
 if(n<3){
  const rows=radarData(series,axes);ctx.textAlign='left';
  rows.forEach((row,i)=>{const y=120+i*190;ctx.font='bold 23px Arial';ctx.fillStyle='#25426a';ctx.fillText(row.name,65,y,580);
   row.values.forEach((v,k)=>{const by=y+30+k*48;ctx.fillStyle='#edf2f8';ctx.fillRect(65,by,470,18);ctx.fillStyle=radarColor(series[k].color);if(v.value!==null){ctx.fillRect(65,by,470*v.value/100,18);ctx.beginPath();ctx.arc(65+470*v.value/100,by+9,5,0,Math.PI*2);ctx.fill();}ctx.font='20px Arial';ctx.fillText(v.value===null?'Sem dados':`${v.value.toFixed(0)}%`,550,by+16);});
  });ctx.font='18px Arial';ctx.fillStyle='#60738c';ctx.fillText('0%',65,500);ctx.textAlign='right';ctx.fillText('100%',535,500);ctx.textAlign='center';ctx.fillText('Com 1 ou 2 fundamentos, a comparação usa barras.',360,548);return;
 }
 const point=(i:number,v:number)=>({x:cx+Math.sin(i*2*Math.PI/n)*r*v,y:cy-Math.cos(i*2*Math.PI/n)*r*v});
 ctx.font='20px Arial';ctx.textAlign='center';ctx.lineWidth=1;
 for(const value of [.25,.5,.75,1]){ctx.beginPath();axes.forEach((_,i)=>{const p=point(i,value);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.closePath();ctx.strokeStyle='#dbe4ef';ctx.stroke();ctx.fillStyle='#60738c';ctx.fillText(`${value*100}%`,cx+23,cy-r*value+16);}
 axes.forEach((name,i)=>{const p=point(i,1),label=point(i,1.18);ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(p.x,p.y);ctx.strokeStyle='#dbe4ef';ctx.stroke();ctx.fillStyle='#25426a';ctx.textAlign=label.x>cx+15?'left':label.x<cx-15?'right':'center';const words=name.split(' '),lines:string[]=[];let line='';for(const word of words){if((line+' '+word).trim().length>16){lines.push(line);line=word;}else line=(line+' '+word).trim();}lines.push(line);lines.forEach((l,j)=>ctx.fillText(l,label.x,label.y+(j-(lines.length-1)/2)*19));});
 const rows=radarData(series,axes);
 series.forEach((s,k)=>{const values=rows.map(row=>row.values[k]);const valid=values.map((v,i)=>v.value===null?null:{i,value:v.value}).filter(Boolean) as {i:number;value:number}[];ctx.strokeStyle=radarColor(s.color);ctx.fillStyle=radarColor(s.color);ctx.lineWidth=4;ctx.setLineDash([]);
  if(valid.length>=2){ctx.beginPath();valid.forEach((v,index)=>{const p=point(v.i,v.value/100);index?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});if(valid.length>=3)ctx.closePath();if(valid.length>=3){ctx.globalAlpha=.1;ctx.fill();ctx.globalAlpha=1;}ctx.stroke();}
  ctx.setLineDash([]);values.forEach((v,i)=>{if(v.value===null)return;const p=point(i,v.value/100);ctx.beginPath();ctx.arc(p.x,p.y,k?6:4,0,Math.PI*2);if(k){ctx.stroke();}else ctx.fill();});
 });
 ctx.fillStyle='#60738c';ctx.textAlign='center';ctx.font='15px Arial';ctx.fillText('Sem ponto = sem dados · Centro = 0%',360,550);
}
