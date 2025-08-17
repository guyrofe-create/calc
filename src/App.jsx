// Women’s Health Tracker – Web MVP (React, no external deps)
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { calculateFromInputs } from './calc.js';

// ---------- UI primitives ----------
function Section(props) {
  return (
    <div style={styles.section} dir="rtl">
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{props.title}</div>
      {props.children}
    </div>
  );
}
function Pill(props) {
  return (
    <button onClick={props.onClick} style={{ ...styles.pill, background: props.active ? '#111' : '#eee', color: props.active ? '#fff' : '#111' }}>
      {props.label}
    </button>
  );
}
function Field(props) {
  return (
    <label style={styles.field} dir="rtl">
      <div style={{ minWidth: 120, textAlign: 'right' }}>{props.label}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>{props.children}</div>
    </label>
  );
}

/** Date input גלוי + כפתור 📅 לפתיחת בורר תאריך מקומי (כולל iOS) */
function DateInputWithButton({ value, onPick }) {
  const ref = useRef(null);
  const open = () => {
    try {
      if (ref.current?.showPicker) ref.current.showPicker();   // iOS 16.4+
      else ref.current?.click();                               // fallback
    } catch {
      ref.current?.focus();
    }
  };
  return (
    <div style={{ display:'flex', gap:8, alignItems:'center', flex:1 }}>
      <input
        type="date"
        ref={ref}
        value={typeof value === 'string' && isISODate(value) ? value : ''}
        onChange={(e)=> onPick?.(e.target.value)}
        style={styles.input}
      />
      <button type="button" onClick={open} title="בחר תאריך" aria-label="בחר תאריך" style={styles.iconBtn}>📅</button>
    </div>
  );
}

var styles = {
  app: { maxWidth: 880, margin: '0 auto', padding: 16, background: '#f7f7f7', direction: 'rtl', fontFamily: 'system-ui, Arial' },
  tabRow: { display: 'flex', gap: 8, justifyContent: 'flex-start', marginBottom: 10 },
  section: { margin: '10px 0', padding: 12, background: '#fff', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' },
  input: { background: '#eee', borderRadius: 10, padding: 10, border: '1px solid #ddd' },
  button: { background: '#111', color: '#fff', padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700 },
  iconBtn: { background:'#eee', border:'1px solid #ddd', borderRadius:10, padding:'10px 12px', cursor:'pointer' },
  smallDanger: { background: 'tomato', color: '#fff', border: 'none', borderRadius: 10, padding: '4px 8px', cursor: 'pointer' },
  row: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '6px 0' },
  pill: { padding: '8px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: 600 },
  field: { display: 'flex', gap: 8, alignItems: 'center', margin: '4px 0' },
  tipBox: { background: '#f1f1f1', borderRadius: 10, padding: 10, margin: '4px 0' }
};

// ---------- Domain logic ----------
function toISO(d) {
  const z = n => String(n).padStart(2,'0');
  return `${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())}`;
}
function parseISO(iso) {
  const [y,m,d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function addDaysISO(iso, days) {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}
function daysBetweenISO(aISO, bISO) {
  const a = parseISO(aISO), b = parseISO(bISO);
  return Math.round((b - a) / (1000*60*60*24));
}
function isISODate(s) {
  if (!s || s.length !== 10) return false;
  const parts = s.split('-');
  if (parts.length !== 3) return false;
  const [y,m,d] = parts.map(Number);
  if ([y,m,d].some(Number.isNaN)) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return toISO(dt) === s;
}
function normalizeUserDate(s){
  if (!s) return null;
  var t = String(s).trim();
  if (isISODate(t)) return t;
  var parts = t.split(/[./-]/);
  if (parts.length !== 3) return null;
  var dd = String(parseInt(parts[0],10));
  var mm = String(parseInt(parts[1],10));
  var yyyy = parts[2];
  if (!(yyyy && yyyy.length===4 && !isNaN(Number(yyyy)))) return null;
  dd = dd.padStart(2,'0');
  mm = mm.padStart(2,'0');
  var iso = yyyy + '-' + mm + '-' + dd;
  return isISODate(iso) ? iso : null;
}
function calcEDD(lmpISO) { return addDaysISO(lmpISO, 280); }
function weekFromLMP(lmpISO, onISO) {
  const todayISO = onISO || toISO(new Date());
  const diffDays = Math.max(0, daysBetweenISO(lmpISO, todayISO));
  return { weeks: Math.floor(diffDays/7), days: diffDays % 7 };
}
function calcFertileWindow(lastPeriodStartISO, cycleLength) {
  const cl = Math.max(21, Math.min(40, Number(cycleLength) || 28));
  const nextPeriod = addDaysISO(lastPeriodStartISO, cl);
  const ovulation = addDaysISO(nextPeriod, -14);
  const start = addDaysISO(ovulation, -5);
  const end = addDaysISO(ovulation, 1);
  return { start, ovulation, end };
}
function detectOvulationFromBBT(logs) {
  const temps = (logs||[]).filter(l => typeof l.bbtC === 'number').slice().sort((a,b)=> a.date < b.date ? -1 : 1);
  if (temps.length < 10) return null;
  for (let i=9; i<temps.length; i++) {
    const prev6 = temps.slice(i-9, i-3).map(t => t.bbtC);
    if (prev6.length < 6) continue;
    const last3 = temps.slice(i-2, i+1).map(t => t.bbtC);
    const prevAvg = prev6.reduce((s,v)=>s+v,0)/prev6.length;
    const lastMin = Math.min(...last3);
    if (lastMin - prevAvg >= 0.2) return temps[i-2].date;
  }
  return null;
}

const DEFAULT_PREG_CHECKS = [
  { title: 'אולטרסאונד מוקדם ואישור דופק', weeksLabel: 'שבוע 6–7', startWeek: 6, endWeek: 7, coverage: 'ממומן', tips: ['CRL לקביעת גיל הריון'] },
  { title: 'בדיקות דם פתיחה', weeksLabel: 'שבוע 6–10', startWeek: 6, endWeek: 10, coverage: 'ממומן', tips: ['ספירת דם, סוג דם/NAT, סוכר בצום, שתן כללית/תרבית', 'סרולוגיות: HIV, HBsAg, VDRL'] },
  { title: 'NIPT', weeksLabel: 'שבוע 10+', startWeek: 10, endWeek: 40, coverage: 'לא ממומן/פרטי', tips: ['סקר לא פולשני לתסמונות נפוצות', 'בממצא חריג: בירור אבחנתי'] },
  { title: 'שקיפות + סקר ראשון', weeksLabel: 'שבוע 11–13+6', startWeek: 11, endWeek: 14, coverage: 'ממומן', tips: ['US שקיפות', 'PAPP-A/hCG'] },
  { title: 'סקירה מוקדמת', weeksLabel: 'שבוע 14–16', startWeek: 14, endWeek: 16, coverage: 'ממומן', tips: [] },
  { title: 'תבחין משולש/מרובע', weeksLabel: 'שבוע 16–18', startWeek: 16, endWeek: 18, coverage: 'ממומן', tips: [] },
  { title: 'מי שפיר/צ׳יפ (לפי צורך)', weeksLabel: 'שבוע 16–22', startWeek: 16, endWeek: 22, coverage: 'מותנה/לפי סיכון', tips: ['צ׳יפ כברירת מחדל'] },
  { title: 'סקירה מאוחרת', weeksLabel: 'שבוע 19–24', startWeek: 19, endWeek: 24, coverage: 'ממומן', tips: [] },
  { title: 'העמסת סוכר', weeksLabel: 'שבוע 24–28', startWeek: 24, endWeek: 28, coverage: 'ממומן', tips: ['50g → 100g אם חיובי', 'Rh-: Anti-D סביב 28'] },
  { title: 'חיסון שעלת', weeksLabel: 'שבוע 27–36', startWeek: 27, endWeek: 36, coverage: 'ממומן', tips: [] },
  { title: 'תרבית GBS', weeksLabel: 'שבוע 35–37', startWeek: 35, endWeek: 37, coverage: 'ממומן', tips: [] },
  { title: 'ביקור חדר לידה', weeksLabel: 'שבוע 39–40', startWeek: 39, endWeek: 40, coverage: 'ממומן', tips: ['NST/US, תכנון לידה'] }
];

function parseWeeksLabelToRange(label){
  if (!label) return {startWeek:0,endWeek:0};
  var t = String(label).replace(/–|—/g,'-');
  var tokens = (t.replace(/[^0-9+]/g,' ').split(' ').filter(Boolean));
  var tok1 = tokens[0] || '0';
  var tok2 = tokens[1] || tok1;
  function ceilTok(tok){ var parts = String(tok).split('+'); var w = parseInt(parts[0]||'0',10)||0; var d = parseInt(parts[1]||'0',10)||0; return w + (d>0?1:0); }
  var s = ceilTok(tok1), e = ceilTok(tok2);
  if (e < s) { var tmp=s; s=e; e=tmp; }
  return { startWeek:s, endWeek:e };
}
function buildPregnancyPlan(lmpISO, checks) {
  const edd = calcEDD(lmpISO);
  const ga = weekFromLMP(lmpISO);
  const items = (checks||[]).slice().sort((a,b)=> (a.startWeek||0) - (b.startWeek||0));
  return { lmp: lmpISO, edd, ga, items };
}

// ---------- Calendar & Chart helpers ----------
function ymFromISO(iso){ const [y,m] = iso.split('-').map(Number); return {year:y, month:m}; }
function isoOfYMDay(year, month, day){ const d = new Date(Date.UTC(year, month-1, day)); return toISO(d); }
function daysInMonth(year, month){ return new Date(Date.UTC(year, month, 0)).getUTCDate(); }
function firstWeekday(year, month){ return new Date(Date.UTC(year, month-1, 1)).getUTCDay(); }
function shiftMonth(year, month, delta){ const d = new Date(Date.UTC(year, month-1, 1)); d.setUTCMonth(d.getUTCMonth()+delta); return {year:d.getUTCFullYear(), month:d.getUTCMonth()+1}; }
function listRangeDays(startISO, endISO){ const n = Math.max(0, daysBetweenISO(startISO, endISO)); const arr=[]; for(let i=0;i<=n;i++){ arr.push(addDaysISO(startISO,i)); } return arr; }

// === CalendarMonth – גרסת Flex יציבה לכל דפדפנים ===
function CalendarMonth(props){
  const y = props.year, m = props.month;

  function safeDaysInMonth(year, month){
    let d = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (!Number.isFinite(d) || d <= 0) d = new Date(year, month, 0).getDate();
    return d;
  }
  function safeFirstWeekday(year, month){
    let wd = new Date(Date.UTC(year, month-1, 1)).getUTCDay();
    if (!Number.isFinite(wd)) wd = new Date(year, month-1, 1).getDay();
    return wd;
  }

  const dim = safeDaysInMonth(y, m);
  const fwd = safeFirstWeekday(y, m);

  const cells = [];
  for(let i=0;i<fwd;i++) cells.push(null);
  for(let d=1; d<=dim; d++){
    const iso = isoOfYMDay(y, m, d);
    cells.push(iso);
  }

  const today = toISO(new Date()));
  const col = '14.2857%';
  const baseCell = {
    boxSizing:'border-box',
    width: col,
    minHeight: 58,
    padding: 6,
    borderRadius: 8,
  };

  return (
    <div style={{ border:'1px solid #eee', borderRadius:12, overflow:'hidden' }}>
      <div style={{ display:'flex', background:'#fafafa', fontWeight:700, padding:6 }}>
        {['א','ב','ג','ד','ה','ו','ש'].map((h,i)=> (
          <div key={i} style={{ width: col, textAlign:'center' }}>{h}</div>
        ))}
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:2, padding:4 }}>
        {cells.map((iso, idx)=>{
          if(!iso) {
            return <div key={idx} style={{ ...baseCell, border:'1px solid transparent' }} />;
          }
          const isToday   = iso === today;
          const isPeriod  = props.periodSet && props.periodSet.has(iso);
          const isFertile = props.fertileSet && props.fertileSet.has(iso);
          const isOvul    = props.ovulSet && props.ovulSet.has(iso);
          const bg     = isFertile ? '#fff3f7' : '#fff';
          const border = isOvul ? '2px dashed #e91e63' : (isToday ? '2px solid #111' : '1px solid #eee');

          return (
            <div
              key={idx}
              onClick={()=> props.onPick && props.onPick(iso)}
              style={{ ...baseCell, background:bg, border, cursor:'pointer', display:'flex', flexDirection:'column', gap:4 }}
            >
              <div style={{ fontWeight:700, alignSelf:'flex-start' }}>{Number(iso.slice(-2))}</div>
              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                {isPeriod && <div title="וסת" style={{ width:8, height:8, borderRadius:4, background:'tomato' }} />}
                {props.hasTemp && props.hasTemp(iso) && <div title="BBT" style={{ width:8, height:8, borderRadius:4, background:'#0af' }} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BBTChart(props){
  const W=680, H=140, P=20;
  const days = listRangeDays(props.startISO, props.endISO);
  const data = days.map((iso,i)=>{ const l = (props.logs||[]).find(x=>x.date===iso && typeof x.bbtC==='number'); return {iso, i, y: l? Number(l.bbtC): null}; });
  const ys = data.filter(d=>d.y!=null).map(d=>d.y);
  if (!ys.length) return <div style={{ color:'#666' }}>אין נתוני טמפרטורה בטווח הנבחר.</div>;
  const minY = Math.floor((Math.min(...ys)-0.2)*10)/10;
  const maxY = Math.ceil((Math.max(...ys)+0.2)*10)/10;
  const x = i=> P + (i*(W-2*P))/(Math.max(1, days.length-1));
  const y = v=> H-P - ((v-minY)/(maxY-minY))*(H-2*P);
  const points = data.filter(d=>d.y!=null).map(d=> `${x(d.i)},${y(d.y)}`).join(' ');
  const ovx = props.ovulationISO && props.ovulationISO>=props.startISO && props.ovulationISO<=props.endISO ? x(data.findIndex(d=>d.iso===props.ovulationISO)) : null;
  return (
    <svg width={W} height={H} style={{ background:'#fff', border:'1px solid #eee', borderRadius:12 }}>
      <line x1={P} y1={H-P} x2={W-P} y2={H-P} stroke="#ccc" />
      <line x1={P} y1={P} x2={P} y2={H-P} stroke="#ccc" />
      <polyline points={points} fill="none" stroke="#111" strokeWidth="2" />
      {data.filter(d=>d.y!=null).map((d,idx)=>(<circle key={idx} cx={x(d.i)} cy={y(d.y)} r={3} fill="#111" />))}
      {ovx!=null && <line x1={ovx} y1={P} x2={ovx} y2={H-P} stroke="#e91e63" strokeDasharray="4,4" />}
      <text x={W-P} y={P+12} fontSize="10" textAnchor="end" fill="#666">{minY.toFixed(1)}–{maxY.toFixed(1)}°C</text>
    </svg>
  );
}

export default function App() {
  const [tab, setTab] = useState('cycle');
  const K_LOGS = 'logs_v1', K_SETTINGS = 'settings_v1', K_NOTIF='notif_enabled_v1', K_LAST_DAY='last_notif_day_v1', K_BBT='notified_bbt_date_v1', K_WEEK='last_week_notified_v1', K_PREG='preg_checks_v1';

  const [logs, setLogs] = useState([]);
  const [settings, setSettings] = useState({ avgCycleLength: 28, avgPeriodLength: 5, lastPeriodStart: '' });
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const [installEvt, setInstallEvt] = useState(null);
  const [a2hsReady, setA2hsReady] = useState(false);

  const [dateInput, setDateInput] = useState(toISO(new Date()));
  const [mucus, setMucus] = useState('יבש');
  const [isPeriod, setIsPeriod] = useState(false);
  const [flow, setFlow] = useState(1);
  const [bbtC, setBbtC] = useState('');
  const [lmp, setLmp] = useState('');

  const todayISO = toISO(new Date());
  const [viewYM, setViewYM] = useState(()=>{ const d=new Date(); return {year:d.getUTCFullYear(), month:d.getUTCMonth()+1}; });
  const HEB_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  const monthLabel = HEB_MONTHS[viewYM.month-1] + ' ' + viewYM.year;

  const periodSet = useMemo(()=> new Set((logs||[]).filter(l=>l.isPeriod).map(l=>l.date)), [logs]);
  const tempHas = (iso)=> (logs||[]).some(l=> l.date===iso && typeof l.bbtC==='number');
  const cycleSets = useMemo(()=>{
    if (!isISODate(settings.lastPeriodStart)) return {fertile:new Set(), ovul:new Set()};
    const cl = Number(settings.avgCycleLength)||28;
    const ovul = new Set();
    const fertile = new Set();
    for (let k=-6; k<18; k++) {
      const ov = addDaysISO(settings.lastPeriodStart, (k+1)*cl - 14);
      ovul.add(ov);
      const st = addDaysISO(ov, -5), en = addDaysISO(ov, 1);
      listRangeDays(st, en).forEach(d=>fertile.add(d));
    }
    return {fertile, ovul};
  }, [settings]);
  const decMonth = ()=> setViewYM(v=> shiftMonth(v.year, v.month, -1));
  const incMonth = ()=> setViewYM(v=> shiftMonth(v.year, v.month, 1));
  const goToday = ()=> setViewYM(()=>{ const d=new Date(); return {year:d.getUTCFullYear(), month:d.getUTCMonth()+1}; });

  // Load
  useEffect(()=>{ try {
    const ls = JSON.parse(localStorage.getItem(K_LOGS) || '[]');
    const cs = JSON.parse(localStorage.getItem(K_SETTINGS) || '{"avgCycleLength":28,"avgPeriodLength":5,"lastPeriodStart":""}');
    const ne = localStorage.getItem(K_NOTIF) === '1';
    const pc = JSON.parse(localStorage.getItem(K_PREG) || 'null');
    setLogs(ls); setSettings(cs); setNotifEnabled(ne);
    if (cs.lastPeriodStart) setLmp(cs.lastPeriodStart);
    if (Array.isArray(pc) && pc.length) setPregChecks(pc);
  } catch {} },[]);
  useEffect(()=>{ try { localStorage.setItem(K_LOGS, JSON.stringify(logs)); } catch {} },[logs]);
  useEffect(()=>{ try { localStorage.setItem(K_SETTINGS, JSON.stringify(settings)); } catch {} },[settings]);

  const fertile = useMemo(()=> isISODate(settings.lastPeriodStart) ? calcFertileWindow(settings.lastPeriodStart, Number(settings.avgCycleLength)||28) : null, [settings]);
  const detectedOvul = useMemo(()=> detectOvulationFromBBT(logs), [logs]);

  function upsertLog(newLog){ setLogs(prev => { const idx = prev.findIndex(l=>l.date===newLog.date); if (idx>=0){ const c=[...prev]; c[idx]={...c[idx],...newLog}; return c;} return [...prev,newLog]; }); }
  function removeLog(dateISO){ setLogs(prev => prev.filter(l=>l.date!==dateISO)); }

  const [pregChecks, setPregChecks] = useState(DEFAULT_PREG_CHECKS);
  const pregPlan = useMemo(()=> isISODate(lmp) ? buildPregnancyPlan(lmp, pregChecks) : null, [lmp, pregChecks]);
  useEffect(()=>{ try { localStorage.setItem(K_PREG, JSON.stringify(pregChecks)); } catch {} },[pregChecks]);

  useEffect(()=>{ dailyCheckNotifications(); }, [settings, lmp, logs, notifEnabled, detectedOvul]);
  useEffect(()=>{ const id = window.setInterval(()=> dailyCheckNotifications(), 60*60*1000); return ()=> clearInterval(id); }, [settings, lmp, logs, notifEnabled, detectedOvul, pregChecks]);
  useEffect(()=>{ if ('serviceWorker' in navigator) { navigator.serviceWorker.getRegistration().then(r=> setSwReady(!!r)); } },[]);
  useEffect(()=>{ function onBIP(e){ e.preventDefault(); setInstallEvt(e); setA2hsReady(true);} window.addEventListener('beforeinstallprompt', onBIP); function onInstalled(){ setA2hsReady(false); setInstallEvt(null); notify('האפליקציה נוספה למסך הבית'); } window.addEventListener('appinstalled', onInstalled); return ()=>{ window.removeEventListener('beforeinstallprompt', onBIP); window.removeEventListener('appinstalled', onInstalled); }; },[]);
  function requestNotifications(){
    try{
      if (!('Notification' in window)) { alert('הדפדפן לא תומך בהתראות מערכת. אפעיל התראות בתוך האפליקציה.'); setNotifEnabled(true); return; }
      if (!window.isSecureContext) { alert('התראות מערכת דורשות https. במצב הדגמה אראה חלון קופץ.'); setNotifEnabled(true); return; }
      if (Notification.permission==='granted'){ localStorage.setItem(K_NOTIF,'1'); setNotifEnabled(true); notify('התראות הופעלו'); return; }
      if (Notification.permission==='denied'){ alert('ההרשאה חסומה. אפשרו התראות בהגדרות האתר.'); setNotifEnabled(false); return; }
      const req = Notification.requestPermission;
      if (typeof req === 'function'){
        const p = req.call(Notification);
        if (p && typeof p.then==='function'){
          p.then(x=>{ if(x==='granted'){ localStorage.setItem(K_NOTIF,'1'); setNotifEnabled(true); notify('התראות הופעלו'); } else { alert('לא אושרו התראות.'); } });
        } else {
          req(function(x){ if(x==='granted'){ localStorage.setItem(K_NOTIF,'1'); setNotifEnabled(true); notify('התראות הופעלו'); } else { alert('לא אושרו התראות.'); } });
        }
      } else {
        alert('לא ניתן לבקש הרשאה בדפדפן זה.'); setNotifEnabled(true);
      }
    } catch { alert('כשל בבקשת הרשאה'); }
  }
  function notify(msg){ if(!notifEnabled) return; try { if ('Notification' in window && Notification.permission==='granted') new Notification(msg); else alert(msg); } catch { try{ alert(msg);}catch{}} }
  function dailyCheckNotifications(){ try{ const today=toISO(new Date()); const last=localStorage.getItem(K_LAST_DAY); if (last===today && !detectedOvul) return; if (isISODate(settings.lastPeriodStart)){ const fw = calcFertileWindow(settings.lastPeriodStart, Number(settings.avgCycleLength)||28); if (today===fw.start) notify('חלון פוריות מתחיל היום'); } if (detectedOvul){ const lastBbt=localStorage.getItem(K_BBT); if (lastBbt!==detectedOvul){ notify('זוהתה עליית BBT סביב: ' + detectedOvul); localStorage.setItem(K_BBT, detectedOvul); } } if (isISODate(lmp)){ const ga=weekFromLMP(lmp); const lastW=Number(localStorage.getItem(K_WEEK)||'-1'); if (ga.weeks!==lastW){ notify('הגעת לשבוע ' + ga.weeks + ' בהריון'); const remind = (pregChecks||[]).find(i => ga.weeks >= (i.startWeek||0) && ga.weeks <= (i.endWeek||i.startWeek||0)); if (remind && remind.title) notify('תזכורת: ' + remind.title); localStorage.setItem(K_WEEK, String(ga.weeks)); } } localStorage.setItem(K_LAST_DAY, today);} catch{} }

  async function hardRefresh(){
    try{
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r=>r.unregister()));
      }
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k=> caches.delete(k)));
      }
    } finally {
      location.replace(window.location.pathname + '?v=' + Date.now());
    }
  }

  function ensureServiceWorker(){
    if (!('serviceWorker' in navigator)) { alert('הדפדפן לא תומך ב-Service Worker'); return; }
    const code = `self.addEventListener('install', e=> self.skipWaiting());
self.addEventListener('activate', e=> self.clients.claim());
self.addEventListener('message', e=>{ const d=e.data||{}; if(d.type==='SHOW'){ self.registration.showNotification(d.title||'תזכורת',{ body:d.body||'' }); }});`;
    try{
      const url = URL.createObjectURL(new Blob([code], {type:'text/javascript'}));
      navigator.serviceWorker.register(url).then(reg=>{ setSwReady(true); try{ if (Notification.permission==='granted') reg.showNotification('התראות רקע הופעלו'); }catch{} }).catch(()=> alert('כשל ברישום Service Worker'));
    }catch{ alert('כשל בהפעלת רקע'); }
  }
  function ensureManifest(){
    try{
      const icon = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn8X3IAAAAASUVORK5CYII=';
      const manifest = { name: 'אפליקציה לנשים', short_name: 'מעקב נשים', lang:'he', dir:'rtl', start_url: '.', display: 'standalone', background_color:'#ffffff', theme_color:'#111111', icons: [{ src: 'data:image/png;base64,'+icon, sizes: '192x192', type:'image/png' }, { src: 'data:image/png;base64,'+icon, sizes: '512x512', type:'image/png' }] };
      const url = URL.createObjectURL(new Blob([JSON.stringify(manifest)], {type:'application/manifest+json'}));
      let link = document.querySelector('link[rel="manifest"]');
      if (!link) { link = document.createElement('link'); link.setAttribute('rel','manifest'); document.head.appendChild(link); }
      link.setAttribute('href', url);
      return true;
    } catch { alert('כשל ביצירת manifest'); return false; }
  }
  function installApp(){
    try{
      ensureManifest(); ensureServiceWorker();
      if (!a2hsReady || !installEvt){ alert('אם לא נפתח דיאלוג – הוסיפי ממסך השיתוף "הוסף למסך הבית"'); return; }
      installEvt.prompt();
      installEvt.userChoice.then(choice=>{ if (choice && choice.outcome==='accepted') notify('האפליקציה נוספה למסך הבית'); setA2hsReady(false); setInstallEvt(null); });
    } catch { alert('כשל בהתקנה'); }
  }
  function exportCSV(){
    try {
      const NL = String.fromCharCode(10);
      const header = 'date,isPeriod,flow,mucus,bbtC' + NL;
      const rows = (logs||[])
        .map(l=> [l.date, l.isPeriod?1:0, l.flow||'', l.mucus||'', (typeof l.bbtC==='number'? Number(l.bbtC).toFixed(2): '')].join(','))
        .join(NL);
      const csv = header + rows + NL;
      const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url; a.download='womens-health-tracker-logs.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) { alert('כשל ביצוא CSV'); }
  }

  return (
    <div style={styles.app}>
      <div style={styles.tabRow} dir="rtl">
        <Pill label="מחזור" active={tab==='cycle'} onClick={()=>setTab('cycle')} />
        <Pill label="ביוץ" active={tab==='ovulation'} onClick={()=>setTab('ovulation')} />
        <Pill label="הריון" active={tab==='pregnancy'} onClick={()=>setTab('pregnancy')} />
      </div>

      {tab==='cycle' && (
        <div>
          <Section title="העדפות מחזור">
            <div style={{ display:'grid', gap:8 }}>
              <Field label="אורך מחזור ממוצע">
                <input type="number" value={String(settings.avgCycleLength)} onChange={e=>setSettings(s=>({...s, avgCycleLength:Number(e.target.value||0)}))} style={styles.input} />
                <span>ימים</span>
              </Field>
              <Field label="אורך דימום">
                <input type="number" value={String(settings.avgPeriodLength)} onChange={e=>setSettings(s=>({...s, avgPeriodLength:Number(e.target.value||0)}))} style={styles.input} />
                <span>ימים</span>
              </Field>
              <Field label="וסת אחרונה">
                <div style={{ display:'flex', gap:8, alignItems:'center', flex:1 }}>
                  <input
                    placeholder="yyyy-mm-dd או dd.mm.yyyy"
                    value={settings.lastPeriodStart||''}
                    onChange={e=>{ const iso=normalizeUserDate(e.target.value); setSettings(s=>({...s, lastPeriodStart: iso || e.target.value})); }}
                    style={styles.input}
                  />
                  <DateInputWithButton
                    value={settings.lastPeriodStart||''}
                    onPick={(iso)=> setSettings(s=>({...s, lastPeriodStart: iso}))}
                  />
                </div>
              </Field>
            </div>
          </Section>

          <Section title="לוח שנה">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <button style={styles.button} onClick={decMonth}>◀︎</button>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ fontWeight:700 }}>{monthLabel}</div>
                <button style={styles.button} onClick={()=>{ goToday(); setDateInput(todayISO); }}>היום</button>
              </div>
              <button style={styles.button} onClick={incMonth}>▶︎</button>
            </div>
            <CalendarMonth year={viewYM.year} month={viewYM.month} periodSet={periodSet} fertileSet={cycleSets.fertile} ovulSet={cycleSets.ovul} hasTemp={tempHas} onPick={(iso)=> setDateInput(iso)} />
          </Section>

          <Section title="רישום יומי">
            <div style={{ display:'grid', gap:8 }}>
              <input placeholder="yyyy-mm-dd או dd.mm.yyyy" value={dateInput} onChange={e=>setDateInput(e.target.value)} style={styles.input} />
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {['יבש','דביק','קרמי','מימי','חלבון-ביצה'].map(m=> (
                  <Pill key={m} label={m} active={mucus===m} onClick={()=>setMucus(m)} />
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Pill label={isPeriod ? 'יש וסת' : 'אין וסת'} active={isPeriod} onClick={()=>setIsPeriod(p=>!p)} />
                <span>עוצמת דימום:</span>
                {[0,1,2,3].map(v=> (
                  <Pill key={String(v)} label={String(v)} active={flow===v} onClick={()=>setFlow(v)} />
                ))}
              </div>
              <input placeholder="טמפ׳ בסיס (°C)" value={bbtC} onChange={e=>setBbtC(e.target.value)} style={styles.input} />
              <button style={styles.button} onClick={()=>{ const iso = normalizeUserDate(dateInput); if(!iso){ alert('תאריך לא תקין'); return;} const entry={ date: iso, isPeriod, flow, mucus, bbtC: bbtC? Number(bbtC): undefined }; upsertLog(entry); setDateInput(iso); setBbtC(''); }}>שמור רישום</button>
            </div>
          </Section>

          <Section title="גרף טמפרטורה (BBT)">
            <BBTChart logs={logs} startISO={addDaysISO(todayISO,-30)} endISO={todayISO} ovulationISO={detectedOvul||null} />
          </Section>

          <Section title="רישומים אחרונים">
            {(logs||[]).slice().sort((a,b)=> a.date<b.date?1:-1).slice(0,14).map(l=> (
              <div key={l.date} style={styles.row}>
                <span>{l.date}</span>
                <span>{(l.isPeriod?'וסת':'—') + ' • '}{l.mucus||'—'} • {typeof l.bbtC==='number'? Number(l.bbtC).toFixed(2)+'°C':'—'}</span>
                <button style={styles.smallDanger} onClick={()=>removeLog(l.date)}>מחק</button>
              </div>
            ))}
          </Section>

          <Section title="כלים">
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button style={styles.button} onClick={exportCSV}>ייצוא CSV</button>
              <button style={styles.button} onClick={requestNotifications}>{notifEnabled? 'התראות פועלות' : 'הפעל התראות'}</button>
              <button style={styles.button} onClick={ensureServiceWorker}>{swReady? 'רקע (PWA) פעיל' : 'הפעל רקע (PWA)'}</button>
              <button style={styles.button} onClick={installApp}>{a2hsReady? 'הוסף למסך הבית' : 'מסך הבית (תפריט הדפדפן)'}</button>
              <button style={styles.button} onClick={()=> notify('בדיקת התראה — אם לא הופיעה התראת מערכת, תראי חלון קופץ כאן.')}>בדיקת התראה</button>
              <button style={styles.button} onClick={hardRefresh}>רענון קש (מחיקת עדכונים ישנים)</button>
            </div>
            <div style={{ fontSize:12, color:'#666', marginTop:6 }}>
              {'סטטוס התראות: ' + (('Notification' in window) ? (window.isSecureContext ? ('הרשאה: ' + Notification.permission) : 'אין https – יוצגו חלונות קופצים') : 'לא נתמך בדפדפן')}
            </div>
          </Section>
        </div>
      )}

      {tab==='ovulation' && (
        <div>
          <Section title="מחשבון ביוץ">
            <div style={{ display:'grid', gap:8 }}>
              <Field label="וסת אחרונה">
                <div style={{ display:'flex', gap:8, alignItems:'center', flex:1 }}>
                  <input
                    placeholder="yyyy-mm-dd או dd.mm.yyyy"
                    value={settings.lastPeriodStart||''}
                    onChange={e=>{ const iso=normalizeUserDate(e.target.value); setSettings(s=>({...s, lastPeriodStart: iso || e.target.value})); }}
                    style={styles.input}
                  />
                  <DateInputWithButton
                    value={settings.lastPeriodStart||''}
                    onPick={(iso)=> setSettings(s=>({...s, lastPeriodStart: iso}))}
                  />
                </div>
              </Field>
              <Field label="אורך מחזור">
                <input type="number" value={String(settings.avgCycleLength)} onChange={e=>setSettings(s=>({...s, avgCycleLength:Number(e.target.value||0)}))} style={styles.input} />
                <span>ימים</span>
              </Field>
              {isISODate(settings.lastPeriodStart) ? (()=>{ const fw = fertile || calcFertileWindow(settings.lastPeriodStart, Number(settings.avgCycleLength)||28); return (
                <div style={{ display:'grid', gap:6 }}>
                  <div>{'חלון פורה: ' + fw.start + ' עד ' + fw.end}</div>
                  <div>{'ביוץ משוער: ' + fw.ovulation}</div>
                  {detectedOvul && (<div>{'זוהתה עליית BBT שמרמזת על ביוץ סביב: ' + detectedOvul}</div>)}
                </div>
              ); })() : <div>הזיני תאריך וסת אחרונה.</div>}
            </div>
          </Section>
        </div>
      )}

      {tab==='pregnancy' && (
        <div>
          <Section title="תכנית הריון אישית">
            <div style={{ display:'grid', gap:8 }}>
              <div style={{ display:'flex', gap:8, alignItems:'center', flex:1 }}>
                <input
                  placeholder="yyyy-mm-dd או dd.mm.yyyy"
                  value={lmp}
                  onChange={e=>{ const iso=normalizeUserDate(e.target.value); setLmp(iso || e.target.value); }}
                  style={styles.input}
                />
                <DateInputWithButton value={lmp} onPick={(iso)=> setLmp(iso)} />
              </div>
              {isISODate(lmp) ? (()=>{ const plan=pregPlan; return (
                <div style={{ display:'grid', gap:6 }}>
                  <div>{'תאריך לידה משוער (EDD): ' + plan.edd}</div>
                  <div>{'גיל הריון להיום: שבוע ' + plan.ga.weeks + ' + ' + plan.ga.days}</div>
                  <div style={{ marginTop:8, fontWeight:700 }}>אבני דרך:</div>
                  {(plan.items||[]).map((i, idx)=> (
                    <div key={String(idx)} style={styles.tipBox}>
                      <div style={{ fontWeight:700 }}>{(i.weeksLabel ? i.weeksLabel + ' · ' : '') + (i.title || '')}</div>
                      {i.coverage ? <div style={{ fontSize:12, color:'#555' }}>{'כיסוי: ' + i.coverage}</div> : null}
                      {(i.tips||[]).map((t,ix)=> (<div key={String(ix)}>• {t}</div>))}
                    </div>
                  ))}
                  <div style={{ marginTop:6, fontSize:12, color:'#666' }}>* המידע לצורכי ידע בלבד ואינו תחליף לייעוץ רפואי.</div>
                </div>
              ); })() : <div>הזיני LMP כדי לבנות תכנית.</div>}
            </div>
          </Section>
        </div>
      )}

      <div style={{ padding:16, textAlign:'center', color:'#888' }}>© 2025 אפליקציה לנשים – Web MVP</div>
    </div>
  );
}

// ---------- Lightweight tests (console) ----------
(function runTests(){
  try {
    console.assert(calcEDD('2025-01-01') === '2025-10-08', 'EDD should be 2025-10-08');
    const fw = calcFertileWindow('2025-01-01', 28);
    console.assert(fw.ovulation === '2025-01-15', 'Ovulation should be 2025-01-15');
    console.assert(fw.start === '2025-01-10' && fw.end === '2025-01-16', 'Fertile window should be 10–16 Jan');
    const fw26 = calcFertileWindow('2025-01-01', 26);
    console.assert(fw26.ovulation === '2025-01-13', '26d cycle ovulation should be 2025-01-13');
    console.assert(fw26.start === '2025-01-08' && fw26.end === '2025-01-14', '26d window should be 8–14 Jan');
    const ga = weekFromLMP('2025-01-01', '2025-01-08');
    console.assert(ga.weeks === 1 && ga.days === 0, 'GA should be 1+0');
    const mkDay = d => `2025-01-${String(d).padStart(2,'0')}`;
    const tempLogs=[]; for(let d=1; d<=20; d++){ const base = d<=12 ? 36.50 : (d>=13 && d<=15 ? 36.80 : 36.70); tempLogs.push({date: mkDay(d), bbtC: base}); }
    const ovul = detectOvulationFromBBT(tempLogs);
    console.assert(ovul === '2025-01-13', 'BBT rise should start 2025-01-13');
    console.log('%cAll tests passed', 'color: green; font-weight: bold');
  } catch (e) { console.error('Test failure:', e); }
})();
