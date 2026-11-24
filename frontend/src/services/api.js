const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}

export const api = {
  getVisits: () => request('/visits'),
  getFarmers: () => request('/farmers'),
  recordVisit: (visit) => request('/visits/record', {
    method: 'POST',
    body: JSON.stringify(visit),
  }),
  createVisit: (rawNote) => request('/visits', { method: 'POST', body: JSON.stringify({ rawNote }) }),
  getFarmerHistory: (id) => request(`/farmers/${id}/history`),
  getReminders: () => request('/reminders'),
  completeReminder: (id) => request(`/reminders/${id}/complete`, {
    method: 'PATCH',
  }),
  getMonthlyReport: (month, year) => request(`/reports?month=${month}&year=${year}`),
};
