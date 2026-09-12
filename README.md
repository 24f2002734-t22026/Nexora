# Nexora

Candidate intelligence for better hiring.

## Project structure

```text
src/
  auth/          Firebase authentication integration
  components/    Reusable hiring, skill-coverage, candidate, and chat UI
  services/      API client and backend-replaceable service contracts
  data.ts        Development analysis data
  types.ts       Shared analysis, candidate, evidence, and verification types
  main.tsx       Application routes and page composition
  styles.css     Nexora light design system
```

## Run locally

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm run build
```

Copy `.env.example` to `.env.local` and provide Firebase values to enable live Google authentication. The application uses typed mock services until backend endpoints are connected.
