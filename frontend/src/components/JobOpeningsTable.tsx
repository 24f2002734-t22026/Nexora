import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Search, 
  Plus, 
  Users, 
  FileText, 
  Trash2, 
  ChevronRight, 
  MapPin, 
  Building2, 
  Clock, 
  X,
  Eye
} from 'lucide-react';
import type { JobOpening } from '../types';
import { store } from '../services/store';
import { CreateJobModal } from './CreateJobModal';

interface JobOpeningsTableProps {
  onSelectJob: (job: JobOpening) => void;
}

export const JobOpeningsTable: React.FC<JobOpeningsTableProps> = ({ 
  onSelectJob
}) => {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingJdJob, setViewingJdJob] = useState<JobOpening | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await store.getJobOpenings();
      setJobs(data);
    } catch (err) {
      console.error('Failed to load jobs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleDeleteJob = async (job: JobOpening, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete the job opening "${job.title}" and all its candidate records?`)) {
      await store.deleteJobOpening(job.id);
      fetchJobs();
    }
  };

  const handleJobCreated = (newJob: JobOpening) => {
    setJobs((prev) => [newJob, ...prev]);
  };

  const filteredJobs = jobs.filter((job) => {
    const query = searchQuery.toLowerCase();
    const matchesQuery = 
      job.title.toLowerCase().includes(query) ||
      (job.department && job.department.toLowerCase().includes(query)) ||
      (job.location && job.location.toLowerCase().includes(query)) ||
      (job.skillsRequired && job.skillsRequired.some((s) => s.toLowerCase().includes(query)));
    
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="candidates-view">
      {/* Header aligned with Candidates Section */}
      <div className="candidates-header">
        <div>
          <span className="eyebrow">RECRUITER PIPELINE</span>
          <h1>Job Openings</h1>
          <p>
            Select a job opening to inspect candidate resumes, review verification integrity, and screen applicants.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={16} /> Create Job Opening
        </button>
      </div>

      {/* Filter & Search Toolbar (Matches Candidates Section) */}
      <div className="filter-toolbar-card">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by job title, skill, department, or location..."
          />
        </div>

        <div className="dropdown-filters-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="filter-select"
            aria-label="Filter by Job Status"
          >
            <option value="all">All Roles ({jobs.length})</option>
            <option value="open">Open Roles ({jobs.filter((j) => j.status === 'open').length})</option>
            <option value="closed">Closed Roles ({jobs.filter((j) => j.status === 'closed').length})</option>
          </select>
        </div>
      </div>

      {/* Tabular Job Openings Table (Exact format as Candidates Table) */}
      <div className="rankings-table-wrap">
        <table className="rankings-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: 50 }} className="text-center">#</th>
              <th scope="col" style={{ minWidth: 260 }}>Job Title & Details</th>
              <th scope="col" style={{ minWidth: 320 }}>Job Description</th>
              <th scope="col" className="text-center" style={{ width: 140 }}>Candidates</th>
              <th scope="col" className="text-right" style={{ width: 160 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8">
                  <div style={{ padding: '24px', color: 'var(--text-muted)' }}>
                    Loading job openings...
                  </div>
                </td>
              </tr>
            ) : filteredJobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8">
                  <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <Briefcase size={28} style={{ color: 'var(--text-light)', margin: '0 auto 8px' }} />
                    <b style={{ display: 'block', fontSize: '14px', color: 'var(--text-primary)' }}>
                      No Job Openings Found
                    </b>
                    <small style={{ color: 'var(--text-muted)' }}>
                      {searchQuery ? 'Try clearing your search filters.' : 'Create a job opening to start receiving and screening resumes.'}
                    </small>
                  </div>
                </td>
              </tr>
            ) : (
              filteredJobs.map((job, idx) => {
                const serialNumber = idx + 1;

                return (
                  <tr 
                    key={job.id} 
                    className="candidate-table-row"
                    onClick={() => onSelectJob(job)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* 1. Dynamic Serial Number */}
                    <td className="rank-cell text-center">
                      <span className="rank-pill">#{serialNumber}</span>
                    </td>

                    {/* 2. Job Title & Meta */}
                    <td>
                      <div className="candidate-cell-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <b style={{ fontSize: '13px' }}>{job.title}</b>
                          <span className="status-badge-inline status-strong" style={{ fontSize: '10px' }}>
                            {job.status.toUpperCase()}
                          </span>
                        </div>
                        <small>
                          {job.department && `${job.department} · `}
                          {job.location && `${job.location} · `}
                          {job.employmentType || 'Full-time'}
                        </small>

                        {/* Skill Tags */}
                        {job.skillsRequired && job.skillsRequired.length > 0 && (
                          <div className="skills-inline-wrap" style={{ marginTop: '6px' }}>
                            {job.skillsRequired.slice(0, 4).map((skill, sIdx) => (
                              <span key={sIdx} className="skill-tag">
                                {skill}
                              </span>
                            ))}
                            {job.skillsRequired.length > 4 && (
                              <small className="more-skills">+{job.skillsRequired.length - 4}</small>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 3. Job Description Snippet + Read More */}
                    <td>
                      <div style={{ maxWidth: '420px', lineHeight: '1.45' }}>
                        <p style={{ 
                          fontSize: '12px', 
                          color: 'var(--text-secondary)',
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {job.description}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingJdJob(job);
                          }}
                          className="btn-text"
                          style={{
                            fontSize: '11px',
                            color: 'var(--primary)',
                            padding: 0,
                            marginTop: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            fontWeight: 600,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          Read Details <ChevronRight size={12} />
                        </button>
                      </div>
                    </td>

                    {/* 4. Candidate Count Badge */}
                    <td className="text-center">
                      <span className="status-badge-inline status-strong" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px' }}>
                        <Users size={12} />
                        <b>{job.candidateCount || 0}</b>
                        <span>{job.candidateCount === 1 ? 'Candidate' : 'Candidates'}</span>
                      </span>
                    </td>

                    {/* 5. Action: View Candidates & Delete */}
                    <td className="text-right">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectJob(job);
                          }}
                          title="View Candidates"
                        >
                          <Eye size={13} /> View Candidates
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => handleDeleteJob(job, e)}
                          title="Delete Opening"
                          style={{ color: 'var(--danger-text)', padding: '6px 8px' }}
                        >
                          <Trash2 size={13} />
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

      {/* Full JD Modal using standard modal design system */}
      {viewingJdJob && (
        <div className="modal-backdrop" onClick={() => setViewingJdJob(null)}>
          <div 
            className="modal-card" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: '640px', 
              maxHeight: '85vh', 
              overflowY: 'auto',
              backgroundColor: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.08)'
            }}
            role="dialog"
            aria-modal="true"
          >
            <header className="modal-header">
              <div>
                <span className="modal-eyebrow">JOB SPECIFICATION</span>
                <h2>{viewingJdJob.title}</h2>
                <p>
                  {viewingJdJob.department} · {viewingJdJob.location} · {viewingJdJob.employmentType}
                </p>
              </div>
              <button 
                type="button" 
                className="close-btn" 
                onClick={() => setViewingJdJob(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              <div>
                <span className="summary-title">Role Overview</span>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                  {viewingJdJob.description}
                </p>
              </div>

              {viewingJdJob.requirements && (
                <div>
                  <span className="summary-title">Requirements & Qualifications</span>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                    {viewingJdJob.requirements}
                  </p>
                </div>
              )}

              {viewingJdJob.responsibilities && (
                <div>
                  <span className="summary-title">Responsibilities</span>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                    {viewingJdJob.responsibilities}
                  </p>
                </div>
              )}

              <div>
                <span className="summary-title">Required Core Skills</span>
                <div className="skills-inline-wrap">
                  {viewingJdJob.skillsRequired?.map((s, sIdx) => (
                    <span key={sIdx} className="skill-tag highlighted">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <small style={{ color: 'var(--text-muted)' }}>
                Created {new Date(viewingJdJob.createdAt).toLocaleDateString()}
              </small>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setViewingJdJob(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const target = viewingJdJob;
                    setViewingJdJob(null);
                    onSelectJob(target);
                  }}
                >
                  <Users size={14} /> View Candidates ({viewingJdJob.candidateCount || 0})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Job Modal */}
      {showCreateModal && (
        <CreateJobModal
          onClose={() => setShowCreateModal(false)}
          onJobCreated={handleJobCreated}
        />
      )}
    </div>
  );
};
