# Nexora Phase 1 Contracts

This directory contains the typed foundation for Nexa and the CodeAssess integration.
It intentionally contains no HTTP transport, LLM calls, database, frontend, or agent
execution logic.

## Dependencies

- Python 3.12+
- Pydantic 2+

The later CodeAssess client will read `CODING_ASSESSMENT_API_URL` and
`CODING_ASSESSMENT_FRONTEND_URL`. LLM integration will later use `OPENROUTER_API_KEY`.
Phase 1 does not require any of these variables.

## Validation

From the Nexora repository root:

```text
python -m unittest discover -s mywork/tests -p "test_*.py"
python -m compileall -q mywork
```
