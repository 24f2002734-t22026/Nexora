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

## Hackathon integration

Hiring intelligence workflow: resume shortlisting → technical coding assessment → recruiter interview support.

## Hackathon target

InternLoom's core requirement is an explainable Smart Shortlisting Engine that evaluates a JD against 15–18 resumes using both semantic and keyword matching, returns a ranked shortlist, and explains the top three candidates. The official bonus also explicitly allows a recruiter chat layer for questions such as why one candidate ranks above another. See the supplied problem statement, especially the core requirements on page 1 and judging rubric on page 2.

## Planned architecture

- Resume/JD matching remains deterministic and explainable: keyword evidence + semantic similarity + weighted ranking.
- Recruiter AI is a tool-using assistant, not a generic ChatGPT clone.
- Coding assessment is integrated as the next stage after shortlist selection, using the existing CodeAssess platform as the assessment engine.
- Recruiter assistant can answer candidate comparisons, skill queries, missing-skill queries, ranking explanations, and coding-assessment result queries.
- Every answer should be grounded in structured Nexora data and expose the evidence used.

## Suggested product flow

```text
JD + Resume Pool
      ↓
Parsing / Normalization
      ↓
Keyword + Semantic Matching
      ↓
Explainable Ranking
      ↓
Recruiter Dashboard
      ↓
Persistent Recruiter AI Drawer
      ├── Why is #1 ranked highest?
      ├── Compare #1 and #2
      ├── Who has strongest React experience?
      ├── Show candidates missing Docker
      └── Who has backend experience?
      ↓
Select Candidate
      ↓
Generate Coding Assessment Invite
      ↓
CodeAssess Candidate Portal
      ↓
Run / Submit / AI Evaluate
      ↓
Assessment Results returned to Nexora
      ↓
HR Interview / Final decision
```

## Integration boundary

CodeAssess currently exposes a FastAPI backend and a Next.js frontend. Its README documents assessment, invite, candidate overview, submission, evaluation, and report endpoints. Nexora should call the backend through a small adapter layer rather than embedding the entire CodeAssess application into the Nexora frontend.

### Environment variables

```env
CODING_ASSESSMENT_API_URL=
CODING_ASSESSMENT_FRONTEND_URL=
OPENROUTER_API_KEY=
```

Do not commit secrets.

## Repository ownership

This repository is organized as a clean integration shell so the team can merge independently developed UI and backend work without copying the CodeAssess repository wholesale.
