import { useCallback, useMemo, useState } from 'react';
import { Check, Copy, FileDown, Sprout, Trash2 } from 'lucide-react';
import VoiceRecorder from './components/VoiceRecorder.jsx';
import {
  deleteLocalVisitNote,
  loadLocalVisitNotes,
  saveVisitNoteToApi,
} from './services/visitNoteApi.js';
import { exportVisitNotesToPdf } from './utils/exportNotesToPdf.js';

function formatSavedTime(isoString: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

function formatDurationShort(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

interface VisitNoteRecord {
  id: string;
  noteText: string;
  language: string;
  durationSeconds: number;
  recordedAt: string;
}

export default function App() {
  const [savedNotes, setSavedNotes] = useState<VisitNoteRecord[]>(() =>
    loadLocalVisitNotes()
  );
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [exportStatus, setExportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const selectedIdSet = useMemo(
    () => new Set(selectedNoteIds),
    [selectedNoteIds]
  );

  const selectedCount = selectedNoteIds.length;
  const allSelected =
    savedNotes.length > 0 && selectedCount === savedNotes.length;

  const handleSaveVisitNote = useCallback(async (visitNote: VisitNoteRecord) => {
    // To connect to your Node.js + MySQL backend later, pass:
    // { apiEndpoint: '/api/farm-visits/notes' }
    const saved = await saveVisitNoteToApi(visitNote);
    setSavedNotes((prev) => [saved, ...prev]);
    setExportStatus(null);
  }, []);

  const handleDeleteNote = useCallback((noteId: string) => {
    const updated = deleteLocalVisitNote(noteId);
    setSavedNotes(updated);
    setSelectedNoteIds((prev) => prev.filter((id) => id !== noteId));
    setExportStatus(null);
  }, []);

  const handleToggleSelectNote = useCallback((noteId: string) => {
    setSelectedNoteIds((prev) =>
      prev.includes(noteId)
        ? prev.filter((id) => id !== noteId)
        : [...prev, noteId]
    );
    setExportStatus(null);
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedNoteIds([]);
    } else {
      setSelectedNoteIds(savedNotes.map((note) => note.id));
    }
    setExportStatus(null);
  }, [allSelected, savedNotes]);

  const handleCopySavedNote = useCallback(async (note: VisitNoteRecord) => {
    try {
      await navigator.clipboard.writeText(note.noteText);
      setCopiedNoteId(note.id);
      window.setTimeout(() => {
        setCopiedNoteId((current) => (current === note.id ? null : current));
      }, 2000);
    } catch {
      // Clipboard API unavailable
    }
  }, []);

  const handleExportToPdf = useCallback(async () => {
    if (savedNotes.length === 0 || isExportingPdf) return;

    const hasSelection = selectedCount > 0;
    const notesToExport = hasSelection
      ? savedNotes.filter((note) => selectedIdSet.has(note.id))
      : savedNotes;

    if (notesToExport.length === 0) return;

    setIsExportingPdf(true);
    setExportStatus(null);

    try {
      await exportVisitNotesToPdf(notesToExport, {
        isSelection: hasSelection,
      });
      setExportStatus({
        type: 'success',
        message: `Exported ${notesToExport.length} ${
          notesToExport.length === 1 ? 'note' : 'notes'
        } to PDF.`,
      });
    } catch (err) {
      setExportStatus({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Could not generate the PDF report. Please try again.',
      });
    } finally {
      setIsExportingPdf(false);
    }
  }, [isExportingPdf, savedNotes, selectedCount, selectedIdSet]);

  return (
    <div className="relative min-h-screen text-slate-900">
      {/* Full-bleed farmer background with soft contrast scrim */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-green-50 via-white to-emerald-50 print:hidden"
      >
        <img
          src="/src/assets/images/farmer_rice_field_1795510152450.jpg"
          alt="Bangladeshi farmer inspecting green rice crops in the field"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-white/72 backdrop-blur-[1px]" />
      </div>

      <header className="border-b border-slate-200/90 bg-white/90 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <Sprout className="h-5 w-5 text-green-700 shrink-0" />
            <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              The Field Officer&apos;s Notebook
            </span>
          </div>
          <span className="text-xs font-medium text-slate-600 whitespace-nowrap shrink-0">
            Voice-to-Text Module
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 print:hidden">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance">
            Farm Visit Voice Recorder
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm font-medium leading-relaxed text-slate-700 sm:text-base">
            Speak your farm observations naturally in English or Bangla. Review
            and edit the live transcription before saving it as a farm visit
            record.
          </p>
        </div>

        <div className="print:hidden">
          <VoiceRecorder onSaveVisitNote={handleSaveVisitNote} />
        </div>

        <section
          aria-label="Saved Visit Notes"
          className="mt-10 border-t border-slate-200 pt-8 print:mt-0 print:border-t-0 print:pt-0"
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Saved Visit Notes
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 font-mono-tabular">
                {savedNotes.length}{' '}
                {savedNotes.length === 1 ? 'record' : 'records'}
                <span aria-hidden="true"> · </span>
                {selectedCount > 0
                  ? `${selectedCount} selected for PDF`
                  : 'Stored locally'}
              </p>
            </div>

            {savedNotes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2.5 print:hidden">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 whitespace-nowrap shrink-0"
                >
                  {allSelected ? 'Clear Selection' : 'Select All'}
                </button>

                <button
                  type="button"
                  onClick={handleExportToPdf}
                  disabled={isExportingPdf || savedNotes.length === 0}
                  aria-label={
                    selectedCount > 0
                      ? `Export ${selectedCount} selected notes to PDF`
                      : `Export all ${savedNotes.length} notes to PDF`
                  }
                  className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 whitespace-nowrap shrink-0"
                >
                  <FileDown className="h-4 w-4 shrink-0" />
                  <span>
                    {isExportingPdf
                      ? 'Generating PDF...'
                      : selectedCount > 0
                      ? `Export to PDF (${selectedCount})`
                      : 'Export to PDF'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {exportStatus && (
            <div
              role="status"
              className={`mb-4 rounded-xl border px-4 py-2.5 text-sm font-medium print:hidden ${
                exportStatus.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-green-200 bg-green-50 text-green-800'
              }`}
            >
              {exportStatus.message}
            </div>
          )}

          {savedNotes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/90 px-5 py-8 text-center backdrop-blur-xs">
              <p className="text-sm font-medium text-slate-700">
                No visit notes saved yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Record or type a farm observation above and click Save Visit
                Note.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xs">
              {savedNotes.map((note) => {
                const isSelected = selectedIdSet.has(note.id);
                return (
                  <li
                    key={note.id}
                    className={`px-4 py-4 transition-colors first:rounded-t-2xl last:rounded-b-2xl sm:px-6 ${
                      isSelected ? 'bg-green-50/70' : 'bg-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <label className="mt-0.5 flex h-6 w-6 cursor-pointer items-center justify-center shrink-0 print:hidden">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectNote(note.id)}
                          aria-label={`Select visit note recorded on ${formatSavedTime(
                            note.recordedAt
                          )}`}
                          className="h-4 w-4 rounded border-slate-300 text-green-700 accent-green-700 focus:ring-2 focus:ring-green-700/30"
                        />
                      </label>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-slate-700">
                              {note.language === 'bn-BD'
                                ? 'Bangla (bn-BD)'
                                : 'English (en-US)'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-tabular">
                              {formatDurationShort(note.durationSeconds)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{formatSavedTime(note.recordedAt)}</span>
                          </div>

                          <div className="flex items-center gap-2 print:hidden">
                            <button
                              type="button"
                              onClick={() => handleCopySavedNote(note)}
                              aria-label="Copy saved visit note"
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700"
                            >
                              {copiedNoteId === note.id ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-green-700" />
                                  <span className="text-green-700">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteNote(note.id)}
                              aria-label="Delete saved visit note"
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                          {note.noteText}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
