
// RRG Group Dashboard - Weekly Trends / History
// Root-file add-on. Does not change the existing dashboard calculations.
const RRG_HISTORY_KEY = 'rrgDashboardHistory_v1';

function rrgNum(v){ return Number(v) || 0; }
function rrgFmt(n){ return Math.round(Number(n)||0).toLocaleString('en-GB'); }
function rrgPct(n){ return `${Math.round((Number(n)||0)*100)}%`; }

function rrgISOWeek(date = new Date()){
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`;
}

function rrgLoadHistory(){
  try{
    const saved = JSON.parse(localStorage.getItem(RRG_HISTORY_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  }catch(e){ return []; }
}

function rrgSaveHistory(history){
  localStorage.setItem(RRG_HISTORY_KEY, JSON.stringify(history));
}

function rrgOrderMonth(){
  if(typeof currentOrderMonth === 'function') return currentOrderMonth();
  const m = new Date().getMonth();
  return ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][m] || 'jul';
}

function rrgSum(rows, key){
  return (rows || []).reduce((a,r)=>a+rrgNum(r && r[key]),0);
}

function rrgCurrentData(){
  // DATA is defined in app.js as the live dashboard dataset.
  try{ return DATA; }catch(e){ return null; }
}

function rrgMakeSnapshot(){
  const data = rrgCurrentData();
  if(!data) throw new Error('Dashboard data not available yet.');

  const regs = data.dashboard_regs || [];
  const used = data.dashboard_used || [];
  const nonRows = (data.q3_non || []).filter(r=>['NORTH CDA','WY CDA'].includes(String(r.centre||'').toUpperCase()));
  const acts = data.dashboard_activity || [];
  const orders = data.dashboard_orders || [];
  const month = rrgOrderMonth();

  const newActual = rrgSum(regs,'qtr_total');
  const newTarget = rrgSum(regs,'qtr_target');
  const usedActual = rrgSum(used,'qtr_counting');
  const usedTarget = rrgSum(used,'qtr_target');
  const fleetActual = rrgSum(nonRows,'qtr_total');
  const fleetTarget = rrgSum(nonRows,'qtr_budget');
  const enquiries = rrgSum(acts,'total_enquiries');
  const testDrives = rrgSum(acts,'total_test_drives');
  const offerSheets = rrgSum(acts,'total_os');
  const salesOrders = rrgSum(acts,'total_orders');

  const orderBankActual = (orders || []).reduce((a,r)=>{
    if(typeof orderDoneFor === 'function') return a + rrgNum(orderDoneFor(r, month));
    return a + rrgNum(r[month + '_done']);
  },0);
  const orderBankTarget = rrgSum(orders, month + '_target');

  const centres = (data.user_sites || ['Rochdale','Bury','Bolton','SQ','Huddersfield','Bradford','Silsden']).map(name=>{
    const r = regs.find(x=>x.centre===name) || {};
    const u = used.find(x=>x.centre===name) || {};
    const a = acts.find(x=>x.centre===name) || {};
    const o = orders.find(x=>x.centre===name) || {};
    const centreEnq = rrgNum(a.total_enquiries);
    const centreOrders = rrgNum(a.total_orders);
    const centreRegPct = rrgNum(r.qtr_target) ? rrgNum(r.qtr_total) / rrgNum(r.qtr_target) : 0;
    const centreUsedPct = rrgNum(u.qtr_target) ? rrgNum(u.qtr_counting) / rrgNum(u.qtr_target) : 0;
    return {
      centre:name,
      newRegs:rrgNum(r.qtr_total),
      newTarget:rrgNum(r.qtr_target),
      newPct:centreRegPct,
      usedCars:rrgNum(u.qtr_counting),
      usedTarget:rrgNum(u.qtr_target),
      usedPct:centreUsedPct,
      enquiries:centreEnq,
      testDrives:rrgNum(a.total_test_drives),
      offerSheets:rrgNum(a.total_os),
      orders:centreOrders,
      conversion:centreEnq ? centreOrders / centreEnq : 0,
      orderBankDone: (typeof orderDoneFor === 'function') ? rrgNum(orderDoneFor(o, month)) : rrgNum(o[month + '_done']),
      orderBankTarget: rrgNum(o[month + '_target'])
    };
  });

  const now = new Date();
  return {
    week: rrgISOWeek(now),
    date: now.toISOString(),
    label: rrgISOWeek(now),
    newActual, newTarget,
    usedActual, usedTarget,
    fleetActual, fleetTarget,
    enquiries,
    testDrivePct: enquiries ? testDrives / enquiries : 0,
    offerSheetPct: enquiries ? offerSheets / enquiries : 0,
    conversionPct: enquiries ? salesOrders / enquiries : 0,
    salesOrders,
    orderBankActual, orderBankTarget,
    centres
  };
}

function rrgStoreCurrentSnapshot(){
  const snapshot = rrgMakeSnapshot();
  const history = rrgLoadHistory().filter(h=>h.week !== snapshot.week);
  history.push(snapshot);
  history.sort((a,b)=>String(a.week).localeCompare(String(b.week)));
  rrgSaveHistory(history);
  rrgRenderTrends();
  return snapshot;
}

function rrgTrendBars(id, history, key, format='num'){
  const el = document.getElementById(id);
  if(!el) return;
  if(!history.length){
    el.innerHTML = '<div class="hint">No snapshots yet. Save a snapshot after your Monday update.</div>';
    return;
  }
  const max = Math.max(...history.map(h=>Math.abs(rrgNum(h[key]))), 1);
  el.innerHTML = history.slice(-12).map(h=>{
    const raw = rrgNum(h[key]);
    const width = Math.max(4, Math.min(100, (Math.abs(raw)/max)*100));
    const value = format === 'pct' ? rrgPct(raw) : rrgFmt(raw);
    return `<div class="trend-row"><div class="trend-week">${h.week}</div><div class="trend-track"><div class="trend-fill" style="width:${width}%"></div></div><div class="trend-value">${value}</div></div>`;
  }).join('');
}

function rrgTrendDelta(latest, previous, key, format='num'){
  if(!latest || !previous) return '-';
  const diff = rrgNum(latest[key]) - rrgNum(previous[key]);
  const sign = diff > 0 ? '+' : '';
  if(format === 'pct') return `${sign}${Math.round(diff*100)} pts`;
  return `${sign}${rrgFmt(diff)}`;
}

function rrgRenderTrendSummary(history){
  const latest = history[history.length-1];
  const prev = history[history.length-2];

  const set = (id, html) => { const el=document.getElementById(id); if(el) el.innerHTML=html; };
  set('trendSnapshotCount', history.length ? rrgFmt(history.length) : '0');
  set('trendLatestWeek', latest ? `Latest: ${latest.week}` : 'No snapshots saved yet');
  set('trendNewWow', rrgTrendDelta(latest, prev, 'newActual'));
  set('trendUsedWow', rrgTrendDelta(latest, prev, 'usedActual'));

  if(!latest){
    set('trendBestPerformance', 'Save a weekly snapshot to start building trends.');
    set('trendBiggestOpportunity', 'Once history exists, this will highlight where the biggest upside sits.');
    if(document.getElementById('momentumTable')) document.getElementById('momentumTable').innerHTML = '';
    return;
  }

  const centres = latest.centres || [];
  const best = centres.slice().sort((a,b)=>Math.max(b.newPct,b.usedPct)-Math.max(a.newPct,a.usedPct))[0];
  const groupConv = latest.enquiries ? latest.salesOrders / latest.enquiries : 0;
  const opportunity = centres.slice()
    .map(c=>({ ...c, upside: Math.max(0, groupConv - rrgNum(c.conversion)) * rrgNum(c.enquiries) }))
    .sort((a,b)=>b.upside-a.upside)[0];

  set('trendBestPerformance', best ? `<strong>${best.centre}</strong><br>New registrations: ${rrgPct(best.newPct)} · Used cars: ${rrgPct(best.usedPct)}.` : 'No centre data available.');
  set('trendBiggestOpportunity', opportunity && opportunity.upside > 0
    ? `<strong>${opportunity.centre}</strong><br>Conversion is ${rrgPct(opportunity.conversion)} against group average of ${rrgPct(groupConv)}. Matching group average would be worth roughly <strong>${Math.round(opportunity.upside)}</strong> additional orders from current enquiry volume.`
    : 'No clear conversion opportunity found in the latest snapshot.');

  const previousCentres = prev ? (prev.centres || []) : [];
  const rows = centres.map(c=>{
    const p = previousCentres.find(x=>x.centre===c.centre) || {};
    const newMove = rrgNum(c.newPct) - rrgNum(p.newPct);
    const usedMove = rrgNum(c.usedPct) - rrgNum(p.usedPct);
    const convMove = rrgNum(c.conversion) - rrgNum(p.conversion);
    let momentum = 'Stable';
    const score = newMove + usedMove + convMove;
    if(!prev) momentum = 'First snapshot';
    else if(score > .06) momentum = 'Building momentum';
    else if(score > .015) momentum = 'Improving';
    else if(score < -.04) momentum = 'Biggest opportunity';
    return {
      centre:c.centre,
      newPct:c.newPct,
      usedPct:c.usedPct,
      conversion:c.conversion,
      newMove,
      usedMove,
      momentum
    };
  });

  if(typeof makeTable === 'function'){
    makeTable('momentumTable',[
      {label:'Centre',key:'centre'},
      {label:'New %',key:'newPct',format:'pct',num:true},
      {label:'Used %',key:'usedPct',format:'pct',num:true},
      {label:'Conversion',key:'conversion',format:'pct',num:true},
      {label:'New WoW',key:'newMove',format:'pct',num:true},
      {label:'Used WoW',key:'usedMove',format:'pct',num:true},
      {label:'Momentum',key:'momentum'}
    ], rows);
  }
}

function rrgRenderTrends(){
  const history = rrgLoadHistory();
  rrgRenderTrendSummary(history);
  rrgTrendBars('newRegsTrend', history, 'newActual');
  rrgTrendBars('usedCarsTrend', history, 'usedActual');
  rrgTrendBars('enquiriesTrend', history, 'enquiries');
  rrgTrendBars('conversionTrend', history, 'conversionPct', 'pct');
}

function rrgDownloadHistory(){
  const blob = new Blob([JSON.stringify(rrgLoadHistory(), null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'rrg-dashboard-history-backup.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function rrgClearHistory(){
  if(confirm('Clear all saved weekly trend history in this browser?')){
    localStorage.removeItem(RRG_HISTORY_KEY);
    rrgRenderTrends();
  }
}

document.getElementById('saveTrendSnapshot')?.addEventListener('click', ()=>{
  const s = rrgStoreCurrentSnapshot();
  alert(`Saved ${s.week} snapshot.`);
});
document.getElementById('downloadHistory')?.addEventListener('click', rrgDownloadHistory);
document.getElementById('clearHistory')?.addEventListener('click', rrgClearHistory);

// Save a history snapshot automatically whenever Admin Publish is clicked.
// Existing Publish handler runs first; this one then records the resulting DATA.
document.getElementById('publishImport')?.addEventListener('click', ()=>{
  setTimeout(()=>{
    try{ rrgStoreCurrentSnapshot(); }catch(e){ console.warn('Trend snapshot not saved:', e); }
  }, 150);
});

rrgRenderTrends();
