import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  ArrowRight, 
  Bot, 
  User as UserIcon, 
  Mic, 
  MicOff, 
  Square, 
  Radio, 
  Loader2,
  Volume2
} from 'lucide-react';
import { toast } from 'sonner';
import { chatWithRecruiter } from '../services/api';
import type { Candidate, ChatMessage } from '../types';

interface RecruiterChatbotProps {
  candidates?: Candidate[];
}

const suggestedPrompts = [
  'Why is Rahul ranked #1?',
  'Who has Angular experience?',
  'Which candidates are missing AWS?',
  'Compare Rahul and Arjun.',
  'Which required skill has the biggest candidate gap?',
];

export function RecruiterChatbot({ candidates }: RecruiterChatbotProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);

  // STT Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Initialize WebSocket connection when drawer opens
  useEffect(() => {
    if (!open) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsConnected(false);
      return;
    }

    const wsUrl = 'ws://127.0.0.1:8001/ws/transcribe';
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'final_transcript') {
            setIsTranscribing(false);
            if (data.text && data.text.trim()) {
              setInput((prev) => (prev ? `${prev} ${data.text.trim()}` : data.text.trim()));
              toast.success(`Transcribed via Moonshine Base (${data.latency_ms || 35}ms)`);
            } else {
              toast.info('No speech detected. Please speak clearly into the microphone.');
            }
          } else if (data.event === 'error') {
            setIsTranscribing(false);
            toast.error(`STT error: ${data.error || 'Transcription failed'}`);
          }
        } catch (e) {
          console.error('WebSocket parse error', e);
        }
      };

      ws.onerror = () => {
        setWsConnected(false);
      };

      ws.onclose = () => {
        setWsConnected(false);
      };
    } catch (err) {
      console.warn('Could not connect to Moonshine WebSocket server', err);
      setWsConnected(false);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [open]);

  // Recording Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Determine supported MIME type
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      // Start WebSocket session if connected
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'start' }));
      }

      mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const buffer = await e.data.arrayBuffer();
            wsRef.current.send(buffer);
          }
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsTranscribing(true);

        // If WebSocket is open, send stop/flush action
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ action: 'stop' }));
        } else {
          // Fallback REST endpoint
          try {
            const blob = new Blob(audioChunksRef.current, { type: mimeType });
            const formData = new FormData();
            formData.append('audio_file', blob, 'recording.webm');
            
            const res = await fetch('http://127.0.0.1:8001/api/stt/transcribe', {
              method: 'POST',
              body: formData,
            });
            const data = await res.json();
            setIsTranscribing(false);

            if (data.text && data.text.trim()) {
              setInput((prev) => (prev ? `${prev} ${data.text.trim()}` : data.text.trim()));
              toast.success(`Transcribed via Moonshine Base REST (${data.latency_ms || 40}ms)`);
            } else {
              toast.info('No speech detected.');
            }
          } catch (restErr) {
            setIsTranscribing(false);
            console.error('REST STT error:', restErr);
            toast.error('Could not transcribe audio. Ensure the Moonshine STT server is running.');
          }
        }
      };

      mediaRecorder.start(250); // Emit audio chunks every 250ms
      setIsRecording(true);
      toast.info('Listening with Moonshine Base STT...');
    } catch (err: any) {
      console.error('Microphone error:', err);
      toast.error('Could not access microphone. Please grant browser microphone permission.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  const handleAsk = async (queryText?: string) => {
    const q = (queryText || input).trim();
    if (!q) return;

    if (isRecording) {
      stopVoiceRecording();
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    try {
      const reply = await chatWithRecruiter(q, candidates);
      setMessages((prev) => [...prev, reply]);
    } catch {
      toast.error('Recruiter Assistant encountered an issue. Please retry.');
    } finally {
      setTyping(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        type="button"
        className="chat-fab-btn"
        onClick={() => setOpen(true)}
        aria-label="Open Recruiter Intelligence Assistant"
      >
        <Sparkles size={16} />
        <span>Recruiter Assistant</span>
      </button>

      {/* Slide-Over Drawer */}
      {open && (
        <div className="drawer-backdrop chat-backdrop" onClick={() => setOpen(false)}>
          <aside
            className="chat-drawer-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-title"
          >
            {/* Header */}
            <header className="chat-header">
              <div className="chat-header-info">
                <div className="chat-bot-icon">
                  <Sparkles size={16} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h3 id="chat-title">Recruiter Assistant</h3>
                    <span 
                      className={`status-badge-inline ${wsConnected ? 'status-strong' : ''}`}
                      style={{ fontSize: '9px', padding: '1px 6px' }}
                      title={wsConnected ? 'Moonshine Base STT WebSocket Connected' : 'Connecting to Moonshine STT...'}
                    >
                      <Radio size={10} style={{ color: wsConnected ? 'var(--success)' : 'var(--text-light)' }} />
                      Moonshine Base STT
                    </span>
                  </div>
                  <small>Context: Active candidate pool & job requirements</small>
                </div>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </header>

            {/* Chat Body */}
            <div className="chat-body">
              {messages.length === 0 && (
                <div className="chat-welcome">
                  <div className="welcome-icon">
                    <Bot size={28} />
                  </div>
                  <h4>How can I assist your hiring decision?</h4>
                  <p>
                    Ask questions using text or voice with <b>Moonshine Base STT</b>. I have full context over candidate rankings, qualifications, and skill evidence.
                  </p>

                  <div className="prompts-list">
                    {suggestedPrompts.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className="prompt-chip-btn"
                        onClick={() => handleAsk(p)}
                      >
                        <span>{p}</span>
                        <ArrowRight size={13} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="messages-stream">
                {messages.map((m) => (
                  <div key={m.id} className={`chat-bubble-row ${m.role}`}>
                    <div className="chat-avatar">
                      {m.role === 'assistant' ? <Sparkles size={13} /> : <UserIcon size={13} />}
                    </div>
                    <div className="chat-bubble">
                      <div className="chat-bubble-text">{m.content}</div>
                      <span className="chat-timestamp">{m.timestamp}</span>
                    </div>
                  </div>
                ))}

                {typing && (
                  <div className="chat-bubble-row assistant">
                    <div className="chat-avatar">
                      <Sparkles size={13} />
                    </div>
                    <div className="chat-bubble typing-bubble">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live Recording Banner */}
            {isRecording && (
              <div style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderTop: '1px solid rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#ef4444'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    animation: 'pulse 1s infinite'
                  }} />
                  <b>Recording audio ({formatTimer(recordingSeconds)})...</b>
                </div>
                <button
                  type="button"
                  onClick={stopVoiceRecording}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '11px',
                    textDecoration: 'underline'
                  }}
                >
                  Finish & Transcribe
                </button>
              </div>
            )}

            {/* Live Transcribing Banner */}
            {isTranscribing && (
              <div style={{
                padding: '8px 16px',
                backgroundColor: 'var(--primary-light)',
                borderTop: '1px solid var(--primary-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: 'var(--primary-text)'
              }}>
                <Loader2 size={14} className="animate-spin" style={{ color: 'var(--primary)' }} />
                <span>Processing speech with <b>Moonshine Base</b> model...</span>
              </div>
            )}

            {/* Input Footer */}
            <form
              className="chat-input-footer"
              onSubmit={(e) => {
                e.preventDefault();
                void handleAsk();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isRecording ? 'Listening to speech...' : 'Type or click mic to speak with Moonshine STT...'}
                aria-label="Ask Recruiter Assistant"
                style={{ flex: 1 }}
              />

              {/* Voice Microphone Button */}
              <button
                type="button"
                onClick={toggleRecording}
                className={`btn btn-secondary btn-sm ${isRecording ? 'active-recording' : ''}`}
                style={{
                  padding: '8px 10px',
                  backgroundColor: isRecording ? '#ef4444' : undefined,
                  color: isRecording ? '#ffffff' : 'var(--text-secondary)',
                  border: isRecording ? '1px solid #dc2626' : undefined,
                  borderRadius: 'var(--radius-md)'
                }}
                title={isRecording ? 'Click to stop recording' : 'Speak using Moonshine Base Speech-to-Text'}
                aria-label="Voice input"
              >
                {isRecording ? <Square size={15} /> : <Mic size={15} />}
              </button>

              {/* Send Button */}
              <button 
                type="submit" 
                className="send-btn" 
                disabled={!input.trim() || typing || isTranscribing}
                title="Send message"
              >
                <ArrowRight size={16} />
              </button>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
