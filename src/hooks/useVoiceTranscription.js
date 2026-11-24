import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const SUPPORTED_LANGUAGES = [
  { value: 'en-US', label: 'English (en-US)', shortLabel: 'English' },
  { value: 'bn-BD', label: 'বাংলা — Bangla (bn-BD)', shortLabel: 'Bangla' },
];

export function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function checkIsSecureEnvironment() {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  const isLocalhost =
    host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  return Boolean(window.isSecureContext || isLocalhost);
}

/**
 * Joins recognized or interim speech onto existing text cleanly
 * without overwriting or introducing double spaces before punctuation.
 */
export function appendSpeechChunk(existing, incoming) {
  const cleanedIncoming = String(incoming || '').replace(/^\s+/, '');
  if (!cleanedIncoming) return existing;
  if (!existing) return cleanedIncoming;

  const startsWithPunctuation = /^[,.;:!?।]/.test(cleanedIncoming);
  const endsWithWhitespace = /[\s\n]$/.test(existing);

  if (startsWithPunctuation || endsWithWhitespace) {
    return existing + cleanedIncoming;
  }
  return `${existing} ${cleanedIncoming}`;
}

function mapSpeechRecognitionError(errorCode) {
  switch (errorCode) {
    case 'not-allowed':
    case 'service-not-allowed':
      return {
        code: errorCode,
        title: 'Microphone permission denied',
        message:
          'Microphone access was blocked or denied by the browser or operating system.',
        hint: 'Click the site-settings icon in Chrome’s address bar, set Microphone to Allow, and try again.',
        variant: 'error',
      };
    case 'audio-capture':
      return {
        code: errorCode,
        title: 'No microphone detected',
        message:
          'No working microphone was found, or another application is currently using it.',
        hint: 'Connect or select an active microphone in your device sound settings and retry.',
        variant: 'error',
      };
    case 'network':
      return {
        code: errorCode,
        title: 'Speech recognition network error',
        message:
          'Chrome’s Web Speech API requires an active internet connection to convert voice to text.',
        hint: 'Verify your Wi-Fi or mobile data connection and tap Start Recording to continue.',
        variant: 'error',
      };
    case 'language-not-supported':
      return {
        code: errorCode,
        title: 'Language unavailable',
        message:
          'The selected language could not be initialized by the browser speech service.',
        hint: 'Try switching between English (en-US) and Bangla (bn-BD).',
        variant: 'error',
      };
    case 'no-speech':
      return {
        code: errorCode,
        title: 'No speech detected',
        message: 'No voice input was heard during the last listening interval.',
        hint: 'Hold the microphone closer and speak clearly.',
        variant: 'warning',
      };
    default:
      return {
        code: errorCode || 'unknown',
        title: 'Speech recognition interrupted',
        message: `Speech recognition stopped unexpectedly (${errorCode || 'unknown'}).`,
        hint: 'Your recorded text is preserved. Tap Start Recording to continue.',
        variant: 'error',
      };
  }
}

/**
 * Reusable Web Speech API hook for continuous voice-to-text transcription.
 * Handles interim vs final separation, anti-duplication, pause/resume,
 * text preservation, permissions, network/compatibility errors, and cleanup.
 */
export function useVoiceTranscription({
  initialText = '',
  defaultLanguage = 'en-US',
} = {}) {
  const [language, setLanguage] = useState(defaultLanguage);
  const [status, setStatus] = useState('idle'); // 'idle' | 'listening' | 'paused' | 'stopped' | 'error'
  const [committedText, setCommittedText] = useState(initialText);
  const [interimText, setInterimText] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const isSpeechSupported = useMemo(
    () => Boolean(getSpeechRecognitionConstructor()),
    []
  );
  const isSecureContext = useMemo(() => checkIsSecureEnvironment(), []);

  // Synchronous refs to keep Web Speech callbacks accurate and prevent stale closures
  const recognitionRef = useRef(null);
  const intentRef = useRef('idle'); // 'idle' | 'listening' | 'paused' | 'stopped'
  const committedTextRef = useRef(initialText);
  const interimTextRef = useRef('');
  const lastFinalIndexRef = useRef(-1);
  const fatalErrorRef = useRef(false);
  const isStartingRef = useRef(false);
  const restartTimeoutRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const languageRef = useRef(language);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const transcript = useMemo(() => {
    if (!interimText) return committedText;
    return appendSpeechChunk(committedText, interimText);
  }, [committedText, interimText]);

  // Recording duration timer
  useEffect(() => {
    if (status === 'listening') {
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    return () => {
      if (timerIntervalRef.current !== null) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [status]);

  // Passive microphone permission status watcher
  useEffect(() => {
    let permissionStatus = null;
    let cancelled = false;

    async function watchMicPermission() {
      try {
        if (!navigator.permissions || !navigator.permissions.query) return;
        const result = await navigator.permissions.query({ name: 'microphone' });
        if (cancelled) return;
        permissionStatus = result;

        if (result.state === 'denied') {
          setError(mapSpeechRecognitionError('not-allowed'));
        }

        result.onchange = () => {
          if (result.state === 'granted') {
            setError((prev) => (prev?.code === 'not-allowed' ? null : prev));
          } else if (result.state === 'denied') {
            setError(mapSpeechRecognitionError('not-allowed'));
          }
        };
      } catch {
        // Permissions API for 'microphone' is unsupported in some browsers
      }
    }

    watchMicPermission();

    return () => {
      cancelled = true;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, []);

  const clearScheduledRestart = useCallback(() => {
    if (restartTimeoutRef.current !== null) {
      window.clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, []);

  const teardownRecognition = useCallback((mode) => {
    const instance = recognitionRef.current;
    if (!instance) return;

    if (mode === 'abort') {
      instance.onstart = null;
      instance.onresult = null;
      instance.onerror = null;
      instance.onend = null;
      try {
        instance.abort();
      } catch {
        // Ignore already-stopped instance
      }
      recognitionRef.current = null;
    } else {
      try {
        instance.stop();
      } catch {
        // Ignore if not currently running
      }
    }
  }, []);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      intentRef.current = 'idle';
      clearScheduledRestart();
      teardownRecognition('abort');
      if (timerIntervalRef.current !== null) {
        window.clearInterval(timerIntervalRef.current);
      }
    };
  }, [clearScheduledRestart, teardownRecognition]);

  const startRecognitionSession = useCallback(() => {
    const SpeechRec = getSpeechRecognitionConstructor();
    if (!SpeechRec) return;

    teardownRecognition('abort');
    lastFinalIndexRef.current = -1;
    fatalErrorRef.current = false;

    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = languageRef.current;

    recognition.onstart = () => {
      if (intentRef.current === 'listening') {
        setStatus('listening');
        setError(null);
        setNotice(null);
      }
    };

    recognition.onresult = (event) => {
      let newFinalChunk = '';
      let currentInterimChunk = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const phrase = result[0]?.transcript || '';

        if (result.isFinal) {
          if (i > lastFinalIndexRef.current) {
            lastFinalIndexRef.current = i;
            newFinalChunk = appendSpeechChunk(newFinalChunk, phrase);
          }
        } else {
          currentInterimChunk = appendSpeechChunk(currentInterimChunk, phrase);
        }
      }

      if (newFinalChunk) {
        const updatedCommitted = appendSpeechChunk(
          committedTextRef.current,
          newFinalChunk
        );
        committedTextRef.current = updatedCommitted;
        setCommittedText(updatedCommitted);
      }

      interimTextRef.current = currentInterimChunk;
      setInterimText(currentInterimChunk);
      setNotice(null);
    };

    recognition.onerror = (event) => {
      const code = event.error;

      if (code === 'aborted' && intentRef.current !== 'listening') {
        return;
      }

      if (code === 'no-speech') {
        setNotice('No speech detected yet — speak clearly near your microphone.');
        return;
      }

      fatalErrorRef.current = true;
      intentRef.current = 'stopped';
      setStatus('error');
      setError(mapSpeechRecognitionError(code));
    };

    recognition.onend = () => {
      // Flush trailing unfinalized interim speech so end-of-sentence words aren't lost
      if (interimTextRef.current) {
        const flushed = appendSpeechChunk(
          committedTextRef.current,
          interimTextRef.current
        );
        committedTextRef.current = flushed;
        setCommittedText(flushed);
        interimTextRef.current = '';
        setInterimText('');
      }

      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }

      // Seamlessly restart if browser ended continuous listening during silence
      if (intentRef.current === 'listening' && !fatalErrorRef.current) {
        clearScheduledRestart();
        restartTimeoutRef.current = window.setTimeout(() => {
          if (intentRef.current === 'listening') {
            startRecognitionSession();
          }
        }, 160);
        return;
      }

      if (intentRef.current === 'paused') {
        setStatus('paused');
      } else if (intentRef.current === 'stopped') {
        setStatus((prev) => (prev === 'error' ? 'error' : 'stopped'));
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      fatalErrorRef.current = true;
      intentRef.current = 'stopped';
      setStatus('error');
      setError({
        code: 'start-failed',
        title: 'Unable to start speech recognition',
        message: 'Could not initialize the browser speech recognition session.',
        hint: 'Wait a moment and click Start Recording again.',
        variant: 'error',
      });
    }
  }, [clearScheduledRestart, teardownRecognition]);

  const startRecording = useCallback(async () => {
    if (isStartingRef.current || status === 'listening') return;

    if (!isSecureContext) {
      setStatus('error');
      setError({
        code: 'insecure-context',
        title: 'HTTPS or localhost required',
        message:
          'Microphone access is blocked on insecure HTTP origins by browser security policy.',
        hint: 'Open this application over HTTPS or http://localhost to enable voice recording.',
        variant: 'error',
      });
      return;
    }

    if (!isSpeechSupported) {
      setStatus('error');
      setError({
        code: 'unsupported-browser',
        title: 'Speech recognition is not supported in this browser',
        message:
          'This browser does not provide the Web Speech API (SpeechRecognition).',
        hint: 'Please use Google Chrome or Microsoft Edge on desktop or Android, or type your visit note manually below.',
        variant: 'error',
      });
      return;
    }

    isStartingRef.current = true;
    setError(null);
    setNotice(null);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }

      intentRef.current = 'listening';
      setStatus('listening');
      startRecognitionSession();
    } catch (err) {
      const name = err?.name || '';
      intentRef.current = 'stopped';
      setStatus('error');

      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError(mapSpeechRecognitionError('not-allowed'));
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError(mapSpeechRecognitionError('audio-capture'));
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setError({
          code: 'mic-busy',
          title: 'Microphone is busy or unavailable',
          message:
            'Another application or browser tab is currently using the microphone.',
          hint: 'Close other audio apps and try Start Recording again.',
          variant: 'error',
        });
      } else {
        setError({
          code: 'permission-error',
          title: 'Microphone access error',
          message:
            err?.message ||
            'An unexpected error occurred while accessing your microphone.',
          hint: 'Check Chrome microphone permissions and try again.',
          variant: 'error',
        });
      }
    } finally {
      isStartingRef.current = false;
    }
  }, [isSecureContext, isSpeechSupported, startRecognitionSession, status]);

  const pauseRecording = useCallback(() => {
    if (status !== 'listening') return;
    clearScheduledRestart();
    intentRef.current = 'paused';
    setStatus('paused');
    setNotice('Recording paused. Existing transcription is preserved.');
    teardownRecognition('stop');
  }, [clearScheduledRestart, status, teardownRecognition]);

  const stopRecording = useCallback(() => {
    if (status !== 'listening' && status !== 'paused') return;
    clearScheduledRestart();
    intentRef.current = 'stopped';
    setStatus('stopped');
    setNotice(null);
    teardownRecognition('stop');
  }, [clearScheduledRestart, status, teardownRecognition]);

  const changeLanguage = useCallback(
    (nextLanguage) => {
      setLanguage(nextLanguage);
      languageRef.current = nextLanguage;

      if (status === 'listening') {
        clearScheduledRestart();
        teardownRecognition('abort');
        startRecognitionSession();
      }
    },
    [clearScheduledRestart, startRecognitionSession, status, teardownRecognition]
  );

  const setManualTranscript = useCallback((nextText) => {
    committedTextRef.current = nextText;
    setCommittedText(nextText);
    if (interimTextRef.current) {
      interimTextRef.current = '';
      setInterimText('');
    }
  }, []);

  const clearTranscript = useCallback(() => {
    if (status === 'listening' || status === 'paused') {
      clearScheduledRestart();
      intentRef.current = 'stopped';
      setStatus('stopped');
      teardownRecognition('stop');
    }

    committedTextRef.current = '';
    interimTextRef.current = '';
    setCommittedText('');
    setInterimText('');
    setElapsedSeconds(0);
    setNotice(null);
  }, [clearScheduledRestart, status, teardownRecognition]);

  const restoreTranscript = useCallback((text, durationSeconds = 0) => {
    committedTextRef.current = text;
    interimTextRef.current = '';
    setCommittedText(text);
    setInterimText('');
    setElapsedSeconds(durationSeconds);
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  return {
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
  };
}
