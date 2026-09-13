import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Upload, 
  Search, 
  FileText, 
  Users, 
  Eye, 
  Mail,
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  X, 
  Clock, 
  Loader2,
  ChevronRight,
  Calendar,
  Send,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import type { JobOpening, Candidate } from '../types';
import { store } from '../services/store';
import {
  createCandidateAssessment,
  getBackendCandidate,
  listBackendCandidates,
  shortlistCandidate,
} from '../services/api';
import { ResumeViewerModal } from './ResumeViewerModal';

interface JobCandidatesViewProps {
  job: JobOpening;
  onBack: () => void;
  onSelectCandidate: (candidate: Candidate) => void;
  initialOpenUpload?: boolean;
}

export const JobCandidatesView: React.FC<JobCandidatesViewProps> = ({
  job,
  onBack,
  onSelectCandidate,
  initialOpenUpload = false,
}) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'flagged' | 'pending'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  
  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(initialOpenUpload);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Assessment Scheduling modal
  const [schedulingCandidate, setSchedulingCandidate] = useState<Candidate | null>(null);
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [scheduleDuration, setScheduleDuration] = useState(45);
  const [candidateEmailInput, setCandidateEmailInput] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // Resume viewer modal
  const [viewingResumeCandidate, setViewingResumeCandidate] = useState<Candidate | null>(null);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const backendData = await listBackendCandidates();
      const matchingJob = backendData.filter((candidate) => candidate.jobId === job.id);
      setCandidates(matchingJob.length > 0 ? matchingJob : backendData);
    } catch (err) {
      console.error('Error loading candidates for job:', err);
      const data = await store.getCandidatesForJob(job.id);
      setCandidates(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, [job.id]);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx' && ext !== 'doc' && ext !== 'txt') {
      setUploadError('Please select a valid PDF or DOCX file.');
      return;
    }
    setSelectedFile(file);
    setUploadError(null);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a resume file (PDF or DOCX).');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const newCand = await store.uploadCandidateResume(
        job.id,
        {},
        selectedFile
      );

      // Add to local list
      setCandidates((prev) => [newCand, ...prev]);
      setShowUploadModal(false);
      setSelectedFile(null);
    } catch (err: any) {
      console.error('Failed to upload resume:', err);
      setUploadError('Error uploading resume. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    const query = searchQuery.toLowerCase();
    const matchesQuery = 
      c.name.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      (c.matchedSkills && c.matchedSkills.some((s) => s.toLowerCase().includes(query)));

    if (!matchesQuery) return false;

    if (statusFilter === 'verified') {
      return c.verificationStatus === 'verified' && (!c.verificationAlerts || c.verificationAlerts.length === 0);
    }
    if (statusFilter === 'flagged') {
      return c.verificationAlerts && c.verificationAlerts.length > 0;
    }
    if (statusFilter === 'pending') {
      return c.analysisPending || c.finalScore === undefined;
    }
    return true;
  });

  const replaceCandidate = (updated: Candidate) => {
    setCandidates((prev) => prev.map((candidate) => (candidate.id === updated.id ? updated : candidate)));
  };

  const handleShortlist = (candidate: Candidate) => {
    const updated = store.shortlistCandidate(candidate.id);
    replaceCandidate(updated);
    toast.success(`${candidate.name} shortlisted. You can now schedule and send their technical assessment.`);
  };

  const openScheduleModal = (candidate: Candidate) => {
    setSchedulingCandidate(candidate);
    setCandidateEmailInput(candidate.email);
  };

  const handleSendAssessmentInvite = () => {
    if (!schedulingCandidate) return;
    setIsSendingInvite(true);
    setTimeout(() => {
      const updated = store.scheduleAssessmentInvite(
        schedulingCandidate.id,
        scheduleDate,
        scheduleDuration,
        candidateEmailInput
      );
      replaceCandidate(updated);
      setIsSendingInvite(false);
      setSchedulingCandidate(null);
      toast.success(`Assessment invitation email scheduled for ${new Date(scheduleDate).toLocaleString()} and sent to ${candidateEmailInput}`);
    }, 500);
  };

  const stageLabel = (stage?: string) => (stage || 'SCREENING').replace(/_/g, ' ');

  return (
    <div className="candidates-view">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="detail-top-bar" style={{ marginBottom: '16px' }}>
        <button type="button" className="back-link-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Job Openings
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowUploadModal(true)}
        >
          <Upload size={16} /> Upload Candidate Resume
        </button>
      </div>

      {/* Role Overview Header (Aligned with Candidates section) */}
      <div className="candidates-header" style={{ marginBottom: '20px' }}>
        <div>
          <span className="eyebrow">APPLICANTS FOR ROLE</span>
          <h1>{job.title}</h1>
          <p>
            {job.department && `${job.department} · `}
            {job.location && `${job.location} · `}
            {job.employmentType || 'Full-time'} · <b>{candidates.length}</b> total applicants
          </p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="filter-toolbar-card">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search applicants by name, email, skills..."
          />
        </div>

        <div className="dropdown-filters-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="filter-select"
            aria-label="Filter applicants"
          >
            <option value="all">All Applicants ({candidates.length})</option>
            <option value="pending">Pending Analysis ({candidates.filter((c) => c.analysisPending || c.finalScore === undefined).length})</option>
            <option value="flagged">Verification Flagged ({candidates.filter((c) => c.verificationAlerts && c.verificationAlerts.length > 0).length})</option>
            <option value="verified">Verified Clear ({candidates.filter((c) => !c.verificationAlerts || c.verificationAlerts.length === 0).length})</option>
          </select>
        </div>
      </div>

      {actionError && (
        <div style={{ padding: '10px 14px', marginBottom: '12px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)', fontSize: '12px' }}>
          {actionError}
        </div>
      )}

      {/* Candidates Table (Exact layout as Candidates section) */}
      <div className="rankings-table-wrap">
        <table className="rankings-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: 50 }} className="text-center">#</th>
              <th scope="col" style={{ minWidth: 240 }}>Candidate</th>
              <th scope="col" style={{ minWidth: 200 }}>Uploaded Resume</th>
              <th scope="col" className="text-center" style={{ width: 140 }}>Match Score</th>
              <th scope="col" className="text-center" style={{ width: 160 }}>Verification</th>
              <th scope="col" className="text-right" style={{ width: 180 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8">
                  <div style={{ padding: '24px', color: 'var(--text-muted)' }}>
                    Loading candidate resumes...
                  </div>
                </td>
              </tr>
            ) : filteredCandidates.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8">
                  <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <Users size={28} style={{ color: 'var(--text-light)', margin: '0 auto 8px' }} />
                    <b style={{ display: 'block', fontSize: '14px', color: 'var(--text-primary)' }}>
                      No Candidates Found
                    </b>
                    <small style={{ color: 'var(--text-muted)' }}>
                      {searchQuery ? 'Try clearing your search query.' : 'Click "Upload Candidate Resume" above to attach resumes to this job.'}
                    </small>
                  </div>
                </td>
              </tr>
            ) : (
              filteredCandidates.map((candidate, idx) => {
                const serialNumber = idx + 1;
                const isPending = candidate.analysisPending || candidate.finalScore === undefined;
                const hasFraudAlerts = candidate.verificationAlerts && candidate.verificationAlerts.length > 0;
                const resume = candidate.resume;
                const isDocx = resume?.fileType === 'docx' || resume?.fileName?.endsWith('.docx');

                return (
                  <tr key={candidate.id} className="candidate-table-row">
                    {/* 1. Dynamic Serial Number */}
                    <td className="rank-cell text-center">
                      <span className="rank-pill">#{serialNumber}</span>
                    </td>

                    {/* 2. Candidate Name & Contact */}
                    <td>
                      <div 
                        className="candidate-cell-info"
                        onClick={() => onSelectCandidate(candidate)}
                        style={{ cursor: 'pointer' }}
                      >
                        <b style={{ fontSize: '13px' }}>{candidate.name}</b>
                        <small>{candidate.email}</small>
                        <small style={{ color: 'var(--text-light)', marginTop: '2px' }}>
                          {candidate.location} {candidate.phone && `· ${candidate.phone}`}
                        </small>
                      </div>
                    </td>

                    {/* 3. Uploaded Resume Badge & Click to view */}
                    <td>
                      <button
                        type="button"
                        onClick={() => setViewingResumeCandidate(candidate)}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textAlign: 'left', maxWidth: '240px' }}
                        title="Open Document in Viewer"
                      >
                        <FileText size={14} style={{ color: isDocx ? '#2563eb' : '#e11d48', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                          {resume?.fileName || `${candidate.name}_Resume.pdf`}
                        </span>
                        <Eye size={12} style={{ marginLeft: 'auto', opacity: 0.6 }} />
                      </button>
                    </td>

                    {/* 4. Match Score */}
                    <td className="text-center">
                      {isPending ? (
                        <span className="status-badge-inline" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                          <Clock size={11} /> Pending
                        </span>
                      ) : (
                        <b className="final-score-text">
                          {candidate.finalScore?.toFixed(1)}%
                        </b>
                      )}
                    </td>

                    {/* 5. Verification Status */}
                    <td className="text-center">
                      {hasFraudAlerts ? (
                        <span 
                          className="status-badge-inline status-review"
                          style={{ cursor: 'pointer' }}
                          onClick={() => setViewingResumeCandidate(candidate)}
                          title="Click to view fraud scan findings"
                        >
                          <ShieldAlert size={12} /> Review ({candidate.verificationAlerts.length})
                        </span>
                      ) : (
                        <span className="status-badge-inline status-strong">
                          <ShieldCheck size={12} /> Verified Clean
                        </span>
                      )}
                    </td>

                    {/* 6. Action: Stages & Stage Actions */}
                    <td className="text-right">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setViewingResumeCandidate(candidate)}
                          title="View Resume Document"
                        >
                          <FileText size={13} /> Resume
                        </button>

                        {(candidate.currentStage === 'SCREENING' || !candidate.currentStage) && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleShortlist(candidate)}
                          >
                            <CheckCircle2 size={13} /> Shortlist
                          </button>
                        )}

                        {candidate.currentStage === 'SHORTLISTED' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => openScheduleModal(candidate)}
                          >
                            <Mail size={13} /> Schedule & Invite
                          </button>
                        )}

                        {candidate.currentStage === 'ASSESSMENT_SENT' && (
                          <a
                            className="btn btn-secondary btn-sm"
                            href={`/assessment/${candidate.id}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Open Candidate Assessment Test Link"
                          >
                            <Clock size={12} style={{ color: 'var(--warning)' }} />
                            <span>Test Link</span>
                            <ChevronRight size={12} />
                          </a>
                        )}

                        {(candidate.currentStage === 'ASSESSMENT_SUBMITTED' || candidate.currentStage === 'ASSESSMENT_EVALUATED' || candidate.currentStage === 'HR_REVIEW') && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => onSelectCandidate(candidate)}
                            style={{ borderColor: 'var(--success-border)', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)' }}
                          >
                            <CheckCircle2 size={12} />
                            <span>Review (94%)</span>
                          </button>
                        )}

                        {candidate.currentStage === 'HR_SELECTED' && (
                          <span className="status-badge-inline status-strong">
                            ✓ HR Selected
                          </span>
                        )}

                        {candidate.currentStage === 'REJECTED' && (
                          <span className="status-badge-inline" style={{ color: 'var(--danger-text)' }}>
                            Rejected
                          </span>
                        )}

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onSelectCandidate(candidate)}
                        >
                          Profile <ChevronRight size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Upload Candidate Resume Modal */}
      {showUploadModal && (
        <div className="modal-backdrop" onClick={() => setShowUploadModal(false)}>
          <div 
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: '520px', 
              maxHeight: '90vh', 
              overflowY: 'auto',
              backgroundColor: '#ffffff',
              borderRadius: '0px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.1)',
              padding: '24px 28px'
            }}
            role="dialog"
            aria-modal="true"
          >
            <header className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <span className="modal-eyebrow" style={{ color: 'var(--primary)', letterSpacing: '0.5px' }}>ATTACH RESUME</span>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '4px 0 2px' }}>Upload Candidate Resume</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Role: <b>{job.title}</b></p>
              </div>
              <button 
                type="button" 
                className="close-btn" 
                onClick={() => setShowUploadModal(false)}
                aria-label="Close"
                style={{ borderRadius: '0px' }}
              >
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {uploadError && (
                <div style={{ padding: '10px 14px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)', fontSize: '12px' }}>
                  {uploadError}
                </div>
              )}

              {/* Drag & Drop File Box */}
              <div>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`dropzone-box ${selectedFile ? 'has-file' : ''}`}
                  style={{ 
                    padding: '36px 20px', 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    borderRadius: '0px',
                    border: selectedFile ? '2px solid var(--primary)' : '2px dashed var(--border-strong)',
                    backgroundColor: selectedFile ? 'var(--primary-light)' : '#fafbfc'
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  {selectedFile ? (
                    <div>
                      <div 
                        style={{ 
                          width: '46px', 
                          height: '46px', 
                          backgroundColor: '#ffffff', 
                          border: '1px solid var(--primary-subtle)', 
                          display: 'grid', 
                          placeItems: 'center',
                          margin: '0 auto 10px',
                          color: 'var(--primary)'
                        }}
                      >
                        <FileText size={24} />
                      </div>
                      <b style={{ display: 'block', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {selectedFile.name}
                      </b>
                      <small style={{ color: 'var(--text-muted)', display: 'block' }}>
                        {(selectedFile.size / 1024).toFixed(1)} KB · Click or drop another file to replace
                      </small>
                    </div>
                  ) : (
                    <div>
                      <div 
                        style={{ 
                          width: '46px', 
                          height: '46px', 
                          backgroundColor: '#ffffff', 
                          border: '1px solid var(--border-color)', 
                          display: 'grid', 
                          placeItems: 'center',
                          margin: '0 auto 10px',
                          color: 'var(--text-muted)'
                        }}
                      >
                        <Upload size={22} />
                      </div>
                      <b style={{ display: 'block', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        Drop candidate resume document here
                      </b>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 6px' }}>
                        or click to browse from your computer
                      </p>
                      <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600, backgroundColor: '#ffffff', border: '1px solid var(--primary-subtle)', padding: '3px 10px' }}>
                        PDF, DOCX, DOC
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowUploadModal(false)}
                  style={{ borderRadius: '0px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="btn btn-primary"
                  style={{ borderRadius: '0px' }}
                >
                  {uploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Uploading Document...
                    </>
                  ) : (
                    <>
                      <Upload size={14} /> Attach Resume Document
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule & Send Assessment Modal */}
      {schedulingCandidate && (
        <div className="modal-backdrop" onClick={() => setSchedulingCandidate(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '520px',
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-md)',
              padding: '24px 28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Schedule Technical Assessment
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Send an official timed assessment invitation to <b>{schedulingCandidate.name}</b>.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSchedulingCandidate(null)}
                style={{ padding: '4px 8px' }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Candidate Email:
                </label>
                <input
                  type="email"
                  value={candidateEmailInput}
                  onChange={(e) => setCandidateEmailInput(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xs)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Scheduled Start Date & Time:
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xs)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Duration:
                  </label>
                  <select
                    value={scheduleDuration}
                    onChange={(e) => setScheduleDuration(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xs)' }}
                  >
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>60 mins</option>
                    <option value={90}>90 mins</option>
                  </select>
                </div>
              </div>

              {/* Email Preview Card */}
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xs)', fontSize: '12px' }}>
                <b style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  ✉️ Email Dispatch Preview:
                </b>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 4px' }}>
                  <b>Subject:</b> Invitation to Technical Assessment: {job.title} - Nexora
                </p>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontStyle: 'italic', fontSize: '11.5px' }}>
                  "Hi {schedulingCandidate.name}, you have been shortlisted for {job.title}. Your technical coding test is scheduled for {new Date(scheduleDate).toLocaleString()} ({scheduleDuration} mins). The test portal link will unlock at the scheduled start time."
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSchedulingCandidate(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSendAssessmentInvite}
                  disabled={isSendingInvite}
                >
                  {isSendingInvite ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Send Assessment Email & Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resume Viewer Modal */}
      {viewingResumeCandidate && (
        <ResumeViewerModal
          candidate={viewingResumeCandidate}
          onClose={() => setViewingResumeCandidate(null)}
        />
      )}
    </div>
  );
};
