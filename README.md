# StudyVault AI:

An AI-powered study companion for students. Upload a document, get a grounded summary and Q&A, turn it into spaced-repetition flashcards, and keep a persistent-memory AI companion alongside it all.

**Live app:** [studyvault-ai-gamma.vercel.app](https://studyvault-ai-gamma.vercel.app)

> Built as a 48-hour hackathon MVP, then extended well beyond that scope. See [Project History](#project-history) below.

---

## Features:

- **Document upload & processing** — PDF, DOCX, TXT, and Markdown. Text is extracted, chunked, and embedded for retrieval.
- **AI summary & key points** — a grounded summary generated from the document itself, not a generic response.
- **Document Q&A (RAG)** — ask questions about an uploaded document; answers are retrieved and grounded in the actual content, with an honest "not found" response when the material doesn't cover it.
- **AI-generated flashcards** — from an entire document or a highlighted snippet, reviewed via the **SM-2 spaced-repetition algorithm**.
- **AI Companion** — a general-purpose chat, separate from document Q&A, with **persistent cross-conversation memory**: tell it something once, and it's available in any future conversation.
- **In-app Help Assistant** — a floating widget that answers "how do I use this app" questions.
- **Email-verified accounts** — registration requires a 6-digit OTP confirmed by email before login is possible; changing your account email requires the same re-verification.

## Tech Stack:

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Tailwind CSS, via Vite |
| Backend | FastAPI (Python), served by Uvicorn |
| Database | PostgreSQL, via SQLAlchemy's async ORM (`asyncpg`) |
| Migrations | Alembic |
| Auth | JWT (`PyJWT`) + `bcrypt` password hashing |
| AI | Google Gemini, via the `google-genai` SDK (chat, embeddings, flashcard generation) |
| Retrieval | Manual cosine similarity over stored embeddings (no vector-database extension) |
| Email | Brevo's HTTPS email API (for OTP delivery) |
| Document parsing | `pypdf` (PDF), `python-docx` (DOCX) |

### Deployment:

| Service | Platform |
|---|---|
| Frontend | [Vercel](https://vercel.com) |
| Backend | [Render](https://render.com) (free tier — the API may take 30–60s to respond after a period of inactivity while the instance wakes up) |
| Database | Hosted PostgreSQL |

## Getting Started (Local Development):

### Prerequisites:

- Python 3.11+
- Node.js 18+
- A PostgreSQL instance
- A Google Gemini API key
- A Brevo account + API key (for sending OTP emails)

### Backend setup:

```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1   # Windows PowerShell — use source venv/bin/activate on macOS/Linux
pip install -r requirements.txt
```

Create a `.env` file in `backend/` (see [Environment Variables](#environment-variables) below), then run migrations and start the server:

```bash
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`, with interactive docs at `http://localhost:8000/docs`.

### Frontend setup:

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`, pointed at the local backend by default.

### Environment Variables:

**Backend** (`backend/.env`):

```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/studyvault_db
JWT_SECRET_KEY=<a long random string>
GEMINI_API_KEY=<your Gemini API key>
BREVO_API_KEY=<your Brevo API key>
BREVO_FROM_EMAIL=<the address OTP emails are sent from>
CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"]
```

**Frontend** (`frontend/.env`, optional):

```
VITE_API_BASE_URL=http://localhost:8000/api
```

Omit this to fall back to the local-dev default automatically.

> **Never commit `.env` files.** They're already covered by `.gitignore`.

## Project Structure:

```
studyvault-ai
├── backend
│   ├── app
│   │   ├── api             # Route handlers (auth, documents, rag, companion, etc.)
│   │   ├── models          # SQLAlchemy models
│   │   ├── services        # Business logic (document parsing, email, SM-2, cleanup)
│   │   ├── main.py         # FastAPI app entrypoint
│   │   ├── config.py       # Settings (pydantic-settings)
│   │   └── database.py     # Async engine/session setup
│   │
│   ├── alembic             # Database migrations
│   └── requirements.txt
│
└── frontend
    ├── src
    │   ├── api             # Axios client
    │   ├── components      # UI components
    │   ├── context         # Auth & theme providers
    │   └── pages           # Top-level views
    └── package.json
```

## Security Notes:

- Passwords are hashed with `bcrypt`; JWTs are used for session auth.
- Every document, flashcard, conversation, and memory operation verifies ownership server-side — a user ID is never trusted from the frontend.
- Uploaded files are stored under UUID-based names, never the original filename.
- Account access requires a verified email address; changing the account email requires re-verifying the new address via a fresh OTP before it takes effect.
- Unverified accounts older than 24 hours are automatically cleaned up by a background task.

## Known Limitations:

- **File storage is ephemeral in production.** The backend's free-tier hosting runs on an ephemeral filesystem, so uploaded files may not survive a redeploy or restart. Document content itself is safe (it's stored as extracted, embedded text in Postgres), but the original raw file — and the ability to re-download it — is not guaranteed to persist.
- **Cold starts.** The free-tier backend sleeps after a period of inactivity; the first request afterward may take up to a minute.
- **RAG uses in-process cosine similarity**, not a dedicated vector database — fine at this scale, but not built to scale to a large document corpus.

## Project History:

This project started as a 48-hour hackathon MVP scoped to document upload, summarization, and basic Q&A. It was extended afterward to add flashcards with spaced repetition, a persistent-memory AI Companion, in-app help, and email verification — several of which were originally listed as explicit future-scope items in the earliest project plan. See the PRD for the full history of what changed and why.

## License:

Licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE.md) — you're free to view, run, and modify this code for any noncommercial purpose (personal use, learning, research, coursework, etc.), but commercial use requires the copyright holder's permission. See [LICENSE.md](LICENSE.md) for the full terms.