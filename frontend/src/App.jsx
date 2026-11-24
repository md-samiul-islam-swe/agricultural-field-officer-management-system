import { useCallback, useEffect, useState } from 'react';
import { CircleAlert, Leaf, LoaderCircle, Send, Sprout } from 'lucide-react';
import Navbar from './components/Navbar.jsx';
import FarmHistoryPanel from './components/FarmHistoryPanel.jsx';
import FollowUpReminders from './components/FollowUpReminders.jsx';
import MonthlyReport from './components/MonthlyReport.jsx';
import { api } from './services/api.js';

const EMPTY_VISIT = {
  farmerName: '',
  plot: '',
  crop: '',
  problem: '',
  advice: '',
  rawNote: '',
  isHealthyVisit: false,
};

export default function App() {
  const [page, setPage] = useState('notebook');
  const [farmers, setFarmers] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [visit, setVisit] = useState(EMPTY_VISIT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refreshDashboard = useCallback(async () => {
    const [farmerRows, reminderRows] = await Promise.all([
      api.getFarmers(),
      api.getReminders(),
    ]);
    setFarmers(farmerRows);
    setReminders(reminderRows);
  }, []);

  useEffect(() => {
    refreshDashboard()
      .catch((fetchError) => setError(`Could not connect to the notebook API: ${fetchError.message}`))
      .finally(() => setLoading(false));
  }, [refreshDashboard]);

  async function submitVisit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await api.recordVisit(visit);
      await refreshDashboard();
      setVisit(EMPTY_VISIT);
      setNotice(result.reminder
        ? 'Visit saved and a follow-up reminder was added.'
        : 'Visit saved to the farmer’s history.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function completeReminder(id) {
    setCompletingId(id);
    setError('');
    try {
      await api.completeReminder(id);
      setReminders((current) => current.filter((reminder) => reminder._id !== id));
    } catch (completeError) {
      setError(completeError.message);
    } finally {
      setCompletingId('');
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Navbar active={page} onNavigate={setPage} />
      {page === 'report' ? <MonthlyReport /> : (
        <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
          <section className="relative mb-8 overflow-hidden rounded-[2rem] bg-ink px-6 py-8 text-white sm:px-10 sm:py-10">
            <div className="relative z-10 max-w-2xl">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#c5d8aa]"><Sprout size={15} /> Field season, in good hands</p>
              <h1 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">A little care goes a long way.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">Keep every farmer’s visit history close and every follow-up right on time.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs">{farmers.length} farmers in your notebook</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs">{reminders.length} pending follow-ups</span>
              </div>
            </div>
            <div className="absolute -right-10 -top-20 h-72 w-72 rounded-full border border-white/10" />
            <div className="absolute -right-3 -top-14 h-56 w-56 rounded-full border border-white/10" />
            <Leaf className="absolute bottom-6 right-14 rotate-[-28deg] text-white/10" size={115} strokeWidth={1} />
          </section>

          {error && (
            <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <CircleAlert className="mt-0.5 shrink-0" size={18} />
              <span>{error}<button type="button" onClick={() => { setError(''); setLoading(true); refreshDashboard().catch((e) => setError(e.message)).finally(() => setLoading(false)); }} className="ml-2 font-semibold underline">Try again</button></span>
            </div>
          )}
          {notice && <div role="status" className="mb-6 rounded-2xl bg-green-100 px-4 py-3 text-sm font-medium text-green-900">{notice}</div>}

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.8fr)]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-card sm:p-8">
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-leaf">Quick capture</p>
                  <h2 className="mt-1 font-display text-2xl text-ink">Record a farm visit</h2>
                  <p className="mt-2 text-sm text-ink/55">Add a follow-up timeframe in the raw note, such as “check again in two weeks.”</p>
                </div>
                <form onSubmit={submitVisit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-ink/75">
                      Farmer name
                      <input
                        required
                        value={visit.farmerName}
                        onChange={(event) => setVisit({ ...visit, farmerName: event.target.value })}
                        placeholder="e.g. Karim Mia"
                        className="mt-1.5 w-full rounded-xl border border-ink/15 bg-[#fcfcf8] px-3.5 py-3 text-sm outline-none focus:border-leaf focus:ring-4 focus:ring-leaf/10"
                      />
                    </label>
                    <label className="text-sm font-medium text-ink/75">
                      Plot
                      <input
                        value={visit.plot}
                        onChange={(event) => setVisit({ ...visit, plot: event.target.value })}
                        placeholder="e.g. north plot"
                        className="mt-1.5 w-full rounded-xl border border-ink/15 bg-[#fcfcf8] px-3.5 py-3 text-sm outline-none focus:border-leaf focus:ring-4 focus:ring-leaf/10"
                      />
                    </label>
                    <label className="text-sm font-medium text-ink/75">
                      Crop
                      <input
                        value={visit.crop}
                        onChange={(event) => setVisit({ ...visit, crop: event.target.value })}
                        placeholder="e.g. rice"
                        className="mt-1.5 w-full rounded-xl border border-ink/15 bg-[#fcfcf8] px-3.5 py-3 text-sm outline-none focus:border-leaf focus:ring-4 focus:ring-leaf/10"
                      />
                    </label>
                    <label className="text-sm font-medium text-ink/75">
                      Problem
                      <input
                        value={visit.problem}
                        onChange={(event) => setVisit({ ...visit, problem: event.target.value })}
                        placeholder="What did you observe?"
                        className="mt-1.5 w-full rounded-xl border border-ink/15 bg-[#fcfcf8] px-3.5 py-3 text-sm outline-none focus:border-leaf focus:ring-4 focus:ring-leaf/10"
                      />
                    </label>
                  </div>
                  <label className="block text-sm font-medium text-ink/75">
                    Advice
                    <textarea
                      rows="2"
                      value={visit.advice}
                      onChange={(event) => setVisit({ ...visit, advice: event.target.value })}
                      placeholder="Advice given to the farmer"
                      className="mt-1.5 w-full resize-y rounded-xl border border-ink/15 bg-[#fcfcf8] px-3.5 py-3 text-sm outline-none focus:border-leaf focus:ring-4 focus:ring-leaf/10"
                    />
                  </label>
                  <label className="block text-sm font-medium text-ink/75">
                    Raw note
                    <textarea
                      rows="3"
                      value={visit.rawNote}
                      onChange={(event) => setVisit({ ...visit, rawNote: event.target.value })}
                      placeholder="Visit notes, including any follow-up timeframe"
                      className="mt-1.5 w-full resize-y rounded-xl border border-ink/15 bg-[#fcfcf8] px-3.5 py-3 text-sm leading-6 outline-none focus:border-leaf focus:ring-4 focus:ring-leaf/10"
                    />
                  </label>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <label className="inline-flex items-center gap-2 text-sm text-ink/70">
                      <input
                        type="checkbox"
                        checked={visit.isHealthyVisit}
                        onChange={(event) => setVisit({ ...visit, isHealthyVisit: event.target.checked })}
                        className="h-4 w-4 rounded border-ink/25 accent-leaf"
                      />
                      Healthy visit
                    </label>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-full bg-leaf px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-wait disabled:opacity-60"
                    >
                      {saving ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={15} />}
                      {saving ? 'Saving visit…' : 'Save visit'}
                    </button>
                  </div>
                </form>
              </section>
              <FarmHistoryPanel farmers={farmers} loading={loading} />
            </div>
            <aside className="space-y-6">
              <FollowUpReminders reminders={reminders} onComplete={completeReminder} completingId={completingId} />
            </aside>
          </div>
        </main>
      )}
    </div>
  );
}
