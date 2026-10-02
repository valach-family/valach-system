import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
const PUB=resolve('v3app/public');
const TY={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
const srv=createServer(async(q,r)=>{try{const f=resolve(PUB,(q.url||'/').split('?')[0].replace(/^\/+/,'')||'demo-index.html');
 if(!f.startsWith(PUB)){r.writeHead(403).end('x');return;}
 r.writeHead(200,{'content-type':TY[extname(f)]||'application/octet-stream','cache-control':'no-store'}).end(await readFile(f));}catch{r.writeHead(404).end('x');}});
await new Promise(k=>srv.listen(0,'127.0.0.1',k));
const B=`http://127.0.0.1:${srv.address().port}`;
const story=process.argv[2]||'invite-revoke';
const KEY = story==='reentry' ? 'tour.reentry' : 'tour.inviteRevoke';
const PKG = JSON.parse(await readFile(resolve('v3app/public/demo-assistant.json'),'utf8'));
const STEPS = (PKG.status.tours.find(t=>t.id===KEY)||{}).steps||[];
console.log(`${KEY}: ${STEPS.length} deklaralt lepes`);
const W=Number(process.argv[3]||1280), H=Number(process.argv[4]||900);
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:W,height:H}});
const p=await ctx.newPage();
p.on('pageerror',e=>console.log('  !! LAPHIBA:',e.message));
const T=t=>p.locator(`[data-testid="${t}"]`).first();
const has=async(sel)=>(await p.locator(sel).count())>0;
/** A VALODI muveletek — a bemutato ezeket SOHA nem vegzi el, a tanu viszont igen (ez a felhasznalo). */
async function doTask(p, s, task){
  if (task==='actor.switched') {
    // A FELHASZNALO ELOBB BEZARJA A NYITOTT PANELT: modalis panel mellett a demo sav nem elerheto.
    const dlg = await p.evaluate(()=>{const d=document.querySelector('[data-testid="panel"]'); return !!(d&&d.open);});
    if (dlg) { await p.locator('[data-testid="panel"] [data-action="panel-close"]').first().click().catch(()=>{}); await p.waitForTimeout(500); }
    await p.locator('[data-tour-anchor="actor-switch"]').first().click(); return 'nezo-valtas';
  }
  if (task==='invite.revoked' && await has('[data-testid^="invite-revoke-"]')) {
    await p.locator('[data-testid^="invite-revoke-"]').first().scrollIntoViewIfNeeded();
    await p.locator('[data-testid^="invite-revoke-"]').first().click();
    await p.waitForTimeout(500);
    if (await has('[data-testid="invite-revoke-confirm"]')) { await T('invite-revoke-confirm').click(); return 'meghivo visszavonva'; }
  }
  if (task==='member.revoked' && await has('[data-testid^="member-revoke-"]')) {
    await p.locator('[data-testid^="member-revoke-"]').first().click(); await p.waitForTimeout(500);
    if (await has('[data-testid="revoke-confirm"]')) { await T('revoke-confirm').click(); return 'tagsag megszuntetve'; }
  }
  if (task==='reinvite.sent' && await has('[data-testid="reinvite-confirm"]')) { await T('reinvite-confirm').click(); return 'ujra meghivas elkuldve'; }
  if (task==='grant.saved' && await has('[data-testid^="member-scope-grant-"]')) {
    await p.locator('[data-testid^="member-scope-grant-"]').first().click(); return 'keszlet-jog megadva';
  }
  if (task==='invite.created' && await has('[data-testid="invite-submit"]')) {
    const em=p.locator('[data-testid="invite-email"]');
    if (await em.count()) await em.fill('bela@mintamuhely.hu');
    await T('invite-submit').click(); return 'uj meghivo kiadva';
  }
  if (task==='invite.redeemed' && await has('[data-testid="invite-redeem"]')) { await T('invite-redeem').click(); return 'meghivo elfogadva'; }
  return null;
}
const snap=()=>p.evaluate(()=>{const box=document.querySelector('[data-testid="tour"]');
  if(!box) return {nincs:true};
  const g=t=>box.querySelector(`[data-testid="${t}"]`);
  const li=document.querySelector('[data-testid^="tour-step-"][aria-current="step"]');
  return {hidden:box.hidden, aborted:g('tour-aborted')?g('tour-aborted').getAttribute('data-why'):null,
    pending:g('tour-pending')?g('tour-pending').getAttribute('data-why'):null,
    blocked:!!g('tour-blocked'), title:(g('tour-step-title')||{}).textContent||null,
    hasNext:!!g('tour-next'), hasFinish:!!g('tour-finish'),
    step:li?li.getAttribute('data-testid')+'='+li.getAttribute('data-state'):null,
    marked:[...document.querySelectorAll('.tourtarget')].map(e=>e.getAttribute('data-testid')||e.getAttribute('data-tour-anchor'))};});
await p.goto(`${B}/demo-index.html`,{waitUntil:'networkidle'}); await p.waitForTimeout(800);
await T(`demo-story-${story}`).click(); await p.waitForTimeout(1800);
console.log('INDULAS:',JSON.stringify(await snap()));
for(let i=0;i<40;i++){
  const s=await snap();
  if(s.nincs){console.log(`  [${i}] a lap meg all fel...`); await p.waitForTimeout(1500); continue;}
  if(s.aborted){console.log(`  [${i}] MEGSZAKADT: ${s.aborted}`);
    console.log('     lapon levo horgonyok:', JSON.stringify(await p.evaluate(()=>({
      nav:[...document.querySelectorAll('[data-testid^="nav-"]')].map(e=>e.getAttribute('data-testid')),
      fejlec: (document.querySelector('[data-testid="header-subject"]')||{}).textContent,
      fiok: (document.querySelector('[data-testid="header-workspace"]')||{}).textContent,
      authLathato: !document.querySelector('[data-testid="auth"]').hidden,
    }))));
    break;}
  console.log(`  [${i}] ${s.step} | "${(s.title||'').slice(0,42)}" | pending=${s.pending} marked=${s.marked} next=${s.hasNext} finish=${s.hasFinish}`);
  if(s.hasFinish && !s.hasNext && !s.pending){console.log('  VEGE (Befejezes)');break;}
  if(s.pending){ const m=s.marked[0]; if(!m){console.log('  !! feltarasra var, de nincs kiemelt elem');break;}
    console.log(`     -> megnyomom a feltarot: ${m}`);
    // A FELTARO LEHET TAROLO: ilyenkor a BENNE levo elso megnyomhato elemre kattintunk (a felhasznalo utja).
    const sel=`[data-testid="${m}"],[data-tour-anchor="${m}"]`;
    const inner=await p.evaluate((q)=>{const c=document.querySelector(q);
      if(!c) return null; if(c.tagName==='BUTTON'||c.tagName==='A') return 'self';
      const b=c.querySelector('a[href],button:not([disabled])'); return b? (b.getAttribute('data-testid')||'__first') : null;}, sel);
    if(inner==='self'||inner===null){ await p.locator(sel).first().click().catch(e=>console.log('     !! kattintas hiba:',e.message.slice(0,60))); }
    else if(inner==='__first'){ await p.locator(sel).first().locator('a[href],button:not([disabled])').first().click().catch(e=>console.log('     !! kattintas hiba:',e.message.slice(0,60))); }
    else { await p.locator(`[data-testid="${inner}"]`).first().click().catch(e=>console.log('     !! kattintas hiba:',e.message.slice(0,60))); }
    await p.waitForLoadState('networkidle').catch(()=>{});
    await p.waitForTimeout(1800); continue; }
  // A FELADATHOZ KOTOTT LEPES: a VALODI muveletet vegezzuk el.
  const sid = s.step ? s.step.split('=')[0].replace('tour-step-','') : null;
  const task = (STEPS.find(x=>x.id===sid)||{}).task || null;
  const doneAlready = s.step && s.step.endsWith('=done');
  const did = doneAlready ? null : await doTask(p, s, task);
  if (did) { console.log(`     -> muvelet: ${did}`); await p.waitForTimeout(1600); continue; }
  // A NAVIGACIOS LEPESNEL A FELHASZNALO RAKATTINT A KIEMELT MENUPONTRA (ez a valodi ut).
  const m0=s.marked[0];
  if(m0 && m0.startsWith('nav-')){ await p.locator(`[data-testid="${m0}"]`).first().click().catch(()=>{}); await p.waitForTimeout(700); }
  if(s.hasNext){ await T('tour-next').click(); await p.waitForTimeout(700);
    const after=await snap();
    if(after.step===s.step && after.blocked){ console.log('     (a Tovabb nem zarta le — helyes)'); }
    if(after.step===s.step && !after.blocked && !did){ console.log('     !! Tovabb nem vitt tovabb es nincs muvelet'); break; }
    continue; }
  console.log('  !! nincs folytatas — itt all meg'); break;
}
await p.screenshot({path:process.env.SHOT||'/tmp/drive.png'});
await b.close(); srv.close();
