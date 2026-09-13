import {calcStats, sideName} from './scoutData';
export const foundations=['Saída de jogo','Aproximação','Tirar bola da ZP','Batida','Aérea','Mover branca','Dobrar bola',"Pingo d'água",'Bola de defesa','Tabela','Sobrepor','Empurrar bola na ZP','Falta'];
export type RadarSeries={name:string;color:string;plays:any[]};
export function matchSeries(session:any):RadarSeries[]{return ['Vermelho','Azul'].map(color=>({name:sideName(session,color)||color,color,plays:(session.plays||[]).filter((p:any)=>p.color===color)}));}
export function radarData(series:RadarSeries[], axes=foundations){return axes.map(name=>({name,values:series.map(s=>{const st=calcStats(s.plays.filter(p=>p.play===name));return {total:st.total,value:st.total?st.efficiency:null};})}));}
export const radarColor=(color:string)=>color==='Azul'?'#1673e8':'#e34250';
export function drawRadar(canvas:HTMLCanvasElement,series:RadarSeries[],axes=foundations){
 canvas.width=720;canvas.height=570;const ctx=canvas.getContext('2d');if(!ctx)return;
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,720,570);const cx=360,cy=282,r=180,n=axes.length;
 const point=(i:number,v:number)=>({x:cx+Math.sin(i*2*Math.PI/n)*r*v,y:cy-Math.cos(i*2*Math.PI/n)*r*v});
 ctx.font='20px Arial';ctx.textAlign='center';ctx.lineWidth=1;
 for(const value of [.25,.5,.75,1]){ctx.beginPath();axes.forEach((_,i)=>{const p=point(i,value);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.closePath();ctx.strokeStyle='#dbe4ef';ctx.stroke();ctx.fillStyle='#60738c';ctx.fillText(`${value*100}%`,cx+23,cy-r*value+16);}
 axes.forEach((name,i)=>{const p=point(i,1),label=point(i,1.18);ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(p.x,p.y);ctx.strokeStyle='#dbe4ef';ctx.stroke();ctx.fillStyle='#25426a';ctx.textAlign=label.x>cx+15?'left':label.x<cx-15?'right':'center';const words=name.split(' '),lines:string[]=[];let line='';for(const word of words){if((line+' '+word).trim().length>16){lines.push(line);line=word;}else line=(line+' '+word).trim();}lines.push(line);lines.forEach((l,j)=>ctx.fillText(l,label.x,label.y+(j-(lines.length-1)/2)*19));});
 const rows=radarData(series,axes);
 series.forEach((s,k)=>{const values=rows.map(row=>row.values[k]);ctx.strokeStyle=radarColor(s.color);ctx.fillStyle=radarColor(s.color);ctx.lineWidth=3;ctx.setLineDash(k?[9,5]:[]);
  if(values.every(v=>v.value!==null)){ctx.beginPath();values.forEach((v,i)=>{const p=point(i,v.value!/100);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.closePath();ctx.globalAlpha=.1;ctx.fill();ctx.globalAlpha=1;ctx.stroke();}
  else values.forEach((v,i)=>{const next=values[(i+1)%n];if(v.value===null||next.value===null)return;const a=point(i,v.value/100),b=point((i+1)%n,next.value/100);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();});
  ctx.setLineDash([]);values.forEach((v,i)=>{if(v.value===null)return;const p=point(i,v.value/100);ctx.beginPath();ctx.arc(p.x,p.y,k?6:4,0,Math.PI*2);if(k){ctx.stroke();}else ctx.fill();});
 });
 ctx.fillStyle='#60738c';ctx.textAlign='center';ctx.font='15px Arial';ctx.fillText('Sem ponto = sem dados · Centro = 0%',360,550);
}
