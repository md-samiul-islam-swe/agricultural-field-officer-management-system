import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { api } from '../services/api';

const monthNames = new Intl.DateTimeFormat(undefined, { month: 'long' });
function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export default function MonthlyReport() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setReport(null);
    setError('');
    api.getMonthlyReport(month, year)
      .then((result) => { if (active) setReport(result); })
      .catch((fetchError) => { if (active) setError(fetchError.message); });
    return () => { active = false; };
  }, [month, year]);

  const title = report ? `${monthNames.format(new Date(Number(year), Number(month) - 1, 1))} ${year}` : 'Monthly report';
  return (
    <main className="mx-auto max-w-7xl px-5 py-9 sm:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-leaf">Your work, at a glance</p>
          <h1 className="mt-1 font-display text-3xl text-ink">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <label className="sr-only" htmlFor="report-month">Month</label>
          <select id="report-month" value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink">
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>{monthNames.format(new Date(2025, index, 1))}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="report-year">Year</label>
          <input id="report-year" type="number" min="1900" max="9999" value={year} onChange={(event) => setYear(event.target.value)} className="w-24 rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink" />
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-leaf"><Printer size={16} /> Print / Save PDF</button>
        </div>
      </div>
      {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {!report && !error && <p className="rounded-2xl bg-white p-10 text-center text-sm text-ink/55">Loading report…</p>}
      {report && (
        <>
          <div className="mb-7 grid gap-4 sm:grid-cols-3">
            {[
              ['Total visits', report.totalVisits, 'All farm visits, including healthy check-ins'],
              ['Issues addressed', report.issueCount, 'Visits where a crop problem was recorded'],
              ['Healthy check-ins', report.healthyCount, 'Visits noted as healthy'],
            ].map(([label, count, detail]) => (
              <article key={label} className="rounded-3xl border border-ink/10 bg-white p-6 shadow-card">
                <p className="text-sm font-medium text-ink/55">{label}</p>
                <p className="mt-2 font-display text-4xl text-ink">{count}</p>
                <p className="mt-2 text-xs text-ink/45">{detail}</p>
              </article>
            ))}
          </div>
          <section className="overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-card">
            <div className="border-b border-ink/10 px-6 py-5"><h2 className="font-display text-xl text-ink">Visit register</h2></div>
            {report.visits.length === 0 ? <p className="p-8 text-center text-sm text-ink/55">No visits recorded for this month.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-paper/70 text-[11px] uppercase tracking-wider text-ink/55">
                    <tr>{['Date', 'Farmer / plot', 'Crop', 'Observation', 'Advice'].map((head) => <th key={head} className="px-5 py-3 font-semibold">{head}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10">
                    {report.visits.map((visit) => (
                      <tr key={visit._id} className="align-top">
                        <td className="whitespace-nowrap px-5 py-4 text-ink/60">{formatDate(visit.visitDate)}</td>
                        <td className="px-5 py-4"><span className="font-semibold text-ink">{visit.farmerName}</span><span className="mt-1 block text-xs text-ink/50">{visit.plot || '—'}</span></td>
                        <td className="px-5 py-4 text-ink/70">{visit.crop || '—'}</td>
                        <td className="max-w-xs px-5 py-4 text-ink/70">{visit.isHealthyVisit ? <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">Healthy</span> : visit.problem || '—'}</td>
                        <td className="max-w-xs px-5 py-4 text-ink/70">{visit.advice || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
