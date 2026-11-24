import { useMemo } from 'react';
import { CalendarClock, Check, Clock3 } from 'lucide-react';

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export default function ReminderList({ reminders, onComplete, completingId }) {
  const sorted = useMemo(
    () => [...reminders].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)),
    [reminders],
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-card">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-leaf">Keep in touch</p>
          <h2 className="mt-1 font-display text-xl text-ink">Follow-up visits</h2>
        </div>
        <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/60">{sorted.length} open</span>
      </div>
      {sorted.length === 0 ? (
        <div className="rounded-2xl bg-paper/70 px-4 py-8 text-center">
          <CalendarClock className="mx-auto text-leaf/70" size={24} />
          <p className="mt-2 text-sm text-ink/60">No follow-ups due. You&apos;re all caught up.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((reminder) => {
            const overdue = new Date(reminder.dueDate) < today;
            return (
              <li key={reminder._id} className={`rounded-2xl border p-4 ${overdue ? 'border-red-200 bg-red-50/70' : 'border-amber-200 bg-amber-50/60'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{reminder.farmerName}</p>
                    <p className="mt-1 text-xs text-ink/55">{reminder.plot || 'Plot not specified'}</p>
                    <p className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${overdue ? 'text-red-700' : 'text-amber-800'}`}>
                      <Clock3 size={13} /> {overdue ? 'Overdue' : 'Due'} {formatDate(reminder.dueDate)}
                    </p>
                  </div>
                  <button
                    onClick={() => onComplete(reminder._id)}
                    disabled={completingId === reminder._id}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-semibold text-leaf shadow-sm transition hover:bg-leaf hover:text-white disabled:opacity-50"
                  >
                    <Check size={14} /> {completingId === reminder._id ? 'Saving' : 'Mark done'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
