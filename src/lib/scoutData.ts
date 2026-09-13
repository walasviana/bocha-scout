export type Point = { x: number; y: number };
export function regularEnds(gameType: string) {
  return Array.from({length: gameType === 'Equipes' || gameType === 'Equipe BC1/BC2' ? 6 : 4}, (_, i) => `End ${i + 1}`);
}
export function calcStats(data: any[] = []) {
  const valid = data.filter(p => ['Acerto', 'Funcional', 'Erro'].includes(p.result));
  const total = valid.length;
  const acertos = valid.filter(p => p.result === 'Acerto').length;
  const funcionais = valid.filter(p => p.result === 'Funcional').length;
  const erros = valid.filter(p => p.result === 'Erro').length;
  const times = valid.map(durationOf).filter((n): n is number => n !== null);
  return { total, acertos, funcionais, erros, accuracy: total ? acertos / total * 100 : 0,
    efficiency: total ? (acertos + funcionais * .5) / total * 100 : 0,
    errorRate: total ? erros / total * 100 : 0,
    averageDurationMs: times.length ? times.reduce((a,b) => a+b,0) / times.length : null,
    timedPlays: times.length };
}
export function durationOf(play: any): number | null {
  return typeof play.durationMs === 'number' && Number.isFinite(play.durationMs) && play.durationMs >= 0 ? play.durationMs : null;
}
export function formatDuration(ms: number | null) {
  if (ms === null) return 'não registrado';
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function sideName(session: any, color: string) {
  return color === session.athleteColor ? session.athlete : session.opponent;
}
export function playName(session: any, play: any) {
  return play.playerName || sideName(session, play.color) || play.color;
}
export function modeLabel(session: any) {
  return session.scoutMode === 'recorded' ? 'Scout de Partida Gravada' : session.scoutMode === 'live' ? 'Ao Vivo' : 'Modo não informado (legado)';
}
export function pointValid(p: any): p is Point {
  return p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
}
export function positionLabel(play: any) {
  const pos = play.whitePositionTo || play.whitePositionFrom;
  const p = play.whitePointTo || play.whitePointFrom;
  return pos ? `${pos}${pointValid(p) ? ` (x ${Math.round(p.x * 100)} cm, y ${Math.round(p.y * 100)} cm)` : ' (quadrado)'}` : 'não registrada';
}
export function sessionEnds(session: any) {
  return [...new Set<string>([...regularEnds(session.gameType), ...Object.keys(session.scores || {}), ...(session.plays || []).map((p: any) => p.end).filter(Boolean)])];
}
export function participants(session: any) {
  const plays: any[] = session.plays || [];
  const groups: Array<{id:string;name:string;color:string;plays:any[]}> = [];
  for(const color of ['Vermelho','Azul']) {
    const sidePlays=plays.filter(p=>p.color===color);
    const ids=[...new Set(sidePlays.map(p=>p.playerId || 'side'))];
    if(!ids.length)ids.push('side');
    for(const id of ids) {
      const pp=sidePlays.filter(p=>(p.playerId || 'side')===id);
      groups.push({id:`${color}:${id}`,name:pp[0]?.playerName || sideName(session,color),color,plays:pp});
    }
  }
  return groups;
}
export function playsForAthlete(session: any, id?: string) {
  const plays=session.plays || [];
  if(id && id!=='Todos' && plays.some((p:any)=>p.playerId===id)) return plays.filter((p:any)=>p.playerId===id);
  const color=id===session.opponentId ? (session.athleteColor==='Vermelho'?'Azul':'Vermelho') : session.athleteColor;
  return plays.filter((p:any)=>p.color===color);
}
export function removeAndRenumber(plays: any[], id: any) {
  const counts=new Map<string,number>();
  return plays.filter(p=>p.id!==id).map(p=>{
    const key=`${p.end}:${p.color}`,n=(counts.get(key)||0)+1;counts.set(key,n);
    return {...p,ball:`${p.color==='Vermelho'?'R':'A'}${n}`};
  });
}
