# CodeAssess Integration Contract

Phase 2 adds a synchronous `httpx` adapter and assessment service. CodeAssess remains
an external FastAPI application; no CodeAssess source or database is copied into
Nexora.

## Configuration

```text
CODING_ASSESSMENT_API_URL=https://the-codeassess-api.example
CODING_ASSESSMENT_FRONTEND_URL=https://the-codeassess-frontend.example
```

The API URL is required only when constructing the HTTP client, so importing the
package and running mocked tests does not require environment variables. The frontend
URL is optional. When configured, the verified candidate route is
`/candidate/test/{token}`; otherwise invite URL construction returns `None`.

## Identity

Nexora `candidate_id` maps directly to CodeAssess `profile_id`:

```text
candidate_id = cand_014
profile_id   = cand_014
```

`CandidateMapping.create` rejects empty IDs and mismatches. The adapter must validate
this mapping before associating an invite, submission, or evaluation with a Nexora
candidate.

## Verified endpoints

The client currently consumes these routes and methods:

- `POST /tests` with `title`, optional `description`, and `interviewer_id`
- `GET /tests/{id}`
- `POST /tests/{id}/questions` with `question_text` and `language`
- `GET /tests/{id}/questions`
- `POST /tests/{id}/invites` with candidate name, email, profile ID, and schedule
- `GET /tests/invites`
- `GET /tests/invites/{token}`
- `GET /submissions`
- `POST /submissions/{id}/evaluate` with an empty JSON body
- `GET /submissions/{id}/report` as an HTML text response

The candidate overview endpoint is verified in the provider repository but is not
needed by the current typed client because result correlation uses invites and
submissions directly.

The current API supports list-based correlation: find an invite by `profile_id`, then
match its `invite_id` to submissions. The service rejects multiple matching invites
with `AmbiguousResultError` instead of silently choosing one. It retains all matching
submissions, while using the greatest provider submission ID per question to derive a
deterministic status when repeated submissions exist. A future candidate-scoped
endpoint may be considered if list correlation becomes too expensive or ambiguous.

## Result status

The service derives a normalized status from provider data:

- `no_assessment`: no invite has the exact profile ID
- `invited`: matching invite exists with no submissions and provider status `pending`
- `in_progress`: submissions exist for only part of the assessment
- `pending_evaluation`: a latest submission has no evaluation
- `evaluation_available`: every known question has an evaluation
- `unknown`: provider invite status is not recognized and there are no submissions

CodeAssess does not expose an explicit started/completed lifecycle in its invite
model. The service therefore does not claim those states without supporting data.

## Error handling

The transport maps failures to typed adapter errors: configuration, timeout,
connection, authentication/authorization, not found, upstream 4xx, upstream 5xx,
and malformed response. Pydantic response mismatches are reported as malformed
responses. Candidate/profile mismatches are rejected locally before any invite
request is sent.

Evaluation fields are optional because submissions may be pending or may not yet have
an AI evaluation. The normalized result preserves assessment, invite/profile,
submission, and evaluation identifiers and score details for the future evidence
builder. Resume and ranking scores are not combined with assessment scores.

The service does not automatically trigger evaluation for missing results: the
existing evaluation endpoint performs an LLM-backed operation, so Phase 2 retrieval
leaves missing evaluations as `pending_evaluation` rather than causing a hidden side
effect. Nexa can explicitly call `evaluate_submission` when that action is approved.

## Known limitations

- CodeAssess currently has no service authentication; the adapter only classifies
	401/403 responses if a deployment later adds authentication.
- Candidate result lookup is list-based and multiple invites are intentionally
	ambiguous.
- CodeAssess submission records do not expose timestamps, so repeated submissions
	are ordered by provider numeric ID as the available deterministic signal.
- No CodeAssess-side changes were made in Phase 2.
