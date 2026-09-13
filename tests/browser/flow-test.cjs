const {chromium,setup,user}=require('./browser-check.cjs');
const assert=require('node:assert/strict');const fs=require('fs');
const draft={version:1,sessionKind:'Treino',competitionName:'',competitionPhase:'',competitionLevel:'Nacional',competitionScope:'Nacional',sessionDate:'2026-09-10',selectedAthleteId:'red-test',selectedOpponentId:'blue-test',selectedRedTeamEntryId:'',selectedBlueTeamEntryId:'',gameType:'Individual',athlete:'ATLETA VERMELHO TESTE',opponent:'ATLETA AZUL TESTE',athleteClass:'BC1',opponentClass:'BC1',gender:'Masculino',athleteColor:'Vermelho',started:true,finished:false,tieBreak:false,tieBreakRound:1,currentEnd:0,stage:'white',whitePosition:'',newWhitePosition:'',selectedColor:'',selectedResult:'',playsHistory:[],commandHistory:[],discardedBalls:{},scores:{},matchHome:false,view:'new',scoutMode:'live'};
async function state(p){return p.evaluate(id=>JSON.parse(localStorage.getItem(`bocha-offline-v1:${id}:test-draft`)).payload,user.id)}
async function mark(p,x,y){const r=await p.getByRole('slider').boundingBox();await p.mouse.click(r.x+r.width*x,r.y+r.height*y);}
module.exports={draft,state,mark};
if(require.main===module)(async()=>{
const browser=await chromium.launch({headless:true,channel:process.env.SCOUT_BROWSER_CHANNEL || 'chrome'});
try {
const {page:p,context,errors}=await setup(browser,{width:390,height:844},draft);
await p.getByRole('button',{name:'Selecionar posição 45',exact:true}).click();
await mark(p,.23,.71);let d=await state(p);assert.ok(Math.abs(d.positionDraft.point.x-.23)<.01);
await p.getByRole('button',{name:'Confirmar posição',exact:true}).click();assert.equal((await state(p)).stage,'color');
await p.getByRole('button',{name:'Desfazer',exact:true}).click();assert.equal((await state(p)).positionDraft.cell,'45');
await p.getByRole('button',{name:'Desfazer',exact:true}).click();assert.equal((await state(p)).positionDraft.point,null);
await mark(p,.3,.7);await p.getByRole('button',{name:'Confirmar posição',exact:true}).click();
await p.getByRole('button',{name:/ATLETA VERMELHO TESTE VERMELHO/}).click();
await p.getByRole('button',{name:'Iniciar cronômetro',exact:true}).click();await p.waitForTimeout(1050);
await p.getByRole('button',{name:'Acerto',exact:true}).click();
await p.getByRole('button',{name:'Saída de jogo',exact:true}).click();
d=await state(p);assert.equal(d.playsHistory.length,1);assert.ok(d.playsHistory[0].durationMs>=1000);assert.ok(d.playsHistory[0].whitePointFrom);
await p.getByRole('button',{name:/ATLETA AZUL TESTE AZUL/}).click();await p.getByRole('button',{name:'Erro',exact:true}).click();
await p.getByRole('button',{name:'Desfazer',exact:true}).click();d=await state(p);assert.equal(d.stage,'result');assert.equal(d.playsHistory.length,1);
await p.getByRole('button',{name:'Funcional',exact:true}).click();await p.getByRole('button',{name:'Aproximação',exact:true}).click();
d=await state(p);assert.equal(d.playsHistory.length,2);assert.equal(d.playsHistory[1].durationMs,null);
await p.getByRole('button',{name:'2ª',exact:true}).click();assert.match(await p.locator('.partial-performance').innerText(),/0 jogadas/);
await p.getByRole('button',{name:'End 1',exact:true}).click();assert.match(await p.locator('.partial-performance').innerText(),/50.0%/);
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await p.screenshot({path:'tests/artifacts/mobile-flow.png',fullPage:true});
await p.reload();await p.getByRole('button',{name:/ATLETA AZUL TESTE AZUL/}).waitFor();d=await state(p);assert.equal(d.playsHistory.length,2);assert.ok(d.whitePoint);
assert.deepEqual(errors,[]);await context.close();console.log('PASS mobile: precise point, granular undo, real timing, missing timing, partials, reload');
const rec=await setup(browser,{width:1280,height:900},{...draft,scoutMode:'recorded',stage:'color',whitePosition:'45'});const q=rec.page;
await q.getByRole('button',{name:/ATLETA VERMELHO TESTE VERMELHO/}).click();assert.equal(await q.getByRole('button',{name:'Iniciar cronômetro'}).count(),0);
await q.getByLabel('Tempo no vídeo em segundos').fill('7.5');await q.getByRole('button',{name:'Acerto',exact:true}).click();await q.getByRole('button',{name:'Aproximação',exact:true}).click();
d=await state(q);assert.equal(d.playsHistory[0].durationMs,7500);assert.equal(d.playsHistory[0].time,null);assert.equal(d.sessionDate,'2026-09-10');
assert.equal(await q.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(rec.errors,[]);await rec.context.close();console.log('PASS desktop: recorded mode preserves date, manual video time, no live timer');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
