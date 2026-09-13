import os
import logging
import threading
from typing import Dict, Any, List, Optional
import torch

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nexora-local-llm")

# Global singleton
_model = None
_tokenizer = None
_device = None
_load_lock = threading.Lock()
_is_loading = False

MODEL_NAME = "Qwen/Qwen2.5-0.5B-Instruct"

def get_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"

def load_local_llm():
    global _model, _tokenizer, _device, _is_loading
    with _load_lock:
        if _model is not None:
            return _model, _tokenizer, _device
        if _is_loading:
            return None, None, None

        _is_loading = True
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer
            _device = get_device()
            logger.info(f"Loading local offline LLM ({MODEL_NAME}) on device: {_device}...")
            
            _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
            
            # Use float16 on GPU/MPS for speed & low memory footprint; float32 on CPU
            dtype = torch.float16 if _device in ["cuda", "mps"] else torch.float32
            _model = AutoModelForCausalLM.from_pretrained(
                MODEL_NAME,
                torch_dtype=dtype,
                low_cpu_mem_usage=True
            ).to(_device)
            _model.eval()
            logger.info(f"Local LLM ({MODEL_NAME}) successfully loaded and active on {_device}.")
            return _model, _tokenizer, _device
        except Exception as e:
            logger.error(f"Failed to load local LLM model: {e}")
            _model = None
            _tokenizer = None
            return None, None, None
        finally:
            _is_loading = False

def build_rag_context(candidates: List[Dict[str, Any]], job_title: str) -> str:
    """
    Builds a compact, fact-dense RAG summary of the candidate pool.
    """
    if not candidates:
        return f"Role: {job_title}\nNo candidate profiles currently available."

    sorted_c = sorted(candidates, key=lambda x: x.get("finalScore", 0), reverse=True)
    summary_lines = [f"Target Role: {job_title}", f"Total Active Candidates: {len(candidates)}", "Candidate Rankings & Evidence:"]

    for idx, c in enumerate(sorted_c[:12], 1):
        name = c.get("name", f"Candidate {idx}")
        score = c.get("finalScore", 0)
        sem = c.get("semanticScore", 0)
        kw = c.get("keywordScore", 0)
        skills = c.get("matchedSkills", [])
        missing = c.get("missingSkills", [])
        exp = c.get("experienceYears", 0)
        alerts = c.get("verificationAlerts", [])
        alert_flag = f"[ALERT: {len(alerts)} anomalies detected (fraudulent keywords excluded)]" if alerts else "[VERIFIED: Clean document]"

        projs = c.get("projects", [])
        proj_str = ", ".join([p.get("title", "Project") for p in projs[:2]]) if projs else "None"

        summary_lines.append(
            f"#{idx} {name} | Match Score: {score}% (Semantic: {sem}%, Keywords: {kw}%) | {exp} yrs exp | {alert_flag}\n"
            f"   - Verified Skills: {', '.join(skills[:8]) if skills else 'None'}\n"
            f"   - Missing Skills: {', '.join(missing[:4]) if missing else 'None'}\n"
            f"   - Key Projects: {proj_str}"
        )

    return "\n".join(summary_lines)

def generate_local_response(prompt: str, candidates: List[Dict[str, Any]], job_title: str) -> Optional[str]:
    """
    Generates an intelligent, grounded recruiter assistant response using the local offline LLM.
    """
    model, tokenizer, device = load_local_llm()
    if model is None or tokenizer is None or device is None:
        return None

    try:
        rag_context = build_rag_context(candidates, job_title)
        
        system_instruction = (
            "You are Nexora AI, a world-class Recruiter Intelligence and Talent Assessment Assistant.\n"
            "You analyze candidate pools, explain match rankings, conduct integrity audits, compare candidates, and generate tailored interview questions.\n"
            "Rules:\n"
            "1. Ground all your answers strictly in the candidate evidence provided below.\n"
            "2. Be concise, structured, insightful, and professional. Use markdown formatting with bold text and bullet points.\n"
            "3. If asked for interview questions, generate 3-4 deep, role-specific questions tailored to their verified projects and skill gaps.\n"
            "4. If asked about fraud or document integrity, highlight any anomalies detected.\n"
            "\n"
            f"--- CANDIDATE POOL DATA ---\n{rag_context}\n---------------------------"
        )

        messages = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": prompt}
        ]

        text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer([text], return_tensors="pt").to(device)

        with torch.no_grad():
            outputs = model.generate(
                inputs.input_ids,
                max_new_tokens=400,
                temperature=0.4,
                top_p=0.9,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )

        generated_ids = outputs[:, inputs.input_ids.shape[1]:]
        response = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()
        return response
    except Exception as e:
        logger.error(f"Local LLM generation failed: {e}")
        return None
