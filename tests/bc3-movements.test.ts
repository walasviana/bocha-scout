import {test} from 'node:test';
import assert from 'node:assert/strict';
import {foundationAllowed} from '../src/lib/scoutData.ts';
import {movementVector} from '../src/lib/courtHeatmap.ts';
test('BC3: esconde dois fundamentos somente em Campeonato individual ou pares',()=>{
  for(const play of ['Aérea',"Pingo d'água"]){
    assert.equal(foundationAllowed(play,'Campeonato','Individual','BC3'),false);
    assert.equal(foundationAllowed(play,'Campeonato','Par BC3',''),false);
    assert.equal(foundationAllowed(play,'Treino','Individual','BC3'),true);
    assert.equal(foundationAllowed(play,'Campeonato','Individual','BC4'),true);
  }
  assert.equal(foundationAllowed('Mover branca','Campeonato','Individual','BC3'),true);
});
test('vetor respeita pontos, sentido, TB e ausência de posição',()=>{
  const precise=movementVector({from:'45',to:'44',fromPoint:{x:.8,y:.3},toPoint:{x:.2,y:.7}})!;
  assert.equal(precise.approximate,false);assert.equal(precise.to.x-precise.from.x,40);assert.equal(precise.to.y-precise.from.y,40);
  assert.equal(movementVector({from:'45',to:'44'})?.approximate,true);
  assert.equal(movementVector({from:'45',to:'45'}),null);
  assert.equal(movementVector({from:'invalid',to:'44'}),null);
  assert.ok(movementVector({from:'TB',to:'44',toPoint:{x:.3,y:.7}}));
  assert.ok(movementVector({from:'45',to:'45',fromPoint:{x:.1,y:.1},toPoint:{x:.9,y:.9}}));
});
