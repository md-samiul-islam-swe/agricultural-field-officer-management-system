import { BookOpen, Sprout } from 'lucide-react';

export default function Navbar({ active, onNavigate }) {
  const links = [
    { id: 'notebook', label: 'Notebook' },
    { id: 'report', label: 'Monthly report' },
  ];

  return (
    <header className="border-b border-ink/10 bg-paper/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <button className="flex items-center gap-3 text-left" onClick={() => onNavigate('notebook')}>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-leaf text-white">
            <BookOpen size={20} />
          </span>
          <span>
            <span className="block font-display text-lg leading-tight text-ink">Field notes</span>
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-leaf">
              <Sprout size={11} /> The Field Officer&apos;s Notebook
            </span>
          </span>
        </button>
        <nav className="flex items-center gap-1 rounded-full bg-white/80 p-1">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => onNavigate(link.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                active === link.id ? 'bg-ink text-white shadow-sm' : 'text-ink/65 hover:bg-paper'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
