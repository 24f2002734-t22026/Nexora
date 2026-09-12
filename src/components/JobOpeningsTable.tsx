import React, { useState, useEffect, useRef } from 'react';
import { 
  Briefcase, 
  Search, 
  Plus, 
  MoreVertical, 
  Users, 
  FileText, 
  Trash2, 
  UploadCloud, 
  ChevronRight, 
  Building2, 
  MapPin, 
  Clock, 
  X, 
  AlertCircle,
  ExternalLink,
  Sparkles,
  Layers
} from 'lucide-react';
import type { JobOpening } from '../types';
import { store } from '../services/store';
import { CreateJobModal } from './CreateJobModal';

interface JobOpeningsTableProps {
  onSelectJob: (job: JobOpening) => void;
  onOpenUploadForJob?: (job: JobOpening) => void;
}

export const JobOpeningsTable: React.FC<JobOpeningsTableProps> = ({ 
  onSelectJob,
  onOpenUploadForJob
}) => {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingJdJob, setViewingJdJob] = useState<JobOpening | null>(null);
  const [activeMenuJobId, setActiveMenuJobId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close three-dot menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuJobId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteJob = async (job: JobOpening, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuJobId(null);
    if (window.confirm(`Are you sure you want to delete the job opening "${job.title}" and its candidates?`)) {
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

  const totalCandidatesCount = jobs.reduce((acc, j) => acc + (j.candidateCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics Overview */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Recruiter Pipeline
            </span>
            <span className="text-xs text-slate-400">Analysis & Resume Screening</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Job Openings</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Select a job opening to inspect candidate resumes, review verification integrity, and track applications.
          </p>
        </div>

        {/* Stats Badges + CTA */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-4 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Roles</p>
              <p className="text-lg font-bold text-white">{jobs.length}</p>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Applicants</p>
              <p className="text-lg font-bold text-blue-400">{totalCandidatesCount}</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Create Job Opening
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, skill, department..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'all' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Roles ({jobs.length})
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'open' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Open ({jobs.filter((j) => j.status === 'open').length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Tabular Job Openings Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/90 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-4 w-12 text-center">#</th>
                <th className="py-4 px-6 min-w-[280px]">Job Title</th>
                <th className="py-4 px-6 min-w-[340px]">Job Description</th>
                <th className="py-4 px-6 w-36 text-center">Candidates</th>
                <th className="py-4 px-6 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <p>Loading job openings...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-300">No Job Openings Found</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {searchQuery
                        ? 'Try adjusting your search query or clear filters.'
                        : 'Get started by creating your first job opening to screen resumes.'}
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create Job Opening
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job, idx) => {
                  const serialNumber = idx + 1;
                  const isMenuOpen = activeMenuJobId === job.id;

                  return (
                    <tr
                      key={job.id}
                      onClick={() => onSelectJob(job)}
                      className="group hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      {/* 1. Dynamic Serial Number */}
                      <td className="py-4 px-4 text-center font-mono font-medium text-slate-400 group-hover:text-slate-200">
                        {serialNumber}
                      </td>

                      {/* 2. Job Title & Meta */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white group-hover:text-blue-400 transition-colors text-sm">
                              {job.title}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {job.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 text-[11px]">
                            {job.department && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-slate-500" />
                                {job.department}
                              </span>
                            )}
                            {job.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                {job.location}
                              </span>
                            )}
                            {job.employmentType && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {job.employmentType}
                              </span>
                            )}
                          </div>

                          {/* Skill Tags */}
                          {job.skillsRequired && job.skillsRequired.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {job.skillsRequired.slice(0, 4).map((skill, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-medium"
                                >
                                  {skill}
                                </span>
                              ))}
                              {job.skillsRequired.length > 4 && (
                                <span className="text-[10px] text-slate-500 self-center">
                                  +{job.skillsRequired.length - 4} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. Job Description Snippet + Read More */}
                      <td className="py-4 px-6">
                        <div className="max-w-md">
                          <p className="text-slate-300 line-clamp-2 text-xs leading-relaxed">
                            {job.description}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingJdJob(job);
                            }}
                            className="text-[11px] text-blue-400 hover:text-blue-300 font-medium mt-1 inline-flex items-center gap-0.5 hover:underline"
                          >
                            Read Full Description
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* 4. Candidate Count Badge */}
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                          <Users className="w-3.5 h-3.5" />
                          <span className="font-bold text-xs">
                            {job.candidateCount || 0}
                          </span>
                          <span className="text-[10px] opacity-80">
                            {job.candidateCount === 1 ? 'Candidate' : 'Candidates'}
                          </span>
                        </div>
                      </td>

                      {/* 5. Actions Dropdown Menu */}
                      <td className="py-4 px-6 text-right">
                        <div className="relative inline-block text-left" ref={isMenuOpen ? menuRef : null}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuJobId(isMenuOpen ? null : job.id);
                            }}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                            title="Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 mt-1 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-40 animate-fadeIn text-slate-200">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuJobId(null);
                                  onSelectJob(job);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-800 hover:text-white transition-colors"
                              >
                                <Users className="w-4 h-4 text-blue-400" />
                                View Candidates ({job.candidateCount || 0})
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuJobId(null);
                                  setViewingJdJob(job);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-800 hover:text-white transition-colors"
                              >
                                <FileText className="w-4 h-4 text-indigo-400" />
                                View Full JD
                              </button>

                              {onOpenUploadForJob && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuJobId(null);
                                    onOpenUploadForJob(job);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-800 hover:text-white transition-colors"
                                >
                                  <UploadCloud className="w-4 h-4 text-emerald-400" />
                                  Upload Resumes
                                </button>
                              )}

                              <div className="my-1 border-t border-slate-800" />

                              <button
                                type="button"
                                onClick={(e) => handleDeleteJob(job, e)}
                                className="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete Opening
                              </button>
                            </div>
                          )}
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

      {/* Full JD Detail Modal / Popover */}
      {viewingJdJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">{viewingJdJob.title}</h3>
                  <p className="text-xs text-slate-400">
                    {viewingJdJob.department} • {viewingJdJob.location} • {viewingJdJob.employmentType}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingJdJob(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-300">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Role Overview</h4>
                <p className="text-slate-200 leading-relaxed bg-slate-950/50 p-3.5 rounded-xl border border-slate-800 whitespace-pre-line text-sm">
                  {viewingJdJob.description}
                </p>
              </div>

              {viewingJdJob.requirements && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Requirements</h4>
                  <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800 whitespace-pre-line text-slate-200 leading-relaxed">
                    {viewingJdJob.requirements}
                  </div>
                </div>
              )}

              {viewingJdJob.responsibilities && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Responsibilities</h4>
                  <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800 whitespace-pre-line text-slate-200 leading-relaxed">
                    {viewingJdJob.responsibilities}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Required Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {viewingJdJob.skillsRequired?.map((s, sIdx) => (
                    <span key={sIdx} className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md text-blue-300 font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Created: {new Date(viewingJdJob.createdAt).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewingJdJob(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const target = viewingJdJob;
                    setViewingJdJob(null);
                    onSelectJob(target);
                  }}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  View {targetCandidatesText(viewingJdJob.candidateCount)}
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

function targetCandidatesText(count: number): string {
  return `${count || 0} Candidates`;
}
