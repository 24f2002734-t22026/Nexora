# Evidence Architecture

```text
Nexora UI
    -> recruiter API (future integration point)
    -> Nexa orchestration (future)
    -> deterministic Nexa tools
    -> controlled intent/entity orchestration
    -> optional evidence-aware response generator
    -> Nexora ranking/resume data and CodeAssess adapter
    -> deterministic evidence builder
    -> stable recruiter response contract (future orchestration)
```

CodeAssess remains an external service. Nexora will use its FastAPI API through a
small adapter and will not copy or embed its frontend/backend. The Phase 1 packages
define the data exchanged at that boundary; Phase 2 implements the adapter.

## Evidence flow

The Phase 3 builders convert structured inputs into `CandidateEvidence`:

```text
resume record  -> resume evidence
ranking record -> ranking evidence
CodeAssess result -> assessment evidence
                         |
                         v
                candidate aggregation
                         |
                         v
          deterministic resume/assessment comparison
```

Evidence sources remain distinct: resume evidence describes candidate claims, ranking
evidence preserves the matching engine's scores, assessment evidence describes what
CodeAssess observed, and comparison evidence links those records. No source is
silently merged into another score.

## Provenance and confidence

Every evidence item has a deterministic ID and structured provenance. Resume items
retain document/location information when supplied. Ranking items retain candidate
and optional job identifiers. Assessment items retain profile, assessment, invite,
submission, and evaluation identifiers when available. Comparison items point to the
resume and assessment evidence IDs that caused their conclusion.

Confidence is optional because upstream records do not always provide it. A missing
confidence is represented as `null`; scores such as an assessment's `overall_score`
are not treated as confidence. The builder never assigns confidence based on an
impression of truth.

## Candidate isolation

Assessment results must have a profile ID equal to the requested Nexora candidate ID.
Ranking records and evidence provenance are checked against the candidate ID as well.
Cross-candidate data raises an error rather than being included in the aggregate.

## Deterministic comparison

`compare_resume_vs_assessment` tokenizes claims and assessment observations, removes
small stop words, and compares only overlapping topics for the same candidate. It
returns `supported`, `partially_supported`, `insufficient_evidence`, or `unavailable`
based on structured score/text signals. It prefers insufficient evidence over an
unsupported negative conclusion. No LLM, prompt, or network call is involved.

For example, Rahul's resume claim `Python backend` can be matched to a strong Python
backend assessment observation as `supported`; a Docker claim with no Docker
assessment observation becomes `insufficient_evidence`; and a matching algorithm
claim with a weak efficiency score becomes `partially_supported`.

## Phase 4 tool boundary

```text
NexoraDataProvider
    -> ranking/candidate/skill tools

AssessmentService -> CodeAssessClient
    -> assessment tools

all tools -> typed result envelope + evidence references
```

The tools are deterministic and provider-backed. They validate arguments, delegate to
the appropriate data source, build or attach evidence, and return structured facts.
They do not calculate ranking scores, make hiring decisions, call an LLM, or call
CodeAssess outside the existing assessment service.

Phase 5 adds a bounded orchestration layer above those tools. It resolves only known
intents and provider-backed entities, executes explicit tool mappings, and passes
structured tool results plus evidence to an optional response generator. A
deterministic fallback keeps the recruiter flow usable when the LLM is unavailable.
The LLM can phrase supplied evidence, but cannot supply ranking, candidate, or
assessment facts.
