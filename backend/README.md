# Nexora Backend

Minimal application/API boundary between the Nexora frontend, `mywork`, and the external CodeAssess service.

## Local development

For local development, set:

```text
NEXORA_AUTH_MODE=development
NEXORA_CODEASSESS_MODE=mock
NEXORA_EMAIL_MODE=logging
```

Then run the API with a FastAPI-compatible server, for example:

```text
python -m uvicorn backend.app.main:app --reload --port 8000
```

For production-style integration, set `NEXORA_AUTH_MODE=firebase`, configure Firebase Admin credentials/project settings, set `NEXORA_CODEASSESS_MODE=external`, and provide `CODING_ASSESSMENT_API_URL` and `CODING_ASSESSMENT_FRONTEND_URL`.

The SQLite file is Nexora-owned and ignored by Git. CodeAssess keeps its own database and application.

## Boundary

The backend imports `mywork` contracts, tools, evidence builders, recruiter orchestrator, and `AssessmentService`. It does not copy or reimplement them. The logging email service records the exact recipient, subject, body, and assessment URL without sending mail.
