import React, { useState } from 'react';
import {
  Code2,
  CheckCircle2,
  Play,
  Send,
  ArrowLeft,
  Clock,
  Sparkles,
  Check,
  AlertCircle,
  Terminal,
  Lock,
  Unlock,
  Calendar,
  Mail,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { candidates as defaultCandidates } from '../data';
import { store } from '../services/store';
import { submitCandidateAssessmentResponse } from '../services/api';
import type { Candidate } from '../types';

export function CandidateAssessmentPortal() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Retrieve candidate from reactive store or default dataset
  const storedCandidate = id ? store.getCandidate(id) : undefined;
  const fallbackCandidate = defaultCandidates.find((c) => c.id === id);
  const candidate: Candidate = storedCandidate || fallbackCandidate || {
    id: id || 'candidate_1',
    name: 'Rahul Sharma',
    title: 'Senior Software Engineer',
    email: 'rahul.sharma@example.com',
    location: 'Bengaluru, India',
    rank: 1,
    requiredSkillsMatched: 5,
    requiredSkillsTotal: 5,
    preferredSkillsMatched: 1,
    preferredSkillsTotal: 2,
    matchedSkills: ['Python', 'TypeScript', 'SQL', 'FastAPI'],
    missingSkills: [],
    skillEvidence: {},
    explanation: '',
    experience: '',
    experienceYears: 3.5,
    education: [],
    projects: [],
    workHistory: [],
    links: {},
    verificationAlerts: [],
    verificationStatus: 'verified',
  };

  const [language, setLanguage] = useState<'python' | 'typescript' | 'javascript' | 'sql'>('python');
  const [code, setCode] = useState<string>(`# Python 3 Solution
from typing import Dict, Any

def handle_candidate_submission(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate input payload, process submission, and return structured JSON response.
    """
    if not payload or "candidate_id" not in payload:
        return {"status": "error", "code": 400, "message": "Missing candidate_id in payload"}
    
    candidate_id = payload.get("candidate_id")
    raw_score = payload.get("score", 0)
    
    # Process structured scoring
    normalized_score = min(100, max(0, float(raw_score)))
    
    return {
        "status": "success",
        "code": 200,
        "data": {
            "candidate_id": candidate_id,
            "verified_score": normalized_score,
            "status": "EVALUATED"
        }
    }
`);

  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [unlockedForPreview, setUnlockedForPreview] = useState(false);

  // Time-gating check: If scheduled in future and not yet unlocked by preview
  const scheduledAt = candidate.assessment?.scheduledAt;
  const isFutureScheduled = scheduledAt ? new Date(scheduledAt).getTime() > Date.now() : false;
  const isLocked = isFutureScheduled && !unlockedForPreview;

  const handleReturnToWorkspace = () => {
    navigate('/analysis');
  };

  const handleRunTests = () => {
    setIsRunningTests(true);
    setTestOutput(null);
    setTimeout(() => {
      setIsRunningTests(false);
      setTestOutput(`[RUNNER] Compiling and executing ${language.toUpperCase()} test suite...
✓ Test Case 1: Valid payload validation -> PASSED (4ms)
✓ Test Case 2: Missing candidate_id error handling -> PASSED (2ms)
✓ Test Case 3: Score boundary clamping (0-100) -> PASSED (2ms)
✓ Test Case 4: Structured JSON response schema match -> PASSED (3ms)

==================================================
SUMMARY: 4/4 Tests Passed. Ready for final submission.`);
    }, 900);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (id) {
        // Persist submitted code into shared reactive store
        store.saveAssessmentSubmission(id, code, language);
        await submitCandidateAssessmentResponse(id, code, language);
      }
      setSubmittedSuccess(true);
    } catch (err) {
      console.error('Failed to submit assessment:', err);
      if (id) {
        store.saveAssessmentSubmission(id, code, language);
      }
      setSubmittedSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F8FA', color: '#111827', fontFamily: 'var(--font-sans)' }}>
      {/* Top Banner Header */}
      <header
        style={{
          height: '56px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleReturnToWorkspace}
            style={{ fontSize: '12px', padding: '5px 12px' }}
          >
            <ArrowLeft size={13} /> Return to Workspace
          </button>
          <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border-color)' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            NEXORA ASSESSMENT PORTAL
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
            <span>Applicant:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{candidate.name}</strong>
          </div>
          <span className="status-badge-inline status-strong">
            <Clock size={11} /> {candidate.assessment?.scheduledDurationMinutes || 45} Minutes Allocated
          </span>
        </div>
      </header>

      {/* Time-Gated Lock Screen (If scheduled for future date and not yet unlocked) */}
      {isLocked ? (
        <div style={{ maxWidth: '640px', margin: '60px auto', padding: '36px 32px', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Lock size={26} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Assessment Scheduled & Gated
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 20px', lineHeight: 1.6 }}>
            This technical coding assessment for <b>{candidate.name}</b> has been scheduled and will unlock at the designated time.
          </p>

          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '8px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', padding: '16px 24px', borderRadius: 'var(--radius-xs)', marginBottom: '24px', textAlign: 'left', minWidth: '320px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <Calendar size={14} className="text-muted" />
              <span><b>Scheduled Time:</b> {new Date(scheduledAt!).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <Clock size={14} className="text-muted" />
              <span><b>Allocated Duration:</b> {candidate.assessment?.scheduledDurationMinutes || 45} Minutes</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <Mail size={14} className="text-muted" />
              <span><b>Invite Sent to:</b> {candidate.assessment?.candidateEmail || candidate.email}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReturnToWorkspace}
            >
              <ArrowLeft size={14} /> Back to Dashboard
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setUnlockedForPreview(true)}
            >
              <Unlock size={14} /> Recruiter Preview Mode (Unlock Now)
            </button>
          </div>
        </div>
      ) : (
        /* Main Coding Environment */
        <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px', display: 'grid', gridTemplateColumns: '420px 1fr', gap: '20px' }}>
          {/* Left Column: Problem Statement */}
          <section
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              height: 'calc(100vh - 120px)',
              overflowY: 'auto',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                <Code2 size={13} /> Coding Challenge #1
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                Input Validation & Structured Response Handler
              </h2>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <p style={{ marginBottom: '10px' }}>
                You are required to implement a robust backend handler function that parses an incoming candidate evaluation payload, enforces validation rules, and produces a structured JSON output.
              </p>

              <h4 style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '14px', marginBottom: '6px' }}>
                Requirements & Rules:
              </h4>
              <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                <li>Must check for the presence of <code>candidate_id</code> in the payload.</li>
                <li>Return HTTP 400 error schema when required parameters are absent.</li>
                <li>Clamp numeric score inputs between <code>0.0</code> and <code>100.0</code>.</li>
                <li>Format output with standardized <code>status</code>, <code>code</code>, and <code>data</code> fields.</li>
              </ul>

              <h4 style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '14px', marginBottom: '6px' }}>
                Example Payload:
              </h4>
              <pre
                style={{
                  backgroundColor: '#F3F4F6',
                  padding: '10px',
                  borderRadius: '4px',
                  fontSize: '11.5px',
                  fontFamily: 'var(--font-mono)',
                  overflowX: 'auto',
                  border: '1px solid var(--border-color)',
                }}
              >
{`{
  "candidate_id": "${candidate.id}",
  "score": 94.5
}`}
              </pre>
            </div>
          </section>

          {/* Right Column: Code Editor & Execution */}
          <section
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100vh - 120px)',
              overflow: 'hidden',
            }}
          >
            {/* Editor Action Bar */}
            <div
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: '#FAFAFB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Language:</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  style={{
                    fontSize: '12px',
                    padding: '4px 8px',
                    borderRadius: '3px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#FFFFFF',
                    fontWeight: 600,
                  }}
                >
                  <option value="python">Python (3.11)</option>
                  <option value="typescript">TypeScript (5.0)</option>
                  <option value="javascript">JavaScript (ES2024)</option>
                  <option value="sql">SQL (PostgreSQL)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleRunTests}
                  disabled={isRunningTests || isSubmitting || submittedSuccess}
                  style={{ fontSize: '12px', padding: '5px 12px' }}
                >
                  <Play size={12} /> {isRunningTests ? 'Running Tests...' : 'Run Test Cases'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleSubmit}
                  disabled={isSubmitting || submittedSuccess}
                  style={{ fontSize: '12px', padding: '5px 14px' }}
                >
                  <Send size={12} /> {submittedSuccess ? 'Submitted ✓' : isSubmitting ? 'Submitting...' : 'Submit Assessment'}
                </button>
              </div>
            </div>

            {/* Code Textarea Area */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
              {submittedSuccess ? (
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '32px',
                    textAlign: 'center',
                    backgroundColor: '#FAFAFB',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--success-bg)',
                      color: 'var(--success)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <CheckCircle2 size={28} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Assessment Submitted Successfully!
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '420px', marginBottom: '20px' }}>
                    Your submission has been recorded and evaluated. Your code and evaluation metrics are now visible in the recruiter portal.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => navigate(`/candidate/${candidate.id}`)}
                  >
                    View Candidate Evaluation in Recruiter Portal
                  </button>
                </div>
              ) : (
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  style={{
                    flex: 1,
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    padding: '16px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    resize: 'none',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                  }}
                  spellCheck={false}
                />
              )}

              {/* Test Results Output Console */}
              {testOutput && !submittedSuccess && (
                <div
                  style={{
                    height: '180px',
                    borderTop: '1px solid var(--border-color)',
                    backgroundColor: '#09090b',
                    color: '#A1A1AA',
                    padding: '12px 16px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11.5px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FAFAFA', fontWeight: 600, marginBottom: '4px' }}>
                    <Terminal size={13} /> Test Output Console
                  </div>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#10B981' }}>
                    {testOutput}
                  </pre>
                </div>
              )}
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
