import os
import io
import time
import logging
from typing import Dict, Any, Tuple, Optional, Union
import numpy as np
import soundfile as sf
from pydub import AudioSegment

# Force Keras 3 to use PyTorch backend (no tensorflow required)
os.environ["KERAS_BACKEND"] = "torch"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("moonshine-transcriber")

class MoonshineTranscriber:
    """
    Moonshine Base Speech-to-Text Model Wrapper
    Model: moonshine/base (~61M parameters)
    High accuracy, ultra-low latency optimized for edge & server streaming/batch inference.
    """
    def __init__(self, model_name: str = "moonshine/base"):
        self.model_name = model_name
        self.target_sample_rate = 16000
        self.model = None
        self._load_model()

    def _load_model(self):
        try:
            import moonshine
            logger.info(f"Loading Moonshine Base model: {self.model_name}...")
            # Load Moonshine Base model into memory
            self.model = moonshine.load_model(self.model_name)
            self.moonshine_pkg = moonshine
            logger.info(f"Moonshine Base model ({self.model_name}) successfully loaded and ready.")
        except Exception as e:
            logger.error(f"Error loading Moonshine Base model: {e}")
            self.model = None

    def preprocess_audio(self, audio_data: Union[bytes, np.ndarray], file_format: str = "wav") -> Tuple[np.ndarray, float]:
        """
        Converts audio bytes (WAV, WebM, MP3, OGG, PCM) or raw numpy array to 16kHz float32 mono array.
        Returns: (audio_array, duration_in_seconds)
        """
        if isinstance(audio_data, np.ndarray):
            # Already numpy array
            audio_array = audio_data.astype(np.float32)
            duration_sec = len(audio_array) / self.target_sample_rate
            return audio_array, duration_sec

        try:
            # Multi-format parsing using pydub
            audio_seg = AudioSegment.from_file(io.BytesIO(audio_data))
            audio_seg = audio_seg.set_frame_rate(self.target_sample_rate)
            audio_seg = audio_seg.set_channels(1)
            
            duration_sec = len(audio_seg) / 1000.0
            samples = np.array(audio_seg.get_array_of_samples())
            
            if audio_seg.sample_width == 2:
                samples = samples.astype(np.float32) / 32768.0
            elif audio_seg.sample_width == 4:
                samples = samples.astype(np.float32) / 2147483648.0
            else:
                samples = samples.astype(np.float32) / (2 ** (8 * audio_seg.sample_width - 1))
                
            return samples, duration_sec
        except Exception as e:
            # Fallback for raw 16kHz 16-bit PCM bytes
            try:
                samples = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
                duration_sec = len(samples) / self.target_sample_rate
                return samples, duration_sec
            except Exception as pe:
                logger.error(f"Audio preprocessing error: {str(e)} / {str(pe)}")
                raise ValueError(f"Audio decoding failed: {str(e)}")

    def transcribe(self, audio_data: Union[bytes, np.ndarray, str], file_format: str = "wav") -> Dict[str, Any]:
        """
        Transcribe audio input using Moonshine Base.
        Accepts: raw bytes, numpy array, or file path.
        """
        start_time = time.time()
        
        if isinstance(audio_data, str) and os.path.exists(audio_data):
            audio_path = audio_data
            data, sr = sf.read(audio_path)
            duration_sec = len(data) / sr
        else:
            audio_array, duration_sec = self.preprocess_audio(audio_data, file_format)
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_wav:
                audio_path = tmp_wav.name
                sf.write(audio_path, audio_array, self.target_sample_rate, subtype='PCM_16')

        try:
            if self.model is not None:
                transcription = self.moonshine_pkg.transcribe(audio_path, self.model)
                if isinstance(transcription, list):
                    text_result = " ".join(transcription).strip()
                else:
                    text_result = str(transcription).strip()
            else:
                text_result = "Moonshine model not loaded."

            latency_ms = int((time.time() - start_time) * 1000)
            return {
                "text": text_result,
                "model": self.model_name,
                "duration_seconds": round(duration_sec, 2),
                "latency_ms": latency_ms,
                "status": "completed"
            }
        except Exception as e:
            logger.error(f"Moonshine Base transcription error: {str(e)}")
            latency_ms = int((time.time() - start_time) * 1000)
            return {
                "text": "",
                "model": self.model_name,
                "duration_seconds": round(duration_sec, 2) if 'duration_sec' in locals() else 0,
                "latency_ms": latency_ms,
                "status": "failed",
                "error": str(e)
            }
        finally:
            if not isinstance(audio_data, str) and os.path.exists(audio_path):
                try:
                    os.remove(audio_path)
                except Exception:
                    pass
