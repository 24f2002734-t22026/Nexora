# Recruiter Chat Contract

## Request

```json
{
  "conversation_id": "conv_001",
  "message": "Why is Rahul ranked above Arjun?",
  "candidate_ids": ["cand_014", "cand_021"],
  "context": {"job_id": "job_003"}
}
```

`conversation_id`, candidate IDs, and job context are optional. `message` is required.

## Response

```json
{
  "answer": "Rahul ranks above Arjun because ...",
  "intent": "compare_candidate_rank",
  "evidence": [],
  "actions": [],
  "warnings": []
}
```

Every response exposes the same five top-level fields. Evidence points to stable
evidence IDs; actions are future UI operations and are not executed in Phase 1.
