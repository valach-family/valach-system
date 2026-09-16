import {openStore,clockFrom} from './v3ref/store.mjs';
import {registerItem} from './v3ref/catalog.mjs';
import {submitStockReceipt,balanceAt} from './v3ref/ledger.mjs';
import {writeFileSync} from 'node:fs';
const T='2026-03-01T00:00:00Z',J='2026-06-01T00:00:00Z';
const s=openStore();const rows=[];
try{
for(const b of ['a','b'])s.run('INSERT INTO book VALUES (?,?)',b,b);
for(const u of ['u','outsider'])s.run('INSERT INTO subject VALUES (?,?)',u,'person');
s.run('INSERT INTO membership VALUES (?,?,?,?,NULL)','u','a','user','2026-01-01T00:00:00Z');
const own=registerItem({store:s,bookId:'a',sku:'OWN',unit:'db',qtyProfile:'qty-2',at:T});
const foreign=registerItem({store:s,bookId:'b',sku:'FOREIGN',unit:'db',qtyProfile:'qty-2',at:T});
const key={bookId:'a',itemId:own.itemId,ownerId:'u',warehouseId:'w'};
function receipt(id,qty,opts={}){return submitStockReceipt({store:s,idemKey:id,actor:opts.actor||'u',bookId:'a',ownerId:'u',warehouseId:opts.warehouse||'w',input:{item_id:opts.itemId||own.itemId,qty,effective_at:opts.effective||T},clock:clockFrom(opts.at||T)});}
function rec(id,ok,detail){rows.push({id,ok,detail});}
const a=receipt('once','1'),b=receipt('once','1');rec('repeat-canonical',a.ok&&b.ok&&b.replayed&&s.get('SELECT COUNT(*) n FROM stock_movement').n===1,{a,b});
const conflict=receipt('once','1',{warehouse:'other'});rec('scope-conflict',conflict.error==='idempotency_conflict',conflict);
const cross=receipt('cross','1',{itemId:foreign.itemId});rec('cross-book-write-rejected',cross.ok===false,cross);
const future=receipt('future','1',{effective:J});const past=balanceAt({store:s,key,view:'A',asOf:T});rec('future-not-in-past',future.ok&&past.text==='1',{future,past});
const invalid=receipt('date','1',{effective:'2026-02-30T00:00:00Z'});rec('calendar-invalid',invalid.ok===false,invalid);
for(let i=0;i<9;i++)receipt('fill'+i,'1000',{effective:J,at:J});receipt('fillLast','998',{effective:J,at:J});
const before={cmd:s.get('SELECT COUNT(*) n FROM command').n,ev:s.get('SELECT COUNT(*) n FROM command_event').n,mov:s.get('SELECT COUNT(*) n FROM stock_movement').n};
const over=receipt('over','1',{effective:T,at:J});const after={cmd:s.get('SELECT COUNT(*) n FROM command').n,ev:s.get('SELECT COUNT(*) n FROM command_event').n,mov:s.get('SELECT COUNT(*) n FROM stock_movement').n};rec('backdate-overflow-atomic',over.error==='sum_out_of_range'&&JSON.stringify(before)===JSON.stringify(after),{over,before,after});
const unknown=receipt('u1','1',{actor:'outsider',itemId:'not-present'}),exists=receipt('u2','1',{actor:'outsider',itemId:foreign.itemId});rec('unauthorized-object-neutral',JSON.stringify(unknown)===JSON.stringify(exists),{unknown,exists});
}finally{s.close();}
const text=JSON.stringify(rows,(_,v)=>typeof v==='bigint'?v.toString():v,2);writeFileSync(new URL('./challenge.json',import.meta.url),text);console.log(text);
