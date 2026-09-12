# Nexa Deterministic Tools

Phase 4 implements Nexa as a deterministic tool layer. Tools return structured
Pydantic data and evidence items; they do not generate prose, call an LLM, or expose
raw HTTP details.

## Data sources

Ranking, candidate, resume, and skill tools depend on the `NexoraDataProvider`
protocol. The main Nexora backend can implement that protocol later without changing
the tools. Phase 4 tests use an in-memory fixture provider only.

Assessment tools depend on `AssessmentService`, which owns CodeAssess HTTP access and
candidate/profile correlation. Tools never call CodeAssess directly.

## Tool groups

### Ranking

- `get_rankings()` returns provider rankings with preserved rank, final, semantic, and
  keyword scores.
- `get_top_candidates(limit)` validates `1 <= limit <= 50`.
- `explain_candidate_rank(candidate_id)` returns ranking facts and evidence.
- `compare_candidates(candidate_a, candidate_b)` returns both ranking records and
  deterministic score differences.

### Candidate

- `get_candidate(candidate_id)` returns provider-backed candidate data.
- `get_candidate_summary(candidate_id)` returns structured skills, experience,
  projects, ranking, and assessment status.
- `get_candidate_evidence(candidate_id)` builds source-separated resume, ranking,
  assessment, and comparison evidence.

### Skills

- `find_candidates_by_skill(skill)` uses the provider's normalized skill query and
  returns only supporting resume/ranking evidence.
- `find_candidates_missing_skill(skill)` returns `skill_not_evidenced`, never a claim
  that the candidate definitely lacks the skill.

### Assessment

- `create_assessment(request)` delegates to `AssessmentService`.
- `create_candidate_invite(candidate_id, assessment_id)` obtains candidate identity
  and email from the provider, maps `candidate_id` to the same CodeAssess
  `profile_id`, and delegates invite creation.
- `get_assessment_status(candidate_id)` returns the normalized Phase 2 result status.
- `get_assessment_result(candidate_id)` returns normalized assessment data and
  assessment evidence.
- `compare_resume_vs_assessment(candidate_id)` reuses the Phase 3 deterministic
  comparison implementation.

## Result contracts

Read operations return `ReadToolResult`:

```json
{
  "tool": "explain_candidate_rank",
  "success": true,
  "data": {},
  "evidence": [],
  "warnings": []
}
```

Mutation operations return `MutationToolResult` with an action result, affected
candidate where applicable, and a deterministic idempotency key.

## Errors and identity safeguards

Tool-layer errors include invalid arguments, candidate not found, ranking unavailable,
assessment not found, assessment unavailable, and ambiguous assessment. Lower-level
CodeAssess errors are converted before reaching a future orchestrator.

Assessment evidence is accepted only when `candidate_id == profile_id`. Matching
submissions are selected by the Phase 2 service through the candidate's invite ID.
The tool layer never substitutes another candidate's assessment.

## Future LLM use

The future orchestration/response layer can select a registered tool, pass structured
arguments, and explain the returned facts using the evidence IDs. It must not treat
tool output as permission to invent unsupported claims. No LLM or chat endpoint is
part of Phase 4.

## Examples

```text
Why is Rahul ranked above Arjun?
  -> compare_candidates("cand_014", "cand_021")
  -> explain_candidate_rank("cand_014")

Who has React experience?
  -> find_candidates_by_skill("React")

Does Rahul's assessment support his resume?
  -> compare_resume_vs_assessment("cand_014")

Send Rahul a coding assessment.
  -> create_assessment(request)
  -> create_candidate_invite("cand_014", assessment_id)
```