"""Recruiter chat HTTP boundary delegating to mywork orchestration."""

from fastapi import APIRouter, Depends, Request

from ..auth import RecruiterIdentity, get_current_recruiter
from ..schemas import ChatRequest

router = APIRouter(tags=["recruiter"])


@router.post("/api/recruiter/chat")
@router.post("/api/chat")
def recruiter_chat(
    payload: ChatRequest,
    request: Request,
    _: RecruiterIdentity = Depends(get_current_recruiter),
):
    response = request.app.state.container.pipeline.chat(
        payload.message,
        payload.candidate_ids,
        payload.conversation_id,
    )
    return response.model_dump(mode="json")
