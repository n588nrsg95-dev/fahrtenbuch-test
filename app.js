const $=id=>document.getElementById(id);
const KEY='fahrtenbuch_v6_4';
let state=load();
let pendingKind='visit';
let pendingPhoto='';
let editingId='';

function uid(){return crypto.randomUUID?.()||String(Date.now()+Math.random())}
function load(){try{const raw=localStorage.getItem(KEY)||localStorage.getItem('fahrtenbuch_v6_2')||localStorage.getItem('fahrtenbuch_v6_0')||localStorage.getItem('fahrtenbuch_v5_17')||localStorage.getItem('fahrtenbuch_v5_12')||localStorage.getItem('fahrtenbuch_v5_10')||localStorage.getItem('fahrtenbuch.v5')||localStorage.getItem('fahrtenbuch.v4');return norm(raw?JSON.parse(raw):{})}catch{return norm({})}}
function norm(d){
  const drivers=[]; function addDriver(v){v=String(v||'').trim(); if(!v)return null; let ex=drivers.find(x=>x.name.toLowerCase()===v.toLowerCase()); if(ex)return ex; ex={id:uid(),name:v}; drivers.push(ex); return ex}
  (d.drivers||[]).forEach(x=>addDriver(typeof x==='string'?x:(x.name||x.driverName||x.driver)));
  if(d.driverName||d.driver)addDriver(d.driverName||d.driver);
  const addresses=[]; function addAddress(v){v=String(v||'').trim(); if(!v)return null; let ex=addresses.find(x=>x.address.toLowerCase()===v.toLowerCase()); if(ex)return ex; ex={id:uid(),address:v}; addresses.push(ex); return ex}
  (d.addresses||d.patients||[]).forEach(a=>addAddress(typeof a==='string'?a:(a.address||a.anschrift||a.name||a.patient)));
  const activeDriverId=d.activeDriverId||drivers[0]?.id||'';
  const entries=(d.entries||[]).map(e=>{
    let a=addresses.find(x=>x.id===(e.addressId||e.patientId)); if(!a)a=addAddress(e.address||e.anschrift||e.patient||e.addressName||e.patientName);
    let dr=drivers.find(x=>x.id===e.driverId); if(!dr)dr=addDriver(e.driverName||e.driver||d.driverName||d.driver||'');
    return {id:e.id||uid(),kind:e.kind||'visit',driverId:dr?.id||'',driverName:dr?.name||'',addressId:a?.id||'',address:a?.address||e.address||'',km:Number(e.km)||0,date:e.date||new Date(e.ts||Date.now()).toISOString().slice(0,10),photo:e.photo||''}
  });
  return {drivers,activeDriverId,addresses,entries,rate:Number(d.rate??.30)||.30,currentAddressId:''};
}
function save(){localStorage.setItem(KEY,JSON.stringify(state));render()}
function show(id){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$(id).classList.add('active')}
function today(){return new Date().toISOString().slice(0,10)}
function fdate(iso){const [y,m,d]=iso.split('-');return `${d}.${m}.${y}`}
function monthLabel(ym){const [y,m]=ym.split('-');return `${m}.${y}`}
function label(k){return k==='first'?'Erster Patient':k==='last'?'Letzter Patient':'Patient'}
function currentDriver(){return state.drivers.find(d=>d.id===state.activeDriverId)||null}
function sorted(){return [...state.entries].sort((a,b)=>(a.date+' '+String(a.km).padStart(9,'0')).localeCompare(b.date+' '+String(b.km).padStart(9,'0')))}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function rateText(){return(Number(state.rate)||.3).toFixed(2).replace('.',',')}
function parseRate(v){const n=Number(String(v).replace(',','.').replace(/[^0-9.]/g,''));return n>0?n:.3}

function render(){
  $('currentDriver').textContent=currentDriver()?.name||'Bitte auswählen';
  $('todayText').textContent='Heute, '+fdate(today());
  $('todayCount').textContent=state.entries.filter(e=>e.date===today()).length+' Einträge';
  if($('rateInput'))$('rateInput').value=rateText();
  renderDrivers(); renderAddresses(); renderEntries();
}
function renderDrivers(){
  const sel=$('driverSelect'), list=$('driverList'); if(!sel)return;
  const arr=[...state.drivers].sort((a,b)=>a.name.localeCompare(b.name,'de'));
  sel.innerHTML='<option value="">Bitte auswählen</option>'+arr.map(d=>`<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('');
  sel.value=state.activeDriverId||'';
  list.innerHTML=arr.length?'<b>Schnellauswahl</b>':'<p>Noch keine Fahrer gespeichert.</p>';
  arr.forEach(d=>{const b=document.createElement('button');b.className='chip'+(d.id===state.activeDriverId?' active':'');b.textContent=d.name;b.onclick=()=>{state.activeDriverId=d.id;save();show('home')};list.appendChild(b)})
}
function renderAddresses(){
  const sel=$('addressSelect'); if(!sel)return;
  const arr=[...state.addresses].sort((a,b)=>a.address.localeCompare(b.address,'de'));
  sel.innerHTML='<option value="">Bekannte Anschrift auswählen</option>'+arr.map(a=>`<option value="${esc(a.id)}">${esc(a.address)}</option>`).join('');
  sel.onchange=()=>{const a=state.addresses.find(x=>x.id===sel.value); if(a)$('addressText').value=a.address};
}
function renderEntries(){
  const l=$('entryList'); if(!l)return; l.innerHTML=''; const arr=sorted();
  if(!arr.length){l.innerHTML='<div class="panel">Noch keine Einträge vorhanden.</div>';return}
  let d=''; arr.forEach(e=>{if(e.date!==d){d=e.date;const h=document.createElement('div');h.className='day';h.textContent=fdate(d);l.appendChild(h)}
    const btn=document.createElement('button');btn.className='entry';btn.type='button';btn.onclick=()=>openEdit(e.id);
    btn.innerHTML=`<div><b>${label(e.kind)}</b><small>${esc(e.driverName||'')}<br>${esc(e.address||'')}${e.photo?'<br><span class="photoBadge">📷 Foto vorhanden</span>':''}</small></div><div class="km"><b>${e.km}</b><small>km</small></div>`;
    l.appendChild(btn)
  })
}
function addDriver(){const v=$('newDriver').value.trim();if(!v){alert('Bitte Fahrername eintragen.');return}let d=state.drivers.find(x=>x.name.toLowerCase()===v.toLowerCase());if(!d){d={id:uid(),name:v};state.drivers.push(d)}state.activeDriverId=d.id;$('newDriver').value='';save();show('home')}
function useDriver(){const id=$('driverSelect').value;if(!id){alert('Bitte Fahrer auswählen oder neu anlegen.');return}state.activeDriverId=id;save();show('home')}
function start(kind){if(!currentDriver()){alert('Bitte zuerst einen Fahrer auswählen oder anlegen.');show('drivers');return}pendingKind=kind;pendingPhoto='';$('formTitle').textContent=label(kind)+' erfassen';$('formDriver').textContent=currentDriver().name;$('addressSelect').value='';$('addressText').value='';$('kmInput').value='';$('photoPreview').classList.add('hidden');$('photoPreview').innerHTML='';show('entryForm')}
function rememberAddress(){const v=$('addressText').value.trim();if(!v){alert('Bitte Anschrift eintragen.');return null}let a=state.addresses.find(x=>x.address.toLowerCase()===v.toLowerCase());if(!a){a={id:uid(),address:v};state.addresses.push(a);save()}else renderAddresses(); return a}
function saveEntry(){const dr=currentDriver();if(!dr){alert('Bitte Fahrer auswählen.');show('drivers');return}const a=rememberAddress();if(!a)return;const km=String($('kmInput').value).replace(/\D/g,'');if(!km){alert('Bitte Kilometerstand eintragen.');return}state.entries.push({id:uid(),kind:pendingKind,driverId:dr.id,driverName:dr.name,addressId:a.id,address:a.address,km:Number(km),date:today(),photo:pendingPhoto||''});state.currentAddressId='';$('addressText').value='';$('kmInput').value='';pendingPhoto='';save();show('home')}
function readPhoto(file,cb){if(!file)return;const r=new FileReader();r.onload=()=>cb(r.result);r.readAsDataURL(file)}
async function shrinkImage(data,max=1000,q=.72){try{const img=new Image();await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=data});const sc=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*sc));c.height=Math.max(1,Math.round(img.height*sc));c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',q)}catch{return data}}
function choosePhoto(){ $('photoInput').value=''; $('photoInput').click() }
function setPhoto(file){readPhoto(file,async data=>{pendingPhoto=await shrinkImage(data);$('photoPreview').innerHTML=`<img src="${pendingPhoto}" alt="Foto">`;$('photoPreview').classList.remove('hidden')})}
function openEdit(id){const e=state.entries.find(x=>x.id===id);if(!e)return;editingId=id;$('editKind').value=e.kind;$('editAddress').value=e.address||'';$('editKm').value=e.km||'';const sel=$('editDriver');sel.innerHTML=state.drivers.map(d=>`<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('');sel.value=e.driverId||state.activeDriverId||'';show('editEntry')}
function updateEntry(){const e=state.entries.find(x=>x.id===editingId);if(!e)return;const dr=state.drivers.find(d=>d.id===$('editDriver').value);const address=$('editAddress').value.trim();const km=String($('editKm').value).replace(/\D/g,'');if(!address||!km){alert('Bitte Anschrift und Kilometerstand eintragen.');return}let a=state.addresses.find(x=>x.address.toLowerCase()===address.toLowerCase());if(!a){a={id:uid(),address};state.addresses.push(a)}Object.assign(e,{kind:$('editKind').value,driverId:dr?.id||'',driverName:dr?.name||'',addressId:a.id,address:a.address,km:Number(km)});save();show('entries')}
function deleteEntry(){if(!editingId)return;if(confirm('Diesen Eintrag wirklich löschen?')){state.entries=state.entries.filter(e=>e.id!==editingId);editingId='';save();show('entries')}}
function availableMonths(){return [...new Set(state.entries.map(e=>String(e.date||'').slice(0,7)).filter(x=>/^\d{4}-\d{2}$/.test(x)))].sort()}
function monthRange(ym){const [y,m]=ym.split('-').map(Number);const last=new Date(y,m,0).getDate();return `01.${String(m).padStart(2,'0')}. - ${String(last).padStart(2,'0')}.${String(m).padStart(2,'0')}.`}
function monthSafe(ym){return ym||new Date().toISOString().slice(0,7)}
function driverSafeName(){const n=(currentDriver()?.name||'Alle_Fahrer').trim();return n.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g,'_').replace(/^_+|_+$/g,'')||'Fahrer'}
let pendingExportType='excel';
function chooseMonth(type){pendingExportType=type;const months=availableMonths();if(!months.length){alert('Es sind noch keine Einträge vorhanden.');return}const list=$('monthList');list.innerHTML='';months.slice().reverse().forEach((m,i)=>{const count=state.entries.filter(e=>String(e.date||'').startsWith(m)).length;const id='month_'+i;const row=document.createElement('label');row.className='monthOption';row.innerHTML=`<input type="radio" name="exportMonth" value="${esc(m)}" ${i===0?'checked':''}><div><b>${monthLabel(m)}</b><small>${monthRange(m)} · ${count} Einträge</small></div>`;list.appendChild(row)});show('monthSelect')}
function getSelectedMonth(){return document.querySelector('input[name="exportMonth"]:checked')?.value||availableMonths().at(-1)||null}
function doMonthExport(){const ym=getSelectedMonth();if(!ym)return;show('settings');if(pendingExportType==='pdf')buildPdfForMonth(ym);else exportExcelForMonth(ym)}
function rowsMonth(ym){let prevDate='',prevKm=null;return sorted().filter(e=>e.date.startsWith(ym)).map(e=>{if(e.date!==prevDate){prevDate=e.date;prevKm=null}let dist='';if(prevKm!==null&&e.km>=prevKm)dist=e.km-prevKm;prevKm=e.km;return{...e,dist,eur:dist===''?'':dist*state.rate}})}
function exportExcel(){state.rate=parseRate($('rateInput')?.value||rateText());save();chooseMonth('excel')}
function buildPdf(){state.rate=parseRate($('rateInput')?.value||rateText());save();chooseMonth('pdf')}
function exportExcelForMonth(ym){const rows=rowsMonth(ym);let sumKm=0,sumE=0;let html='<html><head><meta charset="utf-8"></head><body><table border="1">';html+=`<tr><th colspan="7">Fahrtenbuch Monatsabrechnung ${monthLabel(ym)}</th></tr>`;html+=`<tr><td>Kilometervergütung</td><td>${rateText()} EUR/km</td></tr><tr></tr>`;html+='<tr><th>Datum</th><th>Typ</th><th>Fahrer</th><th>Anschrift</th><th>KM-Stand</th><th>Strecke km</th><th>Erstattung EUR</th></tr>';rows.forEach(r=>{sumKm+=Number(r.dist)||0;sumE+=Number(r.eur)||0;html+=`<tr><td>${fdate(r.date)}</td><td>${label(r.kind)}</td><td>${esc(r.driverName)}</td><td>${esc(r.address)}</td><td>${r.km}</td><td>${r.dist}</td><td>${r.eur===''?'':r.eur.toFixed(2).replace('.',',')}</td></tr>`});html+=`<tr><td colspan="5"><b>Summe</b></td><td><b>${sumKm}</b></td><td><b>${sumE.toFixed(2).replace('.',',')}</b></td></tr>`;html+='</table></body></html>';download(new Blob([html],{type:'application/vnd.ms-excel'}),`${ym}_Fahrtenbuch_${driverSafeName()}.xls`)}
function buildPdfForMonth(ym){const rows=rowsMonth(ym);let sumKm=0,sumE=0;let html=`<h1>Fahrtenbuch Monatsabrechnung</h1><div class="pdfMeta">Monat: ${monthLabel(ym)}<br>Kilometervergütung: ${rateText()} €/km<br>Erstellt am: ${new Date().toLocaleDateString('de-DE')}</div><table class="pdfTable"><thead><tr><th>Datum</th><th>Typ</th><th>Fahrer</th><th>Anschrift</th><th>KM</th><th>Strecke</th><th>Erstattung</th></tr></thead><tbody>`;rows.forEach(r=>{sumKm+=Number(r.dist)||0;sumE+=Number(r.eur)||0;html+=`<tr><td>${fdate(r.date)}</td><td>${label(r.kind)}</td><td>${esc(r.driverName)}</td><td>${esc(r.address)}</td><td>${r.km}</td><td>${r.dist}</td><td>${r.eur===''?'':r.eur.toFixed(2).replace('.',',')+' €'}</td></tr>`});html+=`</tbody></table><div class="pdfSummary"><b>Zusammenfassung</b><br>Einträge: ${rows.length}<br>Gesamtkilometer: ${sumKm} km<br>Gesamterstattung: ${sumE.toFixed(2).replace('.',',')} €</div>`;$('pdfContent').innerHTML=html;show('pdfView')}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
function backup(){download(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),'fahrtenbuch-backup.json')}
function clearTrips(){if(confirm('Wirklich alle Fahrtenbuchdaten löschen?')){state.entries=[];save();show('home')}}
function clearContacts(){if(confirm('Wirklich alle Adressdaten löschen?')){state.addresses=[];save();show('home')}}
function clearDrivers(){if(confirm('Wirklich alle Fahrerdaten löschen? Fahrten bleiben erhalten, behalten aber den gespeicherten Fahrernamen.')){state.drivers=[];state.activeDriverId='';save();show('home')}}

document.addEventListener('DOMContentLoaded',()=>{
  render(); navigator.serviceWorker?.register('sw.js').catch(()=>{});
  $('settingsBtn').onclick=()=>show('settings'); $('driverCard').onclick=()=>show('drivers');
  $('useDriver').onclick=useDriver; $('addDriver').onclick=addDriver;
  document.querySelectorAll('.action').forEach(b=>b.onclick=()=>start(b.dataset.kind));
  document.querySelectorAll('.back').forEach(b=>b.onclick=()=>show('home'));
  $('entriesBtn').onclick=()=>{render();show('entries')}; $('saveAddressBtn').onclick=rememberAddress;
  $('photoBtn').onclick=choosePhoto; $('photoInput').onchange=e=>setPhoto(e.target.files[0]); $('saveEntry').onclick=saveEntry;
  $('updateEntry').onclick=updateEntry; $('deleteEntry').onclick=deleteEntry; document.querySelector('.backEntries').onclick=()=>show('entries');
  $('rateInput').onchange=()=>{state.rate=parseRate($('rateInput').value);save()}; $('excelBtn').onclick=exportExcel; $('pdfBtn').onclick=buildPdf; $('monthBack').onclick=()=>show('settings'); $('monthExport').onclick=doMonthExport; $('pdfBack').onclick=()=>show('settings'); $('printPdf').onclick=()=>window.print();
  $('backupBtn').onclick=backup; $('clearTripsBtn').onclick=clearTrips; $('clearContactsBtn').onclick=clearContacts; $('clearDriversBtn').onclick=clearDrivers;
});
