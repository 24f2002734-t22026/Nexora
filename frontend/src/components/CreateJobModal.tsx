import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  Sparkles, 
  Loader2, 
  FileText, 
  CheckCircle2, 
  Briefcase, 
  MapPin, 
  Building2, 
  Clock, 
  Layers, 
  RefreshCw 
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import type { JobOpening } from '../types';
import { store } from '../services/store';
import { extractTextFromJDFile, parseJobDescriptionAI, type ExtractedJobData } from '../services/jdParser';
import { toast } from 'sonner';

interface CreateJobModalProps {
  onClose: () => void;
  onJobCreated: (job: JobOpening) => void;
}

export const CreateJobModal: React.FC<CreateJobModalProps> = ({ onClose, onJobCreated }) => {
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedJobData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable fields populated by AI extraction
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Core Engineering');
  const [location, setLocation] = useState('San Francisco, CA / Hybrid');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [experienceMinYears, setExperienceMinYears] = useState<number>(3);
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [skillsRaw, setSkillsRaw] = useState('');

  // Process and extract from uploaded JD file
  const processJDFile = async (file: File) => {
    setJdFile(file);
    setIsExtracting(true);
    setError(null);

    try {
      // Step 1: Extract plain text from PDF, DOCX, or TXT
      const rawText = await extractTextFromJDFile(file);
      
      // Step 2: Intelligent AI extraction
      const aiData = parseJobDescriptionAI(rawText, file.name);
      
      // Step 3: Populate state
      setExtractedData(aiData);
      setTitle(aiData.title);
      setDepartment(aiData.department);
      setLocation(aiData.location);
      setEmploymentType(aiData.employmentType);
      setExperienceMinYears(aiData.experienceMinYears);
      setDescription(aiData.description);
      setRequirements(aiData.requirements);
      setResponsibilities(aiData.responsibilities);
      setSkillsRaw(aiData.skillsRequired.join(', '));

      toast.success(`AI successfully extracted details from "${file.name}"`);
    } catch (err: any) {
      console.error('JD extraction error:', err);
      setError('Failed to extract text from the JD file. Please try another format (.pdf, .docx, .txt).');
      toast.error('Could not parse JD document');
    } finally {
      setIsExtracting(false);
    }
  };

  // Dropzone setup
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    },
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        void processJDFile(acceptedFiles[0]);
      }
    }
  });

  // Demo JD Loader for rapid preview
  const handleLoadSampleJD = (roleType: 'fullstack' | 'ml' | 'product') => {
    let mockContent = '';
    let mockFilename = '';

    if (roleType === 'fullstack') {
      mockFilename = 'Senior_Full_Stack_Engineer_JD.pdf';
      mockContent = `Job Title: Senior Full Stack Engineer
Department: Core Engineering
Location: San Francisco, CA / Hybrid
Employment Type: Full-time
Experience Required: 4+ years

About the Role:
We are seeking a Senior Full Stack Engineer to lead frontend architecture and scale backend distributed systems. You will build high-impact web applications, real-time dashboards, and robust microservices powering our talent intelligence engine.

Key Responsibilities:
• Architect, test, and deploy resilient web apps using React, TypeScript, and Python.
• Design scalable REST and GraphQL APIs backed by PostgreSQL and Redis.
• Optimize cloud infrastructure on AWS and Docker container pipelines.
• Collaborate with cross-functional product designers and recruiters to ship critical workflows.

Requirements & Qualifications:
• 4+ years of professional software development experience.
• Strong expertise in React, TypeScript, Node.js, Python, and SQL.
• Hands-on experience with cloud infrastructure (AWS, Docker, CI/CD).
• Deep understanding of distributed state management, performance tuning, and system design.`;
    } else if (roleType === 'ml') {
      mockFilename = 'Staff_Machine_Learning_Engineer_JD.docx';
      mockContent = `Job Title: Staff Machine Learning Engineer
Department: Data & AI Engineering
Location: Remote (Global)
Employment Type: Full-time
Experience Required: 5+ years

About the Role:
Nexora is looking for a Staff Machine Learning Engineer to design and deploy state-of-the-art NLP, LLM orchestration, and candidate matching algorithms.

Key Responsibilities:
• Build and fine-tune large language models and semantic retrieval systems with PyTorch and LangChain.
• Scale low-latency inference pipelines and vector databases.
• Drive technical roadmaps for AI validation and verification models.

Requirements & Qualifications:
• 5+ years building production ML systems and NLP architectures.
• Proficiency in Python, PyTorch, TensorFlow, Hugging Face, and Vector DBs.
• Experience with cloud compute on AWS/GCP and Kubernetes.`;
    } else {
      mockFilename = 'Lead_Product_Designer_JD.pdf';
      mockContent = `Job Title: Lead Product Designer
Department: Product Design
Location: New York, NY / Hybrid
Employment Type: Full-time
Experience Required: 4+ years

About the Role:
We are looking for a Lead Product Designer to shape the user experience and interface systems for our AI recruitment and screening platform.

Key Responsibilities:
• Design intuitive user flows, high-fidelity prototypes, and component libraries in Figma.
• Conduct user research with talent acquisition teams to uncover workflow bottlenecks.
• Partner closely with frontend engineers to ensure pixel-perfect execution.

Requirements & Qualifications:
• 4+ years experience designing B2B SaaS interfaces.
• Mastery of Figma, UI/UX systems, user research, and interactive prototyping.`;
    }

    const mockFile = new File([mockContent], mockFilename, { type: 'text/plain' });
    void processJDFile(mockFile);
  };

  const handlePublishJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Job Title is required.');
      return;
    }
    if (!description.trim()) {
      setError('Job Description is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const skillsArray = skillsRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const created = await store.createJobOpening({
        title: title.trim(),
        department: department.trim() || 'Core Engineering',
        location: location.trim() || 'San Francisco, CA / Hybrid',
        employmentType: employmentType || 'Full-time',
        description: description.trim(),
        requirements: requirements.trim(),
        responsibilities: responsibilities.trim(),
        skillsRequired: skillsArray.length > 0 ? skillsArray : ['TypeScript', 'React', 'Python', 'SQL'],
        experienceMinYears: Number(experienceMinYears) || 1,
      });

      toast.success(`Job opening "${created.title}" successfully created!`);
      onJobCreated(created);
      onClose();
    } catch (err: any) {
      console.error('Failed to create job opening:', err);
      setError('Failed to create job opening in database. Please try again.');
      toast.error('Failed to create job opening');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '720px', 
          maxHeight: '92vh', 
          overflowY: 'auto',
          backgroundColor: '#ffffff',
          borderRadius: '0px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.1)',
          padding: '24px 28px'
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <header className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
          <div>
            <span className="modal-eyebrow" style={{ color: 'var(--primary)', letterSpacing: '0.5px' }}>AI JOB OPENING PIPELINE</span>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '4px 0 2px' }}>Upload Job Description (JD)</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Upload your JD document. Nexora AI will automatically parse and populate the title, requirements, skills, and details.
            </p>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close modal" style={{ borderRadius: '0px' }}>
            <X size={18} />
          </button>
        </header>

        {error && (
          <div style={{ padding: '10px 14px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)', fontSize: '12px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Step 1: JD Document Upload Area */}
        {!extractedData && !isExtracting && (
          <div>
            <div
              {...getRootProps()}
              style={{
                border: isDragActive ? '2px dashed var(--primary)' : '2px dashed var(--border-strong)',
                backgroundColor: isDragActive ? 'var(--primary-light)' : '#fafbfc',
                padding: '36px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              <input {...getInputProps()} />
              <div 
                style={{ 
                  width: '52px', 
                  height: '52px', 
                  backgroundColor: '#ffffff', 
                  border: '1px solid var(--border-color)', 
                  display: 'grid', 
                  placeItems: 'center',
                  color: 'var(--primary)'
                }}
              >
                <UploadCloud size={26} />
              </div>
              <div>
                <b style={{ display: 'block', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {isDragActive ? 'Drop the JD document here...' : 'Choose or drag & drop Job Description document'}
                </b>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                  Supports PDF (.pdf), Microsoft Word (.docx), Markdown (.md), and Text (.txt)
                </p>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600, backgroundColor: '#ffffff', border: '1px solid var(--primary-subtle)', padding: '4px 12px', marginTop: '4px' }}>
                AI Document Parser Ready
              </span>
            </div>

          </div>
        )}

        {/* Step 2: Extracting State Animation */}
        {isExtracting && (
          <div style={{ padding: '48px 24px', textAlign: 'center', backgroundColor: '#fafbfc', border: '1px solid var(--border-color)' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 16px' }} />
            <b style={{ display: 'block', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '6px' }}>
              Parsing Document & Extracting Job Details...
            </b>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto' }}>
              Extracting role title, department, required tech stack, responsibilities, and experience criteria via AI.
            </p>
          </div>
        )}

        {/* Step 3: Extracted Preview & Confirmation Form */}
        {extractedData && !isExtracting && (
          <form onSubmit={handlePublishJob} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* File & AI Detection Summary Card */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={18} style={{ color: 'var(--primary)' }} />
                <div>
                  <b style={{ fontSize: '13px', color: 'var(--primary-text)' }}>
                    Auto-Extracted from {jdFile?.name || 'Uploaded JD'}
                  </b>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    AI Confidence Score: 95% · All fields populated automatically
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setExtractedData(null);
                  setJdFile(null);
                }}
                style={{ borderRadius: '0px', backgroundColor: '#ffffff', fontSize: '11px' }}
              >
                <RefreshCw size={12} /> Upload Different JD
              </button>
            </div>

            {/* Extracted Job Title */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Job Title (Auto-Detected) *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '0px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>

            {/* 3-Column Attributes Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '0px',
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
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '0px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px',
                    backgroundColor: '#ffffff'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Employment Type
                </label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '0px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Remote">Remote</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
            </div>

            {/* Extracted Skills and Min Experience */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Auto-Extracted Required Skills
                </label>
                <input
                  type="text"
                  value={skillsRaw}
                  onChange={(e) => setSkillsRaw(e.target.value)}
                  placeholder="React, TypeScript, Python, SQL"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '0px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px',
                    backgroundColor: '#ffffff'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Min Exp (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  max="25"
                  value={experienceMinYears}
                  onChange={(e) => setExperienceMinYears(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '0px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px',
                    backgroundColor: '#ffffff'
                  }}
                />
              </div>
            </div>

            {/* Job Description Overview */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Job Description Overview (Auto-Extracted) *
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '0px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Requirements & Responsibilities */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Extracted Requirements
                </label>
                <textarea
                  rows={4}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '0px',
                    border: '1px solid var(--border-color)',
                    fontSize: '11.5px',
                    lineHeight: '1.45',
                    backgroundColor: '#ffffff',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Extracted Responsibilities
                </label>
                <textarea
                  rows={4}
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '0px',
                    border: '1px solid var(--border-color)',
                    fontSize: '11.5px',
                    lineHeight: '1.45',
                    backgroundColor: '#ffffff',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ marginTop: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                style={{ borderRadius: '0px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ borderRadius: '0px' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Saving Opening...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Confirm & Publish Opening
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
