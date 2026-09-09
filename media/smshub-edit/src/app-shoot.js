const { chromium } = require('playwright-core');
const path=require('path'), fs=require('fs');
const OUT=path.join(__dirname,'app');   // pass B reads these frames from src/app/
const DEMO=require('./sms-demo.js');
const TG='window.Telegram={WebApp:{initData:"query_id=AAX&user=%7B%22id%22%3A7788%2C%22first_name%22%3A%22Xsanx%22%7D&auth_date=1757000000&hash=demo",initDataUnsafe:{user:{id:7788,first_name:"Xsanx",username:"xsanx"}},ready(){},expand(){},colorScheme:"dark",themeParams:{},MainButton:{show(){},hide(){},setText(){},onClick(){}},BackButton:{show(){},hide(){},onClick(){}},HapticFeedback:{impactOccurred(){},notificationOccurred(){},selectionChanged(){}},onEvent(){},offEvent(){},openLink(){},openTelegramLink(){},setHeaderColor(){},setBackgroundColor(){},expand(){},close(){},isExpanded:true,viewportHeight:900,viewportStableHeight:900,platform:"ios",version:"7.0"}};';

const DRIVER = () => {
  const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;
  const eio=t=>{t=clamp(t,0,1);return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;};
  const eo=t=>1-Math.pow(1-clamp(t,0,1),3);
  const eoq=t=>1-Math.pow(1-clamp(t,0,1),5);

  // freeze the app's own timers so nothing fights our frame clock
  window.__frozen ||= (()=>{ const noop=()=>0;
    window.setInterval=noop; window.requestAnimationFrame=noop; return true; })();

  // kill CSS transitions: we set every value per frame ourselves
  if(!document.getElementById('__nofx')){
    const st=document.createElement('style'); st.id='__nofx';
    st.textContent='*,*::before,*::after{transition:none!important;animation:none!important}';
    document.head.appendChild(st);
  }

  // build the "new SMS" card once, kept hidden until its cue
  if(!document.getElementById('__newsms')){
    const list=q('#smsList');
    if(list){
      const card=document.createElement('div');
      card.id='__newsms'; card.className='sms-card unread';
      card.innerHTML='<div class="sms-top"><div class="sms-phone"><i class="unread-dot"></i>📱 +7 999 123-45-67</div>'+
        '<div class="sms-time">только что</div></div>'+
        '<div class="sms-from">От: Telegram</div>'+
        '<div class="sms-body">Код для входа: 91<span id="__d1">7</span><span id="__d2">4</span><span id="__d3">6</span>. Никому его не сообщайте.</div>'+
        '<div class="sms-actions"><button class="sms-code">Код <strong>91746</strong> · копировать</button>'+
        '<button class="sms-copy">⧉ Текст</button></div>';
      card.style.cssText='opacity:0;transform:translateY(-18px) scale(.96);transform-origin:50% 0;overflow:hidden';
      list.insertBefore(card,list.firstChild);
    }
  }

  const setScreen=(name)=>{
    qa('.screen').forEach(s=>s.classList.toggle('active', s.dataset.screen===name));
    qa('nav .nav').forEach(b=>b.classList.toggle('active', b.dataset.go===name));
  };

  window.__drive = (t) => {
    const boot=q('#bootScreen'), app=q('.app'), sheet=q('#sheet'), backdrop=q('#backdrop');
    const toast=q('.toast')||q('#toast');
    document.body.classList.remove('intro-running');

    const resetSheet=()=>{ if(sheet){sheet.style.transform='translate(-50%,105%)';} if(backdrop) backdrop.style.opacity='0'; };
    const resetToast=()=>{ if(toast){toast.style.opacity='0';} };

    // ---------- 0.00-1.45  boot ----------
    if(t<1.45){
      if(boot){
        boot.style.display='grid';
        boot.style.opacity = t<1.15 ? '1' : String(Math.max(0,1-(t-1.15)/0.28));
        boot.style.transform = `scale(${(1+(t<1.15?0:(t-1.15)/0.28)*0.07).toFixed(3)})`;
        const p=eo(clamp(t/1.05,0,1));
        const bar=q('#bootProgress'); if(bar) bar.style.width=(p*100).toFixed(1)+'%';
        const pc=q('#bootPercent'); if(pc) pc.textContent=String(Math.round(p*100)).padStart(2,'0')+'%';
        const msg=q('#bootMessage');
        if(msg) msg.textContent = p<0.45?'Подключаем защищённый канал':p<0.85?'Синхронизируем номера':'Готово';
      }
      if(app){ const a=clamp((t-1.15)/0.28,0,1); app.style.opacity=String(a); app.style.transform=`scale(${(0.96+0.04*a).toFixed(3)})`; }
      setScreen('home'); window.scrollTo(0,0); resetSheet(); resetToast();
      return;
    }
    if(boot) boot.style.display='none';
    if(app){ app.style.opacity='1'; app.style.transform='none'; }

    // ---------- 1.45-2.60  home, slow scroll ----------
    if(t<2.60){
      setScreen('home'); resetSheet(); resetToast();
      window.scrollTo(0, eio((t-1.45)/1.15)*300);
      return;
    }

    // ---------- 2.60-3.70  order sheet ----------
    if(t<3.70){
      setScreen('home'); resetToast();
      const u=t-2.60;
      window.scrollTo(0, 300-eio(clamp(u/0.5,0,1))*300);
      const up=eoq(clamp(u/0.55,0,1)) * (u<0.85?1:1-eio((u-0.85)/0.25));
      if(sheet) sheet.style.transform=`translate(-50%, ${((1-up)*105).toFixed(1)}%)`;
      if(backdrop) backdrop.style.opacity=(up*0.88).toFixed(3);
      qa('#qty button').forEach((b,i)=>b.classList.toggle('active', i===(u>0.62?2:0)));
      const sub=q('#submitOrder'); if(sub) sub.textContent = u>0.62 ? 'Отправить заявку на 5 номеров' : 'Отправить заявку на 1 номер';
      return;
    }
    resetSheet();

    // ---------- 3.70-4.60  numbers ----------
    if(t<4.60){
      setScreen('numbers'); resetToast();
      const u=t-3.70;
      window.scrollTo(0, eio(u/0.9)*150);
      qa('#numbersList .row').forEach((r,i)=>{ const a=eoq((u-i*0.06)/0.3);
        r.style.opacity=String(a); r.style.transform=`translateY(${((1-a)*24).toFixed(1)}px)`; });
      return;
    }
    qa('#numbersList .row').forEach(r=>{ r.style.opacity='1'; r.style.transform='none'; });

    // ---------- 4.60-6.60  sms: new message arrives, then code copied ----------
    setScreen('sms');
    const u=t-4.60;
    window.scrollTo(0, eio(clamp(u/0.8,0,1))*70);
    const card=document.getElementById('__newsms');
    if(card){
      const a=eoq((u-0.45)/0.55);                       // slide-in of the new SMS
      card.style.opacity=String(a);
      card.style.transform=`translateY(${((1-a)*-30).toFixed(1)}px) scale(${(0.955+0.045*a).toFixed(3)})`;
      card.style.maxHeight=(a*270).toFixed(0)+'px';
      card.style.marginBottom=(a*10).toFixed(0)+'px';
      const pulse=Math.max(0, Math.sin((u-0.45)*3.4))*a;
      card.style.boxShadow=`0 0 ${(30+26*pulse).toFixed(0)}px rgba(124,92,255,${(0.30+0.30*pulse).toFixed(2)})`;
      card.style.borderColor=`rgba(124,92,255,${(0.35+0.35*pulse).toFixed(2)})`;
    }
    const badge=q('#smsBadge');
    if(badge){ const on=u>0.55; badge.style.display=on?'block':'none'; badge.textContent='1'; }
    const codeBtn=card?card.querySelector('.sms-code'):null;
    if(codeBtn){                                        // tap feedback on the code chip
      const press=clamp(1-Math.abs(u-1.28)/0.12,0,1);
      codeBtn.style.transform=`scale(${(1-0.05*press).toFixed(3)})`;
      codeBtn.style.filter=`brightness(${(1+0.5*press).toFixed(2)})`;
    }
    if(toast){
      const a=clamp((u-1.30)/0.2,0,1)*clamp(1-(u-1.95)/0.25,0,1);
      toast.textContent='Код 91746 скопирован';
      toast.style.opacity=String(a);
      toast.style.transform=`translate(-50%, ${((1-a)*-20).toFixed(1)}px)`;
    }
  };
  return true;
};

(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  for(const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT,f));
  const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--hide-scrollbars']});
  const ctx=await b.newContext({viewport:{width:420,height:900},deviceScaleFactor:1.5,isMobile:true,hasTouch:true});
  await ctx.route('**/telegram-web-app.js', r=>r.fulfill({status:200,contentType:'application/javascript',body:TG}));
  await ctx.route('**/api/**', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true})}));
  await ctx.route('**/api/bootstrap*', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(DEMO)}));
  const p=await ctx.newPage();
  await p.goto((process.env.APP_URL||'http://127.0.0.1:8900')+'/index.html',{waitUntil:'networkidle',timeout:40000});
  await p.waitForTimeout(4500);              // let it boot & sync for real
  await p.evaluate(DRIVER);
  const FPS=60, DUR=6.75, N=Math.round(FPS*DUR), t0=Date.now();
  for(let i=0;i<N;i++){
    await p.evaluate(t=>window.__drive(t), i/FPS);
    await p.screenshot({path:path.join(OUT,`a_${String(i).padStart(4,'0')}.png`)});
    if(i%60===0) process.stdout.write(`${i}/${N} ${((Date.now()-t0)/1000).toFixed(0)}s\n`);
  }
  console.log(`app motion: ${N} frames in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  await b.close();
})();
