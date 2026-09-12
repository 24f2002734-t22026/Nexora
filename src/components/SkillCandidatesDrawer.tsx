import React from 'react';
import { X, ArrowRight, CheckCircle2, AlertCircle, ExternalLink, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Candidate } from '../types';

interface SkillCandidatesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  skillName: string;
  mode: 'matching' | 'missing';
  candidates: Candidate[];
}

export function SkillCandidatesDrawer({
  isOpen,
  onClose,
  skillName,
  mode,
  candidates,
}: SkillCandidatesDrawerProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const matchingCandidates = candidates.filter((c) => c.matchedSkills.includes(skillName));
  const missingCandidates = candidates.filter((c) => !c.matchedSkills.includes(skillName));

  const list = mode === 'matching' ? matchingCandidates : missingCandidates;

  const getStatusBadge = (score: number) => {
    if (score >= 85) return { label: 'Strong Match', className: 'status-strong' };
    if (score >= 70) return { label: 'Good Match', className: 'status-good' };
    return { label: 'Needs Review', className: 'status-review' };
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <header className="drawer-header">
          <div>
            <div className="drawer-eyebrow">
              {mode === 'matching' ? 'MATCHING TALENT POOL' : 'SKILL GAP ANALYSIS'}
            </div>
            <h2 id="drawer-title" className="drawer-title">
              {skillName}
            </h2>
            <p className="drawer-subtitle">
              {mode === 'matching' ? (
                <>
                  <b>{matchingCandidates.length}</b> candidate
                  {matchingCandidates.length === 1 ? '' : 's'} with verified evidence
                </>
              ) : (
                <>
                  <b>{missingCandidates.length}</b> candidate
                  {missingCandidates.length === 1 ? '' : 's'} with insufficient evidence in resume
                </>
              )}
            </p>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close panel">
            <X size={20} />
          </button>
        </header>

        <div className="drawer-content">
          {mode === 'missing' && (
            <div className="callout callout-info">
              <AlertCircle size={18} />
              <div>
                <b>Understanding Skill Gaps</b>
                <p>
                  Candidates listed here do not have direct evidence of <b>{skillName}</b> detected in their resumes or projects. This reflects "Skill not detected / Insufficient evidence" rather than confirmed lack of capability.
                </p>
              </div>
            </div>
          )}

          {list.length === 0 ? (
            <div className="empty-state">
              <p>No candidates match this criteria.</p>
            </div>
          ) : (
            <div className="candidate-drawer-list">
              {list.map((c) => {
                const status = getStatusBadge(c.finalScore);
                const evidence = c.skillEvidence?.[skillName];

                return (
                  <article key={c.id} className="drawer-candidate-card">
                    <div className="card-top-row">
                      <div className="avatar avatar-md">
                        {c.name
                          .split(' ')
                          .map((x) => x[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div className="candidate-headings">
                        <div className="name-and-rank">
                          <h4>{c.name}</h4>
                          <span className="rank-tag">#{c.rank}</span>
                        </div>
                        <span className="candidate-role">{c.title}</span>
                      </div>
                      <div className="match-score-pill">
                        <b>{c.finalScore.toFixed(1)}%</b>
                        <small>Match</small>
                      </div>
                    </div>

                    <div className="card-score-breakdown">
                      <div className="metric-chip">
                        <span>Semantic Match</span>
                        <b>{c.semanticScore}%</b>
                      </div>
                      <div className="metric-chip">
                        <span>Keyword Match</span>
                        <b>{c.keywordScore}%</b>
                      </div>
                      <div className="metric-chip">
                        <span>Experience</span>
                        <b>{c.experienceYears} yrs</b>
                      </div>
                      <div className="metric-chip">
                        <span className={`status-badge-inline ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>

                    {/* Skill-specific Evidence preview */}
                    {evidence && mode === 'matching' && (
                      <div className="evidence-inline-box">
                        <div className="evidence-level-tag">
                          <Sparkles size={12} />
                          <span>
                            {evidence.level === 'strong'
                              ? 'Strong Evidence'
                              : evidence.level === 'moderate'
                              ? 'Moderate Evidence'
                              : 'Limited Evidence'}
                          </span>
                        </div>
                        <ul className="evidence-bullets">
                          {evidence.details.slice(0, 2).map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {mode === 'missing' && (
                      <div className="missing-inline-box">
                        <span className="missing-status-tag">
                          {evidence?.details?.[0] || 'Skill not detected in resume'}
                        </span>
                      </div>
                    )}

                    <div className="skills-inline-row">
                      {c.matchedSkills.slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className={`skill-tag ${s.toLowerCase() === skillName.toLowerCase() ? 'highlighted' : ''}`}
                        >
                          {s}
                        </span>
                      ))}
                      {c.matchedSkills.length > 4 && (
                        <span className="skill-tag-more">+{c.matchedSkills.length - 4} more</span>
                      )}
                    </div>

                    <div className="card-footer-action">
                      <button
                        type="button"
                        className="view-candidate-btn"
                        onClick={() => {
                          onClose();
                          navigate(`/candidate/${c.id}`);
                        }}
                      >
                        View Candidate Analysis <ArrowRight size={14} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
