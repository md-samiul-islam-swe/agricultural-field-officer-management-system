import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Mic, MicOff, Send } from 'lucide-react';

export default function NoteInputCard({ onSave }) {
  const [note, setNote] = useState('');
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [listeningText, setListeningText] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  function toggleRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice dictation is not supported in this browser. You can still type your note.');
      return;
    }
    setError('');
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (finalText) setNote((current) => `${current}${current.trim() ? ' ' : ''}${finalText.trim()}`);
      setListeningText(interimText);
    };
    recognition.onerror = (event) => {
      setError(`Voice recording stopped: ${event.error}.`);
      setRecording(false);
      setListeningText('');
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setRecording(false);
      setListeningText('');
    };
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }

  async function submit(event) {
    event.preventDefault();
    if (!note.trim()) return setError('Add a field note before saving.');
    setSaving(true);
    setError('');
    try {
      await onSave(note.trim());
      setNote('');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-card sm:p-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-leaf">Quick capture</p>
          <h2 className="mt-1 font-display text-2xl text-ink">What did you see today?</h2>
        </div>
        <span className="hidden rounded-full bg-paper px-3 py-1.5 text-xs text-ink/55 sm:block">Speak naturally</span>
      </div>
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="field-note">Visit note</label>
        <textarea
          id="field-note"
          rows="5"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Karim Mia, north plot, rice, yellowing on the lower leaves…"
          className="w-full resize-y rounded-2xl border border-ink/15 bg-[#fcfcf8] p-4 text-sm leading-6 text-ink outline-none transition placeholder:text-ink/35 focus:border-leaf focus:ring-4 focus:ring-leaf/10"
        />
        {listeningText && <p className="mt-2 text-sm italic text-leaf">Listening: {listeningText}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={toggleRecording}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
              recording ? 'border-red-200 bg-red-50 text-red-700' : 'border-ink/15 text-ink hover:bg-paper'
            }`}
          >
            {recording ? <MicOff size={16} /> : <Mic size={16} />}
            {recording ? 'Stop recording' : 'Record voice'}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-leaf px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={15} />}
            {saving ? 'Saving note…' : 'Save visit'}
          </button>
        </div>
      </form>
    </section>
  );
}
