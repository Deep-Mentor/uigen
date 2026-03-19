Generate comprehensive tests for the file: $ARGUMENTS

## Steps

### 1. Read and analyse the target file

Read the file at the given path. Identify:
- Every exported function, class, hook, or component
- All meaningful code paths: happy paths, edge cases, and error cases
- External dependencies (modules, contexts, APIs) that will need mocking
- Whether the file is a pure utility, React component, context, server action, or API route

If no argument was provided, ask the user which file to test before proceeding.

### 2. Locate existing tests

Check for an existing `__tests__` directory adjacent to the file. If a test file for this module already exists, read it so you don't duplicate coverage.

### 3. Determine the test file location and name

Follow the project convention:
- Place tests in a `__tests__/` directory next to the source file
- Name the file `<OriginalName>.test.ts` for plain TS modules or `<OriginalName>.test.tsx` for files that render JSX

### 4. Write the tests

Use **Vitest** (`import { test, describe, expect, vi, beforeEach, afterEach } from "vitest"`).
For React components and hooks, also import from `@testing-library/react` and `@testing-library/user-event`.

Apply these rules:
- Use the `@/*` path alias (maps to `./src/*`) for all project imports
- Mock external dependencies with `vi.mock(...)` — mock at the module boundary, not deep inside
- For React components: mock heavy child components and Radix/shadcn primitives as simple HTML wrappers so tests stay focused
- For contexts: wrap the component under test in the real or a minimal stub provider
- For server actions and API routes: mock `prisma`, `jose`, and `bcrypt` at the module level
- Group related tests inside `describe` blocks; name individual tests so they read as sentences ("returns null when file does not exist")
- Cover: normal usage, boundary/edge inputs, error/exception paths, and any conditional rendering or branching
- Avoid testing implementation details — assert on observable outputs and rendered output
- Do not add comments unless the mocking setup is genuinely non-obvious

### 5. Run the tests and fix failures

Run the specific test file:
```bash
npx vitest run <path-to-test-file>
```

If any tests fail:
- Read the error output carefully
- Fix the test (or, if there is a real bug in the source, note it to the user but do not silently change source files)
- Re-run until all tests pass

### 6. Report

After all tests pass, summarise:
- File tested and total test count written
- Which cases are covered (happy path, edge cases, error paths)
- Any known gaps — scenarios that are untestable without integration infrastructure (e.g. real database, real network) — and why they were skipped
