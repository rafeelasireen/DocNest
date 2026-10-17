# DocNest — Technical Specification

**Secure Cloud Document Intelligence Platform**

Status: Greenfield — ready for implementation confirmation  
Project path: `/Users/tony/Developments/rahman/DocNest`

---

## 1. Project Overview

DocNest is a full-stack document intelligence platform that lets users upload PDF documents to secure cloud storage, receive AI-generated summaries and quality scores, and chat with documents using a RAG (Retrieval-Augmented Generation) pipeline powered by Llama 3.2.

### Core Capabilities

- User authentication with JWT, bcrypt password hashing, and email verification
- Role-based access control (Admin, User, Viewer)
- PDF upload, download, and cloud storage via MinIO
- Document versioning with backup history and restore
- AI summarization, document scoring, and contextual Q&A chat
- Audit logging for security-sensitive actions
- Dashboard with storage usage, document scores, and inline chat

---

## 2. Technology Stack

### Frontend

| Layer | Technology |
|-------|------------|
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS |
| UI components | Shadcn UI |
| Data fetching | React Query (TanStack Query) |
| HTTP client | Axios with JWT interceptor |
| Routing | React Router v6 |
| Charts | Recharts (score visualizations) + custom SVG score rings |

### Backend

| Layer | Technology |
|-------|------------|
| Framework | Python 3.11+ / FastAPI |
| ORM | SQLAlchemy 2.x |
| Migrations | Alembic |
| Auth | python-jose (JWT) + passlib/bcrypt |
| File parsing | PyMuPDF (fitz) |
| RAG | LangChain + LangChain Community |
| Vector DB client | ChromaDB |
| Object storage | MinIO Python SDK |
| Async tasks | FastAPI BackgroundTasks |

### Infrastructure (Docker Compose)

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `postgres` | postgres:16 | 5432 | Relational database |
| `minio` | minio/minio | 9000 / 9001 | S3-compatible object storage |
| `chromadb` | chromadb/chroma | 8000 | Vector embeddings store |
| `ollama` | ollama/ollama | 11434 | Local LLM inference |
| `backend` | build `./backend` | 8000 | FastAPI REST API |
| `frontend` | build `./frontend` | 5173 | Vite dev server |

**Ollama models required:**
- `llama3.2` — summarization, chat, document analysis
- `nomic-embed-text` — text embeddings for RAG

---

## 3. System Architecture

```mermaid
flowchart TB
    User[User Browser]
    React["React + TypeScript + Tailwind + Shadcn"]
    FastAPI[FastAPI Backend]
    PG[(PostgreSQL)]
    MinIO["MinIO — bucket: cloudvault-files"]
    Chroma[(ChromaDB)]
    Ollama["Ollama — Llama 3.2"]

    User --> React
    React -->|"REST + JWT Bearer"| FastAPI
    FastAPI --> PG
    FastAPI --> MinIO
    FastAPI --> Chroma
    FastAPI --> Ollama
```

### Data Flow — Document Upload to AI Answer

```mermaid
flowchart LR
    Upload[PDF Upload] --> MinIOStore[MinIO Storage]
    Upload --> PyMuPDF[PyMuPDF Text Extract]
    PyMuPDF --> Chunk[Text Chunking]
    Chunk --> Embed[Ollama Embeddings]
    Embed --> ChromaStore[ChromaDB Index]
    ChromaStore --> Retrieve[Similarity Search]
    Retrieve --> LLM[Llama 3.2]
    LLM --> Summary[Summary]
    LLM --> ChatAnswer[Chat Answer]
    LLM --> Score[Document Score]
```

---

## 4. Project Structure

```
DocNest/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── TECHNICAL_SPEC.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── main.py
│   ├── config.py
│   ├── dependencies.py
│   ├── routes/
│   │   ├── auth.py
│   │   ├── documents.py
│   │   └── chat.py
│   ├── services/
│   │   ├── minio_service.py
│   │   ├── rag_service.py
│   │   ├── ai_service.py
│   │   ├── scoring_service.py
│   │   └── email_service.py
│   ├── models/
│   │   ├── user.py
│   │   ├── document.py
│   │   └── schemas.py
│   └── database/
│       ├── postgres.py
│       └── migrations/
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── lib/api.ts
        ├── hooks/
        ├── pages/
        │   ├── Login.tsx
        │   ├── Register.tsx
        │   ├── VerifyEmail.tsx
        │   ├── VaultDashboard.tsx
        │   ├── DocumentDetail.tsx
        │   ├── Chat.tsx
        │   └── Security.tsx
        └── components/
            ├── layout/       AppLayout, Breadcrumb
            ├── dashboard/    StatsRow, DocumentCard, InlineChat
            ├── document/     SummaryCard, ScoreBars, BackupHistory
            ├── chat/         ChatPanel, ChatBubble, SourceTag
            └── ui/           ScoreRing, UploadZone
```

---

## 5. Database Schema (PostgreSQL)

### `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID / SERIAL PK | |
| `name` | VARCHAR | Display name |
| `email` | VARCHAR UNIQUE | Login identifier |
| `password_hash` | VARCHAR | bcrypt hash |
| `role` | ENUM | `admin`, `user`, `viewer` |
| `is_verified` | BOOLEAN | Email verification flag |
| `created_at` | TIMESTAMP | Auto-set on insert |

### `documents`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID / SERIAL PK | |
| `user_id` | FK → users | Owner |
| `filename` | VARCHAR | Original filename |
| `minio_path` | VARCHAR | Object key in MinIO |
| `size` | BIGINT | Bytes |
| `upload_date` | TIMESTAMP | |
| `summary` | TEXT NULL | AI-generated summary |
| `score` | JSONB NULL | `{completeness, readability, structure, overall}` |

### `document_versions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID / SERIAL PK | |
| `document_id` | FK → documents | |
| `version_number` | INT | Incremental |
| `minio_path` | VARCHAR | Versioned object key |
| `size` | BIGINT | |
| `created_at` | TIMESTAMP | |

### `chat_history`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID / SERIAL PK | |
| `user_id` | FK → users | |
| `document_id` | FK → documents | |
| `question` | TEXT | User query |
| `answer` | TEXT | AI response |
| `source_page` | INT NULL | Page citation (e.g. 4) |
| `created_at` | TIMESTAMP | |

### `audit_logs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID / SERIAL PK | |
| `user_id` | FK → users | |
| `action` | VARCHAR | e.g. `login`, `upload`, `delete` |
| `resource_type` | VARCHAR | e.g. `document` |
| `resource_id` | VARCHAR NULL | |
| `timestamp` | TIMESTAMP | |

### `email_verification_tokens`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID / SERIAL PK | |
| `user_id` | FK → users | |
| `token` | VARCHAR UNIQUE | One-time token |
| `expires_at` | TIMESTAMP | TTL (e.g. 24h) |

---

## 6. Authentication & Authorization

### Auth Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as FastAPI
    participant DB as PostgreSQL

    Note over U,DB: Signup
    U->>FE: Register form
    FE->>API: POST /auth/register
    API->>API: bcrypt hash password
    API->>DB: Insert user is_verified=false
    API->>U: Send verification email

    Note over U,DB: Verify
    U->>FE: Click email link
    FE->>API: POST /auth/verify
    API->>DB: Set is_verified=true

    Note over U,DB: Login
    U->>FE: Login form
    FE->>API: POST /auth/login
    API->>DB: Verify password + is_verified
    API->>FE: JWT token
    FE->>FE: Store token localStorage
    FE->>U: Redirect to /vault
```

### JWT Specification

- Algorithm: **HS256**
- Expiry: **24 hours**
- Payload: `{ sub: user_id, email, role, exp }`
- Header: `Authorization: Bearer eyJhbGciOiJIUzI1...`

### RBAC Matrix

| Action | Admin | User | Viewer |
|--------|-------|------|--------|
| Register / Login | Yes | Yes | Yes |
| Upload documents | Yes | Yes | No |
| View own documents | Yes | Yes | Yes |
| Delete documents | Yes | Yes | No |
| Chat with documents | Yes | Yes | Yes |
| Summarize / Score | Yes | Yes | Yes |
| Restore version | Yes | Yes | No |
| View audit logs | Yes | No | No |
| Access all users' docs | Yes | No | No |

---

## 7. REST API Specification

### Authentication

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/auth/register` | `{ name, email, password }` | `{ message }` |
| POST | `/auth/login` | `{ email, password }` | `{ access_token, token_type }` |
| POST | `/auth/verify` | `{ token }` | `{ message }` |

### Documents

| Method | Endpoint | Auth | Response |
|--------|----------|------|----------|
| POST | `/documents/upload` | user, admin | `{ id, filename, size }` |
| GET | `/documents` | all | `{ documents[], storage_used, storage_quota }` |
| GET | `/documents/{id}` | all | Document metadata + summary + score |
| DELETE | `/documents/{id}` | user, admin | `{ message }` |
| GET | `/documents/{id}/download` | all | File stream |
| GET | `/documents/{id}/versions` | all | `{ versions[] }` |
| POST | `/documents/{id}/restore/{version_id}` | user, admin | `{ message }` |
| GET | `/documents/{id}/score` | all | `{ completeness, readability, structure, overall }` |
| POST | `/documents/summarize` | all | `{ summary }` |

### AI / Chat

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/chat` | `{ document_id, question }` | `{ answer, source_page }` |
| GET | `/chat/{document_id}` | — | `{ messages[] }` |

### Admin

| Method | Endpoint | Auth | Response |
|--------|----------|------|----------|
| GET | `/admin/audit-logs` | admin | `{ logs[] }` |

---

## 8. Cloud Storage (MinIO)

**Bucket:** `cloudvault-files`

**Path conventions:**

```
cloudvault-files/
├── user_1/
│   ├── resume.pdf              ← current version
│   └── report.pdf
├── user_1/versions/42/
│   ├── v1_report.pdf
│   ├── v2_report.pdf
│   └── v3_report.pdf
└── user_2/
    └── invoice.pdf
```

**Service methods (`minio_service.py`):**

- `upload(file, user_id, filename)` → minio_path
- `download(minio_path)` → bytes stream
- `delete(minio_path)`
- `create_version(document_id, file)` → version record
- `restore_version(version_id)` → swap current object
- `get_user_storage_bytes(user_id)` → int
- `list_user_files(user_id)` → list

**Features:** Upload, Download, Backup (versioning), Restore

---

## 9. RAG & AI Layer

### Pipeline Steps

1. **Extract** — PyMuPDF reads PDF page-by-page text
2. **Chunk** — LangChain `RecursiveCharacterTextSplitter` (chunk_size ~1000, overlap ~200)
3. **Embed** — Ollama `nomic-embed-text` via LangChain `OllamaEmbeddings`
4. **Store** — ChromaDB collection `doc_{document_id}` with metadata `{ page, source, document_id }`
5. **Retrieve** — Top-k similarity search on user question
6. **Generate** — Llama 3.2 via LangChain `OllamaLLM` with retrieved context

Indexing runs as **FastAPI BackgroundTasks** after upload — upload returns immediately, processing status tracked in DB.

### AI Document Score

Heuristic analysis (deterministic, no extra LLM call):

| Metric | Method | Weight |
|--------|--------|--------|
| Completeness | Word count, intro/conclusion detection | 30% |
| Readability | Avg sentence length, Flesch-like score | 30% |
| Structure | Heading detection, paragraph/list count | 40% |
| **Overall** | Weighted average of above | — |

Example output:

```json
{
  "completeness": 85,
  "readability": 90,
  "structure": 78,
  "overall": 84
}
```

### AI Document Chat

- Retrieves top relevant chunks from ChromaDB
- Prompts Llama 3.2 with context + question
- Returns answer with source page citation (e.g. `"p. 4"`)
- Persists to `chat_history` table

---

## 10. Frontend UI Specification

Reference mockup: cream background, forest-green primary, card-based layout, top navigation (no sidebar).

### Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#FDFCF8` | Page background |
| Primary | `#064E3B` | Logo, nav, user bubbles, buttons |
| Card | white + border + `rounded-xl` | All panels |
| Score high | `#16A34A` green | 80–100 |
| Score mid | `#EA580C` orange | 60–79 |
| Score low | `#DC2626` red | below 60 |
| Font | Inter | All text |

### App Shell

```
[DocNest logo]     Vault | Chat | Security     [Avatar initials]
─────────────────────────────────────────────────────────────────
Breadcrumb: "Vault — dashboard"
```

### Screen 1 — Vault Dashboard (`/vault`)

- **Stats row** (3 cards): Documents count, Storage used (e.g. "1.8 of 5 GB" + progress bar), Avg. score (e.g. "87%")
- **Recent documents grid** (4 columns): filename, circular score ring (color-coded), size + date; click → document detail
- **Inline chat**: "Ask {filename}" with green user bubble (right), white AI card (left) + page citation tag
- **Upload**: floating button or drag-drop zone

### Screen 2 — Document Detail (`/documents/:id`)

Two-column layout (1:2 ratio):

**Left (~33%):**

- AI Summary card — paragraph text
- Document Score card — horizontal progress bars: Completeness (green), Readability (teal), Structure (orange), Overall (green)
- Backup history (collapsible) — Version 1/2/3 + Restore buttons

**Right (~67%):**

- Full chat panel — user bubbles (forest green, right), AI bubbles (white/grey, left)
- Highlighted key phrases in answers (light blue background)
- Source tag `"p. 1"` below AI responses
- Sticky input: "Ask about this document..." + green circular send button

### Auth Pages (`/login`, `/register`, `/verify`)

- Centered card on cream background, DocNest logo, forest-green submit button
- Redirect to `/vault` on success

### Security Page (`/security`)

- Audit log table (admin only)
- Account role badge
- Cross-document backup history

### Routes

| Route | Page | Layout |
|-------|------|--------|
| `/login` | Login | None |
| `/register` | Register | None |
| `/verify` | Verify Email | None |
| `/vault` | Vault Dashboard | AppLayout |
| `/documents/:id` | Document Detail | AppLayout |
| `/chat` | Chat Hub | AppLayout |
| `/security` | Security | AppLayout |

---

## 11. Security

- JWT on all protected routes; token in `Authorization: Bearer` header
- bcrypt password hashing (passlib)
- Email verification required before login
- RBAC enforced via FastAPI dependency injectors
- File upload: **PDF only**, max **20 MB**
- Rate limiting on auth endpoints (slowapi)
- CORS restricted to frontend origin
- All document routes scoped to authenticated user's `user_id` (admin bypass)
- Audit logs on: login, upload, delete, restore, summarize
- Secrets in `.env` only — never committed; `.gitignore` covers `.env`, `__pycache__`, `node_modules`

---

## 12. Email Verification

`backend/services/email_service.py`:

- **Dev mode:** log verification link to console; optional `DEV_SKIP_VERIFY=true` env flag
- **Production:** SMTP via env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`)
- Link format: `{FRONTEND_URL}/verify?token={token}`
- Token TTL: 24 hours

---

## 13. Environment Variables

```env
# Database
POSTGRES_URL=postgresql://docnest:docnest@postgres:5432/docnest

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=cloudvault-files

# ChromaDB
CHROMA_HOST=chromadb
CHROMA_PORT=8000

# Ollama
OLLAMA_BASE_URL=http://ollama:11434

# JWT
JWT_SECRET=change-me-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24

# Email
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FRONTEND_URL=http://localhost:5173

# Dev
DEV_SKIP_VERIFY=false
STORAGE_QUOTA_GB=5
```

---

## 14. Startup & Development

```bash
# 1. Clone and configure
cp .env.example .env

# 2. Start all services
docker compose up -d

# 3. Pull Ollama models (first time only)
docker compose exec ollama ollama pull llama3.2
docker compose exec ollama ollama pull nomic-embed-text

# 4. Run database migrations
docker compose exec backend alembic upgrade head

# 5. Seed admin user
docker compose exec backend python -m scripts.seed_admin

# Access
# Frontend:  http://localhost:5173
# API docs:  http://localhost:8000/docs
# MinIO UI:  http://localhost:9001
```

---

## 15. Implementation Phases

| Phase | Scope | Deliverable |
|-------|-------|-------------|
| 1 | Infrastructure | docker-compose.yml, Dockerfiles, .env.example, git init |
| 2 | Backend core | FastAPI app, SQLAlchemy models, Alembic migrations, Pydantic schemas |
| 3 | Auth & RBAC | Register, login, verify, JWT, bcrypt, role guards, email service |
| 4 | Document storage | MinIO service, upload/list/get/delete/download, versioning, restore |
| 5 | RAG & AI | PyMuPDF extract, ChromaDB indexing, summarize, chat, scoring |
| 6 | Frontend scaffold | Vite, Tailwind theme, Shadcn, React Query, router, API client, AppLayout |
| 7 | Frontend pages | Vault dashboard, document detail, auth pages, security page (per mockup) |
| 8 | Security & audit | Audit logging, upload validation, CORS, rate limiting, admin endpoint |
| 9 | Finalize | Seed admin script, README with architecture diagram and test walkthrough |

---

## 16. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Ollama model download is slow/large | Document pull step in README; fallback to `llama3.2:1b` for dev |
| ChromaDB + LangChain version conflicts | Pin exact versions in requirements.txt |
| RAG indexing blocks upload response | FastAPI BackgroundTasks; return immediately with processing status |
| Email verification without SMTP in dev | Console-log link; `DEV_SKIP_VERIFY=true` env flag |
| Large PDF memory usage | Stream processing; page-by-page extraction with PyMuPDF |

---

## 17. Feature Checklist (Confirmation)

- [ ] JWT + bcrypt authentication
- [ ] Email verification flow
- [ ] RBAC: Admin, User, Viewer roles
- [ ] PDF upload to MinIO (`cloudvault-files` bucket)
- [ ] Document list, download, delete
- [ ] Document versioning with backup history and restore
- [ ] RAG pipeline: PyMuPDF → Chunk → Embed → ChromaDB
- [ ] AI summarization via Llama 3.2
- [ ] AI document chat with page citations
- [ ] AI document score (completeness, readability, structure, overall)
- [ ] Vault dashboard with stats, document cards, score rings, inline chat
- [ ] Document detail page with summary, score bars, full chat panel
- [ ] Storage usage display
- [ ] Audit logging
- [ ] Security page
- [ ] Docker Compose for all services
