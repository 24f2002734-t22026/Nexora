import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  UploadCloud, 
  Search, 
  FileText, 
  Users, 
  Eye, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  Filter, 
  X, 
  Sparkles, 
  Clock, 
  Building2, 
  MapPin, 
  Loader2,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import type { JobOpening, Candidate, ResumeDocument } from '../types';
import { store } from '../services/store';
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
  
  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(initialOpenUpload);
  const [uploadName, setUploadName] = useState('');
  const [uploadEmail, setUploadEmail] = useState('');
  const [uploadPhone, setUploadPhone] = useState('');
  const [uploadLocation, setUploadLocation] = useState('Remote');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resume viewer modal
  const [viewingResumeCandidate, setViewingResumeCandidate] = useState<Candidate | null>(null);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const data = await store.getCandidatesForJob(job.id);
      setCandidates(data);
    } catch (err) {
      console.error('Error loading candidates for job:', err);
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

    // Auto-fill candidate name if empty
    if (!uploadName) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setUploadName(cleanName.replace(/\b(resume|cv|profile)\b/gi, '').trim());
    }
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
        {
          name: uploadName.trim() || undefined,
          email: uploadEmail.trim() || undefined,
          phone: uploadPhone.trim() || undefined,
          location: uploadLocation.trim() || undefined,
        },
        selectedFile
      );

      // Add to local list
      setCandidates((prev) => [newCand, ...prev]);
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadName('');
      setUploadEmail('');
      setUploadPhone('');
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

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Job Openings
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-slate-300 font-medium truncate max-w-xs">{job.title}</span>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <UploadCloud className="w-4 h-4" />
          Upload Candidate Resume
        </button>
      </div>

      {/* Job Info Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {job.employmentType || 'Full-time'}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {job.status.toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">{job.title}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
              {job.department && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  {job.department}
                </span>
              )}
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {job.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                {candidates.length} {candidates.length === 1 ? 'Candidate' : 'Candidates'} Applied
              </span>
            </div>
          </div>

          {/* Key Required Skills Badges */}
          {job.skillsRequired && job.skillsRequired.length > 0 && (
            <div className="lg:text-right">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1.5">
                Required Core Stack
              </span>
              <div className="flex flex-wrap gap-1.5 lg:justify-end">
                {job.skillsRequired.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-slate-800 text-blue-300 border border-slate-700/80 rounded text-xs font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Candidate Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidates by name, email, skills..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto text-xs">
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'all' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({candidates.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'pending' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pending ({candidates.filter((c) => c.analysisPending || c.finalScore === undefined).length})
            </button>
            <button
              onClick={() => setStatusFilter('flagged')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'flagged' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Flagged ({candidates.filter((c) => c.verificationAlerts && c.verificationAlerts.length > 0).length})
            </button>
          </div>
        </div>
      </div>

      {/* Candidates Tabular View */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/90 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-4 w-12 text-center">#</th>
                <th className="py-4 px-6 min-w-[220px]">Candidate</th>
                <th className="py-4 px-6 min-w-[200px]">Uploaded Resume</th>
                <th className="py-4 px-6 w-36 text-center">Match Score</th>
                <th className="py-4 px-6 w-44 text-center">Integrity Scan</th>
                <th className="py-4 px-6 w-36 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <p>Loading candidate resumes...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-300">No Candidates Found</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {searchQuery
                        ? 'No candidates match your current filter criteria.'
                        : 'Upload resumes (PDF or DOCX) to screen applicants for this role.'}
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500 transition-colors"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        Upload First Resume
                      </button>
                    )}
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
                    <tr
                      key={candidate.id}
                      className="group hover:bg-slate-800/50 transition-colors"
                    >
                      {/* # Dynamic Serial Number */}
                      <td className="py-4 px-4 text-center font-mono font-medium text-slate-400 group-hover:text-slate-200">
                        {serialNumber}
                      </td>

                      {/* Candidate Name & Contact */}
                      <td className="py-4 px-6">
                        <div 
                          onClick={() => onSelectCandidate(candidate)}
                          className="cursor-pointer group-hover:text-blue-400"
                        >
                          <div className="font-semibold text-white group-hover:text-blue-400 transition-colors text-sm">
                            {candidate.name}
                          </div>
                          <p className="text-[11px] text-slate-400">{candidate.email}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            {candidate.location && <span>{candidate.location}</span>}
                            {candidate.phone && <span>• {candidate.phone}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Uploaded Resume File */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setViewingResumeCandidate(candidate)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-slate-200 hover:text-white transition-all text-xs text-left max-w-[240px]"
                            title="Click to view original resume"
                          >
                            <FileText className={`w-4 h-4 shrink-0 ${isDocx ? 'text-indigo-400' : 'text-rose-400'}`} />
                            <div className="truncate min-w-0">
                              <span className="font-medium truncate block text-xs">
                                {resume?.fileName || `${candidate.name}_Resume.pdf`}
                              </span>
                              <span className="text-[10px] text-slate-400 uppercase font-mono">
                                {isDocx ? 'DOCX Document' : 'PDF Document'}
                              </span>
                            </div>
                            <Eye className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-auto group-hover:text-blue-400" />
                          </button>
                        </div>
                      </td>

                      {/* Match Score (No fake numbers when analysis pending) */}
                      <td className="py-4 px-6 text-center">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-400 text-[11px] font-mono">
                            <Clock className="w-3 h-3 text-slate-500" />
                            — (Pending)
                          </span>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className={`text-sm font-bold font-mono ${
                              (candidate.finalScore || 0) >= 80 ? 'text-emerald-400' :
                              (candidate.finalScore || 0) >= 65 ? 'text-blue-400' : 'text-amber-400'
                            }`}>
                              {candidate.finalScore}%
                            </span>
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider">Score</span>
                          </div>
                        )}
                      </td>

                      {/* Integrity / Fraud Scan */}
                      <td className="py-4 px-6 text-center">
                        {hasFraudAlerts ? (
                          <button
                            type="button"
                            onClick={() => setViewingResumeCandidate(candidate)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-medium hover:bg-amber-500/20 transition-colors"
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            Review Flagged ({candidate.verificationAlerts.length})
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Scan Clean
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingResumeCandidate(candidate)}
                            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors"
                            title="View Resume"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onSelectCandidate(candidate)}
                            className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                          >
                            Profile
                            <ChevronRight className="w-3 h-3" />
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
      </div>

      {/* Resume Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Upload Candidate Resume</h3>
                  <p className="text-xs text-slate-400">Applying to: <span className="text-slate-200">{job.title}</span></p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              {uploadError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Drag & Drop File Box */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Resume Document (PDF or DOCX) <span className="text-rose-400">*</span>
                </label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    selectedFile
                      ? 'border-blue-500 bg-blue-500/5'
                      : 'border-slate-700 hover:border-slate-600 bg-slate-950/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="flex flex-col items-center">
                      <FileText className="w-8 h-8 text-blue-400 mb-2" />
                      <p className="text-sm font-semibold text-white truncate max-w-xs">{selectedFile.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {(selectedFile.size / 1024).toFixed(1)} KB • Click or drop to replace
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <UploadCloud className="w-8 h-8 text-slate-500 mb-2" />
                      <p className="text-xs font-semibold text-slate-200">
                        Drag & drop your resume file here, or <span className="text-blue-400 underline">browse</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">Supports PDF & DOCX up to 25MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Candidate Info Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Candidate Full Name
                  </label>
                  <input
                    type="text"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={uploadEmail}
                    onChange={(e) => setUploadEmail(e.target.value)}
                    placeholder="alex.johnson@example.com"
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={uploadPhone}
                    onChange={(e) => setUploadPhone(e.target.value)}
                    placeholder="+1 (555) 234-5678"
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={uploadLocation}
                    onChange={(e) => setUploadLocation(e.target.value)}
                    placeholder="San Francisco, CA"
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Informational callout */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
                <span>
                  The resume will be securely attached to this job opening. Match score will be marked <strong>Pending</strong> until an AI intelligence scan is triggered.
                </span>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading Resume...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      Attach Resume to Job
                    </>
                  )}
                </button>
              </div>
            </form>
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
