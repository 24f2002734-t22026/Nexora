import React from 'react';
import { X, CheckCircle2, AlertTriangle, ArrowRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Candidate } from '../types';

interface CandidateComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateA: Candidate;
  candidateB: Candidate;
}

export function CandidateComparisonModal({
  isOpen,
  onClose,
  candidateA: a,
  candidateB: b,
}: CandidateComparisonModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  // Compute skill differences
  const commonSkills = a.matchedSkills.filter((s) => b.matchedSkills.includes(s));
  const onlyInA = a.matchedSkills.filter((s) => !b.matchedSkills.includes(s));
  const onlyInB = b.matchedSkills.filter((s) => !a.matchedSkills.includes(s));

  // Determine synthesis comparison explanation
  const scoreA = a.finalScore ?? 0;
  const scoreB = b.finalScore ?? 0;
  const higher = scoreA >= scoreB ? a : b;
  const lower = scoreA >= scoreB ? b : a;
  const scoreDiff = (Math.abs(scoreA - scoreB)).toFixed(1);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card compare-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-title"
      >
        <header className="modal-header">
          <div>
            <span className="modal-eyebrow">TALENT COMPARISON</span>
            <h2 id="compare-title">Candidate Comparative Evaluation</h2>
            <p>Side-by-side breakdown of qualification alignment, skill evidence, and verification.</p>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </header>

        <div className="compare-body">
          {/* Comparative Summary Banner */}
          <div className="compare-synthesis-banner">
            <b>Evaluation Rationale:</b>
            <p>
              <b>{higher.name}</b> ranks above <b>{lower.name}</b> by <b>+{scoreDiff}%</b> overall.
              {(higher.semanticScore ?? 0) > (lower.semanticScore ?? 0) &&
                ` ${higher.name} shows stronger contextual semantic alignment (${higher.semanticScore}% vs ${lower.semanticScore}%).`}
              {onlyInA.length > 0 && ` ${a.name} uniquely demonstrates evidence in ${onlyInA.join(', ')}.`}
              {onlyInB.length > 0 && ` ${b.name} uniquely demonstrates evidence in ${onlyInB.join(', ')}.`}
            </p>
          </div>

          <div className="compare-grid-layout">
            {/* Candidate A Column */}
            <div className="compare-candidate-col">
              <div className="compare-candidate-header">
                <div className="avatar avatar-lg">
                  {a.name
                    .split(' ')
                    .map((x) => x[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <span className="compare-rank-badge">Rank #{a.rank}</span>
                  <h3>{a.name}</h3>
                  <p>{a.title}</p>
                </div>
              </div>

              <div className="compare-score-box">
                <span className="box-sub">Final Match Score</span>
                <b className="compare-score-num">{a.finalScore !== undefined ? `${a.finalScore.toFixed(1)}%` : '—'}</b>
              </div>

              <div className="compare-metric-table">
                <div className="metric-row">
                  <span>Semantic Match</span>
                  <b>{a.semanticScore}%</b>
                </div>
                <div className="metric-row">
                  <span>Keyword Match</span>
                  <b>{a.keywordScore}%</b>
                </div>
                <div className="metric-row">
                  <span>Required Skills</span>
                  <b>
                    {a.requiredSkillsMatched} / {a.requiredSkillsTotal}
                  </b>
                </div>
                <div className="metric-row">
                  <span>Preferred Skills</span>
                  <b>
                    {a.preferredSkillsMatched} / {a.preferredSkillsTotal}
                  </b>
                </div>
                <div className="metric-row">
                  <span>Experience</span>
                  <b>{a.experienceYears} Years</b>
                </div>
                <div className="metric-row">
                  <span>Verification</span>
                  {a.verificationAlerts.length > 0 ? (
                    <span className="status-badge-inline status-review">
                      <ShieldAlert size={12} /> Review Recommended
                    </span>
                  ) : (
                    <span className="status-badge-inline status-strong">
                      <ShieldCheck size={12} /> Verified
                    </span>
                  )}
                </div>
              </div>

              <div className="compare-skills-section">
                <h4>Evidenced Skills ({a.matchedSkills.length})</h4>
                <div className="skills-pill-wrap">
                  {a.matchedSkills.map((s) => (
                    <span
                      key={s}
                      className={`matched-pill ${onlyInA.includes(s) ? 'highlight-unique' : ''}`}
                    >
                      <CheckCircle2 size={11} /> {s}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary full-width"
                onClick={() => {
                  onClose();
                  navigate(`/candidate/${a.id}`);
                }}
              >
                Inspect {a.name} <ArrowRight size={14} />
              </button>
            </div>

            {/* Candidate B Column */}
            <div className="compare-candidate-col">
              <div className="compare-candidate-header">
                <div className="avatar avatar-lg">
                  {b.name
                    .split(' ')
                    .map((x) => x[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <span className="compare-rank-badge">Rank #{b.rank}</span>
                  <h3>{b.name}</h3>
                  <p>{b.title}</p>
                </div>
              </div>

              <div className="compare-score-box">
                <span className="box-sub">Final Match Score</span>
                <b className="compare-score-num">{b.finalScore !== undefined ? `${b.finalScore.toFixed(1)}%` : '—'}</b>
              </div>

              <div className="compare-metric-table">
                <div className="metric-row">
                  <span>Semantic Match</span>
                  <b>{b.semanticScore}%</b>
                </div>
                <div className="metric-row">
                  <span>Keyword Match</span>
                  <b>{b.keywordScore}%</b>
                </div>
                <div className="metric-row">
                  <span>Required Skills</span>
                  <b>
                    {b.requiredSkillsMatched} / {b.requiredSkillsTotal}
                  </b>
                </div>
                <div className="metric-row">
                  <span>Preferred Skills</span>
                  <b>
                    {b.preferredSkillsMatched} / {b.preferredSkillsTotal}
                  </b>
                </div>
                <div className="metric-row">
                  <span>Experience</span>
                  <b>{b.experienceYears} Years</b>
                </div>
                <div className="metric-row">
                  <span>Verification</span>
                  {b.verificationAlerts.length > 0 ? (
                    <span className="status-badge-inline status-review">
                      <ShieldAlert size={12} /> Review Recommended
                    </span>
                  ) : (
                    <span className="status-badge-inline status-strong">
                      <ShieldCheck size={12} /> Verified
                    </span>
                  )}
                </div>
              </div>

              <div className="compare-skills-section">
                <h4>Evidenced Skills ({b.matchedSkills.length})</h4>
                <div className="skills-pill-wrap">
                  {b.matchedSkills.map((s) => (
                    <span
                      key={s}
                      className={`matched-pill ${onlyInB.includes(s) ? 'highlight-unique' : ''}`}
                    >
                      <CheckCircle2 size={11} /> {s}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary full-width"
                onClick={() => {
                  onClose();
                  navigate(`/candidate/${b.id}`);
                }}
              >
                Inspect {b.name} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
