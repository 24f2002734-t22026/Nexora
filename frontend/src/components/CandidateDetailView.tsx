import React, { useState } from 'react';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Briefcase,
  ExternalLink,
  Globe,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  Layers,
  Code2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Candidate, SkillEvidence } from '../types';

interface CandidateDetailViewProps {
  candidate: Candidate;
  onCompareWithAnother?: (candidate: Candidate) => void;
}

export function CandidateDetailView({ candidate: c, onCompareWithAnother }: CandidateDetailViewProps) {
  const navigate = useNavigate();
  const [skillFilter, setSkillFilter] = useState<'all' | 'matched' | 'missing'>('all');

  const evidenceLevelBadge = (level: SkillEvidence['level']) => {
    switch (level) {
      case 'strong':
        return <span className="evidence-badge strong"><CheckCircle2 size={12} /> Strong Evidence</span>;
      case 'moderate':
        return <span className="evidence-badge moderate"><Sparkles size={12} /> Moderate Evidence</span>;
      case 'limited':
        return <span className="evidence-badge limited"><AlertTriangle size={12} /> Limited Evidence</span>;
      default:
        return <span className="evidence-badge not-found">Skill Not Detected</span>;
    }
  };

  const skillEntries = Object.entries(c.skillEvidence || {});
  const filteredSkills = skillEntries.filter(([name, ev]) => {
    if (skillFilter === 'matched') return ev.level !== 'not_found';
    if (skillFilter === 'missing') return ev.level === 'not_found';
    return true;
  });

  return (
    <div className="candidate-detail-container">
      {/* Top Breadcrumb & Action Bar */}
      <div className="detail-top-bar">
        <button type="button" className="back-link-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back to candidates
        </button>
        <div className="detail-actions-right">
          {onCompareWithAnother && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onCompareWithAnother(c)}
            >
              Compare Candidate
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.print()}
          >
            <FileText size={15} /> Export Dossier
          </button>
        </div>
      </div>

      {/* Main Three-Column Layout */}
      <div className="candidate-three-col-layout">
        {/* =========================================================================
            COLUMN 1: CANDIDATE PROFILE & CONTACT
            ========================================================================= */}
        <aside className="col-profile">
          <div className="profile-card">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar-xl">
                {c.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <span className="profile-rank-chip">Rank #{c.rank}</span>
            </div>

            <h1 className="profile-name">{c.name}</h1>
            <p className="profile-role">{c.title}</p>

            <div className="profile-quick-meta">
              <div className="meta-item">
                <MapPin size={14} />
                <span>{c.location}</span>
              </div>
              <div className="meta-item">
                <Briefcase size={14} />
                <span>{c.experienceYears} Years Production Experience</span>
              </div>
            </div>

            <hr className="profile-divider" />

            <div className="contact-section">
              <h4>Contact Information</h4>
              <div className="contact-list">
                <a href={`mailto:${c.email}`} className="contact-link">
                  <Mail size={14} />
                  <span>{c.email}</span>
                </a>
                {c.phone && (
                  <div className="contact-link">
                    <Phone size={14} />
                    <span>{c.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <hr className="profile-divider" />

            <div className="links-section">
              <h4>Professional Links</h4>
              <div className="social-links-grid">
                {c.links?.linkedin ? (
                  <a
                    href={c.links.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="social-btn"
                  >
                    <ExternalLink size={15} />
                    <span>LinkedIn</span>
                    <ExternalLink size={12} className="ext-icon" />
                  </a>
                ) : (
                  <span className="social-btn disabled">
                    <ExternalLink size={15} />
                    <span>LinkedIn Unavailable</span>
                  </span>
                )}

                {c.links?.github ? (
                  <a
                    href={c.links.github}
                    target="_blank"
                    rel="noreferrer"
                    className="social-btn"
                  >
                    <Code2 size={15} />
                    <span>GitHub</span>
                    <ExternalLink size={12} className="ext-icon" />
                  </a>
                ) : (
                  <span className="social-btn disabled">
                    <Code2 size={15} />
                    <span>GitHub Unavailable</span>
                  </span>
                )}

                {c.links?.portfolio && (
                  <a
                    href={c.links.portfolio}
                    target="_blank"
                    rel="noreferrer"
                    className="social-btn full-width"
                  >
                    <Globe size={15} />
                    <span>Portfolio</span>
                    <ExternalLink size={12} className="ext-icon" />
                  </a>
                )}
              </div>
            </div>

            <hr className="profile-divider" />

            <div className="education-section">
              <h4>
                <GraduationCap size={15} /> Education
              </h4>
              {c.education.map((edu, idx) => (
                <div key={idx} className="edu-entry">
                  <b>{edu.degree}</b>
                  <div className="edu-school">{edu.institution}</div>
                  <small className="edu-year">Class of {edu.year}</small>
                </div>
              ))}
            </div>

            {/* External Profile Evidence */}
            {c.externalEvidence && (
              <div className="external-evidence-card">
                <div className="external-head">
                  <Code2 size={14} />
                  <span>External Profile Evidence</span>
                </div>
                {c.externalEvidence.githubRepos && (
                  <div className="ext-repos">
                    <small>Sample Public Repositories:</small>
                    <ul>
                      {c.externalEvidence.githubRepos.map((repo) => (
                        <li key={repo}>
                          <code>{repo}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {c.externalEvidence.profileHealth && (
                  <div className="ext-health">
                    <Sparkles size={12} />
                    <span>{c.externalEvidence.profileHealth}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* =========================================================================
            COLUMN 2: SKILLS & EXPERIENCE EVIDENCE
            ========================================================================= */}
        <section className="col-skills-experience">
          {/* Section: Technical Skills & Evidence */}
          <div className="content-card">
            <div className="card-heading-bar">
              <div>
                <h2>Technical Skills & Evidence</h2>
                <p>Multi-source evidence extracted from resume text, projects, and work history.</p>
              </div>
              <div className="filter-pill-group">
                <button
                  type="button"
                  className={`filter-pill ${skillFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setSkillFilter('all')}
                >
                  All ({skillEntries.length})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${skillFilter === 'matched' ? 'active' : ''}`}
                  onClick={() => setSkillFilter('matched')}
                >
                  Evidenced ({c.matchedSkills.length})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${skillFilter === 'missing' ? 'active' : ''}`}
                  onClick={() => setSkillFilter('missing')}
                >
                  Gaps ({c.missingSkills.length})
                </button>
              </div>
            </div>

            <div className="skill-evidence-grid">
              {filteredSkills.map(([skillName, ev]) => (
                <div key={skillName} className={`skill-evidence-item ${ev.level}`}>
                  <div className="skill-ev-header">
                    <div>
                      <b className="skill-title">{skillName}</b>
                      <span className={`priority-tag ${ev.priority}`}>{ev.priority}</span>
                    </div>
                    {evidenceLevelBadge(ev.level)}
                  </div>

                  <ul className="evidence-points">
                    {ev.details.map((detail, dIdx) => (
                      <li key={dIdx}>{detail}</li>
                    ))}
                  </ul>

                  {ev.level !== 'not_found' && (
                    <div className="evidence-tags-row">
                      {ev.inProjects && <span className="evidence-subtag">Used in Projects</span>}
                      {ev.inWorkHistory && <span className="evidence-subtag">Work Experience</span>}
                      {ev.yearsOfExperience ? (
                        <span className="evidence-subtag">{ev.yearsOfExperience} yrs demonstrated</span>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section: Project Evidence */}
          <div className="content-card">
            <div className="card-heading-bar">
              <div>
                <h2>
                  <Layers size={18} /> Project Evidence
                </h2>
                <p>Demonstrated hands-on architectural and coding accomplishments.</p>
              </div>
            </div>

            <div className="projects-timeline">
              {c.projects.map((proj, pIdx) => (
                <div key={pIdx} className="project-card">
                  <div className="project-top">
                    <h4>{proj.title}</h4>
                    {proj.period && <span className="project-period">{proj.period}</span>}
                  </div>
                  <p className="project-desc">{proj.description}</p>
                  <div className="tech-tags">
                    {proj.technologies.map((t) => (
                      <span key={t} className="tech-tag">
                        <Code2 size={11} /> {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Work Experience */}
          <div className="content-card">
            <div className="card-heading-bar">
              <div>
                <h2>
                  <Briefcase size={18} /> Experience Highlights
                </h2>
                <p>Commercial tenure and verified responsibilities.</p>
              </div>
            </div>

            <div className="experience-list">
              {c.workHistory.map((job, jIdx) => (
                <div key={jIdx} className={`experience-card ${job.isOverlap ? 'has-overlap-flag' : ''}`}>
                  <div className="exp-top-row">
                    <div>
                      <b className="exp-role">{job.role}</b>
                      <div className="exp-company">{job.company}</div>
                    </div>
                    <div className="exp-period-wrap">
                      <span className="exp-period">{job.period}</span>
                      {job.isOverlap && (
                        <span className="overlap-indicator-badge">
                          <AlertTriangle size={11} /> Timeline Overlap
                        </span>
                      )}
                    </div>
                  </div>
                  <ul className="exp-highlights">
                    {job.highlights.map((h, hIdx) => (
                      <li key={hIdx}>{h}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================================
            COLUMN 3: JOB FIT & VERIFICATION ALERTS
            ========================================================================= */}
        <aside className="col-job-fit">
          {/* Main Fit Score Widget */}
          <div className="fit-score-card">
            <span className="fit-eyebrow">OVERALL CANDIDATE FIT</span>
            <div className="big-score-wrap">
              <div className="big-score-number">{c.finalScore.toFixed(1)}%</div>
              <div className="big-score-label">Final Match Score</div>
            </div>

            {/* Semantic vs Keyword Breakdown */}
            <div className="match-breakdown-box">
              <div className="breakdown-row">
                <div className="breakdown-label">
                  <span>Semantic Match</span>
                  <b>{c.semanticScore}%</b>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill semantic"
                    style={{ width: `${c.semanticScore}%` }}
                  />
                </div>
                <small className="breakdown-desc">Contextual alignment with role architecture</small>
              </div>

              <div className="breakdown-row">
                <div className="breakdown-label">
                  <span>Keyword Match</span>
                  <b>{c.keywordScore}%</b>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill keyword"
                    style={{ width: `${c.keywordScore}%` }}
                  />
                </div>
                <small className="breakdown-desc">Direct technical term and skill detection</small>
              </div>
            </div>

            {/* Required & Preferred Skills Counts */}
            <div className="skill-ratio-grid">
              <div className="ratio-card">
                <span>Required Skills</span>
                <b>
                  {c.requiredSkillsMatched} / {c.requiredSkillsTotal}
                </b>
                <div className="ratio-status">
                  {c.requiredSkillsMatched === c.requiredSkillsTotal ? (
                    <span className="text-success">100% Coverage</span>
                  ) : (
                    <span>{Math.round((c.requiredSkillsMatched / c.requiredSkillsTotal) * 100)}% Coverage</span>
                  )}
                </div>
              </div>

              <div className="ratio-card">
                <span>Preferred Skills</span>
                <b>
                  {c.preferredSkillsMatched} / {c.preferredSkillsTotal}
                </b>
                <div className="ratio-status">
                  <span>{Math.round((c.preferredSkillsMatched / c.preferredSkillsTotal) * 100)}% Coverage</span>
                </div>
              </div>
            </div>

            {/* Matched Skills List */}
            <div className="skills-summary-box">
              <span className="summary-title">Matched Skills</span>
              <div className="skills-pill-wrap">
                {c.matchedSkills.map((s) => (
                  <span key={s} className="matched-pill">
                    <CheckCircle2 size={12} /> {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Missing / Weak Skills List */}
            {c.missingSkills.length > 0 && (
              <div className="skills-summary-box">
                <span className="summary-title text-muted">Missing / Weak Skills</span>
                <div className="skills-pill-wrap">
                  {c.missingSkills.map((s) => (
                    <span key={s} className="missing-pill-muted">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Rationale Explanation */}
            <div className="explanation-box">
              <h4>Candidate Fit Assessment</h4>
              <p>{c.explanation}</p>
            </div>
          </div>

          {/* =========================================================================
              VERIFICATION ALERT & FLAW DETECTION
              Separated from Job Fit score: Zero penalty on Match Score
              ========================================================================= */}
          <div className="verification-card">
            <div className="verification-head">
              {c.verificationAlerts.length > 0 ? (
                <div className="verif-title-wrap warning">
                  <ShieldAlert size={18} />
                  <div>
                    <h4>Verification Alert</h4>
                    <span className="verif-status-badge review">Review Recommended</span>
                  </div>
                </div>
              ) : (
                <div className="verif-title-wrap verified">
                  <ShieldCheck size={18} />
                  <div>
                    <h4>Resume Verification</h4>
                    <span className="verif-status-badge ok">Verified · No Flaws</span>
                  </div>
                </div>
              )}
            </div>

            {c.verificationAlerts.length > 0 ? (
              <div className="alert-content-body">
                {c.verificationAlerts.map((alert) => (
                  <div key={alert.id} className="alert-item">
                    <b className="alert-title">{alert.title}</b>
                    <p className="alert-message">{alert.message}</p>
                    {alert.timelineDetails && (
                      <div className="timeline-detail-box">
                        <small>Detected Overlap Range:</small>
                        <code>{alert.timelineDetails}</code>
                      </div>
                    )}
                  </div>
                ))}

                <div className="score-independence-notice">
                  <div className="notice-icon">i</div>
                  <p>
                    <b>Match Score Independence:</b> The candidate's <b>{c.finalScore}%</b> Match Score evaluates job qualifications independently. This timeline notice is provided for interview screening verification.
                  </p>
                </div>
              </div>
            ) : (
              <div className="verified-body">
                <p>
                  No timeline overlaps or inconsistent employment periods detected across verified resume dates.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
