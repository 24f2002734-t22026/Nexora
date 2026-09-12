import React, { useState } from 'react';
import { Sparkles, X, ArrowRight, Bot, User as UserIcon, HelpCircle } from 'lucide-react';
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

  const handleAsk = async (queryText?: string) => {
    const q = (queryText || input).trim();
    if (!q) return;

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
            <header className="chat-header">
              <div className="chat-header-info">
                <div className="chat-bot-icon">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 id="chat-title">Recruiter Intelligence Assistant</h3>
                  <small>Context: Senior Full Stack Engineer (18 candidates)</small>
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

            <div className="chat-body">
              {messages.length === 0 && (
                <div className="chat-welcome">
                  <div className="welcome-icon">
                    <Bot size={28} />
                  </div>
                  <h4>How can I assist your hiring decision?</h4>
                  <p>
                    I have full context over the candidate pool, semantic/keyword evaluations, and skill coverage. Ask questions or try the prompts below:
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

            <form
              className="chat-input-footer"
              onSubmit={(e) => {
                e.preventDefault();
                void handleAsk();
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about candidate rankings, Angular, AWS, or comparisons..."
                aria-label="Ask Recruiter Assistant"
              />
              <button type="submit" className="send-btn" disabled={!input.trim() || typing}>
                <ArrowRight size={16} />
              </button>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
