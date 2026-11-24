import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Save, Sprout, BellRing, Users, FileText, Printer, Download, X, Check } from 'lucide-react';

const api = async (url, opts) => {
  const r = await fetch(url, opts && { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
};
const arr = x => (Array.isArray(x) ? x : []);
const normReport = d => ({ month: d?.month, year: d?.year,
  summary: { totalVisits: 0, uniqueFarms: 0, issuesFound: 0, healthyVisits: 0, followUps: 0, pending: 0, completed: 0, ...(d?.summary || {}) },
  visits: arr(d?.visits), crops: arr(d?.crops), problems: arr(d?.problems), advice: arr(d?.advice) });
const fmt = d => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const SAMPLES = [
  'Karim mia, north plot, rice, yellowing on the lower leaves, said he has not applied urea since planting, suggested top dressing, come back in two weeks',
  'Karim, north plot, rice, leaves still pale, advised more urea, come back in a week',
  'Rahim, south plot, potato, no problem, everything looks good'];

function NoteForm({ onSaved }) {
  const [text, setText] = useState(''), [listening, setListening] = useState(false);
  const [status, setStatus] = useState(''), [msg, setMsg] = useState(null);
  const rec = useRef(null), base = useRef('');
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const toggleMic = () => {
    if (!SR) return setStatus('Voice input is not supported in this browser. Type the note instead (Chrome or Edge work best).');
    if (listening) return rec.current?.stop();
    const r = new SR(); r.lang = 'en-US'; r.continuous = true; r.interimResults = true;
    base.current = text ? text.trimEnd() + ' ' : '';
    r.onstart = () => { setListening(true); setStatus('Listening… speak your note.'); };
    r.onresult = e => setText(base.current + Array.from(e.results).map(x => x[0].transcript).join(' '));
    r.onerror = e => setStatus(e.error === 'not-allowed' || e.error === 'service-not-allowed'
      ? 'Microphone access was denied. Allow it in the browser settings, or type the note.' : `Voice error: ${e.error}. Try again or type the note.`);
    r.onend = () => { setListening(false); setStatus(s => (s.startsWith('Listening') ? 'Stopped. Check the text, then save.' : s)); };
    rec.current = r; r.start();
  };
  const save = async () => {
    setMsg(null);
    try {
      const d = await api('/api/notes', { method: 'POST', body: JSON.stringify({ rawNote: text }) });
      setMsg({ ok: true, t: `Saved visit for ${d.farmer.canonicalName}${d.reminder ? ` · follow-up ${fmt(d.reminder.dueDate)}` : ''}${d.autoCompleted ? ` · ${d.autoCompleted} earlier reminder(s) completed` : ''}` });
      setText(''); setStatus(''); onSaved();
    } catch (e) { setMsg({ ok: false, t: e.message }); }
  };
  return (
    <section className="bg-white rounded-lg border border-soil/20 p-4 print:hidden">
      <h2 className="font-serif text-xl mb-2 flex items-center gap-2"><Sprout className="text-leaf" size={20} />New field note</h2>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={4}
        placeholder="Farmer, plot, crop, what you saw, advice, when to return…"
        className="w-full rounded border border-soil/30 p-3 text-lg focus:outline-2 focus:outline-leaf" />
      <div className="flex flex-wrap gap-2 mt-2">
        <button onClick={toggleMic} className={`px-5 py-3 rounded-lg font-semibold flex items-center gap-2 text-white ${listening ? 'bg-red-600' : 'bg-leaf'}`}>
          {listening ? <MicOff size={20} /> : <Mic size={20} />}{listening ? 'Stop recording' : 'Record Voice'}</button>
        <button onClick={save} disabled={!text.trim()} className="px-5 py-3 rounded-lg font-semibold flex items-center gap-2 bg-soil text-white disabled:opacity-40">
          <Save size={20} />Save note</button>
      </div>
      {status && <p className="mt-2 text-sm" role="status">{status}</p>}
      {msg && <p className={`mt-2 text-sm font-medium ${msg.ok ? 'text-leaf' : 'text-red-700'}`}>{msg.t}</p>}
      <details className="mt-3 text-sm"><summary className="cursor-pointer">Try a sample note</summary>
        {SAMPLES.map(s => <button key={s} onClick={() => setText(s)} className="block text-left mt-1 underline decoration-dotted">{s}</button>)}</details>
    </section>);
}

function Reminders({ items, onDone }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return (
    <section className="bg-white rounded-lg border border-soil/20 p-4 print:hidden">
      <h2 className="font-serif text-xl mb-2 flex items-center gap-2"><BellRing className="text-amber-600" size={20} />Follow-up Reminders</h2>
      {!items.length && <p className="text-sm opacity-70">Nothing pending. Follow-ups you mention in notes appear here.</p>}
      <ul className="space-y-2">{items.map(r => {
        const due = new Date(r.dueDate), days = Math.ceil((due - today) / 864e5);
        const tone = days < 0 ? 'bg-red-50 border-red-400' : days <= 3 ? 'bg-amber-50 border-amber-400' : 'bg-green-50 border-green-400';
        return <li key={r._id} className={`border-l-4 rounded p-3 flex items-center justify-between gap-2 ${tone}`}>
          <div><div className="font-semibold">{r.farmerName}{r.plot && <span className="font-normal"> · {r.plot}</span>}</div>
            <div className="text-sm">{days < 0 ? `Overdue by ${-days} day(s)` : days === 0 ? 'Due today' : `Due in ${days} day(s)`} · {fmt(due)}</div></div>
          <button onClick={() => onDone(r._id)} className="px-3 py-2 rounded bg-leaf text-white text-sm flex items-center gap-1"><Check size={16} />Mark Done</button>
        </li>; })}</ul>
    </section>);
}

function Farms({ farmers, onOpen }) {
  return (
    <section className="bg-white rounded-lg border border-soil/20 p-4 print:hidden">
      <h2 className="font-serif text-xl mb-2 flex items-center gap-2"><Users className="text-leaf" size={20} />Farms &amp; Visit History</h2>
      {!farmers.length && <p className="text-sm opacity-70">No farms yet. Save your first note to start a history.</p>}
      <ul className="divide-y divide-soil/10">{farmers.map(f => (
        <li key={f._id}><button onClick={() => onOpen(f)} className="w-full text-left py-2 hover:bg-paper px-1">
          <span className="font-semibold">{f.canonicalName}</span>{f.plot && <span> · {f.plot}</span>}
          {(f.aliases || []).length > 0 && <span className="text-xs opacity-60"> (also: {(f.aliases || []).join(', ')})</span>}</button></li>))}</ul>
    </section>);
}

function Drawer({ farmer, onClose }) {
  const [visits, setVisits] = useState(null);
  useEffect(() => { api(`/api/farmers/${farmer._id}/visits`).then(d => setVisits(arr(d))).catch(() => setVisits([])); }, [farmer]);
  return (
    <div className="fixed inset-0 bg-black/40 z-10 flex justify-end print:hidden" onClick={onClose}>
      <aside className="bg-paper w-full max-w-md h-full overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start"><div><h2 className="font-serif text-2xl">{farmer.canonicalName}</h2>
          <p className="text-sm opacity-70">{farmer.plot}</p></div><button onClick={onClose} aria-label="Close"><X /></button></div>
        {!visits && <p className="mt-4">Loading…</p>}
        {visits?.length === 0 && <p className="mt-4">No visits recorded.</p>}
        <ol className="mt-4 border-l-2 border-leaf/40 ml-2 space-y-4">{visits?.map(v => (
          <li key={v._id} className="pl-4 relative"><span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-leaf" />
            <div className="font-semibold">{fmt(v.visitDate)}{v.crop && <span className="font-normal"> · {v.crop}</span>}</div>
            <div className="text-sm"><b>Problem:</b> {v.isHealthyVisit ? 'No Problem' : v.problem}</div>
            {v.advice && <div className="text-sm"><b>Advice:</b> {v.advice}</div>}
            <div className="text-xs opacity-60 mt-1 italic">“{v.rawNote}”</div></li>))}</ol>
      </aside>
    </div>);
}

function Report() {
  const now = new Date();
  const [m, setM] = useState(now.getMonth() + 1), [y, setY] = useState(now.getFullYear());
  const [data, setData] = useState(null), [err, setErr] = useState('');
  const gen = useCallback(() => { setErr(''); api(`/api/report?month=${m}&year=${y}`).then(d => setData(normReport(d))).catch(e => { setData(null); setErr(e.message); }); }, [m, y]);
  useEffect(() => { gen(); }, []); // eslint-disable-line
  const monthName = new Date(y, m - 1).toLocaleString(undefined, { month: 'long' });
  const csv = () => {
    const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const rows = [['Date', 'Farmer', 'Plot', 'Crop', 'Problem Observed', 'Advice Given'],
      ...data.visits.map(v => [new Date(v.visitDate).toISOString().slice(0, 10), v.farmerName, v.plot, v.crop, v.isHealthyVisit ? 'No Problem' : v.problem, v.advice])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv' }));
    a.download = `field-report-${y}-${String(m).padStart(2, '0')}.csv`; document.body.appendChild(a); a.click(); a.remove();
  };
  const S = data?.summary || {};
  const Kpi = ({ l, v }) => <div className="bg-white border border-soil/20 rounded-lg p-3"><div className="text-3xl font-serif">{v}</div><div className="text-sm">{l}</div></div>;
  const List = ({ t, items }) => <div><h3 className="font-semibold mb-1">{t}</h3>
    {items.length ? <ul className="text-sm list-disc ml-5">{items.map(i => <li key={i.name}>{i.name} ({i.count})</li>)}</ul> : <p className="text-sm opacity-60">None recorded.</p>}</div>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 print:hidden">
        <label className="text-sm">Month<select value={m} onChange={e => setM(+e.target.value)} className="block border rounded p-2 bg-white">
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(2000, i).toLocaleString(undefined, { month: 'long' })}</option>)}</select></label>
        <label className="text-sm">Year<input type="number" value={y} onChange={e => setY(+e.target.value)} className="block border rounded p-2 w-24 bg-white" /></label>
        <button onClick={gen} className="px-4 py-2 rounded bg-leaf text-white font-semibold flex gap-1 items-center"><FileText size={18} />Generate Report</button>
        <button onClick={() => window.print()} disabled={!data} className="px-4 py-2 rounded bg-soil text-white flex gap-1 items-center disabled:opacity-40"><Printer size={18} />Print / Save PDF</button>
        <button onClick={csv} disabled={!data?.visits.length} className="px-4 py-2 rounded border border-soil flex gap-1 items-center disabled:opacity-40"><Download size={18} />Export CSV</button>
      </div>
      {err && <p className="text-red-700">{err}</p>}
      {data && <>
        <h2 className="font-serif text-2xl">Field Report — {monthName} {y}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi l="Total Visits" v={S.totalVisits} /><Kpi l="Unique Farms Visited" v={S.uniqueFarms} />
          <Kpi l="Issues Found" v={S.issuesFound} /><Kpi l="Healthy / No-Issue Visits" v={S.healthyVisits} />
          <Kpi l="Follow-ups Scheduled" v={S.followUps} /><Kpi l="Follow-ups Pending" v={S.pending} /><Kpi l="Follow-ups Completed" v={S.completed} /></div>
        {S.totalVisits === 0 ? <p className="p-4 bg-white rounded border">No visits recorded for {monthName} {y}.</p> : <>
          <div className="grid md:grid-cols-3 gap-4"><List t="Crops checked" items={data.crops} /><List t="Common problems" items={data.problems} /><List t="Advice given" items={data.advice} /></div>
          <table className="w-full text-sm border-collapse bg-white"><thead><tr className="bg-soil text-white text-left print:bg-gray-200 print:text-black">
            {['Date', 'Farmer Name', 'Plot', 'Crop', 'Problem Observed', 'Advice Given'].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead>
            <tbody>{data.visits.map(v => <tr key={v._id} className="border-b border-soil/20 align-top break-inside-avoid">
              <td className="p-2 whitespace-nowrap">{fmt(v.visitDate)}</td><td className="p-2">{v.farmerName}</td><td className="p-2">{v.plot}</td>
              <td className="p-2">{v.crop}</td><td className="p-2">{v.isHealthyVisit || !v.problem ? 'No Problem' : v.problem}</td><td className="p-2">{v.advice}</td></tr>)}</tbody></table></>}
      </>}
    </div>);
}

export default function App() {
  const [tab, setTab] = useState('notes'), [reminders, setReminders] = useState([]), [farmers, setFarmers] = useState([]), [open, setOpen] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const load = useCallback(() => {
    setLoadErr('');
    api('/api/reminders?status=Pending').then(d => setReminders(arr(d))).catch(e => { setReminders([]); setLoadErr(e.message); });
    api('/api/farmers').then(d => setFarmers(arr(d))).catch(e => { setFarmers([]); setLoadErr(e.message); });
  }, []);
  useEffect(load, [load]);
  const done = async id => { try { await api(`/api/reminders/${id}`, { method: 'PATCH' }); } catch (e) { setLoadErr(e.message); return; } load(); };
  return (
    <div className="max-w-5xl mx-auto p-4">
      <header className="mb-4 print:hidden"><h1 className="font-serif text-3xl">The Field Officer’s Notebook</h1>
        <nav className="flex gap-2 mt-3">{[['notes', 'Field Notes'], ['report', 'Monthly Report']].map(([k, l]) =>
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-full font-semibold ${tab === k ? 'bg-soil text-white' : 'bg-white border border-soil/30'}`}>{l}</button>)}</nav></header>
      {loadErr && <p role="alert" className="mb-3 p-3 rounded bg-red-50 border border-red-300 text-red-800 text-sm print:hidden">Could not load data: {loadErr}</p>}
      {tab === 'notes'
        ? <div className="grid md:grid-cols-2 gap-4"><div className="space-y-4"><NoteForm onSaved={load} /><Farms farmers={farmers} onOpen={setOpen} /></div>
            <Reminders items={reminders} onDone={done} /></div>
        : <Report />}
      {open && <Drawer farmer={open} onClose={() => setOpen(null)} />}
    </div>);
}
