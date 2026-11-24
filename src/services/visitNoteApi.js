const LOCAL_VISIT_NOTES_KEY = 'field_officers_notebook_visit_notes_v1';

/**
 * Clean API integration function for future Node.js + MySQL backend.
 * When your Express/Node.js backend is ready, pass `apiEndpoint` (e.g. '/api/farm-visits/notes')
 * or replace the localStorage fallback inside this function.
 *
 * Expected MySQL table columns:
 * - id (VARCHAR/UUID)
 * - note_text (TEXT)
 * - language (VARCHAR(10): 'en-US' | 'bn-BD')
 * - duration_seconds (INT)
 * - recorded_at (DATETIME)
 */
export async function saveVisitNoteToApi(
  visitNote,
  { apiEndpoint = null, authToken = null } = {}
) {
  const payload = {
    id:
      visitNote.id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `visit_${Date.now()}`),
    noteText: visitNote.noteText.trim(),
    language: visitNote.language || 'en-US',
    durationSeconds: Number(visitNote.durationSeconds) || 0,
    recordedAt: visitNote.recordedAt || new Date().toISOString(),
  };

  if (apiEndpoint) {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    return await response.json();
  }

  // Local persistence fallback until connected to Node.js + MySQL backend
  const existing = loadLocalVisitNotes();
  const updated = [payload, ...existing];
  localStorage.setItem(LOCAL_VISIT_NOTES_KEY, JSON.stringify(updated));
  return payload;
}

export function loadLocalVisitNotes() {
  try {
    const raw = localStorage.getItem(LOCAL_VISIT_NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function deleteLocalVisitNote(noteId) {
  const existing = loadLocalVisitNotes();
  const updated = existing.filter((note) => note.id !== noteId);
  try {
    localStorage.setItem(LOCAL_VISIT_NOTES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }
  return updated;
}
