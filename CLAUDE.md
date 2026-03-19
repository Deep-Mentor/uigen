# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (with Turbopack)
npm run dev

# Full setup from scratch (install deps, generate Prisma client, run migrations)
npm run setup

# Build for production
npm run build

# Run all tests
npm run test

# Lint
npm run lint

# Reset SQLite database
npm run db:reset
```

To run a single test file:
```bash
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx
```

Prisma client must be regenerated after schema changes:
```bash
npx prisma generate
npx prisma migrate dev
```

## Environment

Requires `.env` with:
```
ANTHROPIC_API_KEY=sk-ant-...  # Optional — falls back to MockLanguageModel if absent
```

SQLite database lives at `./prisma/dev.db`. Default model is `claude-haiku-4-5`.

## Architecture

UIGen is an AI-powered React component generator. Users describe a UI in natural language; Claude generates React + Tailwind code into a **virtual filesystem**; the result renders live in a sandboxed iframe.

### Key Data Flow

1. User sends a chat message via `/api/chat` (POST, streaming)
2. The route calls Claude with the current virtual filesystem as context
3. Claude calls two AI tools to write files:
   - `str_replace_editor` — create, view, or edit files (str_replace, insert)
   - `file_manager` — create/delete directories and files
4. Tool calls are streamed back; `FileSystemContext` applies them to in-memory state
5. `PreviewFrame` detects file changes → `jsx-transformer` runs Babel on all JSX files, builds an import map, and injects the result into a sandboxed `<iframe>`
6. For authenticated users, the project (messages + serialized FS) is saved to SQLite via Prisma

### State Management

- **`FileSystemContext`** (`src/lib/contexts/file-system-context.tsx`) — owns the virtual filesystem (`VirtualFileSystem` class in `src/lib/file-system.ts`). All file mutations go through this context.
- **`ChatContext`** (`src/lib/contexts/chat-context.tsx`) — owns message history and input state. Wraps Vercel AI SDK's `useChat()`.

### Preview Pipeline

`PreviewFrame` → `jsx-transformer.ts`:
- Babel Standalone transpiles JSX/TSX → JS in-browser
- Module blob URLs are created for each virtual file
- An import map is injected into the iframe so modules can reference each other
- Entry points tried in order: `App.jsx`, `App.tsx`, `index.jsx`, `index.tsx`

### Authentication

JWT-based sessions (7-day expiry) stored in HTTP-only cookies. Server actions for `signUp`, `signIn`, `signOut`, `getUser` live in `src/actions/`. Middleware (`src/middleware.ts`) protects `/api/projects` and `/api/filesystem`. Passwords hashed with bcrypt.

Projects can also exist without a user (anonymous); `anon-work-tracker.ts` persists anonymous state in localStorage.

### Database Schema

Two Prisma models:
- `User` — email (unique), hashed password
- `Project` — belongs to User (nullable for anonymous), stores `messages` (JSON string) and `data` (serialized virtual FS JSON)

### Component Layout

```
MainContent (resizable panels)
├── Chat panel (ChatInterface → MessageList + MessageInput)
└── Preview/Code panel (tabs)
    ├── PreviewFrame (iframe sandbox)
    └── CodeEditor (Monaco) + FileTree
```

UI primitives are shadcn/ui (Radix UI based), located in `src/components/ui/`.

### Path Alias

`@/*` maps to `./src/*` throughout the codebase.

## Code Style

Use comments sparingly — only for complex or non-obvious behavior. Self-evident code should not be commented.
