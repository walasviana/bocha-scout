const {setup,chromium}=require('./browser-check.cjs');const {draft}=require('./flow-test.cjs');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({headless:true,channel:process.env.SCOUT_BROWSER_CHANNEL||'chrome'});try{
 for(const [kind,gameType,hidden] of [['Campeonato','Individual',true],['Campeonato','Par BC3',true],['Treino','Individual',false]]){
  const {page:p,context,errors}=await setup(b,{width:390,height:844},{...draft,sessionKind:kind,gameType,athleteClass:'BC3',opponentClass:'BC3',selectedColor:'Vermelho',selectedResult:'Acerto',whitePosition:'45',stage:'play'});
  await p.getByRole('button',{name:'Mais fundamentos',exact:true}).click();
  assert.equal(await p.getByRole('button',{name:'Aérea',exact:true}).count(),hidden?0:1);
  assert.equal(await p.getByRole('button',{name:"Pingo d'água",exact:true}).count(),hidden?0:1);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await context.close();
 }
 const {page:p,errors}=await setup(b,{width:390,height:844});
 await p.evaluate(async()=>{
   const ReactModule=await import('/node_modules/.vite/deps/react.js');const React=ReactModule.default||ReactModule;const DOM=await import('/node_modules/.vite/deps/react-dom_client.js');const {createRoot}=DOM.default||DOM;
   const {HistoricalHeatmap}=await import('/src/components/BochaScout.tsx');
   document.getElementById('root').style.display='none';const target=document.createElement('div');target.id='movement-fixture';document.body.append(target);
   createRoot(target).render(React.createElement(HistoricalHeatmap,{name:'Exemplo de deslocamentos',color:'Vermelho',plays:[
    {play:'Mover branca',color:'Vermelho',result:'Acerto',whitePositionFrom:'45',whitePositionTo:'34',whitePointFrom:{x:.2,y:.8},whitePointTo:{x:.8,y:.2}},
    {play:'Mover branca',color:'Vermelho',result:'Funcional',whitePositionFrom:'34',whitePositionTo:'23'},
    {play:'Mover branca',color:'Vermelho',result:'Erro',whitePositionFrom:'23',whitePositionTo:'96'}
   ]}));
 });
 const toggle=p.getByLabel('Mostrar deslocamentos da branca');await toggle.waitFor();
 const before=await p.locator('#movement-fixture canvas').evaluate(c=>({data:c.toDataURL(),width:c.width,height:c.height}));
 await p.locator('#movement-fixture .court-heatmap').screenshot({path:'tests/artifacts/movement-arrows.png'});
 await toggle.uncheck();await p.waitForTimeout(100);
 const after=await p.locator('#movement-fixture canvas').evaluate(c=>({data:c.toDataURL(),width:c.width,height:c.height}));
 assert.notEqual(before.data,after.data);assert.equal(before.width,after.width);assert.equal(before.height,after.height);
 assert.deepEqual(errors,[]);console.log('PASS: BC3 Campeonato/Par BC3 hide two foundations; training preserves them; arrows toggle without changing map size on mobile');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
