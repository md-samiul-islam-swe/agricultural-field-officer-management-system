import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Globe,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Save,
  ShieldAlert,
  Square,
  Trash2,
  WifiOff,
} from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  useVoiceTranscription,
} from '../hooks/useVoiceTranscription';

function formatTimer(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function countWords(text) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Reusable Voice-to-Text Field Visit Recorder component.
 * @param {Object} props
 * @param {string} [props.initialText]
 * @param {'en-US' | 'bn-BD'} [props.defaultLanguage]
 * @param {(text: string) => void} [props.onTranscriptChange]
 * @param {(note: { id: string, noteText: string, language: string, durationSeconds: number, recordedAt: string }) => Promise<void> | void} [props.onSaveVisitNote]
 * @param {boolean} [props.isSaving]
 * @param {string} [props.placeholder]
 */
export function VoiceRecorder({
  initialText = '',
  defaultLanguage = 'en-US',
  onTranscriptChange,
  onSaveVisitNote,
  isSaving: externalSaving = false,
  placeholder = 'Tap Start Recording and speak, or type your farm visit note here...',
} = {}) {
  const {
    language,
    status,
    transcript,
    interimText,
    elapsedSeconds,
    error,
    notice,
    isSpeechSupported,
    isSecureContext,
    startRecording,
    pauseRecording,
    stopRecording,
    changeLanguage,
    setManualTranscript,
    clearTranscript,
    restoreTranscript,
    dismissError,
  } = useVoiceTranscription({
    initialText,
    defaultLanguage,
  });

  const [copied, setCopied] = useState(false);
  const [internalSaving, setInternalSaving] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [saveFeedback, setSaveFeedback] = useState(null);
  const [undoSnapshot, setUndoSnapshot] = useState(null);

  const textareaRef = useRef(null);
  const onTranscriptChangeRef = useRef(onTranscriptChange);
  const copyTimerRef = useRef(null);
  const saveTimerRef = useRef(null);
  const undoTimerRef = useRef(null);

  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange;
  }, [onTranscriptChange]);

  useEffect(() => {
    if (onTranscriptChangeRef.current) {
      onTranscriptChangeRef.current(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    if (status === 'listening' && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [transcript, status]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    };
  }, []);

  const isListening = status === 'listening';
  const isPaused = status === 'paused';
  const isSaving = externalSaving || internalSaving;
  const hasText = transcript.trim().length > 0;

  const selectedLanguageMeta = useMemo(
    () =>
      SUPPORTED_LANGUAGES.find((item) => item.value === language) ||
      SUPPORTED_LANGUAGES[0],
    [language]
  );

  const wordCount = useMemo(() => countWords(transcript), [transcript]);
  const charCount = transcript.length;

  const statusMeta = useMemo(() => {
    switch (status) {
      case 'listening':
        return {
          label: `Listening (${selectedLanguageMeta.shortLabel})`,
          textClass: 'text-green-700',
          icon: <Mic className="h-4 w-4 text-green-700 shrink-0" />,
        };
      case 'paused':
        return {
          label: 'Paused — Text preserved',
          textClass: 'text-amber-700',
          icon: <Pause className="h-4 w-4 text-amber-700 shrink-0" />,
        };
      case 'stopped':
        return {
          label: 'Recording stopped',
          textClass: 'text-slate-700',
          icon: <CheckCircle2 className="h-4 w-4 text-green-700 shrink-0" />,
        };
      case 'error':
        return {
          label: 'Attention required',
          textClass: 'text-red-700',
          icon: <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />,
        };
      default:
        return {
          label: 'Ready to record',
          textClass: 'text-slate-600',
          icon: <Mic className="h-4 w-4 text-slate-500 shrink-0" />,
        };
    }
  }, [selectedLanguageMeta.shortLabel, status]);

  const handleStartOrResume = useCallback(() => {
    setValidationError(null);
    setSaveFeedback(null);
    setUndoSnapshot(null);
    startRecording();
  }, [startRecording]);

  const handleMainMicPress = useCallback(() => {
    if (isListening) {
      pauseRecording();
    } else {
      handleStartOrResume();
    }
  }, [handleStartOrResume, isListening, pauseRecording]);

  const handleLanguageSelect = useCallback(
    (e) => {
      changeLanguage(e.target.value);
    },
    [changeLanguage]
  );

  const handleTextChange = useCallback(
    (e) => {
      const nextVal = e.target.value;
      setManualTranscript(nextVal);
      if (validationError && nextVal.trim().length > 0) {
        setValidationError(null);
      }
      if (undoSnapshot) {
        setUndoSnapshot(null);
      }
    },
    [setManualTranscript, undoSnapshot, validationError]
  );

  const handleClear = useCallback(() => {
    if (!hasText) return;

    setUndoSnapshot({
      text: transcript,
      durationSeconds: elapsedSeconds,
    });
    clearTranscript();
    setValidationError(null);
    setSaveFeedback(null);

    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = window.setTimeout(() => {
      setUndoSnapshot(null);
    }, 6000);
  }, [clearTranscript, elapsedSeconds, hasText, transcript]);

  const handleUndoClear = useCallback(() => {
    if (!undoSnapshot) return;
    restoreTranscript(undoSnapshot.text, undoSnapshot.durationSeconds);
    setUndoSnapshot(null);
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
  }, [restoreTranscript, undoSnapshot]);

  const handleCopy = useCallback(async () => {
    const textToCopy = transcript.trim();
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
    } catch {
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand('copy');
        setCopied(true);
      }
    }

    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => {
      setCopied(false);
    }, 2000);
  }, [transcript]);

  const handleSaveVisitNote = useCallback(async () => {
    const cleanedNote = transcript.trim();

    if (!cleanedNote) {
      setValidationError(
        'Visit note cannot be empty. Speak into the microphone or type your observations before saving.'
      );
      setSaveFeedback(null);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      return;
    }

    if (isSaving) return;

    if (isListening || isPaused) {
      stopRecording();
    }

    setValidationError(null);
    setInternalSaving(true);

    const visitNotePayload = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `visit_${Date.now()}`,
      noteText: cleanedNote,
      language,
      durationSeconds: elapsedSeconds,
      recordedAt: new Date().toISOString(),
    };

    try {
      if (onSaveVisitNote) {
        await onSaveVisitNote(visitNotePayload);
      }
      setSaveFeedback('Visit note saved and ready for Farm Visit records.');
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        setSaveFeedback(null);
      }, 4000);
    } catch (saveErr) {
      setValidationError(
        saveErr?.message ||
          'Unable to save visit note right now. Your text is preserved.'
      );
    } finally {
      setInternalSaving(false);
    }
  }, [
    elapsedSeconds,
    isListening,
    isPaused,
    isSaving,
    language,
    onSaveVisitNote,
    stopRecording,
    transcript,
  ]);

  return (
    <section
      aria-label="Farm Visit Voice-to-Text Recorder"
      className="w-full rounded-2xl border border-slate-200 bg-white shadow-xs"
    >
      {/* Top Bar: Recording Status, Language Selection, Recording Timer */}
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-center gap-2.5 min-w-0">
          {statusMeta.icon}
          <span
            role="status"
            aria-live="polite"
            className={`text-sm font-medium truncate ${statusMeta.textClass}`}
          >
            {statusMeta.label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Globe className="h-4 w-4 text-slate-500 shrink-0" />
            <span className="sr-only">Language</span>
            <select
              aria-label="Select speech recognition language"
              value={language}
              onChange={handleLanguageSelect}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 transition-colors hover:border-slate-400 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/20"
            >
              {SUPPORTED_LANGUAGES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div
            aria-label="Recording timer"
            className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-800 font-mono-tabular"
          >
            {formatTimer(elapsedSeconds)}
          </div>
        </div>
      </div>

      {/* Compatibility, Secure Context, & Recognition Error Banners */}
      {(!isSecureContext || !isSpeechSupported || error) && (
        <div className="border-b border-slate-200 px-5 py-4 sm:px-7">
          {!isSecureContext && (
            <div
              role="alert"
              className="mb-3 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"
            >
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div className="text-sm">
                <p className="font-semibold">HTTPS or localhost required</p>
                <p className="mt-0.5 text-amber-900">
                  Browser microphone access requires HTTPS or{' '}
                  <code className="font-mono-tabular">localhost</code>. You can
                  still type or edit visit notes manually below.
                </p>
              </div>
            </div>
          )}

          {!isSpeechSupported && (
            <div
              role="alert"
              className="mb-3 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div className="text-sm">
                <p className="font-semibold">
                  Speech recognition is unsupported in this browser
                </p>
                <p className="mt-0.5 text-amber-900">
                  Use Google Chrome or Microsoft Edge (Desktop or Android) for
                  live voice-to-text, or type your visit note directly below.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className={`flex items-start justify-between gap-3 rounded-xl border p-4 ${
                error.variant === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-950'
                  : 'border-red-200 bg-red-50 text-red-950'
              }`}
            >
              <div className="flex items-start gap-3 text-sm">
                {error.code === 'network' ? (
                  <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                ) : error.code === 'not-allowed' ||
                  error.code === 'service-not-allowed' ? (
                  <MicOff className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                ) : (
                  <AlertCircle
                    className={`mt-0.5 h-5 w-5 shrink-0 ${
                      error.variant === 'warning'
                        ? 'text-amber-700'
                        : 'text-red-600'
                    }`}
                  />
                )}
                <div>
                  <p className="font-semibold">{error.title}</p>
                  <p className="mt-0.5">{error.message}</p>
                  {error.hint && (
                    <p className="mt-1.5 text-xs opacity-90">{error.hint}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={dismissError}
                className="shrink-0 rounded-md px-2.5 py-1 text-xs font-medium hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* Microphone Control Strip */}
      <div className="border-b border-slate-200 bg-slate-50/60 px-5 py-6 sm:px-7">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative flex h-20 w-20 items-center justify-center shrink-0">
              {isListening && (
                <>
                  <span
                    aria-hidden="true"
                    className="animate-mic-ripple absolute inset-0 rounded-full bg-green-600/25"
                  />
                  <span
                    aria-hidden="true"
                    className="animate-mic-ripple-delayed absolute inset-0 rounded-full bg-green-600/20"
                  />
                </>
              )}
              <button
                type="button"
                onClick={handleMainMicPress}
                disabled={!isSpeechSupported || !isSecureContext}
                aria-label={
                  isListening
                    ? 'Pause recording'
                    : isPaused
                    ? 'Resume recording'
                    : 'Start recording'
                }
                className={`relative z-10 flex h-18 w-18 items-center justify-center rounded-full shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-700/30 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 ${
                  isListening
                    ? 'bg-green-700 text-white hover:bg-green-800 scale-105'
                    : isPaused
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-green-700 text-white hover:bg-green-800'
                }`}
              >
                {isPaused ? (
                  <Pause className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </button>
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">
                {isListening
                  ? 'Listening to Farm Visit Note'
                  : isPaused
                  ? 'Recording Paused'
                  : 'Record Farm Visit Note'}
              </h2>
              <p className="mt-0.5 text-sm text-slate-600">
                {isListening
                  ? `Speaking in ${selectedLanguageMeta.shortLabel}. Words appear live below.`
                  : isPaused
                  ? 'Tap Resume to keep appending to your existing note.'
                  : hasText
                  ? 'Starting again preserves and appends to your existing text.'
                  : 'Speak naturally — farmer name, plot, crop condition, fertilizer, and advice.'}
              </p>

              {isListening && (
                <div
                  aria-hidden="true"
                  className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-green-700"
                >
                  <span className="flex items-end gap-0.5 h-3.5">
                    <span className="w-1 h-3.5 bg-green-600 rounded-xs animate-voice-bar" />
                    <span className="w-1 h-3.5 bg-green-700 rounded-xs animate-voice-bar [animation-delay:160ms]" />
                    <span className="w-1 h-3.5 bg-green-600 rounded-xs animate-voice-bar [animation-delay:320ms]" />
                    <span className="w-1 h-3.5 bg-green-700 rounded-xs animate-voice-bar [animation-delay:480ms]" />
                  </span>
                  <span>Microphone active</span>
                </div>
              )}

              {notice && (
                <p
                  className={`mt-2 text-xs font-medium ${
                    isListening ? 'text-amber-700' : 'text-slate-600'
                  }`}
                >
                  {notice}
                </p>
              )}
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center justify-center gap-2.5 sm:w-auto sm:justify-end">
            {!isListening && (
              <button
                type="button"
                onClick={handleStartOrResume}
                disabled={!isSpeechSupported || !isSecureContext}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 whitespace-nowrap shrink-0"
              >
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Resume Recording</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    <span>Start Recording</span>
                  </>
                )}
              </button>
            )}

            {isListening && (
              <button
                type="button"
                onClick={pauseRecording}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 whitespace-nowrap shrink-0"
              >
                <Pause className="h-4 w-4" />
                <span>Pause</span>
              </button>
            )}

            {(isListening || isPaused) && (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 whitespace-nowrap shrink-0"
              >
                <Square className="h-4 w-4 fill-current" />
                <span>Stop Recording</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Live Editable Transcription Area */}
      <div className="px-5 py-5 sm:px-7">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="visit-note-transcription"
            className="text-sm font-semibold text-slate-800"
          >
            Farm Visit Transcription
          </label>
          {interimText && (
            <span className="text-xs font-medium text-green-700">
              Transcribing live speech...
            </span>
          )}
        </div>

        <textarea
          ref={textareaRef}
          id="visit-note-transcription"
          rows={7}
          value={transcript}
          onChange={handleTextChange}
          placeholder={placeholder}
          lang={language}
          className={`w-full min-h-[220px] resize-y rounded-xl border bg-white px-4 py-3.5 text-base leading-relaxed text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 ${
            validationError
              ? 'border-red-400 focus:border-red-600 focus:ring-red-600/20'
              : 'border-slate-300 focus:border-green-700 focus:ring-green-700/20'
          }`}
        />

        {/* Subtle Unboxed Guidance & Word Count Metadata */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span>{selectedLanguageMeta.label}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{wordCount} words</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{charCount} characters</span>
          </div>
          <span>
            Cover farmer, location, crop, problem, fertilizer, advice &amp; next visit
          </span>
        </div>

        {validationError && (
          <div
            role="alert"
            className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-800"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{validationError}</span>
          </div>
        )}

        {undoSnapshot && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
            <span>Transcription cleared.</span>
            <button
              type="button"
              onClick={handleUndoClear}
              className="inline-flex items-center gap-1.5 font-semibold text-green-700 hover:text-green-800 focus-visible:outline-none focus-visible:underline"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Undo</span>
            </button>
          </div>
        )}

        {saveFeedback && (
          <div
            role="status"
            className="mt-3 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-800"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-700" />
            <span>{saveFeedback}</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <button
          type="button"
          onClick={handleClear}
          disabled={!hasText}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-red-700 hover:border-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap shrink-0"
        >
          <Trash2 className="h-4 w-4" />
          <span>Clear Text</span>
        </button>

        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!hasText}
            className="inline-flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap shrink-0"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-700" />
                <span className="text-green-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy Text</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSaveVisitNote}
            disabled={isSaving}
            className="inline-flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 whitespace-nowrap shrink-0"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Save Visit Note'}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

export default VoiceRecorder;
