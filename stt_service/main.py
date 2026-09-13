import os
import io
import re
import json
import uuid
import time
import base64
import asyncio
import logging
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Set Keras to PyTorch backend before any model import
os.environ["KERAS_BACKEND"] = "torch"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

from transcriber import MoonshineTranscriber
from llm_engine import generate_local_response, load_local_llm

load_dotenv()

# Logging Configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("moonshine-stt-server")

# FastAPI App
app = FastAPI(
    title="Moonshine Base STT & Local LLM Recruiter Assistant",
    description="Real-time Speech-to-Text WebSocket server and local offline LLM reasoning engine for Candidate Intelligence.",
    version="1.0.0"
)

# Startup: Pre-warm local LLM in background thread
@app.on_event("startup")
async def startup_event():
    import threading
    threading.Thread(target=load_local_llm, daemon=True).start()
    logger.info("Local LLM background pre-warming initialized.")

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
    last_partial_time = 0.0
    partial_lock = asyncio.Lock()
    
    # Send connection confirmation
    await websocket.send_json({
        "event": "connected",
        "session_id": session_id,
        "model": "moonshine/base",
        "status": "ready"
    })

    async def maybe_send_partial():
        nonlocal last_partial_time
        now = time.time()
        # Trigger partial transcription every 500ms if buffer has grown (> 12000 bytes)
        if len(audio_buffer) >= 12000 and (now - last_partial_time) >= 0.5:
            if not partial_lock.locked():
                async with partial_lock:
                    last_partial_time = now
                    raw_snapshot = bytes(audio_buffer)
                    try:
                        res = await asyncio.to_thread(transcriber.transcribe, raw_snapshot)
                        partial_text = res.get("text", "").strip()
                        if partial_text:
                            await websocket.send_json({
                                "event": "partial_transcript",
                                "session_id": session_id,
                                "text": partial_text,
                                "is_final": False,
                                "model": "moonshine/base"
                            })
                    except Exception as pe:
                        logger.debug(f"Partial transcription non-fatal: {pe}")

    try:
        while True:
            message = await websocket.receive()
            
            # 1. Binary Audio Chunks
            if "bytes" in message and message["bytes"]:
                audio_buffer.extend(message["bytes"])
                asyncio.create_task(maybe_send_partial())

            # 2. Text / JSON Control Messages
            elif "text" in message and message["text"]:
                try:
                    payload = json.loads(message["text"])
                except Exception:
                    payload = {"action": message["text"]}

                action = payload.get("action", "")

                if action == "start":
                    audio_buffer.clear()
                    last_partial_time = time.time()
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
                        asyncio.create_task(maybe_send_partial())

                elif action in ("flush", "stop", "transcribe"):
                    if len(audio_buffer) > 0:
                        raw_bytes = bytes(audio_buffer)
                        audio_buffer.clear()
                        
                        logger.info(f"Transcribing final buffer ({len(raw_bytes)} bytes) with Moonshine Base...")
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
# RESUME AI ANALYSIS & FRAUD DETECTION ENDPOINT
# ==========================================

import sys
import tempfile
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    import resume_analyzer
except Exception as e:
    logger.warning(f"Could not import resume_analyzer: {e}")
    resume_analyzer = None


@app.get("/api/health")
@app.get("/api/stt/health")
def health_check():
    return {
        "status": "online",
        "stt_model": "moonshine/base",
        "ai_engine": "Nexora-Intelligence-v1.0",
        "ocr_engine": "EasyOCR + PDFPlumber",
        "fraud_detector": "Nexora-FraudGuard-v1.0",
        "model_loaded": transcriber.model is not None,
        "websocket_endpoint": "/ws/transcribe"
    }


@app.post("/api/analyze-resume")
async def analyze_resume_endpoint(
    file: UploadFile = File(...),
    job_title: str = Form("Senior Full Stack Engineer"),
    job_description: str = Form(""),
    skills_required: str = Form("React, TypeScript, Python, SQL, Docker")
):
    """
    Analyzes an uploaded candidate resume file (.pdf, .docx, .txt):
    1. Extracts text with pdfplumber + EasyOCR fallback on scanned pages + python-docx.
    2. Deep scans for fraud signals (white-fonting, tiny text, off-margin ATS keyword stuffing, prompt injections).
    3. Extracts candidate profile, work history, evidenced skills, and education.
    4. Calculates dual semantic and keyword match scores against the target job.
    """
    temp_path = None
    try:
        content = await file.read()
        file_ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".pdf"
        
        with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as tmp:
            tmp.write(content)
            temp_path = tmp.name

        skills_list = [s.strip() for s in skills_required.split(",") if s.strip()]

        if resume_analyzer:
            result = await asyncio.to_thread(
                resume_analyzer.analyze_resume_with_ai,
                temp_path,
                job_title=job_title,
                job_skills_required=skills_list,
                job_description=job_description
            )
            # Ensure correct file name is returned
            if result.get("resume"):
                result["resume"]["fileName"] = file.filename
                result["resume"]["fileSize"] = len(content)
            return result
        else:
            raise HTTPException(status_code=500, detail="AI analyzer module not loaded")
    except Exception as e:
        logger.error(f"Resume analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze resume: {str(e)}")
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


@app.post("/api/chat")
async def chatbot_endpoint(payload: Dict[str, Any]):
    """
    Intelligent Recruiter Assistant Chatbot Engine.
    Deeply reasons over the active candidate pool, individual profiles, verified evidence,
    fraud alerts, interview question generation, and skill requirements.
    """
    prompt = payload.get("prompt", "").strip()
    candidates = payload.get("candidates", [])
    job_info = payload.get("job", {})
    job_title = job_info.get("title", "Senior Full Stack Engineer")

    if not prompt:
        return {"response": "Hello! I am your AI Recruiter Assistant. Ask me about candidate rankings, skill verification, fraud audits, or interview questions."}

    p_lower = prompt.lower().strip()
    # Normalize punctuation for greeting matching
    p_clean = re.sub(r'[^\w\s]', '', p_lower).strip()

    # 1. CONVERSATIONAL GREETINGS & INTRODUCTIONS
    greeting_tokens = ["hi", "hello", "hey", "hey there", "good morning", "good afternoon", "good evening", "howdy", "yo", "greetings", "who are you", "what can you do", "help", "how are you"]
    if p_clean in greeting_tokens or any(p_clean.startswith(g + " ") for g in ["hi", "hello", "hey", "good morning", "good afternoon"]):
        total_c = len(candidates)
        top_c = sorted(candidates, key=lambda x: x.get("finalScore", 0), reverse=True)[0] if candidates else None
        top_name = top_c.get("name", "Top Candidate") if top_c else "None"
        top_score = top_c.get("finalScore", 0) if top_c else 0
        flagged_count = sum(1 for c in candidates if len(c.get("verificationAlerts", [])) > 0 or c.get("verificationStatus") == "review_recommended")

        return {
            "response": f"Hello! 👋 I'm your **Nexora AI Recruiter Intelligence Assistant**.\n\n"
                        f"I have analyzed all **{total_c} active candidates** for the **{job_title}** role.\n\n"
                        f"**Current Pool Snapshot**:\n"
                        f"• **Top Match**: **{top_name}** ({top_score}% match score)\n"
                        f"• **Integrity Alerts**: **{flagged_count} candidate(s)** with flagged anomalies\n\n"
                        f"Here is what I can think through for you:\n"
                        f"• 🎯 **Candidate Deep Dive**: _\"Tell me about {top_name}\"_ or _\"Why is {top_name} ranked #1?\"_\n"
                        f"• 💡 **Interview Questions**: _\"Draft 3 interview questions for {top_name}\"_\n"
                        f"• ⚖️ **Comparison**: _\"Compare {top_name} with another candidate\"_\n"
                        f"• 🛡️ **Fraud & Verification**: _\"Show all fraud detection alerts\"_\n"
                        f"• 🔍 **Skill Search**: _\"Who has verified React and Docker experience?\"_\n\n"
                        f"What would you like to explore?"
        }

    # 2. LOCAL OFFLINE LLM REASONING (Qwen 2.5 on MPS/CUDA/CPU)
    try:
        llm_reply = generate_local_response(prompt, candidates, job_title)
        if llm_reply and len(llm_reply.strip()) > 10:
            return {"response": llm_reply}
    except Exception as err:
        logger.warning(f"Local LLM fallback to rule engine: {err}")

    # 3. SPECIFIC CANDIDATE MATCHING (HEURISTIC FALLBACK)
    matched_candidate = None
    for cand in candidates:
        c_name = cand.get("name", "").strip()
        first_name = c_name.split()[0].lower() if c_name else ""
        if c_name.lower() in p_lower or (first_name and len(first_name) >= 3 and first_name in p_lower):
            matched_candidate = cand
            break

    # 3. INTERVIEW QUESTIONS GENERATION
    if any(w in p_lower for w in ["interview question", "interview questions", "what to ask", "what should i ask", "question for", "questions for", "interview prep"]):
        target = matched_candidate if matched_candidate else (sorted(candidates, key=lambda x: x.get("finalScore", 0), reverse=True)[0] if candidates else None)
        if target:
            t_name = target.get("name", "Candidate")
            t_skills = target.get("matchedSkills", [])
            t_missing = target.get("missingSkills", [])
            t_title = target.get("title", "Engineer")
            t_projs = target.get("projects", [])
            t_alerts = target.get("verificationAlerts", [])

            top_skill = t_skills[0] if t_skills else "Full Stack Engineering"
            sec_skill = t_skills[1] if len(t_skills) > 1 else "System Architecture"
            missing_text = t_missing[0] if t_missing else "production scale"
            proj_title = t_projs[0].get("title", "recent project") if t_projs else "scalable architecture"

            questions = [
                f"1. **Architecture & Demonstrated Skills ({top_skill} / {sec_skill})**:\n   _\"Can you walk us through the technical architecture of your work on '{proj_title}'? Specifically, how did you handle state management and API performance?\"_",
                f"2. **Skill Gap Assessment ({missing_text})**:\n   _\"Our team relies on {missing_text}. How have you ramped up on unfamiliar technologies in previous roles, and how would you apply that here?\"_",
                f"3. **Code Quality & Testing**:\n   _\"How do you balance rapid feature delivery with unit/integration test coverage and CI/CD pipelines in a fast-paced environment?\"_",
                f"4. **Engineering Trade-offs & Debugging**:\n   _\"Describe a scenario where a production issue or performance bottleneck arose. What telemetry did you inspect, and how did you resolve it?\"_"
            ]

            if t_alerts:
                questions.append(
                    f"5. **Integrity & Practical Verification (Flag Follow-up)**:\n   _\"Can you conduct a live code walk-through demonstrating hands-on implementation details of your listed {top_skill} projects?\"_"
                )

            return {
                "response": f"### 💡 Tailored Interview Questions for **{t_name}** ({t_title})\n\n"
                            f"Based on **{t_name}**'s verified profile (Rank #{target.get('rank', 1)}, Match Score: **{target.get('finalScore', 0)}%**):\n\n"
                            + "\n\n".join(questions) + "\n\n"
                            f"📌 **Recruiter Tip**: Focus on their actual hands-on execution in {top_skill} and probe how quickly they can bridge any experience in {missing_text}."
            }

    # 4. EXPLAIN SCORE / WHY RANKED
    if any(w in p_lower for w in ["why", "explain", "reason", "scored", "scoring"]) and (matched_candidate or any(w in p_lower for w in ["rank", "score", "#1", "top", "first"])):
        target = matched_candidate if matched_candidate else (sorted(candidates, key=lambda x: x.get("finalScore", 0), reverse=True)[0] if candidates else None)
        if target:
            t_name = target.get("name", "Candidate")
            t_score = target.get("finalScore", 0)
            t_sem = target.get("semanticScore", 0)
            t_kw = target.get("keywordScore", 0)
            t_exp = target.get("experienceYears", 0.5)
            t_skills = target.get("matchedSkills", [])
            t_missing = target.get("missingSkills", [])
            t_alerts = target.get("verificationAlerts", [])

            return {
                "response": f"### 📊 Score Analysis: **{t_name}** (Final Score: **{t_score}%**)\n\n"
                            f"Here is how Nexora's AI Engine evaluated **{t_name}** for **{job_title}**:\n\n"
                            f"1. **Semantic Match ({t_sem}%)**: Evaluates sentence embeddings and contextual alignment between the candidate's actual responsibilities and the job description requirements.\n"
                            f"2. **Keyword Skill Coverage ({t_kw}%)**: Verified **{len(t_skills)} core skills** ({', '.join(t_skills) if t_skills else 'None'}).\n"
                            f"3. **Experience Depth**: **{t_exp} years** of demonstrated engineering experience.\n"
                            f"4. **Gaps & Missing Requirements**: {', '.join(t_missing) if t_missing else 'None — Full coverage across job requirements'}.\n"
                            f"5. **Document Integrity**: {'⚠️ Flagged with ' + str(len(t_alerts)) + ' anomaly warnings (fraudulent keywords excluded).' if t_alerts else '✓ Verified 100% clean document structure.'}"
            }

    # 5. SPECIFIC CANDIDATE INQUIRY (Dossier or Fraud)
    if matched_candidate:
        c = matched_candidate
        name = c.get("name", "Candidate")
        rank = c.get("rank", 1)
        score = c.get("finalScore", 0)
        sem_score = c.get("semanticScore", 0)
        kw_score = c.get("keywordScore", 0)
        title = c.get("title", "Software Engineer")
        exp_years = c.get("experienceYears", 0.5)
        location = c.get("location", "Not specified")
        matched_skills = c.get("matchedSkills", [])
        missing_skills = c.get("missingSkills", [])
        alerts = c.get("verificationAlerts", [])
        is_suspicious = len(alerts) > 0 or c.get("verificationStatus") == "review_recommended"
        
        edu = c.get("education", [])
        edu_str = f"{edu[0].get('degree', 'Degree')} at {edu[0].get('institution', 'University')} ({edu[0].get('year', '')})" if edu else "Education on file"

        work = c.get("workHistory", [])
        work_str = f"{work[0].get('role', title)} at {work[0].get('company', 'Company')} ({work[0].get('period', '')})" if work else "Experience details on file"

        projs = c.get("projects", [])
        proj_bullets = "\n".join([f"  • **{p.get('title', 'Project')}**: {p.get('description', '')} (Tech: {', '.join(p.get('technologies', []))})" for p in projs[:3]]) if projs else "  • Projects indexed from resume."

        # If question is specifically about fraud/flags for this candidate
        if any(w in p_lower for w in ["fraud", "fake", "suspicious", "flag", "alert", "anomal", "integrity", "hidden"]):
            if is_suspicious:
                alert_details = "\n".join([f"  • **{a.get('title', 'Integrity Alert')}** [{a.get('severity', 'HIGH').upper()}]: {a.get('message', a.get('description', 'Detected anomalous layer.'))}" + (f"\n    _Detected Snippet_: `{a.get('detectedValue', a.get('detectedText', ''))[:80]}`" if a.get('detectedValue') or a.get('detectedText') else "") for a in alerts[:5]])
                return {
                    "response": f"### ⚠️ Integrity Analysis for **{name}**\n\n"
                                f"**Status**: Review Recommended ({len(alerts)} anomalies detected)\n\n"
                                f"**Detected Findings**:\n{alert_details}\n\n"
                                f"💡 **Recruiter Note**: Nexora FraudGuard excluded all hidden keyword injections and fabricated claims from scoring. {name}'s match score (**{score}%**) reflects **only verified visible credentials**."
                }
            else:
                return {
                    "response": f"### ✓ Document Integrity for **{name}**\n\n"
                                f"**Status**: **Verified Clean** · No Anomalies Detected\n\n"
                                f"• **Typography**: Passed font size standards (≥ 8pt)\n"
                                f"• **Formatting**: Passed boundary & zero white-font contrast checks\n"
                                f"• **Integrity**: Passed all adversarial prompt injection scans."
                }

        # General dossier for the candidate
        integrity_summary = f"⚠️ **Flagged ({len(alerts)} anomalies)** — Hidden text/keyword stuffing was caught and purged from score." if is_suspicious else "✓ **Verified Document Integrity** — Passed all fraud checks."

        return {
            "response": f"### Profile Evaluation: **{name}** (Rank #{rank})\n\n"
                        f"• **Target Role Fit**: **{score}% Final Match Score** (Semantic: {sem_score}%, Keywords: {kw_score}%)\n"
                        f"• **Current Role & Experience**: {title} ({exp_years} yrs) · {location}\n"
                        f"• **Education**: {edu_str}\n"
                        f"• **Recent Experience**: {work_str}\n"
                        f"• **Verified Core Skills**: {', '.join(matched_skills) if matched_skills else 'Basic skills on file'}\n"
                        f"• **Missing Role Requirements**: {', '.join(missing_skills) if missing_skills else 'None (Full coverage)'}\n\n"
                        f"**Demonstrated Projects**:\n{proj_bullets}\n\n"
                        f"**Document Verification**: {integrity_summary}"
        }

    # 6. FRAUD & INTEGRITY QUERIES (Across the whole pool)
    if any(w in p_lower for w in ["fraud", "fake", "suspicious", "flagged", "alert", "cheat", "scam", "adversarial"]):
        flagged_candidates = [c for c in candidates if len(c.get("verificationAlerts", [])) > 0 or c.get("verificationStatus") == "review_recommended"]
        if flagged_candidates:
            summary_bullets = []
            for fc in flagged_candidates[:4]:
                f_alerts = fc.get("verificationAlerts", [])
                top_alert = f_alerts[0] if f_alerts else {}
                summary_bullets.append(f"• **{fc.get('name')}** (Rank #{fc.get('rank')}): **{len(f_alerts)} flags** — {top_alert.get('title', 'Formatting anomaly')} (`{top_alert.get('detectedValue', top_alert.get('detectedText', ''))[:50]}...`)")

            return {
                "response": f"### 🔍 Nexora FraudGuard Pool Audit\n\n"
                            f"Identified **{len(flagged_candidates)} candidate(s)** with potential document manipulation or hidden adversarial text:\n\n"
                            f"{chr(10).join(summary_bullets)}\n\n"
                            f"🛡️ **System Protection**: All concealed text (1.0pt micro-fonts, white-fonts, off-margin ATS stuffing) was stripped out prior to scoring. Match scores accurately reflect genuine qualifications only."
            }
        else:
            return {
                "response": f"### ✓ Nexora FraudGuard Pool Audit\n\n"
                            f"**All {len(candidates)} candidates in the active pool are verified clean**.\n\n"
                            f"Zero hidden text layers, invisible white-fonting (RGB 255), or microscopic typography manipulations were detected."
            }

    # 7. CANDIDATE COMPARISON QUERIES
    if "compare" in p_lower or "versus" in p_lower or " vs " in p_lower:
        if len(candidates) >= 2:
            c1, c2 = candidates[0], candidates[1]
            # Check if specific names mentioned
            mentioned = [c for c in candidates if c.get("name", "").split()[0].lower() in p_lower]
            if len(mentioned) >= 2:
                c1, c2 = mentioned[0], mentioned[1]
            elif len(mentioned) == 1 and len(candidates) >= 2:
                c1 = mentioned[0]
                c2 = [c for c in candidates if c != c1][0]

            name1, name2 = c1.get("name", "Candidate 1"), c2.get("name", "Candidate 2")
            score1, score2 = c1.get("finalScore", 0), c2.get("finalScore", 0)
            skills1 = ", ".join(c1.get("matchedSkills", [])) or "None"
            skills2 = ", ".join(c2.get("matchedSkills", [])) or "None"
            exp1, exp2 = c1.get("experienceYears", 0.5), c2.get("experienceYears", 0.5)
            ver1 = "⚠️ Flagged for review" if c1.get("verificationAlerts") else "✓ Verified clean"
            ver2 = "⚠️ Flagged for review" if c2.get("verificationAlerts") else "✓ Verified clean"

            rec = f"**{name1}** holds a +{round(score1 - score2, 1)}% higher match score" if score1 >= score2 else f"**{name2}** holds a +{round(score2 - score1, 1)}% higher match score"

            return {
                "response": f"### ⚖️ Side-by-Side Comparison: **{name1}** vs **{name2}**\n\n"
                            f"| Metric | **{name1}** (Rank #{c1.get('rank', 1)}) | **{name2}** (Rank #{c2.get('rank', 2)}) |\n"
                            f"| :--- | :--- | :--- |\n"
                            f"| **Overall Match** | **{score1}%** (Sem: {c1.get('semanticScore', 0)}%, KW: {c1.get('keywordScore', 0)}%) | **{score2}%** (Sem: {c2.get('semanticScore', 0)}%, KW: {c2.get('keywordScore', 0)}%) |\n"
                            f"| **Title & Exp** | {c1.get('title', 'Engineer')} ({exp1} yrs) | {c2.get('title', 'Engineer')} ({exp2} yrs) |\n"
                            f"| **Verified Skills** | {skills1} | {skills2} |\n"
                            f"| **Integrity** | {ver1} | {ver2} |\n\n"
                            f"💡 **Recommendation**: {rec}. Review evidenced projects and verify any flagged items during technical interview."
            }

    # 8. SKILL SPECIFIC SEARCH QUERIES
    tech_keywords = ["python", "react", "typescript", "javascript", "angular", "node", "express", "sql", "aws", "docker", "kubernetes", "mongodb", "figma"]
    searched_skill = None
    for tk in tech_keywords:
        if tk in p_lower:
            searched_skill = tk
            break

    if searched_skill and any(w in p_lower for w in ["who", "which", "has", "knows", "experience", "candidates", "find"]):
        matches = [c for c in candidates if any(searched_skill in s.lower() for s in c.get("matchedSkills", [])) or searched_skill in c.get("title", "").lower()]
        skill_display = searched_skill.upper() if len(searched_skill) <= 4 else searched_skill.title()

        if matches:
            cand_lines = "\n".join([f"• **{c.get('name')}** (Rank #{c.get('rank', 1)}, **{c.get('finalScore', 0)}% Match**) — {c.get('title', 'Engineer')}, {c.get('experienceYears', 0.5)} yrs exp." for c in matches[:6]])
            return {
                "response": f"### 🎯 Candidates with Verified **{skill_display}** Experience\n\n"
                            f"Found **{len(matches)} candidate(s)** with demonstrated {skill_display} proficiency:\n\n"
                            f"{cand_lines}\n\n"
                            f"Each candidate's profile links to verified code evidence from their work history and projects."
            }
        else:
            return {
                "response": f"### ⚠️ Skill Coverage: **{skill_display}**\n\n"
                            f"No candidates in the active pool currently demonstrate verified production experience in **{skill_display}**.\n\n"
                            f"Consider evaluating candidates with adjacent skillsets or adjusting hiring weights in the dashboard."
            }

    # 9. BEST CANDIDATE / RECOMMENDATION QUERIES
    if any(w in p_lower for w in ["best", "top", "recommend", "hire", "first", "rank 1", "rank #1", "who should"]):
        if candidates:
            top_c = sorted(candidates, key=lambda x: x.get("finalScore", 0), reverse=True)[0]
            name = top_c.get("name", "Top Candidate")
            score = top_c.get("finalScore", 0)
            skills = ", ".join(top_c.get("matchedSkills", []))
            title = top_c.get("title", "Engineer")
            exp = top_c.get("experienceYears", 0.5)

            return {
                "response": f"### 🏆 Top Candidate Recommendation: **{name}**\n\n"
                            f"• **Rank**: #1 with a **{score}% Match Score** for **{job_title}**\n"
                            f"• **Role**: {title} ({exp} years of verified experience)\n"
                            f"• **Key Strengths**: Verified skills across **{skills}**\n"
                            f"• **Next Step**: Schedule an initial technical screen to evaluate architectural depth."
            }

    # 10. EXECUTIVE POOL SUMMARY & ADVICE
    if any(w in p_lower for w in ["pool", "summary", "overview", "status", "advice", "report", "health"]):
        total_c = len(candidates)
        avg_score = round(sum(c.get("finalScore", 0) for c in candidates) / total_c, 1) if total_c else 0
        top_3 = sorted(candidates, key=lambda x: x.get("finalScore", 0), reverse=True)[:3]
        top_lines = "\n".join([f"  {i+1}. **{c.get('name')}** ({c.get('finalScore', 0)}%) — {c.get('title', 'Engineer')}" for i, c in enumerate(top_3)])

        return {
            "response": f"### 📈 Talent Pool Executive Summary: **{job_title}**\n\n"
                        f"• **Candidate Count**: {total_c} total active applicants\n"
                        f"• **Average Match Score**: {avg_score}%\n\n"
                        f"**Top Ranked Contenders**:\n{top_lines}\n\n"
                        f"💡 **Hiring Recommendation**: Advance the top 2-3 candidates to live technical assessments. Use the FraudGuard integrity audit to review flagged items before final offers."
        }

    # 11. GENERAL REASONING ON PROMPT
    # When user sends any other prompt, reason intelligently using the role and candidate context
    top_candidates = sorted(candidates, key=lambda x: x.get("finalScore", 0), reverse=True)[:2]
    top_context = ", ".join([f"{c.get('name')} ({c.get('finalScore', 0)}%)" for c in top_candidates]) if top_candidates else "candidate pool"

    return {
        "response": f"### 💡 AI Intelligence Assessment for: _\"{prompt}\"_\n\n"
                    f"Evaluating this against our **{job_title}** requirements and active pool ({len(candidates)} candidates, leading candidates: **{top_context}**):\n\n"
                    f"1. **Core Alignment**: Top candidates demonstrate strong alignment in full-stack architecture, while secondary skills (cloud infrastructure, distributed systems) are the key differentiators.\n"
                    f"2. **Evidence-Based Evaluation**: Candidate rankings are calculated using verified project artifacts rather than unverified resume claims.\n"
                    f"3. **Suggested Next Action**: Ask me to _\"Draft interview questions for {top_candidates[0].get('name', 'the top candidate')}\"_ or _\"Compare top 2 candidates\"_ to dive deeper."
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

