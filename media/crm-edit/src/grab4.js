const { chromium } = require('playwright-core');
const path=require('path');
const OUT='/tmp/claude-0/-home-user-monitoring-pc/58f4bcc1-49b6-5ca9-8e31-5195d1da140c/scratchpad/shots';
const DEMO=require('./demo-state.js');
const TG='window.Telegram={WebApp:{initData:"query_id=AAX&user=%7B%22id%22%3A7788%7D&auth_date=1757000000&hash=demo",initDataUnsafe:{user:{id:7788,first_name:"Xsanx",username:"xsanx"}},ready(){},expand(){},colorScheme:"dark",themeParams:{},MainButton:{show(){},hide(){},setText(){},onClick(){}},HapticFeedback:{impactOccurred(){},notificationOccurred(){}},onEvent(){},offEvent(){},setHeaderColor(){},setBackgroundColor(){},enableClosingConfirmation(){},close(){}}};';
async function mk(b,w,h,mobile){
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:mobile?2:1.5,isMobile:!!mobile,hasTouch:!!mobile});
  await ctx.route('**/telegram-web-app.js', r=>r.fulfill({status:200,contentType:'application/javascript',body:TG}));
  await ctx.route('**/api/**', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,allowed:true,role:'owner',items:[],chats:[],groups:[]})}));
  await ctx.route('**/api/crm-state*', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,exists:true,revision:42,state:DEMO.state})}));
  await ctx.addInitScript(st=>{try{localStorage.setItem('xcrm_v4_state',JSON.stringify(st));}catch(e){}},
    {clients:DEMO.state.clients,companies:DEMO.state.companies,deals:DEMO.state.deals,tasks:DEMO.state.tasks});
  return ctx;
}
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--hide-scrollbars']});
  // square-ish landing hero
  let ctx=await mk(b,1200,1200,false); let p=await ctx.newPage();
  await p.goto('http://127.0.0.1:8899/site/index.html',{waitUntil:'networkidle'}); await p.waitForTimeout(2500);
  await p.screenshot({path:path.join(OUT,'sq_landing.png')}); await ctx.close();
  // wide desktop CRM shots
  ctx=await mk(b,1440,900,false); p=await ctx.newPage();
  await p.goto('http://127.0.0.1:8899/site/app.html',{waitUntil:'networkidle'}); await p.waitForTimeout(3000);
  await p.screenshot({path:path.join(OUT,'w_focus.png')});
  for(const r of ['deals','analytics','clients','tasks']){
    const el=await p.$(`nav#appNav button[data-route="${r}"]`); if(!el) continue;
    await el.click(); await p.waitForTimeout(1500);
    await p.screenshot({path:path.join(OUT,'w_'+r+'.png')});
  }
  await ctx.close();
  // phone shots
  ctx=await mk(b,420,900,true); p=await ctx.newPage();
  await p.goto('http://127.0.0.1:8899/index.html',{waitUntil:'networkidle'}); await p.waitForTimeout(3500);
  await p.screenshot({path:path.join(OUT,'ph_home.png')});
  for(const nav of ['deals','clients','tasks']){
    const el=await p.$(`[data-nav="${nav}"]`); if(!el) continue;
    await el.click(); await p.waitForTimeout(1600);
    await p.screenshot({path:path.join(OUT,'ph_'+nav+'.png')});
  }
  await ctx.close();
  await b.close(); console.log('done');
})();
