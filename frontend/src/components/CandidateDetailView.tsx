import React, { useEffect, useState } from 'react';
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
  Code2,
  Eye,
  Clock,
  Layers,
  Check,
  AlertCircle,
  ChevronDown,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AssessmentResult, Candidate, CandidateEvidence, SkillEvidence } from '../types';
import {
  getAssessmentResult,
  getAssessmentStatus,
  getCandidateEvidence,
  submitHrDecision,
} from '../services/api';
import { ResumeViewerModal } from './ResumeViewerModal';

interface CandidateDetailViewProps {
  candidate: Candidate;
  onCompareWithAnother?: (candidate: Candidate) => void;
  onBack?: () => void;
}

export function CandidateDetailView({ candidate, onCompareWithAnother, onBack }: CandidateDetailViewProps) {
  const navigate = useNavigate();
  const [localCandidate, setLocalCandidate] = useState(candidate);
  const [skillFilter, setSkillFilter] = useState<'all' | 'matched' | 'missing'>('all');
  const [showRequiredSkillsDropdown, setShowRequiredSkillsDropdown] = useState(false);
  const [showResumeViewer, setShowResumeViewer] = useState(false);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(candidate.assessmentResult || null);
  const [evidence, setEvidence] = useState<CandidateEvidence | null>(candidate.evidence || null);
  const [downstreamLoading, setDownstreamLoading] = useState(false);
  const [downstreamError, setDownstreamError] = useState<string | null>(null);
  const [hrLoading, setHrLoading] = useState(false);
  const c = localCandidate;

  const isPending = c.analysisPending;

  useEffect(() => {
    setLocalCandidate(candidate);
    setAssessment(candidate.assessmentResult || null);
    setEvidence(candidate.evidence || null);
  }, [candidate]);

  const refreshDownstream = async () => {
    if (!c.currentStage || c.currentStage === 'SCREENING' || c.currentStage === 'SHORTLISTED') {
      return;
    }
    setDownstreamLoading(true);
    setDownstreamError(null);
    try {
      const status = await getAssessmentStatus(c.id);
      setAssessment(status);
      setLocalCandidate((prev) => ({ ...prev, assessmentStatus: status.status }));
      if (status.status === 'evaluation_available') {
        const [result, candidateEvidence] = await Promise.all([
          getAssessmentResult(c.id),
          getCandidateEvidence(c.id),
        ]);
        setAssessment(result);
        setEvidence(candidateEvidence);
        setLocalCandidate((prev) => ({
          ...prev,
          assessmentStatus: result.status,
          assessmentResult: result,
          evidence: candidateEvidence,
          currentStage: prev.currentStage === 'ASSESSMENT_EVALUATED' ? 'HR_REVIEW' : prev.currentStage,
        }));
      }
    } catch (err) {
      console.error('Failed to load downstream assessment data:', err);
      setDownstreamError('Assessment data is currently unavailable.');
    } finally {
      setDownstreamLoading(false);
    }
  };

  useEffect(() => {
    void refreshDownstream();
  }, [c.id, c.currentStage]);

  useEffect(() => {
    if (!c.currentStage || !['ASSESSMENT_SENT', 'ASSESSMENT_STARTED', 'ASSESSMENT_SUBMITTED'].includes(c.currentStage)) {
      return;
    }
    const timer = window.setInterval(() => {
      void refreshDownstream();
    }, 8000);
    return () => window.clearInterval(timer);
  }, [c.id, c.currentStage]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const formatFraudTitle = (type?: string): string => {
    switch (type) {
      case 'white_font': return 'Invisible White-Font Layer (RGB 255)';
      case 'tiny_text': return '1.0pt Micro-Font ATS Keyword Injection';
      case 'off_margin_text': return 'Off-Margin Injected Metadata';
      case 'hidden_behind_image': return 'Text Hidden Behind Image Layer';
      case 'prompt_injection': return 'Adversarial Prompt Injection Attempt';
      default: return 'Formatting Anomaly Detected';
    }
  };

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

  // Build or retrieve skill evidence entries
  const getComputedSkillEvidence = (): Record<string, SkillEvidence> => {
    if (c.skillEvidence && Object.keys(c.skillEvidence).length > 0) {
      return c.skillEvidence;
    }
    const computed: Record<string, SkillEvidence> = {};
    const matched = c.matchedSkills || [];
    const missing = c.missingSkills || [];
    const all = Array.from(new Set([...matched, ...missing]));

    for (const skill of all) {
      const isMatched = matched.includes(skill);
      computed[skill] = {
        skill,
        level: isMatched ? 'strong' : 'not_found',
        priority: 'required',
        details: isMatched
          ? [`Evidenced in candidate profile and projects.`]
          : [`Not detected in verified experience (hidden/fraudulent mentions excluded).`],
        inProjects: isMatched,
        inWorkHistory: isMatched,
        yearsOfExperience: isMatched ? c.experienceYears : undefined
      };
    }
    return computed;
  };

  const skillEvidenceMap = getComputedSkillEvidence();
  const skillEntries = Object.entries(skillEvidenceMap);

  const jobRequiredSkills = Array.from(
    new Set([...(c.matchedSkills || []), ...(c.missingSkills || [])])
  );
  const candidateResumeSkills: string[] = (c.matchedSkills && c.matchedSkills.length > 0)
    ? c.matchedSkills
    : skillEntries.filter(([_, e]) => e.level !== 'not_found').map(([s]) => s);

  const alerts = c.verificationAlerts || [];
  const isSuspicious = alerts.length > 0 || c.verificationStatus === 'review_recommended';
  const latestEvaluation = assessment?.submissions.find((submission) => submission.evaluation)?.evaluation;

  const handleHrDecision = async (decision: 'HR_SELECTED' | 'REJECTED') => {
    const reason = window.prompt(
      decision === 'HR_SELECTED' ? 'Reason for selecting this candidate?' : 'Reason for rejecting this candidate?',
      latestEvaluation?.explanation || ''
    );
    if (reason === null) return;
    setHrLoading(true);
    setDownstreamError(null);
    try {
      const updated = await submitHrDecision(c.id, decision, reason);
      setLocalCandidate((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      console.error('Failed to submit HR decision:', err);
      setDownstreamError('Could not submit HR decision. Candidate must be evaluated and ready for HR review.');
    } finally {
      setHrLoading(false);
    }
  };

  return (
    <div className="candidate-detail-container">
      {/* Top Breadcrumb & Action Bar */}
      <div className="detail-top-bar">
        <button type="button" className="back-link-btn" onClick={handleBack}>
          <ArrowLeft size={16} /> Back to candidates
        </button>
        <div className="detail-actions-right">
          <button
            type="button"
            className="btn btn-primary flex items-center gap-2"
            onClick={() => setShowResumeViewer(true)}
          >
            <Eye size={15} /> View Uploaded Resume
          </button>
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

      <div className="content-card" style={{ marginBottom: '16px' }}>
        <div className="card-heading-bar">
          <div>
            <h2>Assessment & HR Review</h2>
            <p>Current stage: <b>{(c.currentStage || 'SCREENING').replace(/_/g, ' ')}</b></p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void refreshDownstream()}
            disabled={downstreamLoading}
          >
            {downstreamLoading ? <Clock size={13} /> : <FileText size={13} />} Refresh
          </button>
        </div>

        {downstreamError && (
          <div className="alert-item" style={{ marginBottom: '12px' }}>
            <b className="alert-title">Downstream action failed</b>
            <p className="alert-message">{downstreamError}</p>
          </div>
        )}

        <div className="skill-ratio-grid">
          <div className="ratio-card">
            <span>Assessment Status</span>
            <b>{assessment?.status?.replace(/_/g, ' ') || c.assessmentStatus?.replace(/_/g, ' ') || 'Not sent'}</b>
          </div>
          <div className="ratio-card">
            <span>Overall Assessment</span>
            <b>{assessment?.overallScore != null ? `${assessment.overallScore.toFixed(1)}%` : 'Pending'}</b>
          </div>
          <div className="ratio-card">
            <span>Invite</span>
            {c.assessment?.inviteUrl ? (
              <a href={c.assessment.inviteUrl} target="_blank" rel="noreferrer">Open invite</a>
            ) : (
              <b>{assessment?.invite?.token || c.assessment?.token || 'Unavailable'}</b>
            )}
          </div>
        </div>

        {latestEvaluation && (
          <div className="match-breakdown-box" style={{ marginTop: '14px' }}>
            <div className="breakdown-row">
              <div className="breakdown-label"><span>Correctness</span><b>{latestEvaluation.correctnessScore ?? 'N/A'}%</b></div>
              <div className="breakdown-label"><span>Efficiency</span><b>{latestEvaluation.efficiencyScore ?? 'N/A'}%</b></div>
              <div className="breakdown-label"><span>Code Quality</span><b>{latestEvaluation.codeQualityScore ?? 'N/A'}%</b></div>
              <small className="breakdown-desc">
                Complexity: {latestEvaluation.timeComplexity || 'N/A'} time, {latestEvaluation.spaceComplexity || 'N/A'} space
              </small>
            </div>
            {latestEvaluation.strengths.length > 0 && <p><b>Strengths:</b> {latestEvaluation.strengths.join(', ')}</p>}
            {latestEvaluation.detectedIssues.length > 0 && <p><b>Issues:</b> {latestEvaluation.detectedIssues.join(', ')}</p>}
            {latestEvaluation.improvements.length > 0 && <p><b>Improvements:</b> {latestEvaluation.improvements.join(', ')}</p>}
          </div>
        )}

        {evidence && (
          <div className="projects-timeline" style={{ marginTop: '14px' }}>
            {[...evidence.assessmentEvidence, ...evidence.comparisonEvidence].slice(0, 6).map((item) => (
              <div key={item.evidenceId} className="project-card">
                <div className="project-top">
                  <h4>{item.claim}</h4>
                  <span className="project-period">{item.source}</span>
                </div>
                <p className="project-desc">{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {(c.currentStage === 'HR_REVIEW' || c.currentStage === 'ASSESSMENT_EVALUATED') && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={hrLoading}
              onClick={() => void handleHrDecision('HR_SELECTED')}
            >
              <CheckCircle2 size={14} /> Select for HR
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={hrLoading}
              onClick={() => void handleHrDecision('REJECTED')}
            >
              <AlertCircle size={14} /> Reject
            </button>
          </div>
        )}
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
                <span>{c.experienceYears ? `${c.experienceYears} Years Experience` : 'Experience on file'}</span>
              </div>
            </div>

            {/* Resume Attachment Box */}
            <div className="resume-attachment-box">
              <div className="resume-attachment-head">
                <span className="resume-attachment-label">Resume Attachment</span>
                <span className="resume-filetype-badge">
                  {(c.resume?.fileType || 'PDF').toUpperCase()}
                </span>
              </div>
              <p className="resume-filename">
                {c.resume?.fileName || `${c.name}_Resume.pdf`}
              </p>
              <button
                type="button"
                onClick={() => setShowResumeViewer(true)}
                className="resume-doc-btn"
              >
                <Eye size={14} /> Open Document Viewer
              </button>
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
                    <span>LinkedIn Profile</span>
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
                    <span>GitHub Profile</span>
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
              {c.education && c.education.length > 0 ? (
                c.education.map((edu, idx) => (
                  <div key={idx} className="edu-entry">
                    <b>{edu.degree}</b>
                    <div className="edu-school">{edu.institution}</div>
                    <div className="edu-year">
                      {edu.year || ''}
                      {edu.details && (!edu.year || !edu.year.includes(edu.details)) ? (edu.year ? ` · ${edu.details}` : edu.details) : ''}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">Education details on file in attached resume.</p>
              )}
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
          {/* Section: Technical Skills */}
          <div className="content-card">
            <div className="card-heading-bar" style={{ position: 'relative' }}>
              <div>
                <h2>Technical Skills (Candidate Profile)</h2>
                <p>Verified skills directly detected in candidate's resume and verified work history.</p>
              </div>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowRequiredSkillsDropdown((prev) => !prev)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    padding: '6px 12px',
                    backgroundColor: showRequiredSkillsDropdown ? 'var(--bg-subtle-hover)' : 'var(--bg-surface)',
                  }}
                >
                  <FileText size={13} />
                  <span>Job Required Skills ({jobRequiredSkills.length})</span>
                  <ChevronDown
                    size={13}
                    style={{
                      transform: showRequiredSkillsDropdown ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </button>

                {showRequiredSkillsDropdown && (
                  <div className="required-skills-dropdown-popover">
                    <div className="dropdown-popover-header">
                      <div>
                        <strong>Job Requirements</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {c.matchedSkills?.length || 0} of {jobRequiredSkills.length} skills matched
                        </div>
                      </div>
                      <span className="dropdown-match-badge">
                        {Math.round(((c.matchedSkills?.length || 0) / Math.max(1, jobRequiredSkills.length)) * 100)}% Match
                      </span>
                    </div>
                    <div className="dropdown-skills-list">
                      {jobRequiredSkills.map((skill) => {
                        const isMatched = (c.matchedSkills || []).includes(skill);
                        return (
                          <div key={skill} className={`dropdown-skill-row ${isMatched ? 'matched' : 'missing'}`}>
                            <div className="dropdown-skill-left">
                              {isMatched ? (
                                <CheckCircle2 size={13} style={{ color: 'var(--success)', flexShrink: 0 }} />
                              ) : (
                                <XCircle size={13} style={{ color: 'var(--text-light)', flexShrink: 0 }} />
                              )}
                              <span className="dropdown-skill-name">{skill}</span>
                            </div>
                            <span className={`dropdown-skill-pill ${isMatched ? 'evidenced' : 'gap'}`}>
                              {isMatched ? 'Present' : 'Missing'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {candidateResumeSkills.length > 0 ? (
              <div className="candidate-skills-compact-grid">
                {candidateResumeSkills.map((skillName) => {
                  const ev = skillEvidenceMap[skillName];
                  return (
                    <div key={skillName} className="candidate-skill-compact-badge">
                      <div className="skill-badge-top">
                        <span className="skill-badge-title">{skillName}</span>
                        <span className="skill-badge-status">
                          <CheckCircle2 size={11} /> Verified
                        </span>
                      </div>
                      <div className="skill-badge-bottom">
                        {ev?.yearsOfExperience ? (
                          <span className="skill-badge-tag">{ev.yearsOfExperience}y exp</span>
                        ) : (
                          <span className="skill-badge-tag">Evidenced</span>
                        )}
                        {ev?.inProjects && <span className="skill-badge-tag">Projects</span>}
                        {ev?.inWorkHistory && <span className="skill-badge-tag">Experience</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center bg-subtle" style={{ borderRadius: 'var(--radius-xs)', padding: '16px' }}>
                <Clock size={20} className="text-muted" style={{ margin: '0 auto 6px' }} />
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No skills parsed on resume yet.</p>
              </div>
            )}
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

            {c.projects && c.projects.length > 0 ? (
              <div className="projects-timeline">
                {c.projects.map((proj, pIdx) => (
                  <div key={pIdx} className="project-card">
                    <div className="project-top">
                      <h4>{proj.title}</h4>
                      {proj.period && <span className="project-period">{proj.period}</span>}
                    </div>
                    <p className="project-desc">{proj.description}</p>
                    {proj.technologies && proj.technologies.length > 0 && (
                      <div className="tech-tags">
                        {proj.technologies.map((t) => (
                          <span key={t} className="tech-tag">
                            <Code2 size={11} /> {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-4">Projects will be indexed once analysis is performed.</p>
            )}
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

            {c.workHistory && c.workHistory.length > 0 ? (
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
                    {job.highlights && job.highlights.length > 0 && (
                      <ul className="exp-highlights">
                        {job.highlights.map((h, hIdx) => (
                          <li key={hIdx}>{h}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-4">Detailed work history available in the attached resume document.</p>
            )}
          </div>
        </section>

        {/* =========================================================================
            COLUMN 3: JOB FIT & VERIFICATION ALERTS
            ========================================================================= */}
        <aside className="col-job-fit">
          {/* Main Fit Score Widget */}
          <div className="fit-score-card">
            <span className="fit-eyebrow">OVERALL CANDIDATE FIT</span>
            
            {isPending ? (
              <div className="py-6 text-center">
                <div className="text-3xl font-bold font-mono text-slate-400">—</div>
                <div className="text-xs font-semibold text-blue-400 mt-1 flex items-center justify-center gap-1">
                  <Clock size={13} />
                  Analysis Pending
                </div>
                <p className="text-[11px] text-slate-400 mt-2 max-w-[200px] mx-auto">
                  AI match score will be calculated once the intelligence engine runs.
                </p>
              </div>
            ) : (
              <>
                <div className="big-score-wrap">
                  <div className="big-score-number">{(c.finalScore || 0).toFixed(1)}%</div>
                  <div className="big-score-label">Final Match Score</div>
                </div>

                {/* Semantic vs Keyword Breakdown */}
                <div className="match-breakdown-box">
                  <div className="breakdown-row">
                    <div className="breakdown-label">
                      <span>Semantic Match</span>
                      <b>{c.semanticScore || 0}%</b>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill semantic"
                        style={{ width: `${c.semanticScore || 0}%` }}
                      />
                    </div>
                    <small className="breakdown-desc">Contextual alignment with role architecture</small>
                  </div>

                  <div className="breakdown-row">
                    <div className="breakdown-label">
                      <span>Keyword Match</span>
                      <b>{c.keywordScore || 0}%</b>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill keyword"
                        style={{ width: `${c.keywordScore || 0}%` }}
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
                        <span>{Math.round((c.requiredSkillsMatched / (c.requiredSkillsTotal || 1)) * 100)}% Coverage</span>
                      )}
                    </div>
                  </div>

                  <div className="ratio-card">
                    <span>Preferred Skills</span>
                    <b>
                      {c.preferredSkillsMatched} / {c.preferredSkillsTotal}
                    </b>
                    <div className="ratio-status">
                      <span>{Math.round((c.preferredSkillsMatched / (c.preferredSkillsTotal || 1)) * 100)}% Coverage</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Matched Skills List */}
            {c.matchedSkills && c.matchedSkills.length > 0 && (
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
            )}

            {/* Rationale Explanation */}
            <div className="explanation-box">
              <h4>Candidate Fit Assessment</h4>
              <p>{c.explanation}</p>
            </div>
          </div>

          {/* =========================================================================
              VERIFICATION CARD: FRAUD DETECTION OR VERIFIED INTEGRITY
              ========================================================================= */}
          <div className={`verification-card ${isSuspicious ? 'is-suspicious' : 'is-clean'}`}>
            <div className="verification-head">
              {isSuspicious ? (
                <div className="verif-title-wrap warning">
                  <ShieldAlert size={20} className="text-amber-500" />
                  <div>
                    <h4>Document Integrity Alert</h4>
                    <span className="verif-status-badge review">
                      Review Recommended ({alerts.length} Flagged)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="verif-title-wrap verified">
                  <ShieldCheck size={20} className="text-emerald-500" />
                  <div>
                    <h4>Verified Document Integrity</h4>
                    <span className="verif-status-badge ok">
                      ✓ Verified · No Anomalies Detected
                    </span>
                  </div>
                </div>
              )}
            </div>

            {isSuspicious ? (
              <div className="alert-content-body">
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2.5">
                  <b>Anomaly Warning:</b> Concealed text, typography manipulations, or adversarial prompt injections were identified in this document. These items were purged prior to candidate ranking.
                </p>

                {alerts.map((alert: any, idx: number) => {
                  const fraudType = alert.type || alert.fraudType || 'formatting_anomaly';
                  const title = alert.title || formatFraudTitle(fraudType);
                  const message = alert.message || alert.description || alert.impact || 'Suspicious hidden content or formatting anomaly detected in document layer.';
                  const detected = alert.detectedValue || alert.detectedText || alert.extractedText || '';
                  const severity = alert.severity || 'warning';

                  return (
                    <div key={alert.id || idx} className="alert-item">
                      <div className="flex items-center justify-between mb-1">
                        <b className="alert-title">{title}</b>
                        <span className={`alert-severity-chip ${severity}`}>
                          {String(severity).toUpperCase()}
                        </span>
                      </div>
                      <p className="alert-message">{message}</p>
                      {detected && (
                        <div className="timeline-detail-box">
                          <small>Detected Hidden / Injected Content:</small>
                          <code>{detected}</code>
                        </div>
                      )}
                      {alert.timelineDetails && (
                        <div className="timeline-detail-box">
                          <small>Detected Overlap Range:</small>
                          <code>{alert.timelineDetails}</code>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="score-independence-notice">
                  <div className="notice-icon">i</div>
                  <p>
                    <b>Scoring Policy:</b> The candidate fit score reflects only verified visible skills. Fraudulent keywords and fabricated claims have been excluded from calculations.
                  </p>
                </div>
              </div>
            ) : (
              <div className="verified-body">
                <p className="verified-main-desc">
                  This resume document successfully passed all Nexora automated fraud and formatting integrity checks.
                </p>
                <div className="verified-checklist">
                  <div className="check-item">
                    <Check size={14} className="text-emerald-600" />
                    <span>Standard Visible Typography (&ge; 8pt)</span>
                  </div>
                  <div className="check-item">
                    <Check size={14} className="text-emerald-600" />
                    <span>Document Margins & Printable Area Valid</span>
                  </div>
                  <div className="check-item">
                    <Check size={14} className="text-emerald-600" />
                    <span>Zero Invisible White-Font or Hidden Text Layers</span>
                  </div>
                  <div className="check-item">
                    <Check size={14} className="text-emerald-600" />
                    <span>Chronological Timeline & Experience Verified</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Resume Viewer Modal */}
      {showResumeViewer && (
        <ResumeViewerModal
          candidate={c}
          onClose={() => setShowResumeViewer(false)}
        />
      )}
    </div>
  );
}
