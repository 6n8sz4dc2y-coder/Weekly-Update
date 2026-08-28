// RRG Group Service Figures (VCF) dashboard.
// Mirrors the Weekly Update hub's look, persistence and admin-upload pattern,
// but parses a single "Export" workbook of Centre + repeating pillar groups
// (each group is however many sub-columns the export has, typically
// Actual / Target / SvO). The parser is dynamic so new pillars, renamed
// pillars, or extra sub-columns in a future export are picked up without
// code changes.

const SERVICE_BUILD_VERSION = '2026.08.28.1';
const SERVICE_META_KEY = 'rrgServiceDashboardMeta_v1';
const SERVICE_DATA_KEY = 'rrgServiceDashboardData_v1';

function formatPublishedAt(iso){
  if(!iso) return '-';
  try{ return new Date(iso).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}); }
  catch(e){ return iso; }
}
function getServiceMeta(){
  try{
    const saved = JSON.parse(localStorage.getItem(SERVICE_META_KEY) || 'null');
    if(saved) return saved;
  }catch(e){}
  return { version: SERVICE_BUILD_VERSION, publishedAt: null };
}
function makePublishVersion(){
  const d = new Date();
  return d.toISOString().slice(0,16).replace('T','.').replace(':','');
}
function saveServiceMeta(){
  const meta = { version: makePublishVersion(), publishedAt: new Date().toISOString() };
  localStorage.setItem(SERVICE_META_KEY, JSON.stringify(meta));
  updateVersionDisplays();
  return meta;
}
function updateVersionDisplays(){
  const meta = getServiceMeta();
  const versionText = 'Version ' + meta.version;
  const publishedText = 'Published ' + formatPublishedAt(meta.publishedAt);
  ['liveVersionHeader','footerVersion','adminLiveVersion'].forEach(id=>setText(id, id==='adminLiveVersion' ? meta.version : versionText));
  ['livePublishedHeader','footerPublished','adminPublishedAt'].forEach(id=>setText(id, id==='adminPublishedAt' ? formatPublishedAt(meta.publishedAt) : publishedText));
}

function setText(id, value){ const el=document.getElementById(id); if(el) el.textContent=value; }

const fmt=n=>{if(n===null||n===undefined||Number.isNaN(n))return "-";return new Intl.NumberFormat('en-GB',{maximumFractionDigits:0}).format(n)};
const fmtGbp=n=>{if(n===null||n===undefined||Number.isNaN(n))return "-";return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n)};
const pct=n=>{if(n===null||n===undefined||Number.isNaN(n))return "-";return Math.round(n*100)+"%"};
const isCurrencyPillar = name => /purchase|£|value|revenue|spend/i.test(String(name||''));
const displayVal = (pillarName, n) => isCurrencyPillar(pillarName) ? fmtGbp(n) : fmt(n);
const svoClass = n => n===null||n===undefined ? '' : (n>=1?'green':n>=.9?'amber':'red');
const svoLabel = n => n===null||n===undefined ? 'No data' : (n>=1?'On / Ahead':n>=.9?'Watch':'Behind');
const progressBar = n => `<div class="progress"><div class="bar ${svoClass(n)}" style="width:${Math.min(Math.max((n||0)*100,0),120)}%"></div></div>`;
const statusPill = n => `<span class="status ${svoClass(n)}">${svoLabel(n)}</span>`;

// --- Parsing --------------------------------------------------------------
// Sheet shape: row0 = pillar names (first cell of each group, rest blank -
// i.e. what Excel shows for merged header cells), row1 = sub-column labels
// per pillar (Actual / Target / SvO, but read whatever is actually there),
// then one data row per centre, a Total row, and finally a free-text
// "Applied filters" row which has no numeric values - parsing stops there.
function parseVcfWorkbook(wb){
  const sheetName = wb.SheetNames.find(n=>/export/i.test(n)) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if(!ws) throw new Error('No sheets found in workbook');
  const rows = XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
  if(rows.length < 3) throw new Error('Expected a header row, a sub-header row and at least one data row');
  const row0 = rows[0], row1 = rows[1];

  const pillarAt = [];
  let current = null;
  for(let c=1;c<row0.length;c++){
    if(row0[c]!==null && String(row0[c]).trim()!==''){ current = String(row0[c]).trim(); }
    pillarAt[c] = current;
  }

  const groups = [];
  const byName = {};
  for(let c=1;c<row0.length;c++){
    const name = pillarAt[c];
    if(!name) continue;
    if(!byName[name]){ byName[name] = { name, cols: [] }; groups.push(byName[name]); }
    const label = row1[c]!==null && row1[c]!==undefined ? String(row1[c]).trim() : `Col${c}`;
    byName[name].cols.push({ label, key: label.toLowerCase(), idx: c });
  }
  if(!groups.length) throw new Error('Could not find any pillar columns in row 1 of the "' + sheetName + '" sheet');

  const dataRows = [];
  let total = null;
  for(let i=2;i<rows.length;i++){
    const r = rows[i];
    const centreRaw = r[0];
    if(centreRaw===null || centreRaw===undefined || String(centreRaw).trim()==='') continue;
    const centre = String(centreRaw).trim();
    const anyNumeric = groups.some(g=>g.cols.some(c=>typeof r[c.idx]==='number'));
    if(!anyNumeric) break; // hit the free-text "Applied filters" row - stop here
    const values = {};
    groups.forEach(g=>{
      const v = {};
      g.cols.forEach(c=>{
        const raw = r[c.idx];
        v[c.key] = typeof raw==='number' ? raw : (raw===null||raw===undefined||raw==='' ? null : Number(raw));
      });
      values[g.name] = v;
    });
    if(centre.toLowerCase()==='total'){ total = { centre, values }; }
    else { dataRows.push({ centre, values }); }
  }

  return {
    pillars: groups.map(g=>g.name),
    pillarGroups: groups,
    rows: dataRows,
    total,
    sheet: sheetName,
    importedAt: new Date().toISOString(),
  };
}

// --- Aggregation ------------------------------------------------------------
function pillarTotals(data, pillarName){
  if(data.total && data.total.values[pillarName]){
    const v = data.total.values[pillarName];
    return { actual: v.actual ?? null, target: v.target ?? null, svo: v.svo ?? (v.target ? (v.actual||0)/v.target : null) };
  }
  const actual = data.rows.reduce((a,r)=>a+(Number(r.values[pillarName]?.actual)||0),0);
  const target = data.rows.reduce((a,r)=>a+(Number(r.values[pillarName]?.target)||0),0);
  return { actual, target, svo: target ? actual/target : null };
}
function centreSvo(row, pillarName){
  const v = row.values[pillarName];
  if(!v) return null;
  if(v.svo!==null && v.svo!==undefined) return v.svo;
  return v.target ? (v.actual||0)/v.target : null;
}

// --- Rendering ----------------------------------------------------------
function renderPillarCards(data){
  const el = document.getElementById('pillarCards');
  if(!el) return;
  const span = data.pillars.length<=2 ? 'half' : data.pillars.length===3 ? 'third' : 'half';
  el.innerHTML = data.pillars.map(name=>{
    const t = pillarTotals(data, name);
    return `<div class="card kpi ${span} kpi-progress-card">
      <div class="label">${name}</div>
      <div class="value">${pct(t.svo)}</div>
      <div class="note"><strong>${displayVal(name,t.actual)}</strong> / <strong>${displayVal(name,t.target)}</strong> target</div>
      ${progressBar(t.svo)}
      <div class="kpi-footer-strip two-up"><div><span>Status</span><strong>${statusPill(t.svo)}</strong></div><div><span>Centres reporting</span><strong>${data.rows.length}</strong></div></div>
    </div>`;
  }).join('');
}

function renderLeaderboards(data){
  const el = document.getElementById('pillarLeaderboards');
  if(!el) return;
  el.innerHTML = data.pillars.map(name=>{
    const sorted = data.rows.slice().sort((a,b)=>(centreSvo(b,name)??-Infinity)-(centreSvo(a,name)??-Infinity));
    const rows = sorted.map((r,i)=>{
      const v = centreSvo(r,name);
      return `<div class="leader-row"><div class="rank">${i+1}</div><div class="centre">${r.centre}<div class="mini">${displayVal(name,r.values[name]?.actual)} / ${displayVal(name,r.values[name]?.target)}</div></div><div class="pct">${pct(v)}</div>${progressBar(v)}</div>`;
    }).join('');
    return `<div class="card half"><h3>${name}</h3><div class="leader">${rows || '<div class="hint">No centre data.</div>'}</div></div>`;
  }).join('');
}

const CENTRE_TABLE_SORT = {};
function renderCentreTable(data){
  const table = document.getElementById('centreTable');
  if(!table) return;
  const cols = [{label:'Centre', key:'centre'}];
  data.pillarGroups.forEach(g=>{
    g.cols.forEach(c=>{
      cols.push({ label: `${g.name} ${c.label}`, pillar: g.name, subKey: c.key, num: c.key!=='svo' || true, isSvo: c.key==='svo' });
    });
  });
  const rows = data.rows;
  const state = CENTRE_TABLE_SORT.centreTable || {};
  const sorted = rows.slice();
  if(state.index!==undefined){
    const col = cols[state.index];
    sorted.sort((a,b)=>{
      const av = col.key==='centre' ? a.centre : (a.values[col.pillar]?.[col.subKey] ?? -Infinity);
      const bv = col.key==='centre' ? b.centre : (b.values[col.pillar]?.[col.subKey] ?? -Infinity);
      const bothNum = typeof av==='number' && typeof bv==='number';
      const cmp = bothNum ? av-bv : String(av).localeCompare(String(bv), undefined, {numeric:true, sensitivity:'base'});
      return state.dir==='desc' ? -cmp : cmp;
    });
  }
  table.classList.add('table-centre');
  table.innerHTML = `<thead><tr>${cols.map((c,i)=>{
    const active = state.index===i;
    const arrow = active ? (state.dir==='desc' ? ' ▼' : ' ▲') : '';
    const kind = c.key==='centre' ? '' : (c.subKey==='target' ? 'col-target' : c.subKey==='actual' ? 'col-actual' : '');
    return `<th data-sort-index="${i}" class="sortable ${c.key!=='centre'?'num':''} ${active?'sorted':''} ${kind}" title="Click to sort">${c.label}${arrow}</th>`;
  }).join('')}</tr></thead><tbody>${sorted.map(r=>`<tr>${cols.map(c=>{
    if(c.key==='centre') return `<td>${r.centre}</td>`;
    const v = r.values[c.pillar]?.[c.subKey];
    const kind = c.subKey==='target' ? 'col-target' : c.subKey==='actual' ? 'col-actual' : '';
    const text = c.isSvo ? pct(v) : displayVal(c.pillar, v);
    return `<td class="num ${kind}">${text}</td>`;
  }).join('')}</tr>`).join('')}</tbody>`;
  table.querySelectorAll('th[data-sort-index]').forEach(th=>{
    th.addEventListener('click',()=>{
      const index = Number(th.dataset.sortIndex);
      const cur = CENTRE_TABLE_SORT.centreTable || {};
      const dir = cur.index===index && cur.dir==='desc' ? 'asc' : 'desc';
      CENTRE_TABLE_SORT.centreTable = { index, dir };
      renderCentreTable(data);
    });
  });
}

function renderEmptyState(){
  const el = document.getElementById('pillarCards');
  if(el) el.innerHTML = '<div class="card wide"><div class="note-box">No service figures loaded yet. Go to <strong>Admin Update</strong> and upload the VCF export workbook.</div></div>';
  const lb = document.getElementById('pillarLeaderboards');
  if(lb) lb.innerHTML = '';
  const table = document.getElementById('centreTable');
  if(table) table.innerHTML = '';
}

function build(){
  if(!DATA || !DATA.rows || !DATA.pillars){ renderEmptyState(); updateVersionDisplays(); return; }
  renderPillarCards(DATA);
  renderLeaderboards(DATA);
  renderCentreTable(DATA);
  updateVersionDisplays();
}

// --- Data bootstrap -------------------------------------------------------
let DATA = window.SERVICE_DASHBOARD_DATA || null;
try{
  const saved = localStorage.getItem(SERVICE_DATA_KEY);
  if(saved) DATA = JSON.parse(saved);
}catch(e){ console.warn('Saved service dashboard data could not be loaded', e); }
let PENDING_DATA = null;

// --- Admin: import / publish / backup / reset -----------------------------
function readFileAsArrayBuffer(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
function renderAdminPreview(data){
  const table = document.getElementById('adminPreviewTable');
  if(!table) return;
  const cols = [{label:'Centre'}].concat(data.pillars.flatMap(p=>[`${p} Actual`,`${p} Target`,`${p} SvO`].map(l=>({label:l}))));
  table.innerHTML = `<thead><tr>${cols.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead><tbody>${data.rows.map(r=>`<tr><td>${r.centre}</td>${data.pillars.map(p=>{
    const v = r.values[p]||{};
    return `<td class="num">${displayVal(p,v.actual)}</td><td class="num">${displayVal(p,v.target)}</td><td class="num">${pct(v.svo)}</td>`;
  }).join('')}</tr>`).join('')}${data.total ? `<tr class="group"><td>Total</td>${data.pillars.map(p=>{
    const v=data.total.values[p]||{};
    return `<td class="num">${displayVal(p,v.actual)}</td><td class="num">${displayVal(p,v.target)}</td><td class="num">${pct(v.svo)}</td>`;
  }).join('')}</tr>` : ''}</tbody>`;
}
async function previewImport(){
  const file = document.getElementById('vcfFile')?.files?.[0];
  const status = document.getElementById('adminStatus');
  if(!file){ status.innerHTML = 'Choose a VCF export file first.'; return; }
  try{
    const buf = await readFileAsArrayBuffer(file);
    const wb = XLSX.read(buf,{type:'array'});
    const parsed = parseVcfWorkbook(wb);
    PENDING_DATA = parsed;
    renderAdminPreview(parsed);
    status.innerHTML = `<strong>Preview ready.</strong><br>VCF export imported (${parsed.rows.length} centres, ${parsed.pillars.length} pillars: ${parsed.pillars.join(', ')}).`;
  }catch(e){
    console.error(e);
    status.innerHTML = `<strong>Import failed.</strong><br>${e.message || e}`;
  }
}
function publishImport(){
  const status = document.getElementById('adminStatus');
  if(!PENDING_DATA){ status.innerHTML = 'Preview an import first.'; return; }
  DATA = PENDING_DATA;
  try{ localStorage.setItem(SERVICE_DATA_KEY, JSON.stringify(DATA)); }catch(e){ console.warn(e); }
  const meta = saveServiceMeta();
  build();
  status.innerHTML = `<strong>Published.</strong><br>Preview published in this browser. For the live site, replace vcf-export.xlsx in GitHub and re-download the data backup below to update service-data.js.<br>Version ${meta.version}<br>Published ${formatPublishedAt(meta.publishedAt)}`;
}
function downloadDataBackup(){
  if(!DATA){ return; }
  const payload = '// Live Service Figures (VCF) data source.\n// After using Admin Update > Publish, download and replace this file in GitHub.\nwindow.SERVICE_DASHBOARD_DATA = ' + JSON.stringify(DATA, null, 2) + ';\n';
  const blob = new Blob([payload],{type:'application/javascript'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'service-data.js';
  a.click();
  URL.revokeObjectURL(a.href);
}
function resetSavedData(){
  localStorage.removeItem(SERVICE_DATA_KEY);
  localStorage.removeItem(SERVICE_META_KEY);
  location.reload();
}

// --- Wiring ---------------------------------------------------------------
document.querySelectorAll('nav button').forEach(btn=>{btn.addEventListener('click',()=>{
  document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  btn.classList.add('active');
  const target=document.getElementById(btn.dataset.target);
  if(target) target.classList.add('active');
})});
document.querySelectorAll('.search').forEach(input=>{input.addEventListener('input',()=>{
  const table=document.getElementById(input.dataset.filter);
  if(!table) return;
  const term=input.value.toLowerCase();
  table.querySelectorAll('tbody tr').forEach(tr=>{tr.style.display=tr.textContent.toLowerCase().includes(term)?'':'none'});
})});
document.getElementById('previewImport')?.addEventListener('click', previewImport);
document.getElementById('publishImport')?.addEventListener('click', publishImport);
document.getElementById('downloadData')?.addEventListener('click', downloadDataBackup);
document.getElementById('resetData')?.addEventListener('click', resetSavedData);
document.getElementById('exportPdfHeader')?.addEventListener('click', ()=>window.print());
document.getElementById('exportPdf')?.addEventListener('click', ()=>window.print());

build();
