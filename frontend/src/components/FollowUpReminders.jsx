import { useMemo } from 'react';
import { CalendarClock, Check, Clock3 } from 'lucide-react';

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export default function FollowUpReminders({ reminders, onComplete, completingId }) {
  const sortedReminders = useMemo(
    () => [...reminders].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)),
    [reminders],
  );
  const now = new Date();
  const upcomingLimit = new Date(now);
  upcomingLimit.setDate(upcomingLimit.getDate() + 7);

  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-card sm:p-7">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-leaf">Keep in touch</p>
          <h2 className="mt-1 font-display text-xl text-ink">Follow-up reminders</h2>
        </div>
        <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/60">{sortedReminders.length} pending</span>
      </div>
      {sortedReminders.length === 0 ? (
        <div className="rounded-2xl bg-paper/70 px-4 py-8 text-center">
          <CalendarClock className="mx-auto text-leaf/70" size={24} />
          <p className="mt-2 text-sm text-ink/60">No pending follow-ups. You&apos;re all caught up.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sortedReminders.map((reminder) => {
            const dueDate = new Date(reminder.dueDate);
            const overdue = dueDate < now;
            const nearDue = dueDate <= upcomingLimit;
            const tone = overdue
              ? { card: 'border-red-200 bg-red-50/70', label: 'text-red-700' }
              : nearDue
                ? { card: 'border-amber-200 bg-amber-50/60', label: 'text-amber-800' }
                : { card: 'border-green-200 bg-green-50/60', label: 'text-green-800' };
            return (
              <li key={reminder._id} className={`rounded-2xl border p-4 ${tone.card}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{reminder.farmerName}</p>
                    <p className="mt-1 text-xs text-ink/55">{reminder.plot || 'Plot not specified'}</p>
                    <p className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${tone.label}`}>
                      <Clock3 size={13} /> {overdue ? 'Overdue' : 'Due'} {formatDate(reminder.dueDate)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onComplete(reminder._id)}
                    disabled={completingId === reminder._id}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-semibold text-leaf shadow-sm transition hover:bg-leaf hover:text-white disabled:opacity-50"
                  >
                    <Check size={14} /> {completingId === reminder._id ? 'Saving…' : 'Mark Done'}
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
