const DASHBOARD_BUILD_VERSION = '2026.07.21.performance.1';
const DASHBOARD_META_KEY = 'rrgDashboardMeta_v1';
function formatPublishedAt(iso){
  if(!iso) return 'Not published in this browser yet';
  const d = new Date(iso);
  if(Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', { weekday:'short', day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function getDashboardMeta(){
  try{
    const saved = JSON.parse(localStorage.getItem(DASHBOARD_META_KEY) || 'null');
    if(saved && saved.version) return saved;
  }catch(e){}
  return { version: DASHBOARD_BUILD_VERSION, publishedAt: null };
}
function makePublishVersion(){
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())}.${pad(d.getHours())}${pad(d.getMinutes())}`;
}
function saveDashboardMeta(){
  const meta = { version: makePublishVersion(), publishedAt: new Date().toISOString() };
  localStorage.setItem(DASHBOARD_META_KEY, JSON.stringify(meta));
  updateVersionDisplays();
  return meta;
}
function updateVersionDisplays(){
  const meta = getDashboardMeta();
  const versionText = `Version ${meta.version}`;
  const publishedText = `Published ${formatPublishedAt(meta.publishedAt)}`;
  const set = (id, text) => { const el = document.getElementById(id); if(el) el.textContent = text; };
  set('liveVersionHeader', versionText);
  set('livePublishedHeader', publishedText);
  set('footerVersion', versionText);
  set('footerPublished', publishedText);
  set('adminLiveVersion', versionText);
  set('adminPublishedAt', formatPublishedAt(meta.publishedAt));
}

const NORTH_SITES = ['Bolton','Bury','Rochdale','SQ'];
const WY_SITES = ['Bradford','Huddersfield','Silsden'];
const SOUTH_SITES = ['Denton','Altrincham','Stockport','Macclesfield'];
const ALL_DASHBOARD_SITES = [...NORTH_SITES, ...WY_SITES, ...SOUTH_SITES];
const CDA_TOTALS = [
  { label:'NORTH CDA', items:NORTH_SITES },
  { label:'WY CDA', items:WY_SITES },
  { label:'SOUTH CDA', items:SOUTH_SITES }
];
function hasAnyValues(row, fields){ return fields.some(f => Number(row && row[f]) || 0); }
function isKnownCentreLabel(label){
  const c = normCentreName(label);
  return ALL_DASHBOARD_SITES.includes(c) || ['NORTH CDA','WY CDA','SOUTH CDA','Salford'].includes(c);
}
function ensureRow(rows, centre){
  const c = normCentreName(centre);
  let row = rows.find(r=>normCentreName(r.centre).toLowerCase()===c.toLowerCase());
  if(!row){ row={centre:c}; rows.push(row); }
  return row;
}
function aggregateRows(rows, label, items, fields){
  let row = ensureRow(rows, label);
  row.centre = label;
  fields.forEach(f => row[f] = rows.filter(r=>items.includes(r.centre)).reduce((a,r)=>a+(Number(r[f])||0),0));
  if(fields.includes('qtr_target') && fields.includes('qtr_total')){
    row.to_go = (Number(row.qtr_target)||0) - (Number(row.qtr_total)||0);
    row.per_week = row.per_week || 0;
    row.qtr_regs = row.qtr_total;
    row.target = row.qtr_target;
    row.regs_v_target = row.qtr_target ? row.qtr_total / row.qtr_target : 0;
  }
  if(fields.includes('qtr_target') && fields.includes('qtr_counting')){
    row.regs_v_target = row.qtr_target ? row.qtr_counting / row.qtr_target : 0;
  }
  return row;
}
function ensureCdaTotals(data){
  const regFields=['jul_counting','jul_clcp','jul_fleet','jul_total','jul_target','aug_counting','aug_clcp','aug_fleet','aug_total','aug_target','sep_counting','sep_clcp','sep_fleet','sep_total','sep_target','qtr_counting','qtr_fleet','qtr_total','qtr_target'];
  const usedFields=['jul_counting','jul_target','aug_counting','aug_target','sep_counting','sep_target','qtr_counting','qtr_target'];
  const fleetFields=['regs','target','active_orders'];
  for(const g of CDA_TOTALS){
    if((data.q3_regs||[]).some(r=>g.items.includes(r.centre))) aggregateRows(data.q3_regs, g.label, g.items, regFields);
    if((data.q3_used||[]).some(r=>g.items.includes(r.centre))) aggregateRows(data.q3_used, g.label, g.items, usedFields);
    if((data.q3_fleet||[]).some(r=>g.items.includes(r.centre))){
      const row=aggregateRows(data.q3_fleet, g.label, g.items, fleetFields);
      row.pct = row.target ? row.regs / row.target : 0;
    }
    if((data.q3_fleet_monthly||[]).some(r=>g.items.includes(r.centre))){
      const fields=['jul_fleet','aug_fleet','sep_fleet','qtr_fleet','bch_regs','bch_target','active_orders'];
      const row=aggregateRows(data.q3_fleet_monthly, g.label, g.items, fields);
      row.pct = row.bch_target ? row.bch_regs / row.bch_target : 0;
    }
  }
}

let DATA = {"q3_regs":[{"centre":"Bolton","jul_counting":0,"jul_clcp":0,"jul_fleet":0,"jul_total":0,"jul_target":24.0,"aug_counting":0,"aug_clcp":0,"aug_fleet":0,"aug_total":0,"aug_target":12.0,"sep_counting":0,"sep_clcp":0,"sep_fleet":0,"sep_total":0,"sep_target":69.0,"qtr_counting":0,"qtr_fleet":0,"qtr_total":0,"qtr_target":105,"to_go":105,"per_week":8,"qtr_regs":0,"target":105,"regs_v_target":0},{"centre":"Bury","jul_counting":0,"jul_clcp":0,"jul_fleet":0,"jul_total":0,"jul_target":19.0,"aug_counting":0,"aug_clcp":0,"aug_fleet":0,"aug_total":0,"aug_target":11.0,"sep_counting":0,"sep_clcp":0,"sep_fleet":0,"sep_total":0,"sep_target":47.0,"qtr_counting":0,"qtr_fleet":0,"qtr_total":0,"qtr_target":77,"to_go":77,"per_week":6,"qtr_regs":0,"target":77,"regs_v_target":0},{"centre":"Rochdale","jul_counting":0,"jul_clcp":0,"jul_fleet":0,"jul_total":0,"jul_target":19.0,"aug_counting":0,"aug_clcp":0,"aug_fleet":0,"aug_total":0,"aug_target":11.0,"sep_counting":0,"sep_clcp":0,"sep_fleet":0,"sep_total":0,"sep_target":55.0,"qtr_counting":0,"qtr_fleet":0,"qtr_total":0,"qtr_target":85,"to_go":85,"per_week":7,"qtr_regs":0,"target":85,"regs_v_target":0},{"centre":"SQ","jul_counting":0,"jul_clcp":0,"jul_fleet":0,"jul_total":0,"jul_target":32.0,"aug_counting":0,"aug_clcp":0,"aug_fleet":0,"aug_total":0,"aug_target":18.0,"sep_counting":0,"sep_clcp":0,"sep_fleet":0,"sep_total":0,"sep_target":90.0,"qtr_counting":0,"qtr_fleet":0,"qtr_total":0,"qtr_target":140,"to_go":140,"per_week":11,"qtr_regs":0,"target":140,"regs_v_target":0},{"centre":"NORTH CDA","jul_counting":0,"jul_clcp":0,"jul_fleet":0,"jul_total":0,"jul_target":94,"aug_counting":0,"aug_clcp":0,"aug_fleet":0,"aug_total":0,"aug_target":52,"sep_counting":0,"sep_clcp":0,"sep_fleet":0,"sep_total":0,"sep_target":261,"qtr_counting":0,"qtr_fleet":0,"qtr_total":0,"qtr_target":407,"to_go":407,"per_week":32,"qtr_regs":0,"target":407,"regs_v_target":0},{"centre":"Bradford","jul_counting":0,"jul_clcp":0,"jul_fleet":0,"jul_total":0,"jul_target":22.0,"aug_counting":0,"aug_clcp":0,"aug_fleet":0,"aug_total":0,"aug_target":13.0,"sep_counting":0,"sep_clcp":0,"sep_fleet":0,"sep_total":0,"sep_target":70.0,"qtr_counting":0,"qtr_fleet":0,"qtr_total":0,"qtr_target":105,"to_go":105,"per_week":8,"qtr_regs":0,"target":105,"regs_v_target":0},{"centre":"Huddersfield","jul_counting":0,"jul_clcp":0,"jul_fleet":0,"jul_total":0,"jul_target":23.0,"aug_counting":0,"aug_clcp":0,"aug_fleet":0,"aug_total":0,"aug_target":13.0,"sep_counting":0,"sep_clcp":0,"sep_fleet":0,"sep_total":0,"sep_target":72.0,"qtr_counting":0,"qtr_fleet":0,"qtr_total":0,"qtr_target":108,"to_go":108,"per_week":9,"qtr_regs":0,"target":108,"regs_v_target":0},{"centre":"Silsden","jul_counting":0,"jul_clcp":0,"jul_fleet":0,"jul_total":0,"jul_target":8.0,"aug_counting":0,"aug_clcp":0,"aug_fleet":0,"aug_total":0,"aug_target":3.0,"sep_counting":0,"sep_clcp":0,"sep_fleet":0,"sep_total":0,"sep_target":23.0,"qtr_counting":0,"qtr_fleet":0,"qtr_total":0,"qtr_target":34,"to_go":34,"per_week":3,"qtr_regs":0,"target":34,"regs_v_target":0},{"centre":"WY CDA","jul_counting":0,"jul_clcp":0,"jul_fleet":0,"jul_total":0,"jul_target":53,"aug_counting":0,"aug_clcp":0,"aug_fleet":0,"aug_total":0,"aug_target":29,"sep_counting":0,"sep_clcp":0,"sep_fleet":0,"sep_total":0,"sep_target":165,"qtr_counting":0,"qtr_fleet":0,"qtr_total":0,"qtr_target":247,"to_go":247,"per_week":20,"qtr_regs":0,"target":247,"regs_v_target":0}],"q3_non":[{"centre":"Salford","jul_reg":0,"jul_unreg":0,"jul_total":0,"jul_budget":0,"aug_reg":0,"aug_unreg":0,"aug_total":0,"aug_budget":0,"sep_reg":0,"sep_unreg":0,"sep_total":0,"sep_budget":0,"qtr_reg":0,"qtr_unreg":0,"qtr_total":0,"qtr_budget":0},{"centre":"NORTH CDA","jul_reg":0,"jul_unreg":0,"jul_total":0,"jul_budget":0,"aug_reg":0,"aug_unreg":0,"aug_total":0,"aug_budget":0,"sep_reg":0,"sep_unreg":0,"sep_total":0,"sep_budget":0,"qtr_reg":0,"qtr_unreg":0,"qtr_total":0,"qtr_budget":0},{"centre":"Bradford","jul_reg":0,"jul_unreg":0,"jul_total":0,"jul_budget":0,"aug_reg":0,"aug_unreg":0,"aug_total":0,"aug_budget":0,"sep_reg":0,"sep_unreg":0,"sep_total":0,"sep_budget":0,"qtr_reg":0,"qtr_unreg":0,"qtr_total":0,"qtr_budget":0},{"centre":"WY CDA","jul_reg":0,"jul_unreg":0,"jul_total":0,"jul_budget":0,"aug_reg":0,"aug_unreg":0,"aug_total":0,"aug_budget":0,"sep_reg":0,"sep_unreg":0,"sep_total":0,"sep_budget":0,"qtr_reg":0,"qtr_unreg":0,"qtr_total":0,"qtr_budget":0}],"q3_used":[{"centre":"Bolton","jul_counting":0,"jul_target":63.0,"aug_counting":0,"aug_target":62.0,"sep_counting":0,"sep_target":62.0,"qtr_counting":0,"qtr_target":187},{"centre":"Bury","jul_counting":0,"jul_target":55.0,"aug_counting":0,"aug_target":54.0,"sep_counting":0,"sep_target":54.0,"qtr_counting":0,"qtr_target":163},{"centre":"Rochdale","jul_counting":0,"jul_target":51.0,"aug_counting":0,"aug_target":50.0,"sep_counting":0,"sep_target":50.0,"qtr_counting":0,"qtr_target":151},{"centre":"SQ","jul_counting":0,"jul_target":60.0,"aug_counting":0,"aug_target":59.0,"sep_counting":0,"sep_target":59.0,"qtr_counting":0,"qtr_target":178},{"centre":"NORTH CDA","jul_counting":0,"jul_target":229,"aug_counting":0,"aug_target":225,"sep_counting":0,"sep_target":225,"qtr_counting":0,"qtr_target":679},{"centre":"Bradford","jul_counting":0,"jul_target":36.0,"aug_counting":0,"aug_target":36.0,"sep_counting":0,"sep_target":36.0,"qtr_counting":0,"qtr_target":108},{"centre":"Huddersfield","jul_counting":0,"jul_target":47.0,"aug_counting":0,"aug_target":46.0,"sep_counting":0,"sep_target":46.0,"qtr_counting":0,"qtr_target":139},{"centre":"Silsden","jul_counting":0,"jul_target":22.0,"aug_counting":0,"aug_target":21.0,"sep_counting":0,"sep_target":21.0,"qtr_counting":0,"qtr_target":64},{"centre":"WY CDA","jul_counting":0,"jul_target":105,"aug_counting":0,"aug_target":103,"sep_counting":0,"sep_target":103,"qtr_counting":0,"qtr_target":311}],"q3_fleet":[{"centre":"Bolton","regs":0.0,"target":7.0,"pct":0,"active_orders":0},{"centre":"Bury","regs":0.0,"target":5.0,"pct":0,"active_orders":0},{"centre":"Rochdale","regs":0.0,"target":6.0,"pct":0,"active_orders":0},{"centre":"SQ","regs":0.0,"target":8.0,"pct":0,"active_orders":0},{"centre":"NORTH CDA","regs":0,"target":26,"pct":0,"active_orders":0},{"centre":"Bradford","regs":1.0,"target":6.0,"pct":0.1667,"active_orders":0},{"centre":"Huddersfield","regs":0.0,"target":7.0,"pct":0,"active_orders":0},{"centre":"Silsden","regs":0.0,"target":2.0,"pct":0,"active_orders":0},{"centre":"WY CDA","regs":1,"target":15,"pct":0.0667,"active_orders":0}],"q2_regs":[{"centre":"Bolton","apr_total":26,"apr_target":21.0,"may_total":32,"may_target":27.0,"jun_total":43,"jun_target":48.0,"qtr_counting":99,"qtr_fleet":2,"qtr_total":101,"qtr_target":96,"to_go":-5,"per_week":9,"regs_v_target":1.0521},{"centre":"Bury","apr_total":23,"apr_target":15.0,"may_total":28,"may_target":20.0,"jun_total":26,"jun_target":36.0,"qtr_counting":75.0,"qtr_fleet":2,"qtr_total":77.0,"qtr_target":71,"to_go":-6,"per_week":11,"regs_v_target":1.0845},{"centre":"Rochdale","apr_total":22,"apr_target":17.0,"may_total":41,"may_target":23.0,"jun_total":27,"jun_target":40.0,"qtr_counting":90,"qtr_fleet":0,"qtr_total":90,"qtr_target":80,"to_go":-10,"per_week":18,"regs_v_target":1.125},{"centre":"SQ","apr_total":52,"apr_target":29.0,"may_total":45,"may_target":37.0,"jun_total":51,"jun_target":60.0,"qtr_counting":125,"qtr_fleet":23,"qtr_total":148,"qtr_target":126,"to_go":-22,"per_week":39,"regs_v_target":1.1746},{"centre":"NORTH CDA","apr_total":123,"apr_target":82,"may_total":146,"may_target":107,"jun_total":147,"jun_target":184,"qtr_counting":389,"qtr_fleet":27,"qtr_total":416,"qtr_target":373,"to_go":-43,"per_week":75,"regs_v_target":1.1153},{"centre":"Bradford","apr_total":22,"apr_target":22.0,"may_total":27,"may_target":26.0,"jun_total":30,"jun_target":44.0,"qtr_counting":66,"qtr_fleet":13,"qtr_total":79,"qtr_target":92,"to_go":13,"per_week":-23,"regs_v_target":0.8587},{"centre":"Huddersfield","apr_total":25,"apr_target":21.0,"may_total":38,"may_target":27.0,"jun_total":34,"jun_target":49.0,"qtr_counting":89,"qtr_fleet":8,"qtr_total":97,"qtr_target":97,"to_go":0,"per_week":0,"regs_v_target":1},{"centre":"Silsden","apr_total":6,"apr_target":6.0,"may_total":7,"may_target":9.0,"jun_total":17,"jun_target":13.0,"qtr_counting":30,"qtr_fleet":0,"qtr_total":30,"qtr_target":28,"to_go":-2,"per_week":4,"regs_v_target":1.0714},{"centre":"WY CDA","apr_total":53,"apr_target":49,"may_total":72,"may_target":62,"jun_total":81,"jun_target":106,"qtr_counting":185,"qtr_fleet":21,"qtr_total":206,"qtr_target":217,"to_go":11,"per_week":-19,"regs_v_target":0.9493}],"q2_non":[{"centre":"NORTH CDA","apr_total":198,"may_total":128,"jun_total":328,"qtr_total":654,"budget":0},{"centre":"Bradford","apr_total":13,"may_total":237,"jun_total":34,"qtr_total":284,"budget":0},{"centre":"WY CDA","apr_total":13,"may_total":237,"jun_total":34,"qtr_total":284,"budget":0}],"q2_used":[{"centre":"Bury","apr_counting":59.0,"apr_target":51.0,"may_counting":42.0,"may_target":51.0,"jun_counting":42.0,"jun_target":54.0,"qtr_counting":143,"qtr_target":156},{"centre":"Rochdale","apr_counting":49.0,"apr_target":47.0,"may_counting":47.0,"may_target":47.0,"jun_counting":45.0,"jun_target":50.0,"qtr_counting":141,"qtr_target":144},{"centre":"SQ","apr_counting":59.0,"apr_target":56.0,"may_counting":52.0,"may_target":56.0,"jun_counting":50.0,"jun_target":59.0,"qtr_counting":161,"qtr_target":171},{"centre":"NORTH CDA","apr_counting":235,"apr_target":213,"may_counting":198,"may_target":213,"jun_counting":193,"jun_target":225,"qtr_counting":626,"qtr_target":651},{"centre":"Bradford","apr_counting":40.0,"apr_target":34.0,"may_counting":37.0,"may_target":34.0,"jun_counting":40.0,"jun_target":36.0,"qtr_counting":117,"qtr_target":104},{"centre":"Huddersfield","apr_counting":32.0,"apr_target":44.0,"may_counting":52.0,"may_target":44.0,"jun_counting":35.0,"jun_target":46.0,"qtr_counting":119,"qtr_target":134},{"centre":"Silsden","apr_counting":20.0,"apr_target":20.0,"may_counting":20.0,"may_target":20.0,"jun_counting":31.0,"jun_target":21.0,"qtr_counting":71,"qtr_target":61},{"centre":"WY CDA","apr_counting":92,"apr_target":98,"may_counting":109,"may_target":98,"jun_counting":106,"jun_target":103,"qtr_counting":307,"qtr_target":299}],"q3_fleet_monthly":[{"centre":"Bolton","jul_fleet":0,"aug_fleet":0,"sep_fleet":0,"qtr_fleet":0,"bch_regs":0.0,"bch_target":7.0,"active_orders":0},{"centre":"Bury","jul_fleet":0,"aug_fleet":0,"sep_fleet":0,"qtr_fleet":0,"bch_regs":0.0,"bch_target":5.0,"active_orders":0},{"centre":"Rochdale","jul_fleet":0,"aug_fleet":0,"sep_fleet":0,"qtr_fleet":0,"bch_regs":0.0,"bch_target":6.0,"active_orders":0},{"centre":"SQ","jul_fleet":0,"aug_fleet":0,"sep_fleet":0,"qtr_fleet":0,"bch_regs":0.0,"bch_target":8.0,"active_orders":0},{"centre":"NORTH CDA","jul_fleet":0,"aug_fleet":0,"sep_fleet":0,"qtr_fleet":0,"bch_regs":0,"bch_target":26,"active_orders":0},{"centre":"Bradford","jul_fleet":0,"aug_fleet":0,"sep_fleet":0,"qtr_fleet":0,"bch_regs":1.0,"bch_target":6.0,"active_orders":0},{"centre":"Huddersfield","jul_fleet":0,"aug_fleet":0,"sep_fleet":0,"qtr_fleet":0,"bch_regs":0.0,"bch_target":7.0,"active_orders":0},{"centre":"Silsden","jul_fleet":0,"aug_fleet":0,"sep_fleet":0,"qtr_fleet":0,"bch_regs":0.0,"bch_target":2.0,"active_orders":0},{"centre":"WY CDA","jul_fleet":0,"aug_fleet":0,"sep_fleet":0,"qtr_fleet":0,"bch_regs":1,"bch_target":15,"active_orders":0}],"order_bank":[{"centre":"Bolton","aso":411,"q1_target":119,"q2_target":99,"q3_target":108,"q4_target":91,"cy26_target":417,"jan_target":29,"jan_orders":51,"jan_diff":22,"feb_target":44,"feb_orders":54,"feb_diff":10,"mar_target":46,"mar_orders":33,"mar_diff":-13,"apr_target":30,"apr_orders":38,"apr_diff":8,"may_target":33,"may_orders":35,"may_diff":2,"jun_target":36,"jun_orders":41,"jun_diff":5,"h1_target":218,"h1_orders":252,"h1_diff":34,"h1_pct":1.1559633027522935,"jul_target":28,"jul_orders":2,"jul_diff":-26,"aug_target":41,"aug_orders":null,"aug_diff":-41,"sep_target":39,"sep_orders":null,"sep_diff":-39,"oct_target":28,"oct_orders":null,"oct_diff":-28,"nov_target":33,"nov_orders":null,"nov_diff":-33,"dec_target":30,"dec_orders":null,"dec_diff":-30,"h2_target":199},{"centre":"Bury","aso":298,"q1_target":87,"q2_target":75,"q3_target":77,"q4_target":65,"cy26_target":304,"jan_target":21,"jan_orders":35,"jan_diff":14,"feb_target":32,"feb_orders":59,"feb_diff":27,"mar_target":34,"mar_orders":35,"mar_diff":1,"apr_target":23,"apr_orders":19,"apr_diff":-4,"may_target":25,"may_orders":26,"may_diff":1,"jun_target":27,"jun_orders":24,"jun_diff":-3,"h1_target":162,"h1_orders":198,"h1_diff":36,"h1_pct":1.2222222222222223,"jul_target":21,"jul_orders":1,"jul_diff":-20,"aug_target":29,"aug_orders":null,"aug_diff":-29,"sep_target":27,"sep_orders":null,"sep_diff":-27,"oct_target":20,"oct_orders":null,"oct_diff":-20,"nov_target":23,"nov_orders":null,"nov_diff":-23,"dec_target":22,"dec_orders":null,"dec_diff":-22,"h2_target":142},{"centre":"Rochdale","aso":336,"q1_target":97,"q2_target":82,"q3_target":87,"q4_target":74,"cy26_target":340,"jan_target":23,"jan_orders":43,"jan_diff":20,"feb_target":36,"feb_orders":65,"feb_diff":29,"mar_target":38,"mar_orders":39,"mar_diff":1,"apr_target":25,"apr_orders":34,"apr_diff":9,"may_target":27,"may_orders":25,"may_diff":-2,"jun_target":30,"jun_orders":38,"jun_diff":8,"h1_target":179,"h1_orders":244,"h1_diff":65,"h1_pct":1.3631284916201116,"jul_target":22,"jul_orders":5,"jul_diff":-17,"aug_target":33,"aug_orders":null,"aug_diff":-33,"sep_target":32,"sep_orders":null,"sep_diff":-32,"oct_target":22,"oct_orders":null,"oct_diff":-22,"nov_target":27,"nov_orders":null,"nov_diff":-27,"dec_target":25,"dec_orders":null,"dec_diff":-25,"h2_target":161},{"centre":"SQ","aso":537,"q1_target":152,"q2_target":131,"q3_target":143,"q4_target":118,"cy26_target":544,"jan_target":38,"jan_orders":56,"jan_diff":18,"feb_target":56,"feb_orders":63,"feb_diff":7,"mar_target":58,"mar_orders":76,"mar_diff":18,"apr_target":40,"apr_orders":33,"apr_diff":-7,"may_target":44,"may_orders":40,"may_diff":-4,"jun_target":47,"jun_orders":53,"jun_diff":6,"h1_target":283,"h1_orders":321,"h1_diff":38,"h1_pct":1.1342756183745584,"jul_target":37,"jul_orders":5,"jul_diff":-32,"aug_target":55,"aug_orders":null,"aug_diff":-55,"sep_target":51,"sep_orders":null,"sep_diff":-51,"oct_target":37,"oct_orders":null,"oct_diff":-37,"nov_target":43,"nov_orders":null,"nov_diff":-43,"dec_target":38,"dec_orders":null,"dec_diff":-38,"h2_target":261},{"centre":"Altrincham","aso":323,"q1_target":91,"q2_target":78,"q3_target":89,"q4_target":71,"cy26_target":329,"jan_target":22,"jan_orders":45,"jan_diff":23,"feb_target":34,"feb_orders":59,"feb_diff":25,"mar_target":35,"mar_orders":29,"mar_diff":-6,"apr_target":23,"apr_orders":15,"apr_diff":-8,"may_target":26,"may_orders":21,"may_diff":-5,"jun_target":29,"jun_orders":28,"jun_diff":-1,"h1_target":169,"h1_orders":197,"h1_diff":28,"h1_pct":1.165680473372781,"jul_target":23,"jul_orders":0,"jul_diff":-23,"aug_target":34,"aug_orders":null,"aug_diff":-34,"sep_target":32,"sep_orders":null,"sep_diff":-32,"oct_target":22,"oct_orders":null,"oct_diff":-22,"nov_target":25,"nov_orders":null,"nov_diff":-25,"dec_target":24,"dec_orders":null,"dec_diff":-24,"h2_target":160},{"centre":"Denton","aso":355,"q1_target":101,"q2_target":87,"q3_target":96,"q4_target":78,"cy26_target":362,"jan_target":24,"jan_orders":46,"jan_diff":22,"feb_target":37,"feb_orders":64,"feb_diff":27,"mar_target":40,"mar_orders":44,"mar_diff":4,"apr_target":26,"apr_orders":29,"apr_diff":3,"may_target":29,"may_orders":21,"may_diff":-8,"jun_target":32,"jun_orders":22,"jun_diff":-10,"h1_target":188,"h1_orders":226,"h1_diff":38,"h1_pct":1.202127659574468,"jul_target":24,"jul_orders":6,"jul_diff":-18,"aug_target":37,"aug_orders":null,"aug_diff":-37,"sep_target":35,"sep_orders":null,"sep_diff":-35,"oct_target":24,"oct_orders":null,"oct_diff":-24,"nov_target":28,"nov_orders":null,"nov_diff":-28,"dec_target":26,"dec_orders":null,"dec_diff":-26,"h2_target":174},{"centre":"Macclesfield","aso":357,"q1_target":100,"q2_target":87,"q3_target":97,"q4_target":80,"cy26_target":364,"jan_target":24,"jan_orders":37,"jan_diff":13,"feb_target":37,"feb_orders":64,"feb_diff":27,"mar_target":39,"mar_orders":34,"mar_diff":-5,"apr_target":26,"apr_orders":22,"apr_diff":-4,"may_target":29,"may_orders":23,"may_diff":-6,"jun_target":32,"jun_orders":36,"jun_diff":4,"h1_target":187,"h1_orders":216,"h1_diff":29,"h1_pct":1.1550802139037433,"jul_target":25,"jul_orders":3,"jul_diff":-22,"aug_target":37,"aug_orders":null,"aug_diff":-37,"sep_target":35,"sep_orders":null,"sep_diff":-35,"oct_target":25,"oct_orders":null,"oct_diff":-25,"nov_target":28,"nov_orders":null,"nov_diff":-28,"dec_target":27,"dec_orders":null,"dec_diff":-27,"h2_target":177},{"centre":"Stockport","aso":575,"q1_target":160,"q2_target":141,"q3_target":153,"q4_target":127,"cy26_target":581,"jan_target":39,"jan_orders":64,"jan_diff":25,"feb_target":59,"feb_orders":57,"feb_diff":-2,"mar_target":62,"mar_orders":88,"mar_diff":26,"apr_target":43,"apr_orders":45,"apr_diff":2,"may_target":47,"may_orders":28,"may_diff":-19,"jun_target":51,"jun_orders":55,"jun_diff":4,"h1_target":301,"h1_orders":337,"h1_diff":36,"h1_pct":1.1196013289036544,"jul_target":39,"jul_orders":3,"jul_diff":-36,"aug_target":59,"aug_orders":null,"aug_diff":-59,"sep_target":55,"sep_orders":null,"sep_diff":-55,"oct_target":40,"oct_orders":null,"oct_diff":-40,"nov_target":45,"nov_orders":null,"nov_diff":-45,"dec_target":42,"dec_orders":null,"dec_diff":-42,"h2_target":280},{"centre":"Bradford","aso":397,"q1_target":112,"q2_target":95,"q3_target":107,"q4_target":88,"cy26_target":402,"jan_target":28,"jan_orders":34,"jan_diff":6,"feb_target":41,"feb_orders":42,"feb_diff":1,"mar_target":43,"mar_orders":44,"mar_diff":1,"apr_target":29,"apr_orders":34,"apr_diff":5,"may_target":31,"may_orders":24,"may_diff":-7,"jun_target":35,"jun_orders":45,"jun_diff":10,"h1_target":207,"h1_orders":223,"h1_diff":16,"h1_pct":1.077294685990338,"jul_target":27,"jul_orders":0,"jul_diff":-27,"aug_target":41,"aug_orders":null,"aug_diff":-41,"sep_target":39,"sep_orders":null,"sep_diff":-39,"oct_target":28,"oct_orders":null,"oct_diff":-28,"nov_target":31,"nov_orders":null,"nov_diff":-31,"dec_target":29,"dec_orders":null,"dec_diff":-29,"h2_target":195},{"centre":"Huddersfield","aso":411,"q1_target":116,"q2_target":101,"q3_target":108,"q4_target":92,"cy26_target":417,"jan_target":28,"jan_orders":56,"jan_diff":28,"feb_target":43,"feb_orders":57,"feb_diff":14,"mar_target":45,"mar_orders":46,"mar_diff":1,"apr_target":31,"apr_orders":27,"apr_diff":-4,"may_target":33,"may_orders":28,"may_diff":-5,"jun_target":37,"jun_orders":33,"jun_diff":-4,"h1_target":217,"h1_orders":247,"h1_diff":30,"h1_pct":1.1382488479262673,"jul_target":27,"jul_orders":6,"jul_diff":-21,"aug_target":41,"aug_orders":null,"aug_diff":-41,"sep_target":40,"sep_orders":null,"sep_diff":-40,"oct_target":28,"oct_orders":null,"oct_diff":-28,"nov_target":33,"nov_orders":null,"nov_diff":-33,"dec_target":31,"dec_orders":null,"dec_diff":-31,"h2_target":200},{"centre":"Silsden","aso":132,"q1_target":41,"q2_target":31,"q3_target":35,"q4_target":32,"cy26_target":139,"jan_target":11,"jan_orders":24,"jan_diff":13,"feb_target":15,"feb_orders":12,"feb_diff":-3,"mar_target":15,"mar_orders":21,"mar_diff":6,"apr_target":9,"apr_orders":5,"apr_diff":-4,"may_target":11,"may_orders":9,"may_diff":-2,"jun_target":11,"jun_orders":13,"jun_diff":2,"h1_target":72,"h1_orders":84,"h1_diff":12,"h1_pct":1.1666666666666667,"jul_target":9,"jul_orders":0,"jul_diff":-9,"aug_target":13,"aug_orders":null,"aug_diff":-13,"sep_target":13,"sep_orders":null,"sep_diff":-13,"oct_target":10,"oct_orders":null,"oct_diff":-10,"nov_target":11,"nov_orders":null,"nov_diff":-11,"dec_target":11,"dec_orders":null,"dec_diff":-11,"h2_target":67}],"sales_activity":[{"centre":"Bolton","new_enquiries":9,"new_test_drives":4,"new_os":2,"new_orders":1,"used_enquiries":21,"used_test_drives":13,"used_os":16,"used_orders":12,"total_enquiries":30,"total_test_drives":17,"total_os":18,"total_orders":13,"lost_op_req":0,"confirmed_orders":0,"delivered":18,"lost_opportunities":23,"td_ratio":0.57,"orders_ratio":0.43,"os_ratio":0.6},{"centre":"Bradford","new_enquiries":7,"new_test_drives":1,"new_os":0,"new_orders":0,"used_enquiries":17,"used_test_drives":5,"used_os":7,"used_orders":7,"total_enquiries":24,"total_test_drives":6,"total_os":7,"total_orders":7,"lost_op_req":1,"confirmed_orders":0,"delivered":12,"lost_opportunities":22,"td_ratio":0.25,"orders_ratio":0.29,"os_ratio":0.29},{"centre":"Bury","new_enquiries":8,"new_test_drives":4,"new_os":7,"new_orders":4,"used_enquiries":21,"used_test_drives":4,"used_os":6,"used_orders":5,"total_enquiries":29,"total_test_drives":8,"total_os":13,"total_orders":9,"lost_op_req":0,"confirmed_orders":0,"delivered":12,"lost_opportunities":31,"td_ratio":0.28,"orders_ratio":0.31,"os_ratio":0.45},{"centre":"Huddersfield","new_enquiries":11,"new_test_drives":5,"new_os":9,"new_orders":3,"used_enquiries":13,"used_test_drives":4,"used_os":10,"used_orders":8,"total_enquiries":24,"total_test_drives":9,"total_os":19,"total_orders":11,"lost_op_req":9,"confirmed_orders":0,"delivered":9,"lost_opportunities":2,"td_ratio":0.38,"orders_ratio":0.46,"os_ratio":0.79},{"centre":"Rochdale","new_enquiries":12,"new_test_drives":4,"new_os":3,"new_orders":5,"used_enquiries":15,"used_test_drives":5,"used_os":12,"used_orders":5,"total_enquiries":27,"total_test_drives":9,"total_os":15,"total_orders":10,"lost_op_req":6,"confirmed_orders":0,"delivered":7,"lost_opportunities":16,"td_ratio":0.33,"orders_ratio":0.37,"os_ratio":0.56},{"centre":"SQ","new_enquiries":21,"new_test_drives":4,"new_os":4,"new_orders":2,"used_enquiries":14,"used_test_drives":7,"used_os":11,"used_orders":11,"total_enquiries":35,"total_test_drives":11,"total_os":15,"total_orders":13,"lost_op_req":0,"confirmed_orders":0,"delivered":12,"lost_opportunities":26,"td_ratio":0.31,"orders_ratio":0.37,"os_ratio":0.43},{"centre":"Silsden","new_enquiries":2,"new_test_drives":1,"new_os":1,"new_orders":0,"used_enquiries":11,"used_test_drives":3,"used_os":1,"used_orders":1,"total_enquiries":13,"total_test_drives":4,"total_os":2,"total_orders":1,"lost_op_req":0,"confirmed_orders":0,"delivered":8,"lost_opportunities":6,"td_ratio":0.31,"orders_ratio":0.08,"os_ratio":0.15},{"centre":"TOTAL","new_enquiries":70,"new_test_drives":23,"new_os":26,"new_orders":15,"used_enquiries":112,"used_test_drives":41,"used_os":63,"used_orders":49,"total_enquiries":182,"total_test_drives":64,"total_os":89,"total_orders":64,"lost_op_req":16,"confirmed_orders":0,"delivered":78,"lost_opportunities":126,"td_ratio":0.35,"orders_ratio":0.35,"os_ratio":0.49}],"user_sites":["Bolton","Bury","Rochdale","SQ","Bradford","Huddersfield","Silsden","Denton","Altrincham","Stockport","Macclesfield"],"dashboard_regs":[{"centre":"Bolton","jul_counting":0,"jul_clcp":0,"jul_fleet":0,"jul_total":0,"jul_target":24.0,"aug_counting":0,"aug_clcp":0,"aug_fleet":0,"aug_total":0,"aug_target":12.0,"sep_counting":0,"sep_clcp":0,"sep_fleet":0,"sep_total":0,"sep_target":69.0,"qtr_counting":0,"qtr_fleet":0,"qtr_total":0,"qtr_target":105,"to_go":105,"per_week":8,"qtr_regs":0,"target":105,"regs_v_target":0},{"centre":"Bury","jul_counting":0,"jul_clcp":0,"jul_fleet":0,"jul_total":0,"jul_target":19.0,"aug_counting":0,"aug_clcp":0,"aug_fleet":0,"aug_total":0,"aug_target":11.0,"sep_counting":0,"sep_clcp":0,"sep_fleet":0,"sep_total":0,"sep_target":47.0,"qtr_counting":0,"qtr_fleet":0,"qtr_total":0,"qtr_target":77,"to_go":77,"per_week":6,"qtr_regs":0,"target":77,"regs_v_target":0},{"centre":"Rochdale","jul_counting":0,"jul_clcp":0,"jul_fleet":0,"jul_total":0,"jul_target":19.0,"aug_counting":0,"aug_clcp":0,"aug_fleet":0,"aug_total":0,"aug_target":11.0,"sep_counting":0,"sep_clcp":0,"sep_fleet":0,"sep_total":0,"sep_target":55.0,"qtr_counting":0,"qtr_fleet":0,"qtr_total":0,"qtr_target":85,"to_go":85,"per_week":7,"qtr_regs":0,"target":85,"regs_v_target":0},{"centre":"SQ","jul_counting":0,"jul_clcp":0,"jul_fleet":0,"jul_total":0,"jul_target":32.0,"aug_counting":0,"aug_clcp":0,"aug_fleet":0,"aug_total":0,"aug_target":18.0,"sep_counting":0,"sep_clcp":0,"sep_fleet":0,"sep_total":0,"sep_target":90.0,"qtr_counting":0,"qtr_fleet":0,"qtr_total":0,"qtr_target":140,"to_go":140,"per_week":11,"qtr_regs":0,"target":140,"regs_v_target":0},{"centre":"Bradford","jul_counting":0,"jul_clcp":0,"jul_fleet":0,"jul_total":0,"jul_target":22.0,"aug_counting":0,"aug_clcp":0,"aug_fleet":0,"aug_total":0,"aug_target":13.0,"sep_counting":0,"sep_clcp":0,"sep_fleet":0,"sep_total":0,"sep_target":70.0,"qtr_counting":0,"qtr_fleet":0,"qtr_total":0,"qtr_target":105,"to_go":105,"per_week":8,"qtr_regs":0,"target":105,"regs_v_target":0},{"centre":"Huddersfield","jul_counting":0,"jul_clcp":0,"jul_fleet":0,"jul_total":0,"jul_target":23.0,"aug_counting":0,"aug_clcp":0,"aug_fleet":0,"aug_total":0,"aug_target":13.0,"sep_counting":0,"sep_clcp":0,"sep_fleet":0,"sep_total":0,"sep_target":72.0,"qtr_counting":0,"qtr_fleet":0,"qtr_total":0,"qtr_target":108,"to_go":108,"per_week":9,"qtr_regs":0,"target":108,"regs_v_target":0},{"centre":"Silsden","jul_counting":0,"jul_clcp":0,"jul_fleet":0,"jul_total":0,"jul_target":8.0,"aug_counting":0,"aug_clcp":0,"aug_fleet":0,"aug_total":0,"aug_target":3.0,"sep_counting":0,"sep_clcp":0,"sep_fleet":0,"sep_total":0,"sep_target":23.0,"qtr_counting":0,"qtr_fleet":0,"qtr_total":0,"qtr_target":34,"to_go":34,"per_week":3,"qtr_regs":0,"target":34,"regs_v_target":0}],"dashboard_used":[{"centre":"Bolton","jul_counting":0,"jul_target":63.0,"aug_counting":0,"aug_target":62.0,"sep_counting":0,"sep_target":62.0,"qtr_counting":0,"qtr_target":187},{"centre":"Bury","jul_counting":0,"jul_target":55.0,"aug_counting":0,"aug_target":54.0,"sep_counting":0,"sep_target":54.0,"qtr_counting":0,"qtr_target":163},{"centre":"Rochdale","jul_counting":0,"jul_target":51.0,"aug_counting":0,"aug_target":50.0,"sep_counting":0,"sep_target":50.0,"qtr_counting":0,"qtr_target":151},{"centre":"SQ","jul_counting":0,"jul_target":60.0,"aug_counting":0,"aug_target":59.0,"sep_counting":0,"sep_target":59.0,"qtr_counting":0,"qtr_target":178},{"centre":"Bradford","jul_counting":0,"jul_target":36.0,"aug_counting":0,"aug_target":36.0,"sep_counting":0,"sep_target":36.0,"qtr_counting":0,"qtr_target":108},{"centre":"Huddersfield","jul_counting":0,"jul_target":47.0,"aug_counting":0,"aug_target":46.0,"sep_counting":0,"sep_target":46.0,"qtr_counting":0,"qtr_target":139},{"centre":"Silsden","jul_counting":0,"jul_target":22.0,"aug_counting":0,"aug_target":21.0,"sep_counting":0,"sep_target":21.0,"qtr_counting":0,"qtr_target":64}],"dashboard_orders":[{"centre":"Bolton","aso":411,"q1_target":119,"q2_target":99,"q3_target":108,"q4_target":91,"cy26_target":417,"jan_target":29,"jan_orders":51,"jan_diff":22,"feb_target":44,"feb_orders":54,"feb_diff":10,"mar_target":46,"mar_orders":33,"mar_diff":-13,"apr_target":30,"apr_orders":38,"apr_diff":8,"may_target":33,"may_orders":35,"may_diff":2,"jun_target":36,"jun_orders":41,"jun_diff":5,"h1_target":218,"h1_orders":252,"h1_diff":34,"h1_pct":1.1559633027522935,"jul_target":28,"jul_orders":2,"jul_diff":-26,"aug_target":41,"aug_orders":null,"aug_diff":-41,"sep_target":39,"sep_orders":null,"sep_diff":-39,"oct_target":28,"oct_orders":null,"oct_diff":-28,"nov_target":33,"nov_orders":null,"nov_diff":-33,"dec_target":30,"dec_orders":null,"dec_diff":-30,"h2_target":199},{"centre":"Bury","aso":298,"q1_target":87,"q2_target":75,"q3_target":77,"q4_target":65,"cy26_target":304,"jan_target":21,"jan_orders":35,"jan_diff":14,"feb_target":32,"feb_orders":59,"feb_diff":27,"mar_target":34,"mar_orders":35,"mar_diff":1,"apr_target":23,"apr_orders":19,"apr_diff":-4,"may_target":25,"may_orders":26,"may_diff":1,"jun_target":27,"jun_orders":24,"jun_diff":-3,"h1_target":162,"h1_orders":198,"h1_diff":36,"h1_pct":1.2222222222222223,"jul_target":21,"jul_orders":1,"jul_diff":-20,"aug_target":29,"aug_orders":null,"aug_diff":-29,"sep_target":27,"sep_orders":null,"sep_diff":-27,"oct_target":20,"oct_orders":null,"oct_diff":-20,"nov_target":23,"nov_orders":null,"nov_diff":-23,"dec_target":22,"dec_orders":null,"dec_diff":-22,"h2_target":142},{"centre":"Rochdale","aso":336,"q1_target":97,"q2_target":82,"q3_target":87,"q4_target":74,"cy26_target":340,"jan_target":23,"jan_orders":43,"jan_diff":20,"feb_target":36,"feb_orders":65,"feb_diff":29,"mar_target":38,"mar_orders":39,"mar_diff":1,"apr_target":25,"apr_orders":34,"apr_diff":9,"may_target":27,"may_orders":25,"may_diff":-2,"jun_target":30,"jun_orders":38,"jun_diff":8,"h1_target":179,"h1_orders":244,"h1_diff":65,"h1_pct":1.3631284916201116,"jul_target":22,"jul_orders":5,"jul_diff":-17,"aug_target":33,"aug_orders":null,"aug_diff":-33,"sep_target":32,"sep_orders":null,"sep_diff":-32,"oct_target":22,"oct_orders":null,"oct_diff":-22,"nov_target":27,"nov_orders":null,"nov_diff":-27,"dec_target":25,"dec_orders":null,"dec_diff":-25,"h2_target":161},{"centre":"SQ","aso":537,"q1_target":152,"q2_target":131,"q3_target":143,"q4_target":118,"cy26_target":544,"jan_target":38,"jan_orders":56,"jan_diff":18,"feb_target":56,"feb_orders":63,"feb_diff":7,"mar_target":58,"mar_orders":76,"mar_diff":18,"apr_target":40,"apr_orders":33,"apr_diff":-7,"may_target":44,"may_orders":40,"may_diff":-4,"jun_target":47,"jun_orders":53,"jun_diff":6,"h1_target":283,"h1_orders":321,"h1_diff":38,"h1_pct":1.1342756183745584,"jul_target":37,"jul_orders":5,"jul_diff":-32,"aug_target":55,"aug_orders":null,"aug_diff":-55,"sep_target":51,"sep_orders":null,"sep_diff":-51,"oct_target":37,"oct_orders":null,"oct_diff":-37,"nov_target":43,"nov_orders":null,"nov_diff":-43,"dec_target":38,"dec_orders":null,"dec_diff":-38,"h2_target":261},{"centre":"Bradford","aso":397,"q1_target":112,"q2_target":95,"q3_target":107,"q4_target":88,"cy26_target":402,"jan_target":28,"jan_orders":34,"jan_diff":6,"feb_target":41,"feb_orders":42,"feb_diff":1,"mar_target":43,"mar_orders":44,"mar_diff":1,"apr_target":29,"apr_orders":34,"apr_diff":5,"may_target":31,"may_orders":24,"may_diff":-7,"jun_target":35,"jun_orders":45,"jun_diff":10,"h1_target":207,"h1_orders":223,"h1_diff":16,"h1_pct":1.077294685990338,"jul_target":27,"jul_orders":0,"jul_diff":-27,"aug_target":41,"aug_orders":null,"aug_diff":-41,"sep_target":39,"sep_orders":null,"sep_diff":-39,"oct_target":28,"oct_orders":null,"oct_diff":-28,"nov_target":31,"nov_orders":null,"nov_diff":-31,"dec_target":29,"dec_orders":null,"dec_diff":-29,"h2_target":195},{"centre":"Huddersfield","aso":411,"q1_target":116,"q2_target":101,"q3_target":108,"q4_target":92,"cy26_target":417,"jan_target":28,"jan_orders":56,"jan_diff":28,"feb_target":43,"feb_orders":57,"feb_diff":14,"mar_target":45,"mar_orders":46,"mar_diff":1,"apr_target":31,"apr_orders":27,"apr_diff":-4,"may_target":33,"may_orders":28,"may_diff":-5,"jun_target":37,"jun_orders":33,"jun_diff":-4,"h1_target":217,"h1_orders":247,"h1_diff":30,"h1_pct":1.1382488479262673,"jul_target":27,"jul_orders":6,"jul_diff":-21,"aug_target":41,"aug_orders":null,"aug_diff":-41,"sep_target":40,"sep_orders":null,"sep_diff":-40,"oct_target":28,"oct_orders":null,"oct_diff":-28,"nov_target":33,"nov_orders":null,"nov_diff":-33,"dec_target":31,"dec_orders":null,"dec_diff":-31,"h2_target":200},{"centre":"Silsden","aso":132,"q1_target":41,"q2_target":31,"q3_target":35,"q4_target":32,"cy26_target":139,"jan_target":11,"jan_orders":24,"jan_diff":13,"feb_target":15,"feb_orders":12,"feb_diff":-3,"mar_target":15,"mar_orders":21,"mar_diff":6,"apr_target":9,"apr_orders":5,"apr_diff":-4,"may_target":11,"may_orders":9,"may_diff":-2,"jun_target":11,"jun_orders":13,"jun_diff":2,"h1_target":72,"h1_orders":84,"h1_diff":12,"h1_pct":1.1666666666666667,"jul_target":9,"jul_orders":0,"jul_diff":-9,"aug_target":13,"aug_orders":null,"aug_diff":-13,"sep_target":13,"sep_orders":null,"sep_diff":-13,"oct_target":10,"oct_orders":null,"oct_diff":-10,"nov_target":11,"nov_orders":null,"nov_diff":-11,"dec_target":11,"dec_orders":null,"dec_diff":-11,"h2_target":67}],"dashboard_activity":[{"centre":"Bolton","new_enquiries":9,"new_test_drives":4,"new_os":2,"new_orders":1,"used_enquiries":21,"used_test_drives":13,"used_os":16,"used_orders":12,"total_enquiries":30,"total_test_drives":17,"total_os":18,"total_orders":13,"lost_op_req":0,"confirmed_orders":0,"delivered":18,"lost_opportunities":23,"td_ratio":0.57,"orders_ratio":0.43,"os_ratio":0.6},{"centre":"Bradford","new_enquiries":7,"new_test_drives":1,"new_os":0,"new_orders":0,"used_enquiries":17,"used_test_drives":5,"used_os":7,"used_orders":7,"total_enquiries":24,"total_test_drives":6,"total_os":7,"total_orders":7,"lost_op_req":1,"confirmed_orders":0,"delivered":12,"lost_opportunities":22,"td_ratio":0.25,"orders_ratio":0.29,"os_ratio":0.29},{"centre":"Bury","new_enquiries":8,"new_test_drives":4,"new_os":7,"new_orders":4,"used_enquiries":21,"used_test_drives":4,"used_os":6,"used_orders":5,"total_enquiries":29,"total_test_drives":8,"total_os":13,"total_orders":9,"lost_op_req":0,"confirmed_orders":0,"delivered":12,"lost_opportunities":31,"td_ratio":0.28,"orders_ratio":0.31,"os_ratio":0.45},{"centre":"Huddersfield","new_enquiries":11,"new_test_drives":5,"new_os":9,"new_orders":3,"used_enquiries":13,"used_test_drives":4,"used_os":10,"used_orders":8,"total_enquiries":24,"total_test_drives":9,"total_os":19,"total_orders":11,"lost_op_req":9,"confirmed_orders":0,"delivered":9,"lost_opportunities":2,"td_ratio":0.38,"orders_ratio":0.46,"os_ratio":0.79},{"centre":"Rochdale","new_enquiries":12,"new_test_drives":4,"new_os":3,"new_orders":5,"used_enquiries":15,"used_test_drives":5,"used_os":12,"used_orders":5,"total_enquiries":27,"total_test_drives":9,"total_os":15,"total_orders":10,"lost_op_req":6,"confirmed_orders":0,"delivered":7,"lost_opportunities":16,"td_ratio":0.33,"orders_ratio":0.37,"os_ratio":0.56},{"centre":"SQ","new_enquiries":21,"new_test_drives":4,"new_os":4,"new_orders":2,"used_enquiries":14,"used_test_drives":7,"used_os":11,"used_orders":11,"total_enquiries":35,"total_test_drives":11,"total_os":15,"total_orders":13,"lost_op_req":0,"confirmed_orders":0,"delivered":12,"lost_opportunities":26,"td_ratio":0.31,"orders_ratio":0.37,"os_ratio":0.43},{"centre":"Silsden","new_enquiries":2,"new_test_drives":1,"new_os":1,"new_orders":0,"used_enquiries":11,"used_test_drives":3,"used_os":1,"used_orders":1,"total_enquiries":13,"total_test_drives":4,"total_os":2,"total_orders":1,"lost_op_req":0,"confirmed_orders":0,"delivered":8,"lost_opportunities":6,"td_ratio":0.31,"orders_ratio":0.08,"os_ratio":0.15}]};

try {
  const saved = localStorage.getItem('rrgDashboardData_orderbank_v2');
  if (saved) DATA = JSON.parse(saved);
} catch (e) { console.warn('Saved dashboard data could not be loaded', e); }
let PENDING_DATA = null;
// Q2 Reference override from Toyota Registrations.xlsx - includes North, South and WY CDA.
DATA.q2_regs = [{"centre":"Bolton","apr_total":26,"apr_target":21.0,"may_total":32,"may_target":27.0,"jun_total":43,"jun_target":48.0,"qtr_counting":99,"qtr_fleet":2,"qtr_total":101,"qtr_target":96,"to_go":-5,"per_week":5,"regs_v_target":1.052083333},{"centre":"Bury","apr_total":23,"apr_target":15.0,"may_total":28,"may_target":20.0,"jun_total":26,"jun_target":36.0,"qtr_counting":75,"qtr_fleet":2,"qtr_total":77,"qtr_target":71,"to_go":-6,"per_week":6,"regs_v_target":1.084507042},{"centre":"Rochdale","apr_total":22,"apr_target":17.0,"may_total":41,"may_target":23.0,"jun_total":27,"jun_target":40.0,"qtr_counting":90,"qtr_fleet":0,"qtr_total":90,"qtr_target":80,"to_go":-10,"per_week":10,"regs_v_target":1.125},{"centre":"SQ","apr_total":52,"apr_target":29.0,"may_total":45,"may_target":37.0,"jun_total":50,"jun_target":60.0,"qtr_counting":125,"qtr_fleet":22,"qtr_total":147,"qtr_target":126,"to_go":-21,"per_week":21,"regs_v_target":1.166666667},{"centre":"NORTH CDA","apr_total":123,"apr_target":82,"may_total":146,"may_target":107,"jun_total":146,"jun_target":184,"qtr_counting":389,"qtr_fleet":26,"qtr_total":415,"qtr_target":373,"to_go":-42,"per_week":42,"regs_v_target":1.112600536},{"centre":"Altrincham","apr_total":10,"apr_target":16.0,"may_total":31,"may_target":21.0,"jun_total":32,"jun_target":36.0,"qtr_counting":73,"qtr_fleet":0,"qtr_total":73,"qtr_target":73,"to_go":0,"per_week":0,"regs_v_target":1},{"centre":"Denton","apr_total":28,"apr_target":17.0,"may_total":26,"may_target":24.0,"jun_total":33,"jun_target":42.0,"qtr_counting":80,"qtr_fleet":7,"qtr_total":87,"qtr_target":83,"to_go":-4,"per_week":4,"regs_v_target":1.048192771},{"centre":"Macclesfield","apr_total":18,"apr_target":18.0,"may_total":26,"may_target":23.0,"jun_total":39,"jun_target":40.0,"qtr_counting":83,"qtr_fleet":0,"qtr_total":83,"qtr_target":81,"to_go":-2,"per_week":2,"regs_v_target":1.024691358},{"centre":"Stockport","apr_total":30,"apr_target":30.0,"may_total":40,"may_target":39.0,"jun_total":62,"jun_target":66.0,"qtr_counting":132,"qtr_fleet":0,"qtr_total":132,"qtr_target":135,"to_go":3,"per_week":-3,"regs_v_target":0.9777777778},{"centre":"SOUTH CDA","apr_total":86,"apr_target":81,"may_total":123,"may_target":107,"jun_total":166,"jun_target":184,"qtr_counting":368,"qtr_fleet":7,"qtr_total":375,"qtr_target":372,"to_go":-3,"per_week":3,"regs_v_target":1.008064516},{"centre":"Bradford","apr_total":22,"apr_target":22.0,"may_total":27,"may_target":26.0,"jun_total":30,"jun_target":44.0,"qtr_counting":66,"qtr_fleet":13,"qtr_total":79,"qtr_target":92,"to_go":13,"per_week":-13,"regs_v_target":0.8586956522},{"centre":"Huddersfield","apr_total":25,"apr_target":21.0,"may_total":38,"may_target":27.0,"jun_total":34,"jun_target":49.0,"qtr_counting":89,"qtr_fleet":8,"qtr_total":97,"qtr_target":97,"to_go":0,"per_week":0,"regs_v_target":1},{"centre":"Silsden","apr_total":6,"apr_target":6.0,"may_total":7,"may_target":9.0,"jun_total":17,"jun_target":13.0,"qtr_counting":30,"qtr_fleet":0,"qtr_total":30,"qtr_target":28,"to_go":-2,"per_week":2,"regs_v_target":1.071428571},{"centre":"WY CDA","apr_total":53,"apr_target":49,"may_total":72,"may_target":62,"jun_total":81,"jun_target":106,"qtr_counting":185,"qtr_fleet":21,"qtr_total":206,"qtr_target":217,"to_go":11,"per_week":-11,"regs_v_target":0.9493087558}];
DATA.q2_used = [{"centre":"Bolton","apr_counting":68.0,"apr_target":59.0,"may_counting":57.0,"may_target":59.0,"jun_counting":56.0,"jun_target":62.0,"qtr_counting":181,"qtr_target":180},{"centre":"Bury","apr_counting":59.0,"apr_target":51.0,"may_counting":42.0,"may_target":51.0,"jun_counting":42.0,"jun_target":54.0,"qtr_counting":143,"qtr_target":156},{"centre":"Rochdale","apr_counting":49.0,"apr_target":47.0,"may_counting":47.0,"may_target":47.0,"jun_counting":45.0,"jun_target":50.0,"qtr_counting":141,"qtr_target":144},{"centre":"SQ","apr_counting":59.0,"apr_target":56.0,"may_counting":52.0,"may_target":56.0,"jun_counting":49.0,"jun_target":59.0,"qtr_counting":160,"qtr_target":171},{"centre":"NORTH CDA","apr_counting":235,"apr_target":213,"may_counting":198,"may_target":213,"jun_counting":192,"jun_target":225,"qtr_counting":625,"qtr_target":651},{"centre":"Altrincham","apr_counting":49.0,"apr_target":47.0,"may_counting":41.0,"may_target":47.0,"jun_counting":48.0,"jun_target":50.0,"qtr_counting":138,"qtr_target":144},{"centre":"Denton","apr_counting":41.0,"apr_target":42.0,"may_counting":42.0,"may_target":42.0,"jun_counting":39.0,"jun_target":44.0,"qtr_counting":122,"qtr_target":128},{"centre":"Macclesfield","apr_counting":44.0,"apr_target":44.0,"may_counting":44.0,"may_target":44.0,"jun_counting":49.0,"jun_target":46.0,"qtr_counting":137,"qtr_target":134},{"centre":"Stockport","apr_counting":94.0,"apr_target":85.0,"may_counting":79.0,"may_target":85.0,"jun_counting":98.0,"jun_target":89.0,"qtr_counting":271,"qtr_target":259},{"centre":"SOUTH CDA","apr_counting":228,"apr_target":218,"may_counting":206,"may_target":218,"jun_counting":234,"jun_target":229,"qtr_counting":668,"qtr_target":665},{"centre":"Bradford","apr_counting":40.0,"apr_target":34.0,"may_counting":37.0,"may_target":34.0,"jun_counting":40.0,"jun_target":36.0,"qtr_counting":117,"qtr_target":104},{"centre":"Huddersfield","apr_counting":32.0,"apr_target":44.0,"may_counting":52.0,"may_target":44.0,"jun_counting":35.0,"jun_target":46.0,"qtr_counting":119,"qtr_target":134},{"centre":"Silsden","apr_counting":20.0,"apr_target":20.0,"may_counting":20.0,"may_target":20.0,"jun_counting":31.0,"jun_target":21.0,"qtr_counting":71,"qtr_target":61},{"centre":"WY CDA","apr_counting":92,"apr_target":98,"may_counting":109,"may_target":98,"jun_counting":106,"jun_target":103,"qtr_counting":307,"qtr_target":299}];


const fmt=n=>{if(n===null||n===undefined||Number.isNaN(n))return "-";return new Intl.NumberFormat('en-GB',{maximumFractionDigits:0}).format(n)};
const pct=n=>{if(n===null||n===undefined||Number.isNaN(n))return "-";return Math.round(n*100)+"%"};
const siteLabel=c=>c==='SQ'?'SQ':c;
function activityOrdersFor(centre){const normal=x=>String(x||'').trim().toLowerCase().replace('salford quays','sq');const row=(DATA.dashboard_activity||[]).find(r=>normal(r.centre)===normal(centre));return row ? (Number(row.total_orders)||0) : 0;}
function orderDoneFor(row, month){const v=row ? row[month+'_orders'] : null;return (v===null||v===undefined||v==='') ? 0 : (Number(v)||0);}
function currentOrderMonth(){const m=new Date().getMonth();return ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][m] || 'jul';}
const statusClass=n=> n>=1?'green':n>=.9?'amber':'red';
const paceStatusClass=n=> n>=1?'green':n>=.9?'amber':'red';
const progress=n=>`<div class="progress"><div class="bar ${statusClass(n)}" style="width:${Math.min(Math.max(n*100,0),120)}%"></div></div>`;
const paceProgress=n=>`<div class="progress"><div class="bar ${paceStatusClass(n)}" style="width:${Math.min(Math.max(n*100,0),120)}%"></div></div>`;
const status=n=>`<span class="status ${statusClass(n)}">${n>=1?'On / Ahead':n>=.9?'Watch':'Behind'}</span>`;
const paceStatus=n=>`<span class="status ${paceStatusClass(n)}">${n>=1?'On pace':n>=.9?'Slightly behind':'Behind pace'}</span>`;
function cell(val,col,row){let v=typeof col.value==='function'?col.value(row):row[col.key];if(col.format==='pct')return pct(v);if(col.format==='progress')return progress(v);if(col.format==='paceProgress')return paceProgress(v);if(col.format==='status')return status(v);if(col.format==='paceStatus')return paceStatus(v);return col.num?fmt(v):(v??'-')}

const TABLE_SORT_STATE = {};
function rawCellValue(col,row){
  try{
    return typeof col.value==='function' ? col.value(row) : row[col.key];
  }catch(e){ return ''; }
}
function sortableValue(col,row){
  const v = rawCellValue(col,row);
  if(v===null || v===undefined) return '';
  if(col.num || col.format==='pct' || col.format==='progress' || col.format==='status') return Number(v) || 0;
  const n = Number(String(v).replace(/[%£,]/g,''));
  if(String(v).trim()!=='' && !Number.isNaN(n)) return n;
  return String(v).toLowerCase();
}
function renderTable(id,cols,rows){
  const table=document.getElementById(id);if(!table)return;

  // Work out the table structure from its headings rather than assuming that
  // every table has the same first two columns.
  const rankIndex=cols.findIndex(c=>String(c.label||'').trim().toLowerCase()==='rank');
  const centreIndex=cols.findIndex(c=>String(c.label||'').trim().toLowerCase()==='centre');
  const statusIndex=cols.findIndex(c=>String(c.label||'').trim().toLowerCase()==='status' && (c.format==='status' || c.format==='paceStatus'));
  const statusCol=statusIndex>=0 ? cols[statusIndex] : null;
  const displayCols=cols.filter((_,i)=>i!==statusIndex);

  table.classList.remove('table-rank','table-centre');
  if(rankIndex>=0 && centreIndex>=0) table.classList.add('table-rank');
  else if(centreIndex>=0) table.classList.add('table-centre');

  const state=TABLE_SORT_STATE[id]||{};
  const sorted=rows.slice();
  if(state.index!==undefined){
    const col=displayCols[state.index];
    if(col){
      sorted.sort((a,b)=>{
        const av=sortableValue(col,a), bv=sortableValue(col,b);
        const bothNum=typeof av==='number' && typeof bv==='number';
        let cmp=bothNum ? av-bv : String(av).localeCompare(String(bv), undefined, {numeric:true, sensitivity:'base'});
        return state.dir==='desc' ? -cmp : cmp;
      });
    }
  }

  function renderBodyCell(col,row){
    const centreCol=String(col.label||'').trim().toLowerCase()==='centre';
    if(centreCol && statusCol){
      return `<div class="centre-cell"><span class="centre-name">${cell(null,col,row)}</span>${cell(null,statusCol,row)}</div>`;
    }
    return cell(null,col,row);
  }

  table.innerHTML=`<thead><tr>${displayCols.map((c,i)=>{const active=state.index===i;const arrow=active?(state.dir==='desc'?' ▼':' ▲'):'';return `<th data-sort-index="${i}" class="sortable ${c.num?'num':''} ${active?'sorted':''}" title="Click to sort">${c.label}${arrow}</th>`}).join('')}</tr></thead><tbody>${sorted.map(r=>`<tr class="${String(r.centre||'').includes('CDA')||r.centre==='TOTAL'?'group':''}">${displayCols.map(c=>`<td class="${c.num?'num':''}">${renderBodyCell(c,r)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  table.querySelectorAll('th[data-sort-index]').forEach(th=>{
    th.addEventListener('click',()=>{
      const index=Number(th.dataset.sortIndex);
      const current=TABLE_SORT_STATE[id]||{};
      const dir=current.index===index && current.dir==='desc' ? 'asc' : 'desc';
      TABLE_SORT_STATE[id]={index,dir};
      renderTable(id,cols,rows);
    });
  });
}

function makeTable(id,cols,rows){renderTable(id,cols,rows||[])}
function leaderRows(rows, valueFn, subFn, barFn){return rows.slice().sort((a,b)=>valueFn(b)-valueFn(a)).map((r,i)=>{const v=valueFn(r);const b=barFn?barFn(r):v;return `<div class="leader-row"><div class="rank">${i+1}</div><div class="centre">${siteLabel(r.centre)}<div class="mini">${subFn?subFn(r):''}</div></div><div class="pct">${pct(v)}</div>${barFn?paceProgress(b):progress(v)}</div>`}).join('')}
function q3ElapsedRatio(){
 const now=new Date();
 const start=new Date(now.getFullYear(),6,1,0,0,0); // 1 July
 const end=new Date(now.getFullYear(),8,30,23,59,59); // 30 September
 if(now<=start) return 0;
 if(now>=end) return 1;
 return Math.max(0, Math.min(1, (now-start)/(end-start)));
}

function q3TotalWeeks(){
 const start=new Date(new Date().getFullYear(),6,1,0,0,0);
 const end=new Date(new Date().getFullYear(),8,30,23,59,59);
 return Math.max(1, (end-start)/(7*24*60*60*1000));
}
function q3WeeksElapsed(){
 return Math.max(0.01, q3ElapsedRatio()*q3TotalWeeks());
}
function usedForecastFinish(row){
 const actual=Number(row && row.qtr_counting)||0;
 const runRate=actual/q3WeeksElapsed();
 return Math.round(runRate*q3TotalWeeks());
}
function usedForecastPct(row){
 const target=Number(row && row.qtr_target)||0;
 return target ? usedForecastFinish(row)/target : 0;
}

function usedRequiredPerWeek(row){
 const target=Number(row && row.qtr_target)||0;
 const actual=Number(row && row.qtr_counting)||0;
 const remaining=Math.max(0, target-actual);
 return Math.ceil(remaining / q3WeeksRemaining());
}
function usedForecastMini(row){
 const forecast=usedForecastFinish(row);
 const target=Number(row && row.qtr_target)||0;
 const pctText=target ? pct(forecast/target) : '-';
 return `Forecast ${fmt(forecast)} / ${fmt(target)} (${pctText}) · Req ${fmt(usedRequiredPerWeek(row))}/week`;
}

function paceRatio(actual,target){
 const expected=(Number(target)||0)*q3ElapsedRatio();
 if(!expected) return 0;
 return (Number(actual)||0)/expected;
}
function paceMini(actual,target){
 const expected=(Number(target)||0)*q3ElapsedRatio();
 return `QTR ${fmt(actual)} / ${fmt(target)} · Expected MTD ${fmt(expected)}`;
}
function sum(rows,key){return rows.reduce((a,r)=>a+(Number(r[key])||0),0)}
function quarterForecast(actual){
 const elapsed=q3ElapsedRatio();
 return elapsed>0 ? Math.round((Number(actual)||0)/elapsed) : 0;
}
function forecastDeltaText(forecast,target){
 const delta=Math.round((Number(forecast)||0)-(Number(target)||0));
 if(!target) return '';
 return `${delta>=0?'▲ +':'▼ '}${fmt(delta)}`;
}
function setForecastDisplay(valueId,deltaId,forecast,target){
 setText(valueId,fmt(forecast));
 const el=document.getElementById(deltaId);
 if(!el) return;
 el.textContent=forecastDeltaText(forecast,target);
 el.className='forecast-delta '+(forecast>=target?'positive':forecast>=target*.98?'neutral':'negative');
}
function paceLabel(ratio){return ratio>=1?'On pace':ratio>=.9?'Just behind':'Behind pace'}
function paceClass(ratio){return ratio>=1?'green':ratio>=.9?'amber':'red'}

function topRow(rows, valueFn){return rows && rows.length ? rows.slice().sort((a,b)=>valueFn(b)-valueFn(a))[0] : null}
function highlights(regs,used,acts,orders){
 const reg=topRow(regs,r=>r.qtr_target?r.qtr_total/r.qtr_target:0);
 const usedTop=topRow(used,r=>r.qtr_target?r.qtr_counting/r.qtr_target:0);
 const ordersTop=topRow(acts,r=>Number(r.total_orders)||0);
 const convTop=topRow(acts,r=>Number(r.orders_ratio)||0);
 const obTop=topRow(orders,r=>orderDoneFor(r,currentOrderMonth()));
 const lines=[];
 if(reg) lines.push(`<div><strong>${siteLabel(reg.centre)}</strong> leads registrations at <strong>${pct(reg.qtr_target?reg.qtr_total/reg.qtr_target:0)}</strong> of Q3 target.</div>`);
 if(usedTop) lines.push(`<div><strong>${siteLabel(usedTop.centre)}</strong> is strongest on used cars at <strong>${pct(usedTop.qtr_target?usedTop.qtr_counting/usedTop.qtr_target:0)}</strong> of target.</div>`);
 if(ordersTop) lines.push(`<div><strong>${siteLabel(ordersTop.centre)}</strong> has the highest order volume with <strong>${fmt(ordersTop.total_orders)}</strong> orders.</div>`);
 if(convTop) lines.push(`<div><strong>${siteLabel(convTop.centre)}</strong> leads conversion at <strong>${pct(convTop.orders_ratio)}</strong>.</div>`);
 if(obTop) lines.push(`<div><strong>${siteLabel(obTop.centre)}</strong> is strongest on order bank done with <strong>${fmt(orderDoneFor(obTop,currentOrderMonth()))}</strong> orders.</div>`);
 return lines.join('');
}

function setText(id, value){ const el=document.getElementById(id); if(el) el.textContent=value; }
function q3WeeksRemaining(){
 const now=new Date();
 const end=new Date(now.getFullYear(),8,30,23,59,59); // 30 September
 if(now>end) return 1;
 return Math.max(1, Math.ceil((end-now)/(7*24*60*60*1000)));
}
function quarterMonthKey(){
 const m=new Date().getMonth();
 if(m===7) return 'aug';
 if(m===8) return 'sep';
 return 'jul';
}
function updateProgressKpi(prefix, rows, config){
 const currentMonth=quarterMonthKey();
 const valueKey=config.valueKey;
 const targetKey=config.targetKey;
 const qtrValueKey=config.qtrValueKey;
 const qtrTargetKey=config.qtrTargetKey;
 const months=['jul','aug','sep'];
 const monthValue=sum(rows, currentMonth + '_' + valueKey);
 const monthTarget=sum(rows, currentMonth + '_' + targetKey);
 const qtrValue=sum(rows, qtrValueKey);
 const qtrTarget=sum(rows, qtrTargetKey);
 const remaining=qtrTarget-qtrValue;
 const weeks=q3WeeksRemaining();
 setText(prefix+'MonthPct', pct(monthTarget ? monthValue/monthTarget : 0));
 setText(prefix+'MonthCurrent', fmt(monthValue));
 setText(prefix+'MonthTarget', fmt(monthTarget));
 setText(prefix+'Pct', pct(qtrTarget ? qtrValue/qtrTarget : 0));
 setText(prefix+'Current', fmt(qtrValue));
 setText(prefix+'Target', fmt(qtrTarget));
 months.forEach(m=>{
   const mv=sum(rows, m+'_'+valueKey);
   const mt=sum(rows, m+'_'+targetKey);
   const cap=m.charAt(0).toUpperCase()+m.slice(1);
   setText(prefix+cap+'Pct', pct(mt ? mv/mt : 0));
   setText(prefix+cap+'Vol', `${fmt(mv)} / ${fmt(mt)}`);
 });
 setText(prefix+'Remaining', fmt(remaining));
 setText(prefix+'RunRate', fmt(Math.max(0, Math.ceil(remaining / weeks))));
}


function funnelEfficiencyScore(row){
  const td = Number(row.td_ratio) || 0;
  const os = Number(row.os_ratio) || 0;
  const conv = Number(row.orders_ratio) || 0;
  // Benchmarks: TD 50%, OS 75%, Conversion 15%.
  const tdScore = Math.min(td / 0.50, 1) * 25;
  const osScore = Math.min(os / 0.75, 1) * 35;
  const convScore = Math.min(conv / 0.15, 1) * 40;
  return Math.round(tdScore + osScore + convScore);
}
function funnelGrade(score){
  if(score >= 95) return 'A+';
  if(score >= 90) return 'A';
  if(score >= 80) return 'B';
  if(score >= 70) return 'C';
  return 'D';
}
function funnelOpportunity(row){
  const gaps = [
    {name:'Test drives', gap:Math.max(0, 0.50 - (Number(row.td_ratio)||0)), target:0.50, actual:Number(row.td_ratio)||0},
    {name:'Offer sheets', gap:Math.max(0, 0.75 - (Number(row.os_ratio)||0)), target:0.75, actual:Number(row.os_ratio)||0},
    {name:'Conversion', gap:Math.max(0, 0.15 - (Number(row.orders_ratio)||0)), target:0.15, actual:Number(row.orders_ratio)||0}
  ].sort((a,b)=>b.gap-a.gap);
  const g = gaps[0];
  if(!g || g.gap <= 0) return 'Maintain standards';
  return `${g.name} (+${Math.round(g.gap*100)} pts)`;
}
function renderEfficiencyAwards(rows){
  const el = document.getElementById('efficiencyAwards');
  if(!el) return;
  const valid = (rows||[]).filter(r=>r.centre && r.centre !== 'TOTAL' && (Number(r.total_enquiries)||0)>0);
  const top = (key)=> valid.slice().sort((a,b)=>(Number(b[key])||0)-(Number(a[key])||0))[0];
  const conv = top('orders_ratio'), td = top('td_ratio'), os = top('os_ratio');
  const card = (title,row,key)=> row ? `<div class="award-card"><span>${title}</span><strong>${siteLabel(row.centre)}</strong><em>${pct(Number(row[key])||0)}</em></div>` : '';
  el.innerHTML = card('Best conversion',conv,'orders_ratio') + card('Best test drive rate',td,'td_ratio') + card('Best offer sheet rate',os,'os_ratio');
}
function renderEfficiencyTable(rows){
  const valid = (rows||[]).filter(r=>r.centre && r.centre !== 'TOTAL' && (Number(r.total_enquiries)||0)>0)
    .map(r=>Object.assign({}, r, { efficiency_score:funnelEfficiencyScore(r), efficiency_grade:funnelGrade(funnelEfficiencyScore(r)), efficiency_opportunity:funnelOpportunity(r) }))
    .sort((a,b)=>b.efficiency_score-a.efficiency_score);
  renderEfficiencyAwards(valid);
  makeTable('efficiencyTable',[
    {label:'Rank', value:(r)=>valid.findIndex(x=>x.centre===r.centre)+1, num:true},
    {label:'Centre', key:'centre'},
    {label:'Score', key:'efficiency_score', num:true},
    {label:'Grade', key:'efficiency_grade'},
    {label:'TD %', key:'td_ratio', format:'pct', num:true},
    {label:'OS %', key:'os_ratio', format:'pct', num:true},
    {label:'Conversion %', key:'orders_ratio', format:'pct', num:true},
    {label:'Enquiries', key:'total_enquiries', num:true},
    {label:'Orders', key:'total_orders', num:true},
    {label:'Biggest Opportunity', key:'efficiency_opportunity'}
  ], valid);
}

function build(){
 updateVersionDisplays();
 const regs=DATA.dashboard_regs, used=DATA.dashboard_used, non=DATA.q3_non, acts=DATA.dashboard_activity;
 const regTarget=sum(regs,'qtr_target'), regCurrent=sum(regs,'qtr_total'), regToGo=regTarget-regCurrent;
 const usedTarget=sum(used,'qtr_target'), usedCurrent=sum(used,'qtr_counting'), usedToGo=usedTarget-usedCurrent;
 // Non-counting fleet front-page KPI uses CDA total rows only.
 // Do not sum Salford/Bradford source rows as well, or it double-counts.
 const nonFleetTotals = non.filter(r=>['NORTH CDA','WY CDA','SOUTH CDA'].includes((r.centre||'').toUpperCase()) && ((Number(r.qtr_budget)||0) || (Number(r.qtr_total)||0)));
  if(!nonFleetTotals.length) nonFleetTotals.push(...non.filter(r=>['NORTH CDA','WY CDA'].includes((r.centre||'').toUpperCase())));
 const nonFleetBudget=sum(nonFleetTotals,'qtr_budget'), nonFleetCurrent=sum(nonFleetTotals,'qtr_total');
 updateProgressKpi('q3', regs, {valueKey:'total', targetKey:'target', qtrValueKey:'qtr_total', qtrTargetKey:'qtr_target'});
 updateProgressKpi('used', used, {valueKey:'counting', targetKey:'target', qtrValueKey:'qtr_counting', qtrTargetKey:'qtr_target'});
 updateProgressKpi('nonFleet', nonFleetTotals, {valueKey:'total', targetKey:'budget', qtrValueKey:'qtr_total', qtrTargetKey:'qtr_budget'});
 const usedGroupForecast=usedForecastFinish({qtr_counting:usedCurrent});
 setForecastDisplay('usedGroupForecast','usedForecastDelta',usedGroupForecast,usedTarget);

 const orderRows=DATA.dashboard_orders||[];
 const orderMonth=currentOrderMonth();
 const orderDone=sum(orderRows,orderMonth+'_orders') || orderRows.reduce((a,r)=>a+orderDoneFor(r,orderMonth),0);
 const orderTarget=sum(orderRows,orderMonth+'_target');
 const orderRatio=orderTarget?orderDone/orderTarget:0;
 setText('orderBankDone',fmt(orderDone));
 setText('orderBankTarget',fmt(orderTarget));
 setText('orderBankToGo',fmt(Math.max(0,orderTarget-orderDone)));
 setText('orderBankPct',pct(orderRatio));
 const obStatus=document.getElementById('orderBankStatus');
 if(obStatus){obStatus.innerHTML=`<span class="status ${paceClass(paceRatio(orderDone,orderTarget))}">${paceLabel(paceRatio(orderDone,orderTarget))}</span>`;}

 const fleetRows=(DATA.q3_fleet||[]).filter(r=>!String(r.centre||'').toUpperCase().includes('CDA'));
 const fleetRegs=sum(fleetRows,'regs'), fleetTarget=sum(fleetRows,'target'), fleetOrders=sum(fleetRows,'active_orders');
 const fleetExpected=fleetRegs+fleetOrders;
 const fleetExpectedAchievement=fleetTarget?fleetExpected/fleetTarget:0;
 setText('fleetBchRegs',fmt(fleetRegs));
 setText('fleetBchTarget',fmt(fleetTarget));
 setText('fleetBchOrders',fmt(fleetOrders));
 setText('fleetBchExpected',pct(fleetExpectedAchievement));
 const fleetPace=paceRatio(fleetExpected,fleetTarget);
 const fleetStatus=document.getElementById('fleetBchStatus');
 if(fleetStatus){fleetStatus.innerHTML=`<span class="status ${paceClass(fleetPace)}">${paceLabel(fleetPace)}</span>`;}
 const act = DATA.dashboard_activity || [];
 const totalEnquiries = sum(act,'total_enquiries');
 const totalTestDrives = sum(act,'total_test_drives');
 const totalOS = sum(act,'total_os');
 const totalOrders = sum(act,'total_orders');
 const newEnquiries = sum(act,'new_enquiries');
 const usedEnquiries = sum(act,'used_enquiries');
 const newTestDrives = sum(act,'new_test_drives');
 const usedTestDrives = sum(act,'used_test_drives');
 const newOS = sum(act,'new_os');
 const usedOS = sum(act,'used_os');
 const newOrders = sum(act,'new_orders');
 const usedOrders = sum(act,'used_orders');
 const totalTdRatio = totalEnquiries ? totalTestDrives / totalEnquiries : 0;
 const totalOsRatio = totalEnquiries ? totalOS / totalEnquiries : 0;
 const totalConvRatio = totalEnquiries ? totalOrders / totalEnquiries : 0;
 const newTdRatio = newEnquiries ? newTestDrives / newEnquiries : 0;
 const usedTdRatio = usedEnquiries ? usedTestDrives / usedEnquiries : 0;
 const newOsRatio = newEnquiries ? newOS / newEnquiries : 0;
 const usedOsRatio = usedEnquiries ? usedOS / usedEnquiries : 0;
 const newConvRatio = newEnquiries ? newOrders / newEnquiries : 0;
 const usedConvRatio = usedEnquiries ? usedOrders / usedEnquiries : 0;
 document.getElementById('totalEnquiries').textContent = fmt(totalEnquiries);
 setText('newEnquiries',fmt(newEnquiries));
 setText('usedEnquiries',fmt(usedEnquiries));
 setText('totalEnquiriesSplit',fmt(totalEnquiries));
 document.getElementById('totalTdPct').textContent = pct(totalTdRatio);
 setText('newTdPct',pct(newTdRatio));
 setText('usedTdPct',pct(usedTdRatio));
 setText('totalTdPctSplit',pct(totalTdRatio));
 document.getElementById('totalOsPct').textContent = pct(totalOsRatio);
 setText('newOsPct',pct(newOsRatio));
 setText('usedOsPct',pct(usedOsRatio));
 setText('totalOsPctSplit',pct(totalOsRatio));
 document.getElementById('totalConvPct').textContent = pct(totalConvRatio);
 setText('newConvPct',pct(newConvRatio));
 setText('usedConvPct',pct(usedConvRatio));
 setText('totalConvPctSplit',pct(totalConvRatio));
 document.getElementById('h2Period').innerHTML='<span class="period-pill muted">H1 closed</span><span class="period-pill active">H2 active · July onwards</span>';
 const north=DATA.q3_regs.find(r=>r.centre==='NORTH CDA'), wy=DATA.q3_regs.find(r=>r.centre==='WY CDA'), south=DATA.q3_regs.find(r=>r.centre==='SOUTH CDA');
 document.getElementById('cdaSummary').innerHTML=[north,wy,south].filter(r=>r && ((Number(r.qtr_target)||0) || (Number(r.qtr_total)||0))).map(r=>{const actual=Number(r.qtr_total)||0; const target=Number(r.qtr_target)||0; const qtrPct=target?actual/target:0; const pace=paceRatio(actual,target); return `<div class="leader-row"><div class="rank">●</div><div class="centre">${r.centre}<div class="mini">QTR ${fmt(actual)} / ${fmt(target)} · To go ${fmt((target||0)-(actual||0))} · ${pace>=1?'On pace':pace>=.9?'Slightly behind pace':'Behind pace'}</div></div><div class="pct">${pct(qtrPct)}</div>${progress(qtrPct)}</div>`}).join('');
 document.getElementById('leaderboard').innerHTML=leaderRows(regs,r=>r.qtr_target?r.qtr_total/r.qtr_target:0,r=>`QTR ${fmt(r.qtr_total)} / ${fmt(r.qtr_target)} · To go ${fmt(r.to_go)} <span class="dashboard-pace">${paceStatus(paceRatio(r.qtr_total,r.qtr_target))}</span>`);
 document.getElementById('usedSummary').innerHTML=leaderRows(used,r=>r.qtr_target?r.qtr_counting/r.qtr_target:0,r=>`QTR ${fmt(r.qtr_counting)} / ${fmt(r.qtr_target)} · To go ${fmt((r.qtr_target||0)-(r.qtr_counting||0))} · ${usedForecastMini(r)} <span class="dashboard-pace">${paceStatus(usedForecastPct(r))}</span>`);
 document.getElementById('nonFleetSummary').innerHTML=non.filter(r=>['Salford','Bradford','Denton'].includes(r.centre)).sort((a,b)=>(b.qtr_total||0)-(a.qtr_total||0)).map((r,i)=>`<div class="leader-row"><div class="rank">${i+1}</div><div class="centre">${siteLabel(r.centre)}<div class="mini">QTR ${fmt(r.qtr_total)} · Budget ${fmt(r.qtr_budget)}</div></div><div class="pct">${fmt(r.qtr_total)}</div>${progress(r.qtr_budget?r.qtr_total/r.qtr_budget:0)}</div>`).join('');
 document.getElementById('highlights').innerHTML=highlights(regs,used,acts,DATA.dashboard_orders||[]);
 document.getElementById('execNote').innerHTML=`<strong>H2 is now the active period.</strong> Dashboard focus has been simplified to new registrations, used cars and non-counting fleet. Q3 new registration target is <strong>${fmt(regTarget)}</strong>, with <strong>${fmt(regToGo)}</strong> still to go in the loaded report. Used car target is <strong>${fmt(usedTarget)}</strong>, with <strong>${fmt(usedToGo)}</strong> still to go. Non-counting fleet currently shows <strong>${fmt(nonFleetCurrent)}</strong> against a budget of <strong>${fmt(nonFleetBudget)}</strong>. Sales funnel totals are now shown at the top: enquiries, test drive %, offer sheet % and conversion %. Full sales activity remains available in its own tab.`;
 makeTable('q3Table',[{label:'Centre',key:'centre'},{label:'Jul Total',key:'jul_total',num:true},{label:'Jul Target',key:'jul_target',num:true},{label:'Aug Total',key:'aug_total',num:true},{label:'Aug Target',key:'aug_target',num:true},{label:'Sep Total',key:'sep_total',num:true},{label:'Sep Target',key:'sep_target',num:true},{label:'QTR Total',key:'qtr_total',num:true},{label:'QTR Target',key:'qtr_target',num:true},{label:'Progress',value:r=>r.qtr_target?r.qtr_total/r.qtr_target:0,format:'progress'},{label:'%',value:r=>r.qtr_target?r.qtr_total/r.qtr_target:0,format:'pct',num:true},{label:'To Go',key:'to_go',num:true},{label:'Per Week',key:'per_week',num:true},{label:'Status',value:r=>paceRatio(r.qtr_total,r.qtr_target),format:'paceStatus'}],DATA.q3_regs);
 makeTable('usedTable',[{label:'Centre',key:'centre'},{label:'Jul Used',key:'jul_counting',num:true},{label:'Jul Target',key:'jul_target',num:true},{label:'Aug Used',key:'aug_counting',num:true},{label:'Aug Target',key:'aug_target',num:true},{label:'Sep Used',key:'sep_counting',num:true},{label:'Sep Target',key:'sep_target',num:true},{label:'QTR Used',key:'qtr_counting',num:true},{label:'QTR Target',key:'qtr_target',num:true},{label:'Progress',value:r=>r.qtr_target?r.qtr_counting/r.qtr_target:0,format:'progress'},{label:'%',value:r=>r.qtr_target?r.qtr_counting/r.qtr_target:0,format:'pct',num:true},{label:'Req / Week',value:r=>usedRequiredPerWeek(r),num:true},{label:'Forecast',value:r=>usedForecastFinish(r),num:true},{label:'Forecast %',value:r=>usedForecastPct(r),format:'pct',num:true},{label:'Status',value:r=>usedForecastPct(r),format:'paceStatus'}],DATA.q3_used);
 makeTable('fleetMonthlyTable',[{label:'Centre',key:'centre'},{label:'Jul Fleet',key:'jul_fleet',num:true},{label:'Aug Fleet',key:'aug_fleet',num:true},{label:'Sep Fleet',key:'sep_fleet',num:true},{label:'QTR Fleet',key:'qtr_fleet',num:true},{label:'BCH Regs',key:'bch_regs',num:true},{label:'BCH Target',key:'bch_target',num:true},{label:'Active Orders',key:'active_orders',num:true},{label:'Expected Achievement',value:r=>r.bch_target?((Number(r.bch_regs)||0)+(Number(r.active_orders)||0))/r.bch_target:0,format:'pct',num:true},{label:'Progress',value:r=>r.bch_target?((Number(r.bch_regs)||0)+(Number(r.active_orders)||0))/r.bch_target:0,format:'progress'},{label:'Status',value:r=>paceRatio((Number(r.bch_regs)||0)+(Number(r.active_orders)||0),r.bch_target),format:'paceStatus'}],DATA.q3_fleet_monthly);
 makeTable('fleetTable',[{label:'Centre',key:'centre'},{label:'Regs',key:'regs',num:true},{label:'Target',key:'target',num:true},{label:'Active Orders',key:'active_orders',num:true},{label:'Expected Achievement',value:r=>r.target?((Number(r.regs)||0)+(Number(r.active_orders)||0))/r.target:0,format:'pct',num:true},{label:'Progress',value:r=>r.target?((Number(r.regs)||0)+(Number(r.active_orders)||0))/r.target:0,format:'progress'},{label:'Status',value:r=>paceRatio((Number(r.regs)||0)+(Number(r.active_orders)||0),r.target),format:'paceStatus'}],DATA.q3_fleet);
 makeTable('nonTable',[{label:'Centre',key:'centre'},{label:'Jul Total',key:'jul_total',num:true},{label:'Jul Budget',key:'jul_budget',num:true},{label:'Aug Total',key:'aug_total',num:true},{label:'Aug Budget',key:'aug_budget',num:true},{label:'Sep Total',key:'sep_total',num:true},{label:'Sep Budget',key:'sep_budget',num:true},{label:'QTR Total',key:'qtr_total',num:true},{label:'QTR Budget',key:'qtr_budget',num:true}],DATA.q3_non);
 makeTable('orderBankTable',[{label:'Centre',key:'centre'},{label:'H1 Target',key:'h1_target',num:true},{label:'H1 Orders',key:'h1_orders',num:true},{label:'H1 Diff',key:'h1_diff',num:true},{label:'H1 %',key:'h1_pct',format:'pct',num:true},{label:'H2 Target',key:'h2_target',num:true},{label:'July Target',key:'jul_target',num:true},{label:'July Done',value:r=>orderDoneFor(r,'jul'),num:true},{label:'July To Go',value:r=>(Number(r.jul_target)||0)-orderDoneFor(r,'jul'),num:true},{label:'July Progress',value:r=>r.jul_target?orderDoneFor(r,'jul')/r.jul_target:0,format:'progress'},{label:'July %',value:r=>r.jul_target?orderDoneFor(r,'jul')/r.jul_target:0,format:'pct',num:true},{label:'Q3 Target',key:'q3_target',num:true},{label:'Q4 Target',key:'q4_target',num:true},{label:'CY26 OB',key:'cy26_target',num:true}],(DATA.dashboard_orders||[]).slice().sort((a,b)=>orderDoneFor(b,currentOrderMonth())-orderDoneFor(a,currentOrderMonth())));
 makeTable('monthlyOrderTable',[
  {label:'Centre',key:'centre'},
  {label:'H1 Target',key:'h1_target',num:true},
  {label:'H1 Orders',key:'h1_orders',num:true},
  {label:'H1 Diff',key:'h1_diff',num:true},
  {label:'H1 %',key:'h1_pct',format:'pct',num:true},
  {label:'H2 Target',key:'h2_target',num:true},
  {label:'H2 Orders',key:'h2_orders',num:true},
  {label:'H2 Diff',key:'h2_diff',num:true},
  {label:'H2 %',key:'h2_pct',format:'pct',num:true},
  {label:'Jul Target',key:'jul_target',num:true},{label:'Jul Done',value:r=>orderDoneFor(r,'jul'),num:true},{label:'Jul Diff',key:'jul_diff',num:true},
  {label:'Aug Target',key:'aug_target',num:true},{label:'Aug Done',value:r=>orderDoneFor(r,'aug'),num:true},{label:'Aug Diff',key:'aug_diff',num:true},
  {label:'Sep Target',key:'sep_target',num:true},{label:'Sep Done',value:r=>orderDoneFor(r,'sep'),num:true},{label:'Sep Diff',key:'sep_diff',num:true},
  {label:'Oct Target',key:'oct_target',num:true},{label:'Oct Done',value:r=>orderDoneFor(r,'oct'),num:true},{label:'Oct Diff',key:'oct_diff',num:true},
  {label:'Nov Target',key:'nov_target',num:true},{label:'Nov Done',value:r=>orderDoneFor(r,'nov'),num:true},{label:'Nov Diff',key:'nov_diff',num:true},
  {label:'Dec Target',key:'dec_target',num:true},{label:'Dec Done',value:r=>orderDoneFor(r,'dec'),num:true},{label:'Dec Diff',key:'dec_diff',num:true}
],(DATA.dashboard_orders||[]).slice().sort((a,b)=>orderDoneFor(b,currentOrderMonth())-orderDoneFor(a,currentOrderMonth())));
 makeTable('activityTable',[{label:'Rank',value:(r)=>((DATA.dashboard_activity||[]).slice().sort((a,b)=>(b.total_orders||0)-(a.total_orders||0)).findIndex(x=>x.centre===r.centre)+1),num:true},{label:'Centre',key:'centre'},{label:'Enquiries',key:'total_enquiries',num:true},{label:'Test Drives',key:'total_test_drives',num:true},{label:'OS',key:'total_os',num:true},{label:'Orders',key:'total_orders',num:true},{label:'TD %',key:'td_ratio',format:'pct',num:true},{label:'Order %',key:'orders_ratio',format:'pct',num:true},{label:'OS %',key:'os_ratio',format:'pct',num:true},{label:'New Enq',key:'new_enquiries',num:true},{label:'New TD',key:'new_test_drives',num:true},{label:'New OS',key:'new_os',num:true},{label:'New Orders',key:'new_orders',num:true},{label:'Used Enq',key:'used_enquiries',num:true},{label:'Used TD',key:'used_test_drives',num:true},{label:'Used OS',key:'used_os',num:true},{label:'Used Orders',key:'used_orders',num:true},{label:'Delivered',key:'delivered',num:true},{label:'Lost Opp',key:'lost_opportunities',num:true}],(DATA.dashboard_activity||[]).slice().sort((a,b)=>(b.total_orders||0)-(a.total_orders||0)));
 renderEfficiencyTable(DATA.dashboard_activity||[]);
 makeTable('q2RegTable',[{label:'Centre',key:'centre'},{label:'Apr Total',key:'apr_total',num:true},{label:'Apr Target',key:'apr_target',num:true},{label:'May Total',key:'may_total',num:true},{label:'May Target',key:'may_target',num:true},{label:'Jun Total',key:'jun_total',num:true},{label:'Jun Target',key:'jun_target',num:true},{label:'QTR Total',key:'qtr_total',num:true},{label:'QTR Target',key:'qtr_target',num:true},{label:'Progress',value:r=>r.qtr_target?r.qtr_total/r.qtr_target:0,format:'progress'},{label:'%',key:'regs_v_target',format:'pct',num:true},{label:'To Go',key:'to_go',num:true}],DATA.q2_regs);
 makeTable('q2UsedTable',[{label:'Centre',key:'centre'},{label:'Apr Used',key:'apr_counting',num:true},{label:'Apr Target',key:'apr_target',num:true},{label:'May Used',key:'may_counting',num:true},{label:'May Target',key:'may_target',num:true},{label:'Jun Used',key:'jun_counting',num:true},{label:'Jun Target',key:'jun_target',num:true},{label:'QTR Used',key:'qtr_counting',num:true},{label:'QTR Target',key:'qtr_target',num:true},{label:'Progress',value:r=>r.qtr_target?r.qtr_counting/r.qtr_target:0,format:'progress'},{label:'%',value:r=>r.qtr_target?r.qtr_counting/r.qtr_target:0,format:'pct',num:true}],DATA.q2_used);
}


function cloneData(){ return JSON.parse(JSON.stringify(DATA)); }
function normCentreName(v){
  const s=String(v||'').trim().replace(/^RRG Toyota\s+/i,'').replace(/^RRG\s+/i,'');
  if(/salford quays/i.test(s)) return 'SQ';
  return s;
}
function nval(v){
  if(v===null||v===undefined||v==='') return 0;
  if(typeof v==='number') return v;
  const s=String(v).replace(/,/g,'').replace('%','').trim();
  const num=Number(s);
  return Number.isFinite(num)?num:0;
}
function pctval(v){
  if(v===null||v===undefined||v==='') return 0;
  if(typeof v==='number') return v>1? v/100 : v;
  const s=String(v).trim();
  const num=nval(s);
  return s.includes('%') ? num/100 : (num>1?num/100:num);
}
async function readFileAsArrayBuffer(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsArrayBuffer(file);});}
async function readFileAsText(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsText(file);});}
function updateRow(rows, centre, patch){
  const row = ensureRow(rows, centre);
  Object.assign(row, patch);
}
function totalsFor(rows, names, fields){
  const result={centre:names.label};
  fields.forEach(f=>result[f]=rows.filter(r=>names.items.includes(r.centre)).reduce((a,r)=>a+(Number(r[f])||0),0));
  return result;
}
function recomputeDashboardSets(data){
  ensureCdaTotals(data);
  const userSites = ALL_DASHBOARD_SITES;
  data.user_sites = userSites;
  data.dashboard_regs = (data.q3_regs||[]).filter(r=>userSites.includes(r.centre));
  data.dashboard_used = (data.q3_used||[]).filter(r=>userSites.includes(r.centre));
  data.dashboard_activity = (data.sales_activity||data.dashboard_activity||[]).filter(r=>userSites.includes(r.centre));
  data.dashboard_orders = (data.order_bank||data.dashboard_orders||[]).filter(r=>userSites.includes(r.centre));
}
function parseWeeklyWorkbook(wb, data){
  const ws = wb.Sheets['2026 - Q3'] || wb.Sheets[wb.SheetNames[0]];
  const a = XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
  const findSection = (txt)=>a.findIndex(r=>String(r && r[0] || '').toUpperCase().includes(txt));
  const nextSection = (start)=>{
    let next=a.length;
    for(let i=start+1;i<a.length;i++){
      const label=String(a[i] && a[i][0] || '').toUpperCase();
      if(label.includes('REGISTRATIONS') || label.includes('USED COUNTING') || label.includes('CENTRE FLEET')){ next=i; break; }
    }
    return next;
  };
  const parseBetween = (start, handler)=>{
    if(start<0) return;
    const end=nextSection(start);
    for(let i=start+1;i<end;i++){
      const r=a[i]; if(!r || !r[0]) continue;
      const centre=normCentreName(r[0]);
      if(!isKnownCentreLabel(centre)) continue;
      handler(r, centre);
    }
  };
  parseBetween(findSection('REGISTRATIONS (COUNTING)'), (r, centre)=>{
    const patch={
      jul_counting:nval(r[1]), jul_clcp:nval(r[2]), jul_fleet:nval(r[3]), jul_total:nval(r[4]), jul_target:nval(r[5]),
      aug_counting:nval(r[7]), aug_clcp:nval(r[8]), aug_fleet:nval(r[9]), aug_total:nval(r[10]), aug_target:nval(r[11]),
      sep_counting:nval(r[13]), sep_clcp:nval(r[14]), sep_fleet:nval(r[15]), sep_total:nval(r[16]), sep_target:nval(r[17]),
      qtr_counting:nval(r[19]), qtr_fleet:nval(r[20]), qtr_total:nval(r[21]), qtr_target:nval(r[22]),
      to_go:nval(r[23]), per_week:nval(r[24]), qtr_regs:nval(r[25]), target:nval(r[26]), regs_v_target:pctval(r[27])
    };
    updateRow(data.q3_regs, centre, patch);
  });
  parseBetween(findSection('REGISTRATIONS (NON-COUNTING)'), (r, centre)=>{
    const patch={jul_reg:nval(r[1]),jul_unreg:nval(r[2]),jul_total:nval(r[3]),jul_budget:nval(r[4]),aug_reg:nval(r[5]),aug_unreg:nval(r[6]),aug_total:nval(r[7]),aug_budget:nval(r[8]),sep_reg:nval(r[9]),sep_unreg:nval(r[10]),sep_total:nval(r[11]),sep_budget:nval(r[12]),qtr_reg:nval(r[14]),qtr_unreg:nval(r[15]),qtr_total:nval(r[16]),qtr_budget:nval(r[17])};
    updateRow(data.q3_non, centre, patch);
  });
  parseBetween(findSection('USED COUNTING VOLUME'), (r, centre)=>{
    const patch={jul_counting:nval(r[1]),jul_target:nval(r[2]),aug_counting:nval(r[4]),aug_target:nval(r[5]),sep_counting:nval(r[7]),sep_target:nval(r[8]),qtr_counting:nval(r[10]),qtr_target:nval(r[11])};
    updateRow(data.q3_used, centre, patch);
  });
  parseBetween(findSection('CENTRE FLEET'), (r, centre)=>{
    updateRow(data.q3_fleet, centre, {regs:nval(r[1]),target:nval(r[2]),pct:pctval(r[3]),active_orders:nval(r[5])});
    updateRow(data.q3_fleet_monthly, centre, {bch_regs:nval(r[1]),bch_target:nval(r[2]),active_orders:nval(r[5])});
  });
  recomputeDashboardSets(data);
}

function parseOrderWorkbook(wb, data){
  const ws = wb.Sheets['Order Bank Targets'] || wb.Sheets[wb.SheetNames[0]];
  if(!ws) throw new Error('Order Bank Targets sheet not found.');

  const rows = XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
  const months = {
    jan:'jan', january:'jan', feb:'feb', february:'feb', mar:'mar', march:'mar',
    apr:'apr', april:'apr', may:'may', jun:'jun', june:'jun',
    jul:'jul', july:'jul', aug:'aug', august:'aug', sep:'sep', sept:'sep', september:'sep',
    oct:'oct', october:'oct', nov:'nov', november:'nov', dec:'dec', december:'dec'
  };

  const clean = v => String(v ?? '').trim().toLowerCase();
  const normalMonth = v => months[clean(v)] || null;
  const isCentre = v => {
    const c = normCentreName(v);
    return ALL_DASHBOARD_SITES.includes(c);
  };
  const ensureOrderRow = centre => {
    data.order_bank = data.order_bank || [];
    const wanted = normCentreName(centre);
    let row = data.order_bank.find(r=>normCentreName(r.centre).toLowerCase()===wanted.toLowerCase());
    if(!row){
      row = {centre:wanted};
      data.order_bank.push(row);
    }
    row.centre = wanted;
    return row;
  };
  const blankOrder = v => v===null || v===undefined || v==='';

  // Read the top annual/quarter target table dynamically.
  for(const r of rows){
    if(!r || !isCentre(r[0])) continue;
    const centre = normCentreName(r[0]);
    // The top table has ASO in column B and Q1-Q4/CY26 in D-I.
    if(r.length >= 9 && (r[1] !== null || r[3] !== null || r[8] !== null)){
      const row = ensureOrderRow(centre);
      row.aso = nval(r[1]);
      row.q1_target = nval(r[3]);
      row.q2_target = nval(r[4]);
      row.q3_target = nval(r[5]);
      row.q4_target = nval(r[6]);
      row.cy26_target = nval(r[8]);
    }
  }

  // Find every "Orders after cancellations" block and derive month columns
  // from its header. This supports both H1 and H2, plus layout shifts.
  let blocksFound = 0;
  for(let headerIndex=0; headerIndex<rows.length; headerIndex++){
    const header = rows[headerIndex] || [];
    if(!clean(header[0]).includes('orders after cancellations')) continue;

    const monthColumns = [];
    for(let c=1; c<header.length; c++){
      const m = normalMonth(header[c]);
      if(m) monthColumns.push({month:m,targetCol:c,ordersCol:c+1,diffCol:c+2});
    }
    if(!monthColumns.length) continue;
    blocksFound++;

    for(let rIndex=headerIndex+1; rIndex<rows.length; rIndex++){
      const r = rows[rIndex] || [];
      if(!r[0]) {
        // Allow total rows, but stop before the next section after a short gap.
        if(rIndex > headerIndex+15) break;
        continue;
      }
      if(clean(r[0]).includes('orders after cancellations')) break;
      if(!isCentre(r[0])) {
        // Once centre rows have finished, stop at totals/other headings.
        if(rIndex > headerIndex+1) break;
        continue;
      }

      const row = ensureOrderRow(r[0]);
      for(const m of monthColumns){
        const target = nval(r[m.targetCol]);
        const rawOrders = r[m.ordersCol];
        const orders = blankOrder(rawOrders) ? null : nval(rawOrders);
        const rawDiff = r[m.diffCol];

        row[m.month+'_target'] = target;
        row[m.month+'_orders'] = orders;
        row[m.month+'_diff'] = blankOrder(rawDiff)
          ? (orders===null ? -target : orders-target)
          : nval(rawDiff);
      }
    }
  }

  if(!blocksFound) throw new Error('No "Orders after cancellations" tables found.');

  const h1 = ['jan','feb','mar','apr','may','jun'];
  const h2 = ['jul','aug','sep','oct','nov','dec'];
  for(const row of (data.order_bank||[])){
    row.h1_target = h1.reduce((t,m)=>t+(Number(row[m+'_target'])||0),0);
    row.h1_orders = h1.reduce((t,m)=>t+(Number(row[m+'_orders'])||0),0);
    row.h1_diff = row.h1_orders - row.h1_target;
    row.h1_pct = row.h1_target ? row.h1_orders / row.h1_target : 0;

    row.h2_target = h2.reduce((t,m)=>t+(Number(row[m+'_target'])||0),0);
    row.h2_orders = h2.reduce((t,m)=>t+(Number(row[m+'_orders'])||0),0);
    row.h2_diff = row.h2_orders - row.h2_target;
    row.h2_pct = row.h2_target ? row.h2_orders / row.h2_target : 0;

    if(!row.q3_target) row.q3_target = ['jul','aug','sep'].reduce((t,m)=>t+(Number(row[m+'_target'])||0),0);
    if(!row.q4_target) row.q4_target = ['oct','nov','dec'].reduce((t,m)=>t+(Number(row[m+'_target'])||0),0);
  }

  recomputeDashboardSets(data);
  return (data.dashboard_orders||[]).length;
}

function parseSalesRows(rows, data){
  const siteRows=[];
  for(const r of rows){
    if(!r || !r[0]) continue;
    const label=String(r[0]);
    if(!/^RRG Toyota/i.test(label)) continue;
    const centre=normCentreName(label);
    const row={
      centre,
      new_enquiries:nval(r[5]), new_test_drives:nval(r[6]), new_os:nval(r[7]), new_orders:nval(r[8]),
      used_enquiries:nval(r[17]), used_test_drives:nval(r[18]), used_os:nval(r[19]), used_orders:nval(r[20]),
      total_enquiries:nval(r[25]), total_test_drives:nval(r[26]), total_os:nval(r[27]), total_orders:nval(r[28]),
      lost_op_req:nval(r[29]), confirmed_orders:nval(r[30]), delivered:nval(r[31]), lost_opportunities:nval(r[32]),
      td_ratio:pctval(r[33]), orders_ratio:pctval(r[34]), os_ratio:pctval(r[35])
    };
    siteRows.push(row);
  }
  if(siteRows.length){
    data.sales_activity = siteRows;
    recomputeDashboardSets(data);
  }
  return siteRows.length;
}
async function parseSalesActivityFile(file, data){
  const buf = await readFileAsArrayBuffer(file);
  try{
    const wb = XLSX.read(buf,{type:'array'});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:false});
    const count=parseSalesRows(rows,data);
    if(count) return count;
  }catch(e){ console.warn('SheetJS sales parse failed, trying HTML',e); }
  const text = await readFileAsText(file);
  const doc = new DOMParser().parseFromString(text,'text/html');
  const rows = Array.from(doc.querySelectorAll('tr')).map(tr=>Array.from(tr.querySelectorAll('th,td')).map(td=>td.textContent.trim()));
  return parseSalesRows(rows,data);
}
function renderAdminPreview(data){
  const rows=[];
  const regCurrent=(data.dashboard_regs||[]).reduce((a,r)=>a+(Number(r.qtr_total)||0),0);
  const regTarget=(data.dashboard_regs||[]).reduce((a,r)=>a+(Number(r.qtr_target)||0),0);
  const usedCurrent=(data.dashboard_used||[]).reduce((a,r)=>a+(Number(r.qtr_counting)||0),0);
  const usedTarget=(data.dashboard_used||[]).reduce((a,r)=>a+(Number(r.qtr_target)||0),0);
  const act=data.dashboard_activity||[];
  rows.push({area:'New registrations',actual:regCurrent,target:regTarget,percent:regTarget?regCurrent/regTarget:0});
  rows.push({area:'Used cars',actual:usedCurrent,target:usedTarget,percent:usedTarget?usedCurrent/usedTarget:0});
  rows.push({area:'Sales enquiries',actual:act.reduce((a,r)=>a+(Number(r.total_enquiries)||0),0),target:'-',percent:null});
  rows.push({area:'Sales activity orders',actual:act.reduce((a,r)=>a+(Number(r.total_orders)||0),0),target:'-',percent:null});
  const om=currentOrderMonth(); const ord=data.dashboard_orders||[]; const obDone=ord.reduce((a,r)=>a+orderDoneFor(r,om),0); const obTarget=ord.reduce((a,r)=>a+(Number(r[om+'_target'])||0),0);
  rows.push({area:'Order bank '+om.toUpperCase(),actual:obDone,target:obTarget,percent:obTarget?obDone/obTarget:0});
  makeTable('adminPreviewTable',[{label:'Area',key:'area'},{label:'Actual',key:'actual',num:true},{label:'Target',key:'target',num:true},{label:'%',key:'percent',format:'pct',num:true}],rows);
}
async function previewImport(){
  const weekly=document.getElementById('weeklyFile')?.files?.[0];
  const activity=document.getElementById('activityFile')?.files?.[0];
  const order=document.getElementById('orderFile')?.files?.[0];
  const status=document.getElementById('adminStatus');
  const data=cloneData();
  const messages=[];
  try{
    if(weekly){
      const buf=await readFileAsArrayBuffer(weekly);
      const wb=XLSX.read(buf,{type:'array'});
      parseWeeklyWorkbook(wb,data);
      messages.push('Weekly Update imported');
    }
    if(activity){
      const count=await parseSalesActivityFile(activity,data);
      messages.push(`Sales Activity imported (${count} centres)`);
    }
    if(order){
      const buf=await readFileAsArrayBuffer(order);
      const wb=XLSX.read(buf,{type:'array'});
      const count=parseOrderWorkbook(wb,data);
      messages.push(`Order Bank imported (${count} rows)`);
    }
    PENDING_DATA=data;
    renderAdminPreview(data);
    status.innerHTML = messages.length ? `<strong>Preview ready.</strong><br>${messages.join('<br>')}` : 'Choose at least one file to preview.';
  }catch(e){
    console.error(e);
    status.innerHTML = `<strong>Import failed.</strong><br>${e.message || e}`;
  }
}
function publishImport(){
  if(!PENDING_DATA){ document.getElementById('adminStatus').innerHTML='Preview an import first.'; return; }
  DATA=PENDING_DATA;
  const publishedMeta = saveDashboardMeta();
  document.getElementById('previewImport')?.addEventListener('click', previewImport);
document.getElementById('publishImport')?.addEventListener('click', publishImport);
document.getElementById('downloadData')?.addEventListener('click', downloadDataBackup);
document.getElementById('resetData')?.addEventListener('click', resetSavedData);
build();
  document.getElementById('adminStatus').innerHTML=`<strong>Published.</strong><br>Preview published in this browser. For the live site, replace the three workbook files in GitHub and commit.<br>${'Version ' + publishedMeta.version}<br>${'Published ' + formatPublishedAt(publishedMeta.publishedAt)}`;
}
function downloadDataBackup(){
  const payload = 'window.DASHBOARD_DATA = ' + JSON.stringify(DATA, null, 2) + ';\n';
  const blob = new Blob([payload],{type:'application/javascript'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='data.js';
  a.click();
  URL.revokeObjectURL(a.href);
}
function resetSavedData(){
  localStorage.removeItem('rrgDashboardData_orderbank_v2');
  localStorage.removeItem(DASHBOARD_META_KEY);
  location.reload();
}

function cloneData(){ return JSON.parse(JSON.stringify(DATA)); }
function normCentreName(v){
  const s=String(v||'').trim().replace(/^RRG Toyota\s+/i,'').replace(/^RRG\s+/i,'');
  if(/salford quays/i.test(s)) return 'SQ';
  return s;
}
function nval(v){
  if(v===null||v===undefined||v==='') return 0;
  if(typeof v==='number') return v;
  const s=String(v).replace(/,/g,'').replace('%','').trim();
  const num=Number(s);
  return Number.isFinite(num)?num:0;
}
function pctval(v){
  if(v===null||v===undefined||v==='') return 0;
  if(typeof v==='number') return v>1? v/100 : v;
  const s=String(v).trim();
  const num=nval(s);
  return s.includes('%') ? num/100 : (num>1?num/100:num);
}
async function readFileAsArrayBuffer(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsArrayBuffer(file);});}
async function readFileAsText(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsText(file);});}
function updateRow(rows, centre, patch){
  const row = ensureRow(rows, centre);
  Object.assign(row, patch);
}
function totalsFor(rows, names, fields){
  const result={centre:names.label};
  fields.forEach(f=>result[f]=rows.filter(r=>names.items.includes(r.centre)).reduce((a,r)=>a+(Number(r[f])||0),0));
  return result;
}
function recomputeDashboardSets(data){
  ensureCdaTotals(data);
  const userSites = ALL_DASHBOARD_SITES;
  data.user_sites = userSites;
  data.dashboard_regs = (data.q3_regs||[]).filter(r=>userSites.includes(r.centre));
  data.dashboard_used = (data.q3_used||[]).filter(r=>userSites.includes(r.centre));
  data.dashboard_activity = (data.sales_activity||data.dashboard_activity||[]).filter(r=>userSites.includes(r.centre));
  data.dashboard_orders = (data.order_bank||data.dashboard_orders||[]).filter(r=>userSites.includes(r.centre));
}
function parseWeeklyWorkbook(wb, data){
  const ws = wb.Sheets['2026 - Q3'] || wb.Sheets[wb.SheetNames[0]];
  const a = XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
  const findSection = (txt)=>a.findIndex(r=>String(r && r[0] || '').toUpperCase().includes(txt));
  const nextSection = (start)=>{
    let next=a.length;
    for(let i=start+1;i<a.length;i++){
      const label=String(a[i] && a[i][0] || '').toUpperCase();
      if(label.includes('REGISTRATIONS') || label.includes('USED COUNTING') || label.includes('CENTRE FLEET')){ next=i; break; }
    }
    return next;
  };
  const parseBetween = (start, handler)=>{
    if(start<0) return;
    const end=nextSection(start);
    for(let i=start+1;i<end;i++){
      const r=a[i]; if(!r || !r[0]) continue;
      const centre=normCentreName(r[0]);
      if(!isKnownCentreLabel(centre)) continue;
      handler(r, centre);
    }
  };
  parseBetween(findSection('REGISTRATIONS (COUNTING)'), (r, centre)=>{
    const patch={
      jul_counting:nval(r[1]), jul_clcp:nval(r[2]), jul_fleet:nval(r[3]), jul_total:nval(r[4]), jul_target:nval(r[5]),
      aug_counting:nval(r[7]), aug_clcp:nval(r[8]), aug_fleet:nval(r[9]), aug_total:nval(r[10]), aug_target:nval(r[11]),
      sep_counting:nval(r[13]), sep_clcp:nval(r[14]), sep_fleet:nval(r[15]), sep_total:nval(r[16]), sep_target:nval(r[17]),
      qtr_counting:nval(r[19]), qtr_fleet:nval(r[20]), qtr_total:nval(r[21]), qtr_target:nval(r[22]),
      to_go:nval(r[23]), per_week:nval(r[24]), qtr_regs:nval(r[25]), target:nval(r[26]), regs_v_target:pctval(r[27])
    };
    updateRow(data.q3_regs, centre, patch);
  });
  parseBetween(findSection('REGISTRATIONS (NON-COUNTING)'), (r, centre)=>{
    const patch={jul_reg:nval(r[1]),jul_unreg:nval(r[2]),jul_total:nval(r[3]),jul_budget:nval(r[4]),aug_reg:nval(r[5]),aug_unreg:nval(r[6]),aug_total:nval(r[7]),aug_budget:nval(r[8]),sep_reg:nval(r[9]),sep_unreg:nval(r[10]),sep_total:nval(r[11]),sep_budget:nval(r[12]),qtr_reg:nval(r[14]),qtr_unreg:nval(r[15]),qtr_total:nval(r[16]),qtr_budget:nval(r[17])};
    updateRow(data.q3_non, centre, patch);
  });
  parseBetween(findSection('USED COUNTING VOLUME'), (r, centre)=>{
    const patch={jul_counting:nval(r[1]),jul_target:nval(r[2]),aug_counting:nval(r[4]),aug_target:nval(r[5]),sep_counting:nval(r[7]),sep_target:nval(r[8]),qtr_counting:nval(r[10]),qtr_target:nval(r[11])};
    updateRow(data.q3_used, centre, patch);
  });
  parseBetween(findSection('CENTRE FLEET'), (r, centre)=>{
    updateRow(data.q3_fleet, centre, {regs:nval(r[1]),target:nval(r[2]),pct:pctval(r[3]),active_orders:nval(r[5])});
    updateRow(data.q3_fleet_monthly, centre, {bch_regs:nval(r[1]),bch_target:nval(r[2]),active_orders:nval(r[5])});
  });
  recomputeDashboardSets(data);
}
function parseSalesRows(rows, data){
  const siteRows=[];
  for(const r of rows){
    if(!r || !r[0]) continue;
    const label=String(r[0]);
    if(!/^RRG Toyota/i.test(label)) continue;
    const centre=normCentreName(label);
    const row={
      centre,
      new_enquiries:nval(r[5]), new_test_drives:nval(r[6]), new_os:nval(r[7]), new_orders:nval(r[8]),
      used_enquiries:nval(r[17]), used_test_drives:nval(r[18]), used_os:nval(r[19]), used_orders:nval(r[20]),
      total_enquiries:nval(r[25]), total_test_drives:nval(r[26]), total_os:nval(r[27]), total_orders:nval(r[28]),
      lost_op_req:nval(r[29]), confirmed_orders:nval(r[30]), delivered:nval(r[31]), lost_opportunities:nval(r[32]),
      td_ratio:pctval(r[33]), orders_ratio:pctval(r[34]), os_ratio:pctval(r[35])
    };
    siteRows.push(row);
  }
  if(siteRows.length){
    data.sales_activity = siteRows;
    recomputeDashboardSets(data);
  }
  return siteRows.length;
}
async function parseSalesActivityFile(file, data){
  const buf = await readFileAsArrayBuffer(file);
  try{
    const wb = XLSX.read(buf,{type:'array'});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:false});
    const count=parseSalesRows(rows,data);
    if(count) return count;
  }catch(e){ console.warn('SheetJS sales parse failed, trying HTML',e); }
  const text = await readFileAsText(file);
  const doc = new DOMParser().parseFromString(text,'text/html');
  const rows = Array.from(doc.querySelectorAll('tr')).map(tr=>Array.from(tr.querySelectorAll('th,td')).map(td=>td.textContent.trim()));
  return parseSalesRows(rows,data);
}
function renderAdminPreview(data){
  const rows=[];
  const regCurrent=(data.dashboard_regs||[]).reduce((a,r)=>a+(Number(r.qtr_total)||0),0);
  const regTarget=(data.dashboard_regs||[]).reduce((a,r)=>a+(Number(r.qtr_target)||0),0);
  const usedCurrent=(data.dashboard_used||[]).reduce((a,r)=>a+(Number(r.qtr_counting)||0),0);
  const usedTarget=(data.dashboard_used||[]).reduce((a,r)=>a+(Number(r.qtr_target)||0),0);
  const act=data.dashboard_activity||[];
  rows.push({area:'New registrations',actual:regCurrent,target:regTarget,percent:regTarget?regCurrent/regTarget:0});
  rows.push({area:'Used cars',actual:usedCurrent,target:usedTarget,percent:usedTarget?usedCurrent/usedTarget:0});
  rows.push({area:'Sales enquiries',actual:act.reduce((a,r)=>a+(Number(r.total_enquiries)||0),0),target:'-',percent:null});
  rows.push({area:'Orders',actual:act.reduce((a,r)=>a+(Number(r.total_orders)||0),0),target:'-',percent:null});
  makeTable('adminPreviewTable',[{label:'Area',key:'area'},{label:'Actual',key:'actual',num:true},{label:'Target',key:'target',num:true},{label:'%',key:'percent',format:'pct',num:true}],rows);
}
async function previewImport(){
  const weekly=document.getElementById('weeklyFile')?.files?.[0];
  const activity=document.getElementById('activityFile')?.files?.[0];
  const status=document.getElementById('adminStatus');
  const data=cloneData();
  const messages=[];
  try{
    if(weekly){
      const buf=await readFileAsArrayBuffer(weekly);
      const wb=XLSX.read(buf,{type:'array'});
      parseWeeklyWorkbook(wb,data);
      messages.push('Weekly Update imported');
    }
    if(activity){
      const count=await parseSalesActivityFile(activity,data);
      messages.push(`Sales Activity imported (${count} centres)`);
    }
    PENDING_DATA=data;
    renderAdminPreview(data);
    status.innerHTML = messages.length ? `<strong>Preview ready.</strong><br>${messages.join('<br>')}` : 'Choose at least one file to preview.';
  }catch(e){
    console.error(e);
    status.innerHTML = `<strong>Import failed.</strong><br>${e.message || e}`;
  }
}
function publishImport(){
  if(!PENDING_DATA){ document.getElementById('adminStatus').innerHTML='Preview an import first.'; return; }
  DATA=PENDING_DATA;
  const publishedMeta = saveDashboardMeta();
  document.getElementById('previewImport')?.addEventListener('click', previewImport);
document.getElementById('publishImport')?.addEventListener('click', publishImport);
document.getElementById('downloadData')?.addEventListener('click', downloadDataBackup);
document.getElementById('resetData')?.addEventListener('click', resetSavedData);
build();
  document.getElementById('adminStatus').innerHTML=`<strong>Published.</strong><br>Preview published in this browser. For the live site, replace the three workbook files in GitHub and commit.<br>${'Version ' + publishedMeta.version}<br>${'Published ' + formatPublishedAt(publishedMeta.publishedAt)}`;
}
function downloadDataBackup(){
  const payload = 'window.DASHBOARD_DATA = ' + JSON.stringify(DATA, null, 2) + ';\n';
  const blob = new Blob([payload],{type:'application/javascript'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='data.js';
  a.click();
  URL.revokeObjectURL(a.href);
}
function resetSavedData(){
  localStorage.removeItem('rrgDashboardData_orderbank_v2');
  localStorage.removeItem(DASHBOARD_META_KEY);
  location.reload();
}


async function fetchWorkbook(path){
  const res = await fetch(path, { cache: 'no-cache' });
  if(!res.ok) throw new Error(path + ' not found (' + res.status + ')');
  const buf = await res.arrayBuffer();
  return XLSX.read(buf, { type: 'array' });
}
async function fetchRowsWorkbook(path, raw=false){
  const wb = await fetchWorkbook(path);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header:1, defval:null, raw });
}
async function loadGithubWorkbookData(){
  const status=document.getElementById('adminStatus');
  const data=cloneData();
  const messages=[];
  try{
    // Fetch the three source files together. This avoids waiting for each
    // workbook to finish before starting the next one.
    const [weeklyResult, activityResult, orderResult] = await Promise.allSettled([
      fetchWorkbook('./weekly-update.xlsx'),
      fetchRowsWorkbook('./sales-activity.xls', false),
      fetchWorkbook('./order-bank.xlsx')
    ]);

    if(weeklyResult.status==='fulfilled'){
      parseWeeklyWorkbook(weeklyResult.value, data);
      messages.push('weekly-update.xlsx loaded');
    }else messages.push('weekly-update.xlsx not loaded: ' + weeklyResult.reason.message);

    if(activityResult.status==='fulfilled'){
      const count=parseSalesRows(activityResult.value, data);
      messages.push('sales-activity.xls loaded (' + count + ' centres)');
    }else messages.push('sales-activity.xls not loaded: ' + activityResult.reason.message);

    if(orderResult.status==='fulfilled'){
      const count=parseOrderWorkbook(orderResult.value, data);
      messages.push('order-bank.xlsx loaded (' + count + ' rows)');
    }else messages.push('order-bank.xlsx not loaded: ' + orderResult.reason.message);

    DATA=data;
    build();
    const el=document.getElementById('dataSourceStatus');
    if(el) el.innerHTML='<strong>Workbook source active.</strong><br>'+messages.join('<br>');
    if(status) status.innerHTML='<strong>Workbook files loaded from GitHub.</strong><br>'+messages.join('<br>');
  }catch(e){
    console.error(e);
    build();
    if(status) status.innerHTML='<strong>Workbook load failed.</strong><br>'+(e.message||e);
  }
}

document.querySelectorAll('nav button').forEach(btn=>{btn.addEventListener('click',()=>{
  document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  btn.classList.add('active');
  const target=document.getElementById(btn.dataset.target);
  if(target) target.classList.add('active');
})});
document.querySelectorAll('.search').forEach(input=>{input.addEventListener('input',()=>{const table=document.getElementById(input.dataset.filter);const term=input.value.toLowerCase();table.querySelectorAll('tbody tr').forEach(tr=>{tr.style.display=tr.textContent.toLowerCase().includes(term)?'':'none'})})});
document.getElementById('previewImport')?.addEventListener('click', previewImport);
document.getElementById('publishImport')?.addEventListener('click', publishImport);
document.getElementById('downloadData')?.addEventListener('click', downloadDataBackup);
document.getElementById('resetData')?.addEventListener('click', resetSavedData);
loadGithubWorkbookData();


function exportWeeklyPdf(){
  document.body.classList.add('print-pack');
  setTimeout(()=>{ window.print(); }, 150);
  const cleanup = () => {
    document.body.classList.remove('print-pack');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  setTimeout(()=>{ document.body.classList.remove('print-pack'); }, 3000);
}
document.getElementById('exportPdf')?.addEventListener('click', exportWeeklyPdf);
document.getElementById('exportPdfHeader')?.addEventListener('click', exportWeeklyPdf);


// --- PowerPoint Board Pack Export ---
function asNum(v){ return Number(v) || 0; }
function fmtPpt(n){ return Math.round(Number(n)||0).toLocaleString('en-GB'); }
function pctPpt(n){ return `${Math.round((Number(n)||0)*100)}%`; }
function safeRows(rows){ return Array.isArray(rows) ? rows : []; }
function sumPpt(rows, key){ return safeRows(rows).reduce((a,r)=>a+asNum(r && r[key]),0); }
function siteDisplay(name){ return name === 'SQ' ? 'Salford Quays' : (name || '-'); }
function currentWeekLabel(){
  try { if(typeof rrgISOWeek === 'function') return rrgISOWeek(new Date()); } catch(e){}
  const d = new Date();
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
function pptStatusColour(ratio){ return ratio >= 1 ? '15803D' : ratio >= 0.9 ? 'B45309' : 'B91C1C'; }
function addSlideTitle(slide, title, subtitle){
  slide.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.333, h:0.62, fill:{color:'0F172A'}, line:{color:'0F172A'} });
  slide.addText(title, { x:0.35, y:0.15, w:8.5, h:0.3, fontFace:'Aptos Display', fontSize:17, bold:true, color:'FFFFFF', margin:0 });
  slide.addText(subtitle || 'RRG Group Dashboard', { x:9.2, y:0.18, w:3.7, h:0.25, fontFace:'Aptos', fontSize:9, color:'CBD5E1', align:'right', margin:0 });
}
function addFooter(slide){
  slide.addText(`Generated ${new Date().toLocaleDateString('en-GB')} · RRG Group Dashboard`, { x:0.35, y:7.15, w:12.6, h:0.2, fontFace:'Aptos', fontSize:7, color:'64748B', margin:0 });
}
function addMetricCard(slide, x, y, w, h, title, value, sub, color='2563EB'){
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius:0.08, fill:{color:'FFFFFF'}, line:{color:'D9DEE8', width:1} });
  slide.addText(title.toUpperCase(), { x:x+0.15, y:y+0.15, w:w-0.3, h:0.22, fontFace:'Aptos', fontSize:7.5, bold:true, color:'6B7280', margin:0 });
  slide.addText(String(value), { x:x+0.15, y:y+0.45, w:w-0.3, h:0.45, fontFace:'Aptos Display', fontSize:24, bold:true, color, margin:0 });
  slide.addText(String(sub||''), { x:x+0.15, y:y+h-0.35, w:w-0.3, h:0.2, fontFace:'Aptos', fontSize:8, color:'6B7280', margin:0 });
}
function addTableSlide(slide, title, rows, columns, subtitle){
  addSlideTitle(slide, title, subtitle || currentWeekLabel());
  const data = [columns.map(c=>({text:c.label, options:{bold:true,color:'334155',fill:'F8FAFC'}}))];
  rows.slice(0,18).forEach(r=>{
    data.push(columns.map(c=>{
      let v = typeof c.value === 'function' ? c.value(r) : r[c.key];
      if(c.format === 'pct') v = pctPpt(v);
      else if(c.num) v = fmtPpt(v);
      return { text: String(v ?? '-'), options:{ color:'111827', fill: String(r.centre||'').includes('CDA') || r.centre==='TOTAL' ? 'EEF2FF' : 'FFFFFF' } };
    }));
  });
  slide.addTable(data, { x:0.35, y:0.9, w:12.65, h:5.95, border:{type:'solid',color:'E5E7EB',pt:0.5}, fontFace:'Aptos', fontSize:8, color:'111827', margin:0.04, valign:'mid', fit:'shrink', colW:columns.map(c=>c.w||1) });
  addFooter(slide);
}
function efficiencyRows(){
  const acts = safeRows(DATA.dashboard_activity).filter(r=>r.centre && r.centre !== 'TOTAL');
  if(typeof funnelEfficiencyScore === 'function'){
    return acts.map(r=>({ ...r, effScore:funnelEfficiencyScore(r), effGrade:efficiencyGrade(funnelEfficiencyScore(r)) })).sort((a,b)=>b.effScore-a.effScore);
  }
  return acts.map(r=>{
    const td=asNum(r.td_ratio), os=asNum(r.os_ratio), conv=asNum(r.orders_ratio);
    const score=Math.round(Math.min(td/0.5,1)*25 + Math.min(os/0.75,1)*35 + Math.min(conv/0.15,1)*40);
    return { ...r, effScore:score, effGrade:score>=90?'A':score>=80?'B':score>=70?'C':'D' };
  }).sort((a,b)=>b.effScore-a.effScore);
}
let pptxLibraryPromise=null;
function ensurePptxLibrary(){
  if(typeof pptxgen !== 'undefined') return Promise.resolve();
  if(pptxLibraryPromise) return pptxLibraryPromise;
  pptxLibraryPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='./pptxgen.bundle.js?v=20260721-performance-1';
    script.onload=()=>typeof pptxgen!=='undefined' ? resolve() : reject(new Error('PowerPoint library unavailable'));
    script.onerror=()=>reject(new Error('PowerPoint library failed to load'));
    document.head.appendChild(script);
  });
  return pptxLibraryPromise;
}
async function exportBoardPack(){
  try{
    await ensurePptxLibrary();
  }catch(e){
    alert('PowerPoint generator did not load. Please check the site files and try again.');
    return;
  }
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Gavin Barry';
  pptx.subject = 'RRG Group Weekly Performance Dashboard';
  pptx.title = 'RRG Weekly Performance Pack';
  pptx.company = 'RRG Group';
  pptx.theme = { headFontFace:'Aptos Display', bodyFontFace:'Aptos', lang:'en-GB' };

  const week = currentWeekLabel();
  const regs = safeRows(DATA.dashboard_regs);
  const used = safeRows(DATA.dashboard_used);
  const nonRows = safeRows(DATA.q3_non).filter(r=>['NORTH CDA','WY CDA','SOUTH CDA'].includes(String(r.centre||'').toUpperCase()));
  const acts = safeRows(DATA.dashboard_activity).filter(r=>r.centre && r.centre !== 'TOTAL');
  const orders = safeRows(DATA.dashboard_orders);

  const newActual = sumPpt(regs,'qtr_total'), newTarget = sumPpt(regs,'qtr_target');
  const usedActual = sumPpt(used,'qtr_counting'), usedTarget = sumPpt(used,'qtr_target');
  const fleetActual = sumPpt(nonRows,'qtr_total'), fleetTarget = sumPpt(nonRows,'qtr_budget');
  const enq = sumPpt(acts,'total_enquiries'), td = sumPpt(acts,'total_test_drives'), os = sumPpt(acts,'total_os'), salesOrders = sumPpt(acts,'total_orders');

  // Cover
  let slide = pptx.addSlide();
  slide.background = { color:'F5F7FB' };
  slide.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.333, h:7.5, fill:{color:'0F172A'}, line:{color:'0F172A'} });
  slide.addText('RRG Group', { x:0.75, y:0.75, w:4.5, h:0.4, fontFace:'Aptos', fontSize:18, bold:true, color:'CBD5E1', margin:0 });
  slide.addText('Weekly Performance\nDashboard', { x:0.75, y:1.6, w:8.5, h:1.6, fontFace:'Aptos Display', fontSize:44, bold:true, color:'FFFFFF', margin:0, breakLine:false });
  slide.addText(`${week}\nPrepared by Gavin Barry`, { x:0.8, y:4.4, w:5, h:0.6, fontFace:'Aptos', fontSize:16, color:'CBD5E1', margin:0 });
  slide.addShape(pptx.ShapeType.roundRect, { x:8.1, y:1.15, w:4.4, h:4.7, rectRadius:0.12, fill:{color:'FFFFFF', transparency:5}, line:{color:'334155'} });
  slide.addText('Board Pack', { x:8.45, y:1.55, w:3.6, h:0.35, fontSize:18, bold:true, color:'FFFFFF', margin:0 });
  slide.addText(`New Regs: ${pctPpt(newTarget?newActual/newTarget:0)}\nUsed Cars: ${pctPpt(usedTarget?usedActual/usedTarget:0)}\nFleet: ${pctPpt(fleetTarget?fleetActual/fleetTarget:0)}\nConversion: ${pctPpt(enq?salesOrders/enq:0)}`, { x:8.45, y:2.15, w:3.8, h:2.0, fontSize:18, color:'E5E7EB', breakLine:false, fit:'shrink' });

  // Executive Dashboard
  slide = pptx.addSlide();
  slide.background = { color:'F5F7FB' };
  addSlideTitle(slide, 'Executive Dashboard', week);
  addMetricCard(slide, 0.35, 0.9, 4.05, 1.35, 'Q3 New Registrations', pctPpt(newTarget?newActual/newTarget:0), `${fmtPpt(newActual)} / ${fmtPpt(newTarget)} target`, '2563EB');
  addMetricCard(slide, 4.65, 0.9, 4.05, 1.35, 'Q3 Used Cars', pctPpt(usedTarget?usedActual/usedTarget:0), `${fmtPpt(usedActual)} / ${fmtPpt(usedTarget)} target`, '15803D');
  addMetricCard(slide, 8.95, 0.9, 4.05, 1.35, 'Non-Counting Fleet', pctPpt(fleetTarget?fleetActual/fleetTarget:0), `${fmtPpt(fleetActual)} / ${fmtPpt(fleetTarget)} budget`, '6D28D9');
  addMetricCard(slide, 0.35, 2.55, 3.0, 1.05, 'Enquiries', fmtPpt(enq), 'Total sales funnel', '2563EB');
  addMetricCard(slide, 3.65, 2.55, 3.0, 1.05, 'Test Drive %', pctPpt(enq?td/enq:0), `${fmtPpt(td)} test drives`, '2563EB');
  addMetricCard(slide, 6.95, 2.55, 3.0, 1.05, 'Offer Sheet %', pctPpt(enq?os/enq:0), `${fmtPpt(os)} offer sheets`, '2563EB');
  addMetricCard(slide, 10.25, 2.55, 2.75, 1.05, 'Conversion %', pctPpt(enq?salesOrders/enq:0), `${fmtPpt(salesOrders)} orders`, '2563EB');
  slide.addShape(pptx.ShapeType.roundRect, { x:0.35, y:4.0, w:6.25, h:2.8, rectRadius:0.08, fill:{color:'FFFFFF'}, line:{color:'D9DEE8'} });
  slide.addText('Highlights', { x:0.6, y:4.2, w:5.75, h:0.3, fontSize:15, bold:true, color:'111827', margin:0 });
  const topReg = regs.filter(r=>!String(r.centre).includes('CDA')).sort((a,b)=>(b.qtr_target?b.qtr_total/b.qtr_target:0)-(a.qtr_target?a.qtr_total/a.qtr_target:0))[0];
  const topUsed = used.filter(r=>!String(r.centre).includes('CDA')).sort((a,b)=>(b.qtr_target?b.qtr_counting/b.qtr_target:0)-(a.qtr_target?a.qtr_counting/a.qtr_target:0))[0];
  const topEff = efficiencyRows()[0];
  const highlights = [
    topReg ? `${siteDisplay(topReg.centre)} leads registrations at ${pctPpt(topReg.qtr_target?topReg.qtr_total/topReg.qtr_target:0)} of target.` : '',
    topUsed ? `${siteDisplay(topUsed.centre)} leads used cars at ${pctPpt(topUsed.qtr_target?topUsed.qtr_counting/topUsed.qtr_target:0)} of target.` : '',
    topEff ? `${siteDisplay(topEff.centre)} leads Sales Funnel Efficiency with score ${topEff.effScore}.` : ''
  ].filter(Boolean).join('\n');
  slide.addText(highlights || 'No highlights available yet.', { x:0.6, y:4.65, w:5.75, h:1.8, fontSize:12, color:'475569', breakLine:false, fit:'shrink' });
  slide.addShape(pptx.ShapeType.roundRect, { x:6.9, y:4.0, w:6.1, h:2.8, rectRadius:0.08, fill:{color:'FFFFFF'}, line:{color:'D9DEE8'} });
  slide.addText('CDA Summary', { x:7.15, y:4.2, w:5.6, h:0.3, fontSize:15, bold:true, color:'111827', margin:0 });
  const cda = safeRows(DATA.q3_regs).filter(r=>String(r.centre||'').includes('CDA')).map(r=>`${r.centre}: ${pctPpt(r.qtr_target?r.qtr_total/r.qtr_target:0)} (${fmtPpt(r.qtr_total)} / ${fmtPpt(r.qtr_target)})`).join('\n');
  slide.addText(cda, { x:7.15, y:4.65, w:5.6, h:1.7, fontSize:12, color:'475569', breakLine:false, fit:'shrink' });
  addFooter(slide);

  // Tables
  addTableSlide(pptx.addSlide(), 'Q3 Registrations', safeRows(DATA.q3_regs), [
    {label:'Centre',key:'centre',w:1.55},{label:'Jul',key:'jul_total',num:true,w:0.65},{label:'Jul Tgt',key:'jul_target',num:true,w:0.7},{label:'Aug',key:'aug_total',num:true,w:0.65},{label:'Aug Tgt',key:'aug_target',num:true,w:0.7},{label:'Sep',key:'sep_total',num:true,w:0.65},{label:'Sep Tgt',key:'sep_target',num:true,w:0.7},{label:'QTR',key:'qtr_total',num:true,w:0.65},{label:'Target',key:'qtr_target',num:true,w:0.75},{label:'%',value:r=>r.qtr_target?r.qtr_total/r.qtr_target:0,format:'pct',num:true,w:0.6},{label:'To Go',key:'to_go',num:true,w:0.65}
  ], week);
  addTableSlide(pptx.addSlide(), 'Used Cars', safeRows(DATA.q3_used), [
    {label:'Centre',key:'centre',w:1.8},{label:'Jul',key:'jul_counting',num:true,w:0.75},{label:'Jul Tgt',key:'jul_target',num:true,w:0.75},{label:'Aug',key:'aug_counting',num:true,w:0.75},{label:'Aug Tgt',key:'aug_target',num:true,w:0.75},{label:'Sep',key:'sep_counting',num:true,w:0.75},{label:'Sep Tgt',key:'sep_target',num:true,w:0.75},{label:'QTR',key:'qtr_counting',num:true,w:0.85},{label:'Target',key:'qtr_target',num:true,w:0.85},{label:'%',value:r=>r.qtr_target?r.qtr_counting/r.qtr_target:0,format:'pct',num:true,w:0.65}
  ], week);
  addTableSlide(pptx.addSlide(), 'Fleet', safeRows(DATA.q3_fleet), [
    {label:'Centre',key:'centre',w:2.0},{label:'BCH Regs',key:'regs',num:true,w:1.0},{label:'Target',key:'target',num:true,w:1.0},{label:'%',value:r=>r.target?r.regs/r.target:0,format:'pct',num:true,w:0.8},{label:'Active Orders',key:'active_orders',num:true,w:1.2}
  ], week);
  addTableSlide(pptx.addSlide(), 'Order Bank', orders.slice().sort((a,b)=>orderDoneFor(b,currentOrderMonth())-orderDoneFor(a,currentOrderMonth())), [
    {label:'Centre',key:'centre',w:1.6},{label:'H1 Tgt',key:'h1_target',num:true,w:0.8},{label:'H1 Orders',key:'h1_orders',num:true,w:0.9},{label:'H1 %',key:'h1_pct',format:'pct',num:true,w:0.7},{label:'H2 Tgt',key:'h2_target',num:true,w:0.85},{label:'Jul Tgt',key:'jul_target',num:true,w:0.8},{label:'Jul Done',value:r=>orderDoneFor(r,'jul'),num:true,w:0.85},{label:'Jul %',value:r=>r.jul_target?orderDoneFor(r,'jul')/r.jul_target:0,format:'pct',num:true,w:0.65},{label:'Q3 Tgt',key:'q3_target',num:true,w:0.8},{label:'Q4 Tgt',key:'q4_target',num:true,w:0.8}
  ], week);
  addTableSlide(pptx.addSlide(), 'Sales Funnel Volume', acts.slice().sort((a,b)=>(b.total_orders||0)-(a.total_orders||0)), [
    {label:'Centre',key:'centre',w:1.5},{label:'Enq',key:'total_enquiries',num:true,w:0.7},{label:'TD',key:'total_test_drives',num:true,w:0.65},{label:'OS',key:'total_os',num:true,w:0.65},{label:'Orders',key:'total_orders',num:true,w:0.75},{label:'TD %',key:'td_ratio',format:'pct',num:true,w:0.65},{label:'OS %',key:'os_ratio',format:'pct',num:true,w:0.65},{label:'Conv %',key:'orders_ratio',format:'pct',num:true,w:0.7},{label:'Delivered',key:'delivered',num:true,w:0.8},{label:'Lost Opp',key:'lost_opportunities',num:true,w:0.8}
  ], week);
  addTableSlide(pptx.addSlide(), 'Sales Funnel Efficiency', efficiencyRows(), [
    {label:'Centre',key:'centre',w:1.9},{label:'Score',key:'effScore',num:true,w:0.75},{label:'Grade',key:'effGrade',w:0.65},{label:'TD %',key:'td_ratio',format:'pct',num:true,w:0.75},{label:'OS %',key:'os_ratio',format:'pct',num:true,w:0.75},{label:'Conv %',key:'orders_ratio',format:'pct',num:true,w:0.75},{label:'Orders',key:'total_orders',num:true,w:0.8},{label:'Enquiries',key:'total_enquiries',num:true,w:0.9}
  ], week);


  await pptx.writeFile({ fileName: `RRG Weekly Performance Pack - ${week}.pptx` });
}

document.getElementById('exportPpt')?.addEventListener('click', exportBoardPack);
document.getElementById('exportPptHeader')?.addEventListener('click', exportBoardPack);
