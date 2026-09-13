const {setup,chromium}=require('./browser-check.cjs');const {draft,state}=require('./flow-test.cjs');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({headless:true,channel:'chrome'});try{
 const plays=Array.from({length:72},(_,i)=>({id:i,end:`End ${1+Math.floor(i/12)}`,color:i%2?'Azul':'Vermelho',ball:`${i%2?'A':'R'}${1+Math.floor(i%12/2)}`,play:'Aproximação',result:'Acerto',whitePositionFrom:'45',whitePositionTo:'45',durationMs:3000,playerId:i%2?'blue-test':'red-test',playerName:i%2?'ATLETA AZUL TESTE':'ATLETA VERMELHO TESTE'}));
 const {page:p,calls,errors}=await setup(b,{width:390,height:844},{...draft,scoutMode:'recorded',gameType:'Equipe BC1/BC2',stage:'endScore',currentEnd:5,whitePosition:'45',playsHistory:plays,scores:Object.fromEntries(Array.from({length:5},(_,i)=>[`End ${i+1}`,{athlete:1,opponent:1}])),endScoreDraft:{athlete:'',opponent:''}});
 await p.getByRole('spinbutton').nth(0).fill('2');await p.getByRole('spinbutton').nth(1).fill('0');await p.getByRole('button',{name:'Salvar End e iniciar próximo',exact:true}).click();
 assert.equal((await state(p)).finished,true);await p.waitForTimeout(1500);
 const writes=calls.filter(c=>c.url.includes('/scout_sessions')&&c.method==='POST');assert.ok(writes.length);const row=JSON.parse(writes.at(-1).body);
 assert.equal(row.payload.plays.length,72);assert.equal(row.payload.scoutMode,'recorded');assert.equal(Object.keys(row.payload.scores).length,6);assert.equal(row.session_date,'2026-09-10');
 await p.getByRole('button',{name:'Nova partida',exact:true}).click();
 await p.getByRole('button',{name:'Histórico',exact:true}).click();
 await p.getByRole('button',{name:'Ver análise completa',exact:true}).click();
 assert.ok((await p.locator('body').innerText()).includes('Scout de Partida Gravada'));
 assert.ok((await p.locator('body').innerText()).includes('End 6 · A6'));
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const download=p.waitForEvent('download');await p.getByRole('button',{name:'PDF desta partida',exact:true}).click();
 await (await download).saveAs('tests/artifacts/completed-match.pdf');
 assert.deepEqual(errors,[]);console.log('PASS completion: 72 throws / 6 ends / recorded metadata persisted, visible in history and exported to PDF');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
