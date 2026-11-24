# The Field Officer's Notebook
## Setup
cd backend && npm install && npm start      # API on :5000
cd frontend && npm install && npm run dev   # UI on :5173 (proxies /api to :5000)
## Verify
1. Save: "Karim mia, north plot, rice, yellowing on the lower leaves, said he has not applied urea since planting, suggested top dressing, come back in two weeks" -> reminder in 14 days.
2. Save: "Karim, north plot, rice, leaves still pale, advised more urea, come back in a week" -> same farmer, alias "Karim" added, first reminder auto-completed, new one created.
3. Save: "Rahim, south plot, potato, no problem, everything looks good" -> healthy visit, no reminder.
4. Monthly Report -> Generate, Print / Save PDF, Export CSV.
