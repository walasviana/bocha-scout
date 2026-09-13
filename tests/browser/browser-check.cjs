const {chromium}=require(process.env.SCOUT_PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs');fs.mkdirSync('tests/artifacts',{recursive:true});
const user={id:'11111111-1111-4111-8111-111111111111',email:'teste@example.invalid',user_metadata:{},aud:'authenticated',role:'authenticated'};
const athletes=[{id:'red-test',name:'ATLETA VERMELHO TESTE',class:'BC1',gender:'Masculino',country:'Brasil',approval_status:'approved'},{id:'blue-test',name:'ATLETA AZUL TESTE',class:'BC1',gender:'Masculino',country:'Brasil',approval_status:'approved'}];
async function setup(browser,viewport={width:1280,height:900},draft=null){
 const context=await browser.newContext({viewport,acceptDownloads:true});
 const calls=[];
 await context.route('**/*.supabase.co/**',async route=>{
   const req=route.request(),url=req.url();calls.push({url,method:req.method(),body:req.postData()});
   let data=[];
   if(url.includes('/auth/v1/user'))data=user;
   else if(url.includes('/profiles'))data=req.headers().accept?.includes('object')?{...user,name:'CONTA TESTE',role:'user'}:[{...user,name:'CONTA TESTE',role:'user'}];
   else if(url.includes('/athletes'))data=athletes;
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await context.addInitScript(({user,draft})=>{
  localStorage.setItem('sb-whufbagsxtdzekooamxf-auth-token',JSON.stringify({access_token:'test.test.test',refresh_token:'test',expires_at:9999999999,token_type:'bearer',user}));
  if(draft&&!localStorage.getItem('test-seeded')){
    localStorage.setItem('test-seeded','yes');localStorage.setItem(`bocha-offline-v1:active:${user.id}`,'test-draft');
    localStorage.setItem(`bocha-offline-v1:${user.id}:test-draft`,JSON.stringify({id:'test-draft',owner_id:user.id,state:'active',revision:1,payload:draft}));
  }
 },{user,draft});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:5173/');await page.getByText('Carregando Bocha Scout...', {exact:true}).waitFor({state:'hidden'});await page.waitForTimeout(500);
 return {page,context,errors,calls};
}
module.exports={setup,chromium,user};
if(require.main===module)(async()=>{const browser=await chromium.launch({headless:true,channel:process.env.SCOUT_BROWSER_CHANNEL || 'chrome'});const {page,errors}=await setup(browser);console.log((await page.locator('body').innerText()).slice(0,7000));console.log({errors});await page.screenshot({path:'tests/artifacts/home-check.png',fullPage:true});await browser.close();})().catch(e=>{console.error(e);process.exit(1)});

