const {setup,chromium}=require('./browser-check.cjs'),{draft}=require('./flow-test.cjs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 const {page:p,context,errors}=await setup(browser,{width:390,height:844});
 await p.getByRole('button',{name:'Iniciar Scout',exact:false}).waitFor();assert.equal(await p.getByRole('button',{name:'Atletas',exact:true}).count(),0);
 await p.screenshot({path:'tests/artifacts/home-light.png',fullPage:true});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const result=await p.evaluate(async()=>{
  const {radarData,foundations}=await import('/src/lib/foundationRadar.ts');const {comparisonAthletes}=await import('/src/components/AthleteComparison.tsx');
  const series=[{name:'VERMELHO TESTE',color:'Vermelho',plays:foundations.flatMap((play,i)=>[{play,result:i%2?'Acerto':'Funcional',color:'Vermelho',end:'End 1',whitePositionFrom:'45',durationMs:3000}])},{name:'AZUL TESTE',color:'Azul',plays:foundations.map((play,i)=>({play,result:i%2?'Funcional':'Erro',color:'Azul',end:'End 1',whitePositionFrom:'34',durationMs:5000}))}];
  const missing=radarData([{name:'X',color:'Vermelho',plays:[{play:'Batida',result:'Erro'}]}]);
  const collective=comparisonAthletes([{gameType:'Par BC3',plays:[{play:'Batida',color:'Vermelho',result:'Acerto'}]}]);
  const {createMatchReport}=await import('/src/lib/matchReport.ts');const doc=await createMatchReport({date:'2026-09-13',gameType:'Individual',scoutMode:'live',athlete:series[0].name,opponent:series[1].name,athleteColor:'Vermelho',totalAthlete:4,totalOpponent:2,scores:{'End 1':{athlete:2,opponent:0},'End 2':{athlete:0,opponent:2}},plays:series.flatMap(s=>s.plays)},()=>({}));
  window.testPdf=doc.output('datauristring');
  const React=(await import('/node_modules/.vite/deps/react.js')).default,DOM=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;const {default:Radar}=await import('/src/components/FoundationRadar.tsx');document.getElementById('root').style.display='none';const target=document.createElement('div');target.id='radar-test';document.body.append(target);DOM.createRoot(target).render(React.createElement(Radar,{series,gameType:'Individual'}));
  return {missing:missing.find(r=>r.name==='Aérea').values[0],zero:missing.find(r=>r.name==='Batida').values[0],collective:collective.length,pages:doc.getNumberOfPages()};
 });assert.equal(result.missing.value,null);assert.equal(result.zero.value,0);assert.equal(result.collective,0);assert.equal(result.pages,2);
 await p.locator('#radar-test canvas').waitFor();await p.locator('#radar-test').screenshot({path:'tests/artifacts/radar-mobile.png'});
 require('fs').writeFileSync('tests/artifacts/radar-report.pdf',Buffer.from((await p.evaluate(()=>window.testPdf)).split(',')[1],'base64'));
 await p.getByRole('button',{name:'End 2',exact:true}).click();await p.getByText('Detalhes do gráfico').click();assert.ok((await p.locator('#radar-test').innerText()).includes('sem dados'));assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await context.close();
 const team=await setup(browser,{width:390,height:844},{...draft,gameType:'Par BC3',stage:'result',whitePosition:'45',selectedColor:'Vermelho'});assert.equal(await team.page.getByLabel('Atleta que vai lançar').count(),0);await team.page.getByRole('button',{name:'Acerto',exact:true}).click();await team.page.getByRole('button',{name:'Aproximação',exact:true}).waitFor();assert.deepEqual(team.errors,[]);await team.context.close();
 const anon=await browser.newContext();await anon.route('**/*.supabase.co/**',r=>r.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'otp_expired'})}));const a=await anon.newPage();await a.goto('http://127.0.0.1:5173/?auth=confirm&token_hash=fake');await a.getByRole('heading',{name:'Não foi possível confirmar'}).waitFor();await a.getByRole('button',{name:'Reenviar confirmação'}).waitFor();await anon.close();
 console.log('PASS: mobile home/radar, missing vs zero, collective exclusion, 2-page PDF, team without player selection, expired confirmation.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
