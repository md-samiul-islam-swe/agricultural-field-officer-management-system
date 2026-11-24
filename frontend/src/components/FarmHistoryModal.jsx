import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../services/api';

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export default function FarmHistoryModal({ farmer, onClose }) {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.getFarmerHistory(farmer._id)
      .then((result) => { if (active) setHistory(result); })
      .catch((fetchError) => { if (active) setError(fetchError.message); });
    return () => { active = false; };
  }, [farmer._id]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="history-title" className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-paper p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-leaf">Farmer history</p>
            <h2 id="history-title" className="mt-1 font-display text-2xl text-ink">{farmer.canonicalName}</h2>
            <p className="mt-1 text-sm text-ink/55">{farmer.plot || 'Plot not specified'}</p>
          </div>
          <button onClick={onClose} aria-label="Close history" className="rounded-full p-2 text-ink/60 hover:bg-white"><X size={20} /></button>
        </div>
        {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {!history && !error && <p className="py-12 text-center text-sm text-ink/55">Loading visit history…</p>}
        {history && history.visits.length === 0 && <p className="py-12 text-center text-sm text-ink/55">No visits recorded yet.</p>}
        {history?.visits.length > 0 && (
          <ol className="mt-7 space-y-0">
            {history.visits.map((visit, index) => (
              <li key={visit._id} className="relative pb-7 pl-7 last:pb-0">
                {index < history.visits.length - 1 && <span className="absolute bottom-0 left-[7px] top-3 w-px bg-leaf/20" />}
                <span className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-[3px] border-leaf bg-paper" />
                <p className="text-xs font-semibold uppercase tracking-wide text-leaf">{formatDate(visit.visitDate)}</p>
                <div className="mt-2 rounded-2xl border border-ink/10 bg-white p-4">
                  <p className="font-semibold text-ink">{visit.crop || 'Crop not recorded'} {visit.isHealthyVisit && <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-800">Healthy</span>}</p>
                  {visit.problem && <p className="mt-2 text-sm text-ink/75"><strong>Problem:</strong> {visit.problem}</p>}
                  {visit.advice && <p className="mt-1 text-sm text-ink/75"><strong>Advice:</strong> {visit.advice}</p>}
                  {visit.rawNote && <p className="mt-3 border-t border-ink/10 pt-3 text-xs italic leading-5 text-ink/50">{visit.rawNote}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
