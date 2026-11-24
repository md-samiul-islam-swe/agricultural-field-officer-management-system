import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Sprout, Users } from 'lucide-react';
import { api } from '../services/api.js';

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export default function FarmHistoryPanel({ farmers, loading }) {
  const [query, setQuery] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredFarmers = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    if (!search) return farmers;
    return farmers.filter((farmer) => [
      farmer.canonicalName,
      farmer.plot,
      ...(farmer.aliases || []),
    ].some((value) => value?.toLocaleLowerCase().includes(search)));
  }, [farmers, query]);

  useEffect(() => {
    if (!selectedFarmer) return undefined;
    let active = true;
    setHistory(null);
    setError('');
    setHistoryLoading(true);
    api.getFarmerHistory(selectedFarmer._id)
      .then((result) => { if (active) setHistory(result); })
      .catch((fetchError) => { if (active) setError(fetchError.message); })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [selectedFarmer]);

  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-card sm:p-7">
      {selectedFarmer ? (
        <>
          <button
            type="button"
            onClick={() => setSelectedFarmer(null)}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-leaf hover:text-ink"
          >
            <ArrowLeft size={16} /> All farmers
          </button>
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-leaf">Visit history timeline</p>
            <h2 className="mt-1 font-display text-2xl text-ink">{selectedFarmer.canonicalName}</h2>
            <p className="mt-1 text-sm text-ink/55">{selectedFarmer.plot || 'Plot not specified'}</p>
            {!!selectedFarmer.aliases?.length && (
              <div className="mt-3 flex flex-wrap gap-2" aria-label="Farmer aliases">
                {selectedFarmer.aliases.map((alias) => (
                  <span key={alias} className="rounded-full bg-[#eef2e8] px-2.5 py-1 text-xs font-medium text-leaf">{alias}</span>
                ))}
              </div>
            )}
          </div>
          {historyLoading && <p className="py-8 text-center text-sm text-ink/55">Loading visit history…</p>}
          {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
          {history && !history.visits.length && (
            <p className="rounded-2xl bg-paper/70 px-4 py-8 text-center text-sm text-ink/55">No visits recorded yet.</p>
          )}
          {history?.visits.length > 0 && (
            <ol className="space-y-0">
              {history.visits.map((visit, index) => (
                <li key={visit._id} className="relative pb-6 pl-7 last:pb-0">
                  {index < history.visits.length - 1 && <span className="absolute bottom-0 left-[7px] top-3 w-px bg-leaf/20" />}
                  <span className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-[3px] border-leaf bg-white" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-leaf">{formatDate(visit.visitDate)}</p>
                  <article className="mt-2 rounded-2xl border border-ink/10 bg-paper/50 p-4">
                    <p className="font-semibold text-ink">{visit.crop || 'Crop not recorded'}</p>
                    <p className="mt-2 text-sm text-ink/75"><strong>Problem:</strong> {visit.problem || (visit.isHealthyVisit ? 'No problem reported' : 'Not recorded')}</p>
                    <p className="mt-1 text-sm text-ink/75"><strong>Advice:</strong> {visit.advice || 'Not recorded'}</p>
                    {visit.rawNote && <p className="mt-3 border-t border-ink/10 pt-3 text-xs italic leading-5 text-ink/55">{visit.rawNote}</p>}
                  </article>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-leaf">Your community</p>
              <h2 className="mt-1 font-display text-xl text-ink">Farm visit history</h2>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2e8] text-leaf"><Users size={19} /></span>
          </div>
          <label className="sr-only" htmlFor="farmer-search">Search farmers by name or plot</label>
          <input
            id="farmer-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search farmer or plot"
            className="mb-4 w-full rounded-xl border border-ink/15 bg-[#fcfcf8] px-4 py-3 text-sm text-ink outline-none focus:border-leaf focus:ring-4 focus:ring-leaf/10"
          />
          {loading ? <p className="py-8 text-center text-sm text-ink/55">Loading farmers…</p> : filteredFarmers.length === 0 ? (
            <div className="rounded-2xl bg-paper/70 px-4 py-8 text-center">
              <Sprout className="mx-auto text-leaf/70" size={23} />
              <p className="mt-2 text-sm text-ink/60">{farmers.length ? 'No farmers match that search.' : 'Farmers will appear after a visit is saved.'}</p>
            </div>
          ) : (
            <ul className="divide-y divide-ink/10">
              {filteredFarmers.map((farmer) => (
                <li key={farmer._id}>
                  <button
                    type="button"
                    onClick={() => setSelectedFarmer(farmer)}
                    className="flex w-full items-center gap-3 py-4 text-left transition hover:px-2"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper text-leaf"><Sprout size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">{farmer.canonicalName}</span>
                        <span className="text-xs text-ink/50">{farmer.plot || 'Plot not specified'}</span>
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        {(farmer.aliases || []).map((alias) => (
                          <span key={alias} className="rounded-full bg-[#eef2e8] px-2 py-0.5 text-[10px] font-medium text-leaf">{alias}</span>
                        ))}
                        <span className="text-[11px] text-ink/45">{farmer.totalVisitCount} {farmer.totalVisitCount === 1 ? 'visit' : 'visits'}</span>
                      </span>
                    </span>
                    <ChevronRight className="shrink-0 text-ink/35" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
