export type PositionStats = { total: number; acertos?: number; funcionais?: number; erros?: number; saidas: number; efficiency: number };
export type CourtOptions = { data: Record<string, PositionStats>; mode?: string; color?: string; name?: string; selected?: string; showPositions?: boolean; selectionOnly?: boolean };
export const CHART_WIDTH = 800, CHART_HEIGHT = 1360;
const X = 100, Y = 200, BOX = 84, FIELD = Y + BOX;
const navy = '#223e62';
export const courtCells = [
  { position: '14', x: X + 200, y: FIELD + 100 }, { position: '13', x: X + 300, y: FIELD + 100 },
  ...Array.from({ length: 8 }, (_, r) => Array.from({ length: 6 }, (_, c) => ({ position: `${r + 2}${6 - c}`, x: X + c * 100, y: FIELD + (r + 2) * 100 }))).flat(),
];
export function cellMetric(options: CourtOptions, position: string) {
  const d = options.data[position];
  if (!d || !d.total || (options.mode === 'Saídas de jogo' && (!d.saidas || position === 'TB'))) return null;
  const countMode = options.mode === 'Volume' || options.mode === 'Saídas de jogo';
  const count = options.mode === 'Saídas de jogo' ? d.saidas : d.total;
  const maximum = Math.max(1, ...Object.entries(options.data).filter(([p]) => options.mode !== 'Saídas de jogo' || p !== 'TB').map(([, s]) => options.mode === 'Saídas de jogo' ? s.saidas : s.total));
  const value = countMode ? count / maximum * 100 : d.efficiency;
  return { value, label: countMode ? `${count}x` : `${Math.round(value)}%`, count, starts: d.saidas };
}
function tone(value: number, countMode: boolean, red: boolean) {
  if (countMode) return red ? [226, 81, 90] : [48, 135, 220];
  return value >= 80 ? [68, 190, 130] : value >= 60 ? [143, 195, 83] : value >= 40 ? [240, 203, 67] : value >= 20 ? [236, 151, 83] : [226, 102, 122];
}
export function drawCourtHeatmap(canvas: HTMLCanvasElement, options: CourtOptions) {
  const scale = 2;
  canvas.width = CHART_WIDTH * scale; canvas.height = (options.selectionOnly ? 1120 : CHART_HEIGHT) * scale;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Não foi possível desenhar a quadra.');
  ctx.scale(scale, scale);
  if (options.selectionOnly) ctx.translate(0, -176);
  const red = options.color === 'Vermelho', accent = red ? '#df5963' : '#367bdc';
  const countMode = options.mode === 'Volume' || options.mode === 'Saídas de jogo';
  const label = (text: string, x: number, y: number, size: number, color = navy, align: CanvasTextAlign = 'center') => { ctx.font = `${size}px Arial, sans-serif`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(text, x, y); };
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, CHART_WIDTH, CHART_HEIGHT);
  if (!options.selectionOnly) {
  const heading = `Mapa de calor${options.name ? ' · ' + options.name : ''}`;
  let font = 56; ctx.font = `${font}px Arial`;
  while (ctx.measureText(heading).width > 720 && font > 25) { font--; ctx.font = `${font}px Arial`; }
  label(heading, 40, 77, font, navy, 'left');
  ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(52, 119, 12, 0, Math.PI * 2); ctx.fill();
  label(options.color && options.color !== 'Todas' ? options.color : 'Todas as cores', 79, 129, 30, '#748297', 'left');
  label('Menor', 460, 129, 28, '#748297', 'right');
  const grad = ctx.createLinearGradient(478, 0, 658, 0);
  if(countMode) { grad.addColorStop(0, '#e8eff8'); grad.addColorStop(1, accent); }
  else { grad.addColorStop(0, '#e7a3b0'); grad.addColorStop(.5, '#f1da86'); grad.addColorStop(1, '#79c99c'); }
  ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(478, 111, 180, 17, 8); ctx.fill();
  label('Maior', 674, 129, 28, '#748297', 'left');
  }
  ctx.save(); ctx.beginPath(); ctx.roundRect(X, Y, 600, 1084, 18); ctx.clip();
  ctx.fillStyle = '#f7faff'; ctx.fillRect(X, Y, 600, 1084);
  ctx.fillStyle = '#ecf3fb'; ctx.fillRect(X, Y, 600, BOX);
  for(const cell of courtCells) {
    const m = cellMetric(options, cell.position); if(!m) continue;
    const rgb = tone(m.value, countMode, red), cx = cell.x + 50, cy = cell.y + 53;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 59);
    const strength = countMode ? .18 + m.value / 100 * .32 : .42;
    glow.addColorStop(0, `rgba(${rgb.join(',')},${strength})`); glow.addColorStop(.45, `rgba(${rgb.join(',')},${strength * .7})`); glow.addColorStop(1, `rgba(${rgb.join(',')},0)`);
    ctx.fillStyle = glow; ctx.fillRect(cell.x-10, cell.y-10, 120, 120);
  }
  ctx.strokeStyle = '#b8cbe0'; ctx.lineWidth = 1.6;
  for(let i=1;i<6;i++){ctx.beginPath();ctx.moveTo(X+i*100,Y);ctx.lineTo(X+i*100,FIELD+1000);ctx.stroke();}
  for(let i=1;i<10;i++){ctx.beginPath();ctx.moveTo(X,FIELD+i*100);ctx.lineTo(X+600,FIELD+i*100);ctx.stroke();}
  for(let c=0;c<6;c++) label(String(6-c),X+c*100+50,Y+54,30);
  for(const cell of courtCells){
    const m = cellMetric(options,cell.position), center = cell.x+50;
    if(options.selected===cell.position){ctx.strokeStyle=accent;ctx.lineWidth=4;ctx.strokeRect(cell.x+4,cell.y+4,92,92);}
    if(options.showPositions !== false) label(cell.position,center,cell.y+47,26);
    if(m){
      label(m.label,center,cell.y+(options.showPositions === false?58:78),20,countMode ? accent : m.value>=60?'#347b57':m.value>=40?'#927220':'#ac435e');
      if(m.starts){ctx.fillStyle=accent;ctx.beginPath();ctx.arc(center+21,cell.y+33,7,0,Math.PI*2);ctx.fill();}
    }else if(!options.selectionOnly && options.showPositions!==false && cell.position!=='14' && cell.position!=='13') label('–',center,cell.y+77,18,'#9fadb9');
  }
  ctx.strokeStyle = navy; ctx.lineWidth = 4; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(X,FIELD);ctx.lineTo(X+600,FIELD);ctx.stroke();
  ctx.beginPath(); ctx.moveTo(X,FIELD+300);ctx.lineTo(X+300,FIELD+150);ctx.lineTo(X+600,FIELD+300);ctx.stroke();
  ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(X+283,FIELD+500);ctx.lineTo(X+317,FIELD+500);ctx.moveTo(X+300,FIELD+483);ctx.lineTo(X+300,FIELD+517);ctx.stroke();
  ctx.restore(); ctx.lineWidth=2.5; ctx.strokeStyle=navy;ctx.beginPath();ctx.roundRect(X,Y,600,1084,18);ctx.stroke();
  if(options.data.TB?.total) label(`Tie-break · ${options.data.TB.total} jogadas · ${Math.round(options.data.TB.efficiency)}%`,400,1328,24);
}
export function appendHeatmapReport(doc: any, sides: Array<{ name: string; color: string; data: Record<string, PositionStats> }>) {
  doc.addPage('a4', 'landscape');
  const W=doc.internal.pageSize.getWidth(), H=doc.internal.pageSize.getHeight();
  doc.setFillColor(6,45,84);doc.rect(0,0,W,48,'F');doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(255,255,255);doc.text('MAPAS DE CALOR DA PARTIDA',26,31);
  const height=H-84,width=height*CHART_WIDTH/CHART_HEIGHT;
  sides.forEach((side,i)=>{const c=document.createElement('canvas');drawCourtHeatmap(c,{...side,mode:'Desempenho'});doc.addImage(c.toDataURL('image/png'),'PNG',W/4+i*W/2-width/2,54,width,height,undefined,'FAST');});
  doc.setTextColor(70,87,107);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text('Eficiencia: acerto = 100%, funcional = 50%, erro = 0%. Pontos indicam saidas de jogo. Sem mancha = sem jogadas.',W/2,H-14,{align:'center'});
}
