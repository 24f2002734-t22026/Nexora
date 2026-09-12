import React, { useState } from 'react';
import { X, Briefcase, Sparkles, Loader2 } from 'lucide-react';
import type { JobOpening } from '../types';
import { store } from '../services/store';

interface CreateJobModalProps {
  onClose: () => void;
  onJobCreated: (job: JobOpening) => void;
}

export const CreateJobModal: React.FC<CreateJobModalProps> = ({ onClose, onJobCreated }) => {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Core Engineering');
  const [location, setLocation] = useState('San Francisco, CA / Hybrid');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [skillsRaw, setSkillsRaw] = useState('React, TypeScript, Python, SQL');
  const [experienceMin, setExperienceMin] = useState<number>(3);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Job Title is required.');
      return;
    }
    if (!description.trim()) {
      setError('Job Description is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const skillsArray = skillsRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const created = await store.createJobOpening({
        title: title.trim(),
        department: department.trim(),
        location: location.trim(),
        employmentType,
        description: description.trim(),
        requirements: requirements.trim(),
        responsibilities: responsibilities.trim(),
        skillsRequired: skillsArray,
        experienceMinYears: Number(experienceMin) || 1,
      });

      onJobCreated(created);
      onClose();
    } catch (err: any) {
      console.error('Failed to create job opening:', err);
      setError('Failed to create job opening. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
        role="dialog"
        aria-modal="true"
      >
        <header className="modal-header">
          <div>
            <span className="modal-eyebrow">NEW ROLE SPECIFICATION</span>
            <h2>Create New Job Opening</h2>
            <p>Define a new position to collect, screen, and verify applicant resumes.</p>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
          {error && (
            <div style={{ padding: '10px 14px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', fontSize: '12px' }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Job Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Full Stack Engineer"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Core Engineering"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Remote / SF"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Type
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Remote">Remote</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Job Description *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide role overview, scope, and objectives..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
                lineHeight: '1.5',
                outline: 'none',
                backgroundColor: '#ffffff',
                resize: 'vertical'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Requirements & Qualifications
            </label>
            <textarea
              rows={3}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="• 3+ years experience with React and TypeScript..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                lineHeight: '1.5',
                outline: 'none',
                backgroundColor: '#ffffff',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Required Skills (comma separated)
              </label>
              <input
                type="text"
                value={skillsRaw}
                onChange={(e) => setSkillsRaw(e.target.value)}
                placeholder="React, TypeScript, Python, PostgreSQL"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Min. Exp (Years)
              </label>
              <input
                type="number"
                min="0"
                max="25"
                value={experienceMin}
                onChange={(e) => setExperienceMin(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Save & Publish Opening
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
