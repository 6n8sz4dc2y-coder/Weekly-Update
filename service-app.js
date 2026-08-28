// RRG Group Service Figures (VCF) dashboard.
// Mirrors the Weekly Update hub's look, persistence and admin-upload pattern,
// but parses "Export" workbooks of Centre/CDA + repeating pillar groups
// (each group is however many sub-columns the export has, typically
// Actual / Target / SvO). The parser is dynamic so new pillars, renamed
// pillars, or extra sub-columns in a future export are picked up without
// code changes.
//
// This is an annual programme, so figures come in two periods (Year to
// Date and the current quarter) and two rollup levels (by Centre and by
// CDA); the Total row at either level is the Group total. A period toggle
// switches Dashboard, Centre Detail and CDA Summary together.

const SERVICE_BUILD_VERSION = '2026.08.28.2';
const SERVICE_META_KEY = 'rrgServiceDashboardMeta_v1';
const SERVICE_DATA_KEY = 'rrgServiceDashboardData_v2';

const PERIODS = ['ytd','q3'];
const PERIOD_LABEL = { ytd: 'Year to Date', q3: 'Q3 (Current Quarter)' };
let ACTIVE_PERIOD = 'q3';

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
  setText('liveVersionHeader', 'Version ' + meta.version);
  setText('footerVersion', 'Version ' + meta.version);
  setText('adminLiveVersion', meta.version);
  setText('livePublishedHeader', 'Published ' + formatPublishedAt(meta.publishedAt));
  setText('footerPublished', 'Published ' + formatPublishedAt(meta.publishedAt));
  setText('adminPublishedAt', formatPublishedAt(meta.publishedAt));
}
function setText(id, value){ const el=document.getElementById(id); if(el) el.textContent=value; }

const fmt=n=>{if(n===null||n===undefined||Number.isNaN(n))return "-";return new Intl.NumberFormat('en-GB',{maximumFractionDigits:0}).format(n)};
const fmtGbp=n=>{if(n===null||n===undefined||Number.isNaN(n))return "-";return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n)};
const pct=n=>{if(n===null||n===undefined||Number.isNaN(n))return "-";return Math.round(n*100)+"%"};
const isCurrencyPillar = name => /purchase|£|value|revenue|spend/i.test(String(name||''));
const isActualPillar = name => /service plan/i.test(String(name||''));
const pillarBasis = name => isActualPillar(name) ? 'Actual' : 'Run-rate';
const displayVal = (pillarName, n) => isCurrencyPillar(pillarName) ? fmtGbp(n) : fmt(n);
const fmtGbpCompact=n=>{if(n===null||n===undefined||Number.isNaN(n))return "-";return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',notation:'compact',maximumFractionDigits:1}).format(n)};
// Currency values get compacted (they're long, e.g. £758,605 -> £758.6K) to
// keep the CDA table narrow; unit counts are already short, so keep full
// precision for those rather than compacting a small number like 1,092.
const displayValCompact = (pillarName, n) => isCurrencyPillar(pillarName) ? fmtGbpCompact(n) : fmt(n);
const svoClass = n => n===null||n===undefined ? '' : (n>=1?'green':n>=.9?'amber':'red');
const svoLabel = n => n===null||n===undefined ? 'No data' : (n>=1?'On / Ahead':n>=.9?'Watch':'Behind');
const progressBar = n => `<div class="progress"><div class="bar ${svoClass(n)}" style="width:${Math.min(Math.max((n||0)*100,0),120)}%"></div></div>`;
const statusPill = n => `<span class="status ${svoClass(n)}">${svoLabel(n)}</span>`;

// --- Parsing --------------------------------------------------------------
// Sheet shape: row0 = pillar names (first cell of each group, rest blank -
// i.e. what Excel shows for merged header cells), row1 = sub-column labels
// per pillar (Actual / Target / SvO, but read whatever is actually there),
// then one data row per centre/CDA, a Total row, and finally a free-text
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
    const groupRaw = r[0];
    if(groupRaw===null || groupRaw===undefined || String(groupRaw).trim()==='') continue;
    const centre = String(groupRaw).trim();
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
  if(!data) return { actual:null, target:null, svo:null };
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
// Group (whole company) total for a pillar - Centre and CDA exports carry
// the same Total row, so prefer whichever level has data for this period.
function groupData(period){
  return DATA.centre[period] || DATA.cda[period] || null;
}

// --- Rendering ----------------------------------------------------------
function pillarBadge(name){
  const basis = pillarBasis(name);
  return `<span class="status ${basis==='Actual'?'green':'blue'}" style="margin-left:8px;vertical-align:middle">${basis}</span>`;
}
const CARD_ACCENTS = ['blue-card','green-card','purple-card','amber-card'];
// Q3 (the opener) on the left, Year to Date on the right - one card per
// pillar, mirroring the Weekly Update dashboard's Month-to-date / Total
// split cards, but split by reporting period instead of by month.
function renderPillarCards(q3Data, ytdData, containerId){
  const el = document.getElementById(containerId);
  if(!el) return;
  const pillars = (q3Data && q3Data.pillars) || (ytdData && ytdData.pillars) || [];
  if(!pillars.length){ el.innerHTML = '<div class="card wide"><div class="note-box">No data loaded yet. Use Admin Update to upload the workbooks.</div></div>'; return; }
  el.innerHTML = pillars.map((name,i)=>{
    const q3 = pillarTotals(q3Data, name);
    const ytd = pillarTotals(ytdData, name);
    const accent = CARD_ACCENTS[i % CARD_ACCENTS.length];
    return `<div class="card kpi kpi-progress-card ${accent}">
      <div class="label">${name}${pillarBadge(name)}</div>
      <div class="kpi-split-main">
        <div><div class="mini-label">Q3 (Current Quarter)</div><div class="value">${pct(q3.svo)}</div><div class="note"><strong>${displayVal(name,q3.actual)}</strong> / <strong>${displayVal(name,q3.target)}</strong> target</div></div>
        <div><div class="mini-label">Year to Date</div><div class="value">${pct(ytd.svo)}</div><div class="note"><strong>${displayVal(name,ytd.actual)}</strong> / <strong>${displayVal(name,ytd.target)}</strong> target</div></div>
      </div>
      <div class="kpi-footer-strip two-up"><div><span>Status (Q3)</span><strong>${statusPill(q3.svo)}</strong></div><div><span>Status (YTD)</span><strong>${statusPill(ytd.svo)}</strong></div></div>
    </div>`;
  }).join('');
}

// "£12,345 to go" when short of target, "£12,345 over" when past it.
function gapLabel(name, actual, target){
  if(actual===null||actual===undefined||target===null||target===undefined) return '';
  const gap = actual - target;
  const cls = gap>=0 ? 'positive' : 'negative';
  const text = gap>=0 ? `${displayVal(name,gap)} over` : `${displayVal(name,Math.abs(gap))} to go`;
  return `<span class="variance-cell ${cls}">${text}</span>`;
}
function renderLeaderboards(data){
  const el = document.getElementById('pillarLeaderboards');
  if(!el) return;
  if(!data){ el.innerHTML = ''; return; }
  el.innerHTML = data.pillars.map(name=>{
    const sorted = data.rows.slice().sort((a,b)=>(centreSvo(b,name)??-Infinity)-(centreSvo(a,name)??-Infinity));
    const rows = sorted.map((r,i)=>{
      const v = centreSvo(r,name);
      const values = r.values[name] || {};
      return `<div class="leader-row"><div class="rank">${i+1}</div><div class="centre">${r.centre}<div class="mini">${displayVal(name,values.actual)} / ${displayVal(name,values.target)} · ${gapLabel(name,values.actual,values.target)}</div></div><div class="pct">${pct(v)}</div>${progressBar(v)}</div>`;
    }).join('');
    return `<div class="card half"><h3>${name}</h3><div class="leader">${rows || '<div class="hint">No centre data.</div>'}</div></div>`;
  }).join('');
}

const TABLE_SORT = {};
function renderGroupTable(data, tableId, firstColLabel){
  const table = document.getElementById(tableId);
  if(!table) return;
  if(!data){ table.innerHTML = ''; return; }
  const cols = [{label:firstColLabel || 'Centre', key:'centre'}];
  data.pillarGroups.forEach(g=>{
    g.cols.forEach(c=>{
      cols.push({ label: `${g.name} ${c.label}`, pillar: g.name, subKey: c.key, isSvo: c.key==='svo' });
    });
  });
  const rows = data.rows;
  const state = TABLE_SORT[tableId] || {};
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
      const cur = TABLE_SORT[tableId] || {};
      const dir = cur.index===index && cur.dir==='desc' ? 'asc' : 'desc';
      TABLE_SORT[tableId] = { index, dir };
      renderGroupTable(data, tableId, firstColLabel);
    });
  });
}

// Compact single-pane table: one Actual + one Gap-to-Target column per
// pillar (instead of Actual/Target/SvO), with the gap cell coloured by
// achievement so the SvO column isn't needed to read performance at a
// glance. Built for the small CDA row count so it fits without horizontal
// scrolling. Includes the Group Total as a pinned, unsorted final row.
function renderCompactTable(data, tableId, firstColLabel){
  const table = document.getElementById(tableId);
  if(!table) return;
  if(!data){ table.innerHTML = ''; return; }
  const cols = [{label:firstColLabel || 'CDA', key:'centre'}];
  data.pillars.forEach(name=>{
    cols.push({ label: 'Actual', pillar: name, kind: 'actual' });
    cols.push({ label: 'Gap', pillar: name, kind: 'gap' });
  });
  const state = TABLE_SORT[tableId] || {};
  const sorted = data.rows.slice();
  if(state.index!==undefined){
    const col = cols[state.index];
    sorted.sort((a,b)=>{
      const av = col.key==='centre' ? a.centre : gapSortValue(a, col);
      const bv = col.key==='centre' ? b.centre : gapSortValue(b, col);
      const bothNum = typeof av==='number' && typeof bv==='number';
      const cmp = bothNum ? av-bv : String(av).localeCompare(String(bv), undefined, {numeric:true, sensitivity:'base'});
      return state.dir==='desc' ? -cmp : cmp;
    });
  }
  function gapSortValue(row, col){
    const v = row.values[col.pillar];
    if(!v) return -Infinity;
    return col.kind==='actual' ? (v.actual ?? -Infinity) : ((v.actual??0) - (v.target??0));
  }
  function renderRow(row, isTotal){
    return `<tr class="${isTotal?'group':''}">${cols.map(c=>{
      if(c.key==='centre') return `<td>${row.centre}</td>`;
      const v = row.values[c.pillar] || {};
      if(c.kind==='actual') return `<td class="num" title="${displayVal(c.pillar, v.actual)}">${displayValCompact(c.pillar, v.actual)}</td>`;
      const gap = (v.actual??null)===null || (v.target??null)===null ? null : v.actual - v.target;
      const cls = isTotal ? '' : (svoClass(v.svo) ? 'cell-' + svoClass(v.svo) : '');
      const sign = gap!==null && gap>0 ? '+' : '';
      const title = gap===null ? '' : ` title="${sign}${displayVal(c.pillar, gap)}"`;
      return `<td class="num ${cls}"${title}>${gap===null?'-':sign+displayValCompact(c.pillar, gap)}</td>`;
    }).join('')}</tr>`;
  }
  table.classList.add('table-centre','table-compact');
  // Two header rows: pillar name spanning its Actual/Gap pair (like the
  // source workbook's merged headers), then the short sub-labels - this
  // keeps column widths tight enough to fit in one pane without scrolling.
  const pillarHeaderRow = `<tr><th></th>${data.pillars.map(name=>`<th colspan="2" style="text-align:center">${name}</th>`).join('')}</tr>`;
  const subHeaderRow = `<tr>${cols.map((c,i)=>{
    const active = state.index===i;
    const arrow = active ? (state.dir==='desc' ? ' ▼' : ' ▲') : '';
    return `<th data-sort-index="${i}" class="sortable ${c.key!=='centre'?'num':''} ${active?'sorted':''}" title="Click to sort">${c.label}${arrow}</th>`;
  }).join('')}</tr>`;
  table.innerHTML = `<thead>${pillarHeaderRow}${subHeaderRow}</thead><tbody>${sorted.map(r=>renderRow(r,false)).join('')}${data.total ? renderRow(data.total,true) : ''}</tbody>`;
  table.querySelectorAll('th[data-sort-index]').forEach(th=>{
    th.addEventListener('click',()=>{
      const index = Number(th.dataset.sortIndex);
      const cur = TABLE_SORT[tableId] || {};
      const dir = cur.index===index && cur.dir==='desc' ? 'asc' : 'desc';
      TABLE_SORT[tableId] = { index, dir };
      renderCompactTable(data, tableId, firstColLabel);
    });
  });
}

function renderPeriodToggle(){
  // Multiple instances share the same state (Dashboard above Rankings,
  // Centre Detail, CDA Summary) so the period can be switched from
  // whichever tab is open.
  document.querySelectorAll('.periodToggle').forEach(el=>{
    el.innerHTML = PERIODS.map(p=>`<button class="admin-btn ${p===ACTIVE_PERIOD?'primary-btn':''}" data-period="${p}" type="button">${PERIOD_LABEL[p]}</button>`).join('');
    el.querySelectorAll('button[data-period]').forEach(btn=>{
      btn.addEventListener('click', ()=>{ ACTIVE_PERIOD = btn.dataset.period; build(); });
    });
  });
}

function build(){
  renderPeriodToggle();
  renderPillarCards(groupData('q3'), groupData('ytd'), 'pillarCards');
  renderLeaderboards(DATA.centre[ACTIVE_PERIOD]);
  renderGroupTable(DATA.centre[ACTIVE_PERIOD], 'centreTable', 'Centre');
  renderPillarCards(DATA.cda.q3, DATA.cda.ytd, 'cdaPillarCards');
  renderCompactTable(DATA.cda[ACTIVE_PERIOD], 'cdaTable', 'CDA');
  updateVersionDisplays();
}

// --- Data bootstrap -------------------------------------------------------
let DATA = {
  centre: { q3: window.SERVICE_DATA_CENTRE_Q3 || null, ytd: window.SERVICE_DATA_CENTRE_YTD || null },
  cda: { q3: window.SERVICE_DATA_CDA_Q3 || null, ytd: window.SERVICE_DATA_CDA_YTD || null },
};
try{
  const saved = localStorage.getItem(SERVICE_DATA_KEY);
  if(saved) DATA = JSON.parse(saved);
}catch(e){ console.warn('Saved service dashboard data could not be loaded', e); }
let PENDING_DATA = null;

// --- Admin: import / publish / backup / reset -----------------------------
const IMPORT_SLOTS = [
  { level:'centre', period:'q3', fileId:'centreQ3File', label:'Centre - Q3' },
  { level:'centre', period:'ytd', fileId:'centreYtdFile', label:'Centre - YTD' },
  { level:'cda', period:'q3', fileId:'cdaQ3File', label:'CDA - Q3' },
  { level:'cda', period:'ytd', fileId:'cdaYtdFile', label:'CDA - YTD' },
];
function readFileAsArrayBuffer(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
function cloneData(){ return JSON.parse(JSON.stringify(DATA)); }
function previewTableHtml(data){
  const cols = [{label:'Centre'}].concat(data.pillars.flatMap(p=>[`${p} Actual`,`${p} Target`,`${p} SvO`].map(l=>({label:l}))));
  return `<table>` + `<thead><tr>${cols.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead><tbody>${data.rows.map(r=>`<tr><td>${r.centre}</td>${data.pillars.map(p=>{
    const v = r.values[p]||{};
    return `<td class="num">${displayVal(p,v.actual)}</td><td class="num">${displayVal(p,v.target)}</td><td class="num">${pct(v.svo)}</td>`;
  }).join('')}</tr>`).join('')}${data.total ? `<tr class="group"><td>Total</td>${data.pillars.map(p=>{
    const v=data.total.values[p]||{};
    return `<td class="num">${displayVal(p,v.actual)}</td><td class="num">${displayVal(p,v.target)}</td><td class="num">${pct(v.svo)}</td>`;
  }).join('')}</tr>` : ''}</tbody></table>`;
}
async function previewImport(){
  const status = document.getElementById('adminStatus');
  const container = document.getElementById('adminPreviewContainer');
  const data = cloneData();
  const messages = [];
  container.innerHTML = '';
  try{
    for(const slot of IMPORT_SLOTS){
      const file = document.getElementById(slot.fileId)?.files?.[0];
      if(!file) continue;
      const buf = await readFileAsArrayBuffer(file);
      const wb = XLSX.read(buf,{type:'array'});
      const parsed = parseVcfWorkbook(wb);
      data[slot.level][slot.period] = parsed;
      messages.push(`${slot.label} imported (${parsed.rows.length} rows, ${parsed.pillars.length} pillars)`);
      const block = document.createElement('div');
      block.innerHTML = `<div class="hint" style="margin-top:12px">${slot.label} preview</div><div class="table-wrap" style="max-height:280px">${previewTableHtml(parsed)}</div>`;
      container.appendChild(block);
    }
    PENDING_DATA = data;
    status.innerHTML = messages.length ? `<strong>Preview ready.</strong><br>${messages.join('<br>')}` : 'Choose at least one file to preview.';
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
  status.innerHTML = `<strong>Published.</strong><br>Preview published in this browser. For the live site, replace the relevant workbook(s) in GitHub and re-download the data backups below.<br>Version ${meta.version}<br>Published ${formatPublishedAt(meta.publishedAt)}`;
}
function downloadOne(filename, varName, data){
  if(!data) return;
  const payload = `// Live Service Figures (VCF) data source.\n// After using Admin Update > Publish, download and replace this file in GitHub.\nwindow.${varName} = ${JSON.stringify(data, null, 2)};\n`;
  const blob = new Blob([payload],{type:'application/javascript'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
function downloadDataBackup(){
  downloadOne('service-data.js', 'SERVICE_DATA_CENTRE_Q3', DATA.centre.q3);
  downloadOne('service-data-ytd.js', 'SERVICE_DATA_CENTRE_YTD', DATA.centre.ytd);
  downloadOne('service-cda-data.js', 'SERVICE_DATA_CDA_Q3', DATA.cda.q3);
  downloadOne('service-cda-data-ytd.js', 'SERVICE_DATA_CDA_YTD', DATA.cda.ytd);
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
