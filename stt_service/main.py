import os
import io
import json
import uuid
import time
import base64
import asyncio
import logging
from typing import Optional, Dict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Set Keras to PyTorch backend before any model import
os.environ["KERAS_BACKEND"] = "torch"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

from transcriber import MoonshineTranscriber

load_dotenv()

# Logging Configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("moonshine-stt-server")

# FastAPI App
app = FastAPI(
    title="Moonshine Base STT & WebSocket Service",
    description="Real-time Speech-to-Text WebSocket server powered by Moonshine Base model for Resume Screening and AI Interviewer Assistant.",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Moonshine Base Transcriber (Model: moonshine/base)
transcriber = MoonshineTranscriber(model_name="moonshine/base")

# Supabase Client (Optional connection if keys are present)
supabase_client = None
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized.")
    except Exception as e:
        logger.warning(f"Supabase connection warning: {e}")


# ==========================================
# WEBSOCKET STREAMING STT ENDPOINT
# ==========================================

@app.websocket("/ws/transcribe")
async def websocket_transcribe(websocket: WebSocket):
    """
    WebSocket endpoint for real-time Moonshine Base speech-to-text.
    
    Protocol:
    1. Connect to ws://host:port/ws/transcribe
    2. Receive {"event": "connected", "session_id": "...", "model": "moonshine/base"}
    3. Send {"action": "start", "session_id": "..."} (Optional)
    4. Send Binary Audio Frames (PCM / WAV / WebM chunks) or Base64 {"action": "chunk", "data": "..."}
    5. Send {"action": "stop"} or {"action": "flush"} to finalize
    6. Receive {"event": "final_transcript", "text": "...", "latency_ms": ...}
    """
    await websocket.accept()
    session_id = str(uuid.uuid4())
    logger.info(f"WebSocket client connected. Assigned session_id: {session_id}")
    
    audio_buffer = bytearray()
    
    # Send connection confirmation
    await websocket.send_json({
        "event": "connected",
        "session_id": session_id,
        "model": "moonshine/base",
        "status": "ready"
    })

    try:
        while True:
            message = await websocket.receive()
            
            # 1. Binary Audio Chunks
            if "bytes" in message and message["bytes"]:
                audio_buffer.extend(message["bytes"])

            # 2. Text / JSON Control Messages
            elif "text" in message and message["text"]:
                try:
                    payload = json.loads(message["text"])
                except Exception:
                    payload = {"action": message["text"]}

                action = payload.get("action", "")

                if action == "start":
                    audio_buffer.clear()
                    if "session_id" in payload:
                        session_id = payload["session_id"]
                    await websocket.send_json({
                        "event": "session_started",
                        "session_id": session_id,
                        "status": "recording"
                    })

                elif action == "chunk":
                    b64_data = payload.get("data", "")
                    if b64_data:
                        audio_buffer.extend(base64.b64decode(b64_data))

                elif action in ("flush", "stop", "transcribe"):
                    if len(audio_buffer) > 0:
                        raw_bytes = bytes(audio_buffer)
                        audio_buffer.clear()
                        
                        logger.info(f"Transcribing buffer ({len(raw_bytes)} bytes) with Moonshine Base...")
                        result = await asyncio.to_thread(transcriber.transcribe, raw_bytes)
                        
                        await websocket.send_json({
                            "event": "final_transcript",
                            "session_id": session_id,
                            "text": result.get("text", ""),
                            "is_final": True,
                            "duration_seconds": result.get("duration_seconds", 0),
                            "latency_ms": result.get("latency_ms", 0),
                            "model": "moonshine/base"
                        })
                    else:
                        await websocket.send_json({
                            "event": "final_transcript",
                            "session_id": session_id,
                            "text": "",
                            "is_final": True,
                            "duration_seconds": 0,
                            "latency_ms": 0,
                            "model": "moonshine/base"
                        })

                elif action == "reset":
                    audio_buffer.clear()
                    await websocket.send_json({
                        "event": "reset",
                        "status": "buffer_cleared"
                    })

    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        try:
            await websocket.send_json({
                "event": "error",
                "error": str(e)
            })
        except Exception:
            pass


# ==========================================
# REST API ENDPOINTS
# ==========================================

@app.get("/api/stt/health")
def health_check():
    return {
        "status": "online",
        "stt_model": "moonshine/base",
        "engine": "Moonshine Base (Useful Sensors)",
        "model_loaded": transcriber.model is not None,
        "websocket_endpoint": "/ws/transcribe"
    }


@app.post("/api/stt/transcribe")
async def transcribe_file(audio_file: UploadFile = File(...)):
    """
    Direct REST endpoint to transcribe uploaded audio file with Moonshine Base.
    """
    try:
        content = await audio_file.read()
        file_ext = audio_file.filename.split(".")[-1].lower() if audio_file.filename else "wav"
        result = await asyncio.to_thread(transcriber.transcribe, content, file_format=file_ext)
        return result
    except Exception as e:
        logger.error(f"Transcription failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
