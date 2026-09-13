import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calcStats, regularEnds, durationOf, positionLabel, sessionEnds, modeLabel, participants, playsForAthlete, removeAndRenumber} from '../src/lib/scoutData.ts';
test('Individual e Pares têm quatro parciais; somente Equipes têm seis', () => {
  for (const t of ['Individual', 'Par BC3', 'Par BC4']) assert.equal(regularEnds(t).length,4);
  assert.equal(regularEnds('Equipe BC1/BC2').length,6);
});
test('estatísticas usam resultados válidos, separam ausência de tempo de zero', () => {
  const stats = calcStats([{result:'Acerto',durationMs:1000},{result:'Funcional',durationMs:3000},{result:'Erro'},{result:'Entregar'}]);
  assert.equal(stats.total,3); assert.equal(stats.efficiency,50); assert.equal(stats.averageDurationMs,2000);
  assert.equal(durationOf({time:'13:25:03'}),null); assert.equal(durationOf({durationMs:0}),0);
  assert.equal(modeLabel({}),'Modo não informado (legado)');
});
test('histórico inclui todas as parciais e TB repetido; não inventa ponto antigo', () => {
  assert.ok(sessionEnds({gameType:'Equipe BC1/BC2',plays:[{end:'Tie-Break 2'}]}).includes('Tie-Break 2'));
  assert.equal(positionLabel({whitePositionFrom:'45'}),'45 (quadrado)');
  assert.equal(positionLabel({whitePositionFrom:'45',whitePointFrom:{x:.2,y:.8}}),'45 (x 20 cm, y 80 cm)');
});
test('atletas da mesma equipe não têm desempenho misturado',()=>{
 const session={athlete:'Equipe A',opponent:'Equipe B',athleteColor:'Vermelho',plays:[{color:'Vermelho',playerId:'p1',playerName:'Um',result:'Acerto'},{color:'Vermelho',playerId:'p2',playerName:'Dois',result:'Erro'}]};
 assert.equal(calcStats(playsForAthlete(session,'p1')).efficiency,100);
 assert.equal(calcStats(playsForAthlete(session,'p2')).efficiency,0);
 assert.equal(participants(session).filter(g=>g.color==='Vermelho').length,2);
});
test('exclusão preserva uma numeração coerente por cor e parcial',()=>{
 const plays=[{id:1,end:'End 1',color:'Vermelho',ball:'R1'},{id:2,end:'End 1',color:'Vermelho',ball:'R2'},{id:3,end:'End 2',color:'Vermelho',ball:'R1'}];
 assert.deepEqual(removeAndRenumber(plays,1).map(p=>p.ball),['R1','R1']);
 assert.equal(plays.length,3);
});
