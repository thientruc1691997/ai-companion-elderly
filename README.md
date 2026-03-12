AI-powered elderly care assistant — Chat, Vision, Health Tracking

## Project Structure
```
carecompanion/
├── backend/                  # Python FastAPI
│   ├── main.py               # Entry point
│   ├── routers/              # API endpoints per tab
│   │   ├── chat.py           # AI Companion
│   │   ├── vision.py         # Computer Vision
│   │   ├── medications.py    # Medication management
│   │   ├── dashboard.py      # Health metrics
│   │   └── emergency.py      # Emergency alerts
│   ├── models/               # AI / Database logic
│   │   ├── llm_handler.py    # Claude API
│   │   ├── vision_model.py   # YOLOv8 + MediaPipe
│   │   └── health_tracker.py # SQLite
│   └── requirements.txt
│
└── frontend/                 # React (Vite)
    ├── index.html
    ├── components/          
    │   ├── Dashboard.jsx
    │   ├── VoiceCompanion.jsx
    │   ├── VisionMonitor.jsx
    │   ├── Medications.jsx
    │   └── Emergency.jsx
    └── services/
        ├── api.js            # All API calls
        └── speech.js         # Web Speech API
```

---

## Setup & Run

### 1. Backend (Python)
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate          # macOS/Linux
# venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "ANTHROPIC_API_KEY=sk-ant-xxxx" > .env

# Start server
python main.py
# → Server running at http://localhost:8000
# → API docs at  http://localhost:8000/docs
```

### 2. Frontend (React + Vite)
```bash
cd frontend

# Scaffold Vite + React (if no package.json yet)
npm create vite@latest . -- --template react
npm install

# Copy files into src/
cp components/* src/components/
cp services/*   src/services/

# Set environment variables
echo "VITE_API_URL=http://localhost:8000/api" > .env
echo "VITE_WS_URL=ws://localhost:8000/api"   >> .env

# Start dev server
npm run dev
# → Frontend at http://localhost:5173
```

---

## API Endpoints

| Method | Endpoint                  | Description                    |
|--------|---------------------------|--------------------------------|
| GET    | `/api/dashboard/overview` | Aggregated health summary      |
| POST   | `/api/chat/message`       | Send message to AI companion   |
| WS     | `/api/vision/stream`      | Real-time camera stream        |
| GET    | `/api/medications/today`  | Today's medication schedule    |
| POST   | `/api/medications/log`    | Mark a dose as taken           |
| POST   | `/api/emergency/alert`    | Trigger emergency alert        |

Full interactive docs: http://localhost:8000/docs (Swagger UI — auto-generated)

---

## Tech Stack

| Layer     | Technology                             |
|-----------|----------------------------------------|
| Backend   | Python 3.11 · FastAPI · Uvicorn        |
| AI / LLM  | Claude API (Anthropic)                 |
| Vision    | YOLOv8 (Ultralytics) · MediaPipe Pose  |
| Database  | SQLite · SQLAlchemy (async)            |
| Frontend  | React 18 · Vite                        |
| Voice     | Web Speech API (browser native)        |
| Realtime  | WebSocket                              |
