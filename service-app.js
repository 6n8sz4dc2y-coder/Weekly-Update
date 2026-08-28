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
// lives in the header (sticky, so it's reachable from every tab) and
// switches all of it together. Three tabs cover the three data sources:
// VCF (pillar cards, Rankings, CDA Rankings, Centre Detail), Trade Parts
// (a Group-level card/table plus a CDA + Lexus breakdown of per-CDA
// pillar cards, each its own export) and WRR (its own per-centre Rankings/CDA
// Rankings/Detail, parsed from two flat workbooks rather than the VCF
// pillar-group shape).

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
const svoClass = n => n===null||n===undefined ? '' : (n>=1?'green':n>=.9?'amber':'red');
const svoLabel = n => n===null||n===undefined ? 'No data' : (n>=1?'On / Ahead':n>=.9?'Watch':'Behind');
const progressBar = n => `<div class="progress"><div class="bar ${svoClass(n)}" style="width:${Math.min(Math.max((n||0)*100,0),120)}%"></div></div>`;
const statusPill = n => `<span class="status ${svoClass(n)}">${svoLabel(n)}</span>`;
// Confirmed-actual pillars (Service Plans Plus) don't get the cautious
// "Watch" middle state that run-rate pillars use to hedge an estimate -
// the number is exact, so it's a plain Ahead/Behind call.
const statusPillFor = (name, n) => {
  if(!isActualPillar(name)) return statusPill(n);
  if(n===null||n===undefined) return '<span class="status">No data</span>';
  return n>=1 ? '<span class="status green">Ahead</span>' : '<span class="status red">Behind</span>';
};

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

// Group Trade Parts (SMROE) export: a flat quarterly table (Period, Working
// Days, Days to Date, Sales Out to Date/Forecast, Target, Achieved %,
// Reward % and Reward Payable). The same export shape is used both
// Group-level (one file, no filter) and per-CDA (one file per CDA, filtered
// in Toyota's tool), so this parser also captures the "Applied filters"
// footer text - extractCdaName() below reads the CDA name out of it for the
// per-CDA case. Same stop-at-the-filters-row rule applies either way.
function parseTradePartsWorkbook(wb){
  const sheetName = wb.SheetNames.find(n=>/export/i.test(n)) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if(!ws) throw new Error('No sheets found in workbook');
  const rows = XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
  if(rows.length < 2) throw new Error('Expected a header row and at least one data row');
  const header = rows[0].map(h=>h===null||h===undefined ? null : String(h).trim());
  const dataRows = [];
  let filtersText = null;
  for(let i=1;i<rows.length;i++){
    const r = rows[i];
    if(r[0]===null || r[0]===undefined || String(r[0]).trim()==='') continue;
    const anyNumeric = r.slice(1).some(v=>typeof v==='number');
    if(!anyNumeric){ filtersText = String(r[0]); break; } // hit the free-text "Applied filters" row - stop here, keep its text
    const obj = {};
    header.forEach((h,idx)=>{ if(h) obj[h] = r[idx]; });
    dataRows.push(obj);
  }
  if(!dataRows.length) throw new Error('Could not find any data rows in the "' + sheetName + '" sheet');
  return { header: header.filter(Boolean), rows: dataRows, sheet: sheetName, importedAt: new Date().toISOString(), filtersText };
}
// Reads the CDA name out of a Trade Parts export's "Applied filters" footer,
// e.g. "...+ West Yorkshire (CDA)\n..." -> "West Yorkshire". Falls back to
// the source filename so an export whose filter text doesn't match this
// pattern still gets a usable label instead of failing the import.
function extractCdaName(filtersText, fallback){
  if(filtersText){
    const m = filtersText.match(/\+\s*([^()\n]+?)\s*\(CDA\)/i);
    if(m) return m[1].trim();
  }
  return fallback;
}

// WRR export: one flat row per centre (CPUS Unique, Target, Centre %
// Achieved, plus a "WRR Group" column that is the same CDA grouping used
// elsewhere), a Total row, then the filters row. Q3 and YTD are separate
// workbooks (unlike the VCF exports' Actual/Target/SvO groups), so this
// only needs to parse one period per call - callers hold q3/ytd like the
// Trade Parts card does.
function parseWrrWorkbook(wb){
  const sheetName = wb.SheetNames.find(n=>/export/i.test(n)) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if(!ws) throw new Error('No sheets found in workbook');
  const rows = XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
  if(rows.length < 2) throw new Error('Expected a header row and at least one data row');
  const header = rows[0].map(h=>h===null||h===undefined ? null : String(h).trim());
  const dataRows = [];
  let total = null;
  for(let i=1;i<rows.length;i++){
    const r = rows[i];
    if(r[0]===null || r[0]===undefined || String(r[0]).trim()==='') continue;
    const anyNumeric = r.slice(1).some(v=>typeof v==='number');
    if(!anyNumeric) break; // hit the free-text "Applied filters" row - stop here
    const obj = {};
    header.forEach((h,idx)=>{ if(h) obj[h] = r[idx]; });
    if(String(r[0]).trim().toLowerCase()==='total'){ total = obj; }
    else { dataRows.push(obj); }
  }
  if(!dataRows.length) throw new Error('Could not find any data rows in the "' + sheetName + '" sheet');
  return { header: header.filter(Boolean), rows: dataRows, total, sheet: sheetName, importedAt: new Date().toISOString() };
}
// Group rollup for the WRR CDA Rankings card - the WRR Group column is
// already the same CDA grouping used elsewhere, computed here from the
// centre rows rather than trusting the per-row "WRR Group % Achieved"
// field (which is uniform within a group but not guaranteed present).
function wrrGroupRollup(rows){
  const byGroup = {};
  const order = [];
  (rows||[]).forEach(r=>{
    const g = r['WRR Group'];
    if(!g) return;
    if(!byGroup[g]){ byGroup[g] = { group:g, actual:0, target:0 }; order.push(g); }
    byGroup[g].actual += Number(r['CPUS Unique'])||0;
    byGroup[g].target += Number(r['Target'])||0;
  });
  return order.map(g=>{
    const v = byGroup[g];
    return { group:v.group, actual:v.actual, target:v.target, achieved: v.target ? v.actual/v.target : null };
  });
}
function wrrGapLabel(actual, target){
  if(actual===null||actual===undefined||target===null||target===undefined) return '';
  const gap = actual - target;
  const cls = gap>=0 ? 'positive' : 'negative';
  const text = gap>=0 ? `${fmt(gap)} over` : `${fmt(Math.abs(gap))} behind`;
  return `<span class="variance-cell ${cls}">${text}</span>`;
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
        <div><div class="mini-label">This Quarter</div><div class="value">${pct(q3.svo)}</div><div class="note note-target"><strong>${displayVal(name,q3.actual)}</strong> / <strong>${displayVal(name,q3.target)}</strong> target</div><div class="note">${gapLabel(name,q3.actual,q3.target)}</div></div>
        <div><div class="mini-label">Year to Date</div><div class="value">${pct(ytd.svo)}</div><div class="note note-target"><strong>${displayVal(name,ytd.actual)}</strong> / <strong>${displayVal(name,ytd.target)}</strong> target</div><div class="note">${gapLabel(name,ytd.actual,ytd.target)}</div></div>
      </div>
      <div class="kpi-footer-strip two-up"><div><span>Status (Q3)</span><strong>${statusPillFor(name, q3.svo)}</strong></div><div><span>Status (YTD)</span><strong>${statusPillFor(name, ytd.svo)}</strong></div></div>
    </div>`;
  }).join('');
}

// "£12,345 behind" when short of target, "£12,345 over" when past it. These
// figures are run-rate projections rather than a literal countdown, so
// "behind"/"over" reads more honestly than "to go".
function gapLabel(name, actual, target){
  if(actual===null||actual===undefined||target===null||target===undefined) return '';
  const gap = actual - target;
  const cls = gap>=0 ? 'positive' : 'negative';
  const text = gap>=0 ? `${displayVal(name,gap)} over` : `${displayVal(name,Math.abs(gap))} behind`;
  return `<span class="variance-cell ${cls}">${text}</span>`;
}
function renderLeaderboards(data, containerId){
  const el = document.getElementById(containerId);
  if(!el) return;
  if(!data){ el.innerHTML = ''; return; }
  el.innerHTML = data.pillars.map(name=>{
    const sorted = data.rows.slice().sort((a,b)=>(centreSvo(b,name)??-Infinity)-(centreSvo(a,name)??-Infinity));
    const rows = sorted.map((r,i)=>{
      const v = centreSvo(r,name);
      const values = r.values[name] || {};
      return `<div class="leader-row"><div class="rank">${i+1}</div><div class="centre">${r.centre}<div class="mini">${displayVal(name,values.actual)} / ${displayVal(name,values.target)} · ${gapLabel(name,values.actual,values.target)}</div></div><div class="pct ${svoClass(v)}">${pct(v)}</div>${progressBar(v)}</div>`;
    }).join('');
    return `<div class="card quarter leader-quarter"><h3>${name}</h3><div class="leader">${rows || '<div class="hint">No centre data.</div>'}</div></div>`;
  }).join('');
}

// Group Trade Parts: a small quarterly table (Q1-Q4 + Total), Group-level
// only. Q4 is all null until the quarter starts, so those cells just show
// "-" with no status pill.
const TRADE_PARTS_COLS = [
  { key:'Period', label:'Period' },
  { key:'__days', label:'Days Elapsed' },
  { key:'SMROE Sales Out To Date*', label:'Sales Out to Date' },
  { key:'SMROE Sales Out (Forecast)*', label:'Sales Out (Forecast)' },
  { key:'SMROE Target', label:'Target' },
  { key:'Target % Achieved (Forecast)*', label:'Achieved %' },
  { key:'Target Reward %*', label:'Reward %' },
  { key:'Reward Payable*', label:'Reward Payable' },
];
function tradePartsCellText(key, row){
  if(key==='Period') return row.Period;
  if(key==='__days') return row['Days to Date']==null ? '-' : `${fmt(row['Days to Date'])} / ${fmt(row['Working Days'])}`;
  const v = row[key];
  if(v===null||v===undefined) return '-';
  if(/%/.test(key)) return pct(v);
  return fmtGbp(v);
}
function renderTradeParts(data){
  const el = document.getElementById('tradePartsTable');
  if(!el) return;
  if(!data || !data.rows || !data.rows.length){ el.innerHTML = ''; return; }
  el.classList.add('table-tight');
  el.innerHTML = `<thead><tr>${TRADE_PARTS_COLS.map(c=>`<th class="${c.key==='Period'?'':'num'}">${c.label}</th>`).join('')}<th>Status</th></tr></thead><tbody>${data.rows.map(row=>{
    const isTotal = String(row.Period||'').toLowerCase()==='total';
    const forecast = row['SMROE Sales Out (Forecast)*'];
    const target = row['SMROE Target'];
    return `<tr class="${isTotal?'group':''}">${TRADE_PARTS_COLS.map(c=>`<td class="${c.key==='Period'?'':'num'}">${tradePartsCellText(c.key,row)}</td>`).join('')}<td>${tradePartsStatusPill(forecast,target)}</td></tr>`;
  }).join('')}</tbody>`;
}

function tradePartsRow(data, period){
  if(!data || !data.rows) return null;
  return data.rows.find(r => String(r.Period||'').toLowerCase()===period.toLowerCase()) || null;
}
// Group Trade Parts is forecast-driven, not a hedged run-rate estimate, so
// its status is a plain "Tracking ahead"/"Tracking behind" call off the
// forecast vs target - no cautious "Watch" middle state.
function tradePartsStatusPill(forecast, target){
  if(forecast===null||forecast===undefined||target===null||target===undefined) return '<span class="status">No data</span>';
  return forecast>=target ? '<span class="status green">Tracking ahead</span>' : '<span class="status red">Tracking behind</span>';
}
// "£X behind"/"£X over" against target, same convention as gapLabel() but
// always currency (gapLabel's currency detection keys off a pillar name,
// which doesn't apply here).
function tradePartsGapLabel(forecast, target){
  if(forecast===null||forecast===undefined||target===null||target===undefined) return '';
  const gap = forecast - target;
  const cls = gap>=0 ? 'positive' : 'negative';
  const text = gap>=0 ? `${fmtGbp(gap)} over` : `${fmtGbp(Math.abs(gap))} behind`;
  return `<span class="variance-cell ${cls}">${text}</span>`;
}
// Appends a 5th summary card into the same top grid as the 4 VCF pillar
// cards - This Quarter (Q3 row) and Full Year (Total row), both read off
// the forecast (the headline metric the source export itself uses for an
// in-progress quarter) rather than the partial to-date actual.
function renderTradePartsCard(containerId, data){
  const el = document.getElementById(containerId);
  if(!el) return;
  const q3 = tradePartsRow(data, 'Q3');
  const total = tradePartsRow(data, 'Total');
  if(!q3 && !total){ el.innerHTML = ''; return; }
  const cell = (row) => {
    if(!row) return { value:'-', note:'No data', gap:'', statusHtml:'<span class="status">No data</span>' };
    const forecast = row['SMROE Sales Out (Forecast)*'];
    const target = row['SMROE Target'];
    const achieved = row['Target % Achieved (Forecast)*'];
    return {
      value: pct(achieved),
      note: `<strong>${fmtGbp(forecast)}</strong> / <strong>${fmtGbp(target)}</strong> target`,
      gap: tradePartsGapLabel(forecast, target),
      statusHtml: tradePartsStatusPill(forecast, target),
    };
  };
  const q3Cell = cell(q3), totalCell = cell(total);
  el.innerHTML = `<div class="card half kpi-progress-card green-card">
    <div class="label">Group Trade Parts<span class="status blue" style="margin-left:8px;vertical-align:middle">Group</span></div>
    <div class="kpi-split-main">
      <div><div class="mini-label">This Quarter</div><div class="value">${q3Cell.value}</div><div class="note note-target">${q3Cell.note}</div><div class="note">${q3Cell.gap}</div></div>
      <div><div class="mini-label">Full Year</div><div class="value">${totalCell.value}</div><div class="note note-target">${totalCell.note}</div><div class="note">${totalCell.gap}</div></div>
    </div>
    <div class="kpi-footer-strip two-up"><div><span>Status (Q3)</span><strong>${q3Cell.statusHtml}</strong></div><div><span>Status (Full Year)</span><strong>${totalCell.statusHtml}</strong></div></div>
  </div>`;
}
// CDA + Lexus breakdown of Group Trade Parts, one box per CDA laid out like
// the VCF pillar cards rather than a ranked list - This Quarter always
// reads the forecast (the export's own headline metric for an in-progress
// quarter, not the partial to-date actual), Full Year reads the Total row,
// which is already Q1 + Q2 actual plus the Q3 forecast (Q4 hasn't started
// yet). Each column also shows the reward band (5/9/12%) that forecast is
// currently tracking to earn.
// Fixed display order rather than upload order (multi-file selection order
// isn't guaranteed) - anything not in this list (a future new CDA) is
// appended at the end rather than dropped.
const TRADE_PARTS_CDA_ORDER = ['North Manchester', 'South Manchester', 'West Yorkshire', 'Lexus'];
function renderTradePartsCdaCards(containerId, cdaList){
  const el = document.getElementById(containerId);
  if(!el) return;
  if(!cdaList || !cdaList.length){ el.innerHTML = '<div class="card wide"><div class="note-box">No data loaded yet. Use Admin Update to upload the workbooks.</div></div>'; return; }
  cdaList = cdaList.slice().sort((a,b)=>{
    const ia = TRADE_PARTS_CDA_ORDER.indexOf(a.cda), ib = TRADE_PARTS_CDA_ORDER.indexOf(b.cda);
    return (ia===-1?TRADE_PARTS_CDA_ORDER.length:ia) - (ib===-1?TRADE_PARTS_CDA_ORDER.length:ib);
  });
  const cell = (row) => {
    if(!row) return { value:'-', note:'No data', gap:'', reward:'-', statusHtml:'<span class="status">No data</span>' };
    const forecast = row['SMROE Sales Out (Forecast)*'];
    const target = row['SMROE Target'];
    const achieved = row['Target % Achieved (Forecast)*'];
    const reward = row['Target Reward %*'];
    return {
      value: pct(achieved),
      note: `<strong>${fmtGbp(forecast)}</strong> / <strong>${fmtGbp(target)}</strong> target`,
      gap: tradePartsGapLabel(forecast, target),
      reward: reward===null||reward===undefined ? '-' : pct(reward),
      statusHtml: tradePartsStatusPill(forecast, target),
    };
  };
  el.innerHTML = cdaList.map((c,i)=>{
    const q3Cell = cell(tradePartsRow(c, 'Q3'));
    const totalCell = cell(tradePartsRow(c, 'Total'));
    const accent = CARD_ACCENTS[i % CARD_ACCENTS.length];
    return `<div class="card kpi kpi-progress-card ${accent}">
      <div class="label">${c.cda}</div>
      <div class="kpi-split-main">
        <div><div class="mini-label">This Quarter</div><div class="value">${q3Cell.value}</div><div class="note note-target">${q3Cell.note}</div><div class="note">${q3Cell.gap}</div><div class="note">Reward band <strong>${q3Cell.reward}</strong></div></div>
        <div><div class="mini-label">Full Year</div><div class="value">${totalCell.value}</div><div class="note note-target">${totalCell.note}</div><div class="note">${totalCell.gap}</div><div class="note">Reward band <strong>${totalCell.reward}</strong></div></div>
      </div>
      <div class="kpi-footer-strip two-up"><div><span>Status (Q3)</span><strong>${q3Cell.statusHtml}</strong></div><div><span>Status (Full Year)</span><strong>${totalCell.statusHtml}</strong></div></div>
    </div>`;
  }).join('');
}

// WRR: two separate workbooks (Q3, YTD), each a flat per-centre row with a
// Total row already computed - same "This Quarter / Year to Date" framing
// as the VCF pillar cards, reading straight off each workbook's Total row.
function renderWrrCard(containerId, q3Data, ytdData){
  const el = document.getElementById(containerId);
  if(!el) return;
  const q3 = q3Data && q3Data.total, ytd = ytdData && ytdData.total;
  if(!q3 && !ytd){ el.innerHTML = ''; return; }
  const cell = (row) => {
    if(!row) return { value:'-', note:'No data', gap:'', statusHtml:'<span class="status">No data</span>' };
    const actual = row['CPUS Unique'];
    const target = row['Target'];
    const achieved = row['Centre % Achieved'];
    return {
      value: pct(achieved),
      note: `<strong>${fmt(actual)}</strong> / <strong>${fmt(target)}</strong> target`,
      gap: wrrGapLabel(actual, target),
      statusHtml: achieved===null||achieved===undefined ? '<span class="status">No data</span>' : statusPill(achieved),
    };
  };
  const q3Cell = cell(q3), ytdCell = cell(ytd);
  el.innerHTML = `<div class="card half kpi-progress-card blue-card">
    <div class="label">WRR<span class="status green" style="margin-left:8px;vertical-align:middle">Actual</span></div>
    <div class="kpi-split-main">
      <div><div class="mini-label">This Quarter</div><div class="value">${q3Cell.value}</div><div class="note note-target">${q3Cell.note}</div><div class="note">${q3Cell.gap}</div></div>
      <div><div class="mini-label">Year to Date</div><div class="value">${ytdCell.value}</div><div class="note note-target">${ytdCell.note}</div><div class="note">${ytdCell.gap}</div></div>
    </div>
    <div class="kpi-footer-strip two-up"><div><span>Status (Q3)</span><strong>${q3Cell.statusHtml}</strong></div><div><span>Status (YTD)</span><strong>${ytdCell.statusHtml}</strong></div></div>
  </div>`;
}
// WRR has its own dedicated tab now (not sharing a row with the 4 VCF
// pillars), so its Rankings/CDA Rankings are single full-width lists using
// the regular leader-row (with progress bar) rather than the compact
// leader-quarter variant built for a 4-across grid.
function renderWrrRankingCard(containerId, data){
  const el = document.getElementById(containerId);
  if(!el) return;
  if(!data || !data.rows || !data.rows.length){ el.innerHTML = ''; return; }
  const sorted = data.rows.slice().sort((a,b)=>(b['Centre % Achieved']??-Infinity)-(a['Centre % Achieved']??-Infinity));
  el.innerHTML = sorted.map((r,i)=>{
    const v = r['Centre % Achieved'];
    return `<div class="leader-row"><div class="rank">${i+1}</div><div class="centre">${r['Centre Name']}<div class="mini">${fmt(r['CPUS Unique'])} / ${fmt(r['Target'])} · ${wrrGapLabel(r['CPUS Unique'],r['Target'])}</div></div><div class="pct ${svoClass(v)}">${pct(v)}</div>${progressBar(v)}</div>`;
  }).join('');
}
function renderWrrCdaRankingCard(containerId, data){
  const el = document.getElementById(containerId);
  if(!el) return;
  if(!data || !data.rows || !data.rows.length){ el.innerHTML = ''; return; }
  const groups = wrrGroupRollup(data.rows).sort((a,b)=>(b.achieved??-Infinity)-(a.achieved??-Infinity));
  el.innerHTML = groups.map((g,i)=>`<div class="leader-row"><div class="rank">${i+1}</div><div class="centre">${g.group}<div class="mini">${fmt(g.actual)} / ${fmt(g.target)} · ${wrrGapLabel(g.actual,g.target)}</div></div><div class="pct ${svoClass(g.achieved)}">${pct(g.achieved)}</div>${progressBar(g.achieved)}</div>`).join('');
}
function renderWrrTable(data){
  const el = document.getElementById('wrrTable');
  if(!el) return;
  if(!data || !data.rows || !data.rows.length){ el.innerHTML = ''; return; }
  el.classList.add('table-tight');
  const cols = [
    { label:'Centre', get:r=>r['Centre Name'] },
    { label:'WRR Group', get:r=>r['WRR Group']||'' },
    { label:'CPUS', get:r=>fmt(r['CPUS Unique']), num:true },
    { label:'Target', get:r=>fmt(r['Target']), num:true },
    { label:'Gap', get:r=>wrrGapLabel(r['CPUS Unique'],r['Target']), num:true },
    { label:'Achieved %', get:r=>pct(r['Centre % Achieved']), num:true },
    { label:'Bonus Payable', get:r=>fmtGbp(r['Bonus Payable']), num:true },
    { label:'Status', get:r=>r['Centre % Achieved']===null||r['Centre % Achieved']===undefined?'-':statusPill(r['Centre % Achieved']) },
  ];
  const rowsHtml = data.rows.map(r=>`<tr>${cols.map(c=>`<td class="${c.num?'num':''}">${c.get(r)}</td>`).join('')}</tr>`).join('');
  const totalHtml = data.total ? `<tr class="group">${cols.map(c=>{
    if(c.label==='Centre') return `<td>Total</td>`;
    if(c.label==='WRR Group') return `<td></td>`;
    return `<td class="${c.num?'num':''}">${c.get(data.total)}</td>`;
  }).join('')}</tr>` : '';
  el.innerHTML = `<thead><tr>${cols.map(c=>`<th class="${c.num?'num':''}">${c.label}</th>`).join('')}</tr></thead><tbody>${rowsHtml}${totalHtml}</tbody>`;
}

function renderPeriodToggle(){
  // Multiple instances share the same state (Dashboard above Rankings,
  // Centre Detail) so the period can be switched from whichever tab is
  // open.
  document.querySelectorAll('.periodToggle').forEach(el=>{
    el.innerHTML = PERIODS.map(p=>`<button class="admin-btn ${p===ACTIVE_PERIOD?'primary-btn':''}" data-period="${p}" type="button">${PERIOD_LABEL[p]}</button>`).join('');
    el.querySelectorAll('button[data-period]').forEach(btn=>{
      btn.addEventListener('click', ()=>{ ACTIVE_PERIOD = btn.dataset.period; build(); });
    });
  });
}

function build(){
  renderPeriodToggle();
  // VCF tab
  renderPillarCards(groupData('q3'), groupData('ytd'), 'pillarCards');
  renderLeaderboards(DATA.centre[ACTIVE_PERIOD], 'pillarLeaderboards');
  renderLeaderboards(DATA.cda[ACTIVE_PERIOD], 'cdaLeaderboards');
  // Trade Parts tab
  renderTradePartsCard('tradePartsCard', DATA.tradeParts);
  renderTradePartsCdaCards('tradePartsCdaCards', DATA.tradePartsCda);
  renderTradeParts(DATA.tradeParts);
  // WRR tab
  renderWrrCard('wrrCard', DATA.wrr.q3, DATA.wrr.ytd);
  renderWrrRankingCard('wrrLeaderboard', DATA.wrr[ACTIVE_PERIOD]);
  renderWrrCdaRankingCard('wrrCdaLeaderboard', DATA.wrr[ACTIVE_PERIOD]);
  renderWrrTable(DATA.wrr[ACTIVE_PERIOD]);
  updateVersionDisplays();
}

// --- Data bootstrap -------------------------------------------------------
let DATA = {
  centre: { q3: window.SERVICE_DATA_CENTRE_Q3 || null, ytd: window.SERVICE_DATA_CENTRE_YTD || null },
  cda: { q3: window.SERVICE_DATA_CDA_Q3 || null, ytd: window.SERVICE_DATA_CDA_YTD || null },
  wrr: { q3: window.SERVICE_DATA_WRR_Q3 || null, ytd: window.SERVICE_DATA_WRR_YTD || null },
  tradeParts: window.SERVICE_DATA_TRADE_PARTS || null,
  tradePartsCda: window.SERVICE_DATA_TRADE_PARTS_CDA || null,
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
const WRR_SLOTS = [
  { period:'q3', fileId:'wrrQ3File', label:'WRR - Q3' },
  { period:'ytd', fileId:'wrrYtdFile', label:'WRR - YTD' },
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
function tradePartsPreviewHtml(data){
  return `<table><thead><tr>${TRADE_PARTS_COLS.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead><tbody>${data.rows.map(row=>`<tr class="${String(row.Period||'').toLowerCase()==='total'?'group':''}">${TRADE_PARTS_COLS.map(c=>`<td class="num">${tradePartsCellText(c.key,row)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function wrrPreviewHtml(data){
  const labels = ['Centre Name','WRR Group','CPUS Unique','Target','Centre % Achieved','Bonus Payable'];
  return `<table><thead><tr>${labels.map(l=>`<th>${l}</th>`).join('')}</tr></thead><tbody>${data.rows.map(r=>`<tr><td>${r['Centre Name']}</td><td>${r['WRR Group']}</td><td class="num">${fmt(r['CPUS Unique'])}</td><td class="num">${fmt(r['Target'])}</td><td class="num">${pct(r['Centre % Achieved'])}</td><td class="num">${fmtGbp(r['Bonus Payable'])}</td></tr>`).join('')}${data.total ? `<tr class="group"><td>Total</td><td></td><td class="num">${fmt(data.total['CPUS Unique'])}</td><td class="num">${fmt(data.total['Target'])}</td><td class="num">${pct(data.total['Centre % Achieved'])}</td><td class="num">${fmtGbp(data.total['Bonus Payable'])}</td></tr>` : ''}</tbody></table>`;
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
    const tradePartsFile = document.getElementById('tradePartsFile')?.files?.[0];
    if(tradePartsFile){
      const buf = await readFileAsArrayBuffer(tradePartsFile);
      const wb = XLSX.read(buf,{type:'array'});
      const parsed = parseTradePartsWorkbook(wb);
      data.tradeParts = parsed;
      messages.push(`Group Trade Parts imported (${parsed.rows.length} periods)`);
      const block = document.createElement('div');
      block.innerHTML = `<div class="hint" style="margin-top:12px">Group Trade Parts preview</div><div class="table-wrap" style="max-height:280px">${tradePartsPreviewHtml(parsed)}</div>`;
      container.appendChild(block);
    }
    const tradePartsCdaFiles = document.getElementById('tradePartsCdaFile')?.files;
    const tradePartsLexusFile = document.getElementById('tradePartsLexusFile')?.files?.[0];
    if((tradePartsCdaFiles && tradePartsCdaFiles.length) || tradePartsLexusFile){
      const cdaList = [];
      for(const file of (tradePartsCdaFiles || [])){
        const buf = await readFileAsArrayBuffer(file);
        const wb = XLSX.read(buf,{type:'array'});
        const parsed = parseTradePartsWorkbook(wb);
        const cda = extractCdaName(parsed.filtersText, file.name.replace(/\.[^.]+$/,''));
        cdaList.push(Object.assign({ cda }, parsed));
      }
      if(tradePartsLexusFile){
        const buf = await readFileAsArrayBuffer(tradePartsLexusFile);
        const wb = XLSX.read(buf,{type:'array'});
        const parsed = parseTradePartsWorkbook(wb);
        cdaList.push(Object.assign({ cda:'Lexus' }, parsed));
      }
      data.tradePartsCda = cdaList;
      messages.push(`Group Trade Parts breakdown imported (${cdaList.map(c=>c.cda).join(', ')})`);
      const block = document.createElement('div');
      block.innerHTML = `<div class="hint" style="margin-top:12px">Group Trade Parts breakdown preview</div>` + cdaList.map(c=>`<div class="hint" style="margin-top:8px"><strong>${c.cda}</strong></div><div class="table-wrap" style="max-height:220px">${tradePartsPreviewHtml(c)}</div>`).join('');
      container.appendChild(block);
    }
    for(const slot of WRR_SLOTS){
      const file = document.getElementById(slot.fileId)?.files?.[0];
      if(!file) continue;
      const buf = await readFileAsArrayBuffer(file);
      const wb = XLSX.read(buf,{type:'array'});
      const parsed = parseWrrWorkbook(wb);
      data.wrr[slot.period] = parsed;
      messages.push(`${slot.label} imported (${parsed.rows.length} centres)`);
      const block = document.createElement('div');
      block.innerHTML = `<div class="hint" style="margin-top:12px">${slot.label} preview</div><div class="table-wrap" style="max-height:280px">${wrrPreviewHtml(parsed)}</div>`;
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
  downloadOne('service-trade-parts-data.js', 'SERVICE_DATA_TRADE_PARTS', DATA.tradeParts);
  downloadOne('service-trade-parts-cda-data.js', 'SERVICE_DATA_TRADE_PARTS_CDA', DATA.tradePartsCda);
  downloadOne('service-wrr-data.js', 'SERVICE_DATA_WRR_Q3', DATA.wrr.q3);
  downloadOne('service-wrr-data-ytd.js', 'SERVICE_DATA_WRR_YTD', DATA.wrr.ytd);
}
function resetSavedData(){
  localStorage.removeItem(SERVICE_DATA_KEY);
  localStorage.removeItem(SERVICE_META_KEY);
  location.reload();
}

// --- Wiring ---------------------------------------------------------------
(function(){
  const params=new URLSearchParams(location.search);
  if(params.get('admin')==='1'){
    localStorage.setItem('rrg_admin_unlocked','1');
    params.delete('admin');
    const qs=params.toString();
    history.replaceState(null,'',location.pathname+(qs?'?'+qs:'')+location.hash);
  }
  if(localStorage.getItem('rrg_admin_unlocked')!=='1'){
    document.querySelectorAll('nav button[data-target="admin"]').forEach(b=>b.style.display='none');
  }
})();
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
