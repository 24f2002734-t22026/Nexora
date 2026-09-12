# Nexa Recruiter AI

Phase 5 adds controlled orchestration around the deterministic Phase 4 tools.

## Request flow

```text
ChatRequest
  -> IntentRouter
  -> EntityResolver
  -> explicit intent/tool mapping
  -> NexaToolService
  -> structured result + evidence
  -> ResponseGenerator or deterministic fallback
  -> ChatResponse
```

There is no free-running agent loop. The orchestrator executes one approved mapping
per request, except assessment creation, which explicitly performs `create_assessment`
then `create_candidate_invite`.

## Intent routing

The initial router is deterministic and supports only:

- rank explanation
- candidate comparison
- top candidates
- skill search
- missing skill search
- candidate summary/evidence
- assessment creation/status/result
- resume-assessment comparison
- unsupported and clarification-required outcomes

The router never invents tool names or candidate IDs. Candidate IDs come from the
request or the provider-backed entity resolver.

## Entity resolution

Names are matched case-insensitively against `NexoraDataProvider.get_candidates()`.
Unknown names and duplicate names produce clarification responses. Explicit candidate
IDs are validated against the provider before tools execute.

## Evidence grounding

Tool results pass structured Pydantic data and `EvidenceItem` records to the response
layer. The final `ChatResponse` exposes deduplicated `ResponseEvidence` records so a
future UI can render evidence cards. Resume, ranking, assessment, and comparison
sources remain distinct.

Candidate-provided resume and assessment text is labeled untrusted data in the system
prompt and is never treated as instructions.

## Response generation

`OpenRouterResponseGenerator` is an optional minimal provider using
`OPENROUTER_API_KEY` and `OPENROUTER_MODEL`. It receives only the recruiter message,
approved intent, structured tool data, and evidence. Its output must validate as
`StructuredResponse` containing `answer` and `key_points`.

The orchestrator does not require OpenRouter. Without a provider, or when the provider
times out, returns malformed output, or fails, `DeterministicResponseGenerator`
formats a safe answer from the tool data and adds a warning.

## Assessment action handling

For `Send Rahul a coding assessment`:

1. Resolve Rahul to `cand_014`.
2. Create the configured technical assessment.
3. Create the invite through `AssessmentService` with `profile_id=cand_014`.
4. Return an `assessment_invite_created` action with the verified invite URL.

If step 3 fails, the response contains `assessment_invite_failed` and never claims
that an invite was created.

## Non-autonomous behavior

Nexa explains evidence and returns recruiter-supporting observations. It does not
reject, hire, eliminate, or make irreversible HR decisions. Frontend, voice, and
streaming integration are outside this phase.