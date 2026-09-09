const { chromium } = require('playwright-core');
const path=require('path'), fs=require('fs');
const DIR=__dirname, EXE=process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const args=process.argv.slice(2), mode=args[0]||'all';
  const outDir=path.join(DIR, mode==='preview'?'preview':'frames');
  fs.mkdirSync(outDir,{recursive:true});
  if(mode==='all') for(const f of fs.readdirSync(outDir)) fs.unlinkSync(path.join(outDir,f));
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox','--hide-scrollbars','--disable-lcd-text']});
  const p=await b.newPage({viewport:{width:1080,height:1080},deviceScaleFactor:1});
  p.on('pageerror',e=>console.log('PAGEERROR:',String(e).slice(0,200)));
  p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE:',m.text().slice(0,200));});
  await p.goto('file://'+path.join(DIR,'edit.html'));
  await p.waitForFunction('window.__ready===true',{timeout:60000});
  await p.waitForTimeout(300);
  let times, startIdx=0;
  if(mode==='range'){
    const a=Number(args[1]), b=Number(args[2]);
    times=[]; for(let i=a;i<=b;i++) times.push(i/60);
    startIdx=a;
  } else if(mode==='preview') times=args.slice(1).map(Number);
  else { const FPS=60,DUR=21.62; times=[]; for(let i=0;i<Math.round(DUR*FPS);i++) times.push(i/FPS); }
  const t0=Date.now();
  for(let i=0;i<times.length;i++){
    await p.evaluate(async t=>{ await window.renderFrame(t); }, times[i]);
    const name = mode==='preview'?`p_${times[i].toFixed(2)}.png`:`f_${String(startIdx+i).padStart(5,'0')}.png`;
    await p.screenshot({path:path.join(outDir,name)});
    if(mode!=='preview'&&i%120===0) process.stdout.write(`${i}/${times.length} ${((Date.now()-t0)/1000).toFixed(0)}s\n`);
  }
  console.log(`done ${times.length} frames in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  await b.close();
})();
