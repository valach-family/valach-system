import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
const PUB=resolve('v3app/public');
const TY={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
const srv=createServer(async(q,r)=>{try{const f=resolve(PUB,(q.url||'/').split('?')[0].replace(/^\/+/,'')||'demo-index.html');
 r.writeHead(200,{'content-type':TY[extname(f)]||'application/octet-stream','cache-control':'no-store'}).end(await readFile(f));}catch{r.writeHead(404).end('x');}});
await new Promise(k=>srv.listen(0,'127.0.0.1',k));
const B=`http://127.0.0.1:${srv.address().port}`;
const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
p.on('pageerror',e=>console.log('LAPHIBA:',e.message));
p.on('console',m=>{if(m.type()==='error')console.log('KONZOL:',m.text().slice(0,160));});
await p.goto(`${B}/demo-index.html`,{waitUntil:'networkidle'}); await p.waitForTimeout(1200);
console.log(JSON.stringify(await p.evaluate(()=>({
  story: window.VS_DEMO && window.VS_DEMO.story(),
  actor: window.VS_DEMO && window.VS_DEMO.actor(),
  appUp: !!document.querySelector('[data-testid="app"]') && !document.querySelector('[data-testid="app"]').hidden,
  nav: [...document.querySelectorAll('[data-testid^="nav-"]')].map(e=>e.getAttribute('data-testid')),
})),null,1));
await p.locator('[data-testid="demo-story-invite-revoke"]').click();
await p.waitForTimeout(2500);
console.log('KATTINTAS UTAN:', JSON.stringify(await p.evaluate(()=>({
  story: window.VS_DEMO && window.VS_DEMO.story(),
  tourBoxHidden: document.querySelector('[data-testid="tour"]').hidden,
  tourHtmlLen: document.querySelector('[data-testid="tour"]').innerHTML.length,
}))));
await b.close(); srv.close();
