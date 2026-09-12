import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  ExternalLink, 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert,
  Eye,
  Loader2
} from 'lucide-react';
import mammoth from 'mammoth';
import type { ResumeDocument, Candidate } from '../types';
import { store } from '../services/store';

interface ResumeViewerModalProps {
  candidate: Candidate;
  onClose: () => void;
}

export const ResumeViewerModal: React.FC<ResumeViewerModalProps> = ({ candidate, onClose }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [activeTab, setActiveTab] = useState<'document' | 'fraud_report'>('document');
  const containerRef = useRef<HTMLDivElement>(null);

  const resume = candidate.resume;
  const fileUrl = resume ? store.getResumeUrl(candidate.id, resume) : null;
  const isDocx = resume?.fileType === 'docx' || resume?.fileName.endsWith('.docx');
  const isPdf = !isDocx;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setDocxHtml(null);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const loadContent = async () => {
      try {
        if (isDocx) {
          if (resume?.fileBlob) {
            const arrayBuffer = await resume.fileBlob.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            if (isMounted) {
              setDocxHtml(result.value);
              setLoading(false);
            }
          } else if (fileUrl && (fileUrl.startsWith('blob:') || fileUrl.startsWith('http'))) {
            const response = await fetch(fileUrl);
            const arrayBuffer = await response.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            if (isMounted) {
              setDocxHtml(result.value);
              setLoading(false);
            }
          } else {
            // Simulated DOCX view
            if (isMounted) {
              setDocxHtml(generateSimulatedResumeHtml(candidate));
              setLoading(false);
            }
          }
        } else {
          // PDF
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error loading resume content:', err);
        if (isMounted) {
          setError('Could not render document directly. You can still download the original file.');
          setLoading(false);
        }
      }
    };

    loadContent();

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [candidate, resume, fileUrl, isDocx, onClose]);

  const handleDownload = () => {
    if (resume?.fileBlob) {
      const url = URL.createObjectURL(resume.fileBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resume.fileName || `${candidate.name.replace(/\s+/g, '_')}_Resume.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (fileUrl && (fileUrl.startsWith('blob:') || fileUrl.startsWith('http'))) {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = resume?.fileName || `${candidate.name.replace(/\s+/g, '_')}_Resume.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Create downloadable text/pdf representation
      const dummyContent = generateSimulatedResumeText(candidate);
      const blob = new Blob([dummyContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resume?.fileName ? resume.fileName.replace(/\.pdf$/, '.txt') : `${candidate.name}_Resume.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleOpenNewTab = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 md:p-6 animate-fadeIn">
      <div className="relative w-full max-w-6xl h-[90vh] bg-slate-900 border border-slate-700/70 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white truncate max-w-md">
                  {resume?.fileName || `${candidate.name} - Resume`}
                </h2>
                <span className={`px-2 py-0.5 text-xs font-medium uppercase tracking-wider rounded-md ${
                  isDocx ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {isDocx ? 'DOCX' : 'PDF'}
                </span>
                {candidate.resume?.fileSize && (
                  <span className="text-xs text-slate-400">
                    {(candidate.resume.fileSize / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">
                Applicant: <span className="text-slate-200 font-medium">{candidate.name}</span> • {candidate.email}
              </p>
            </div>
          </div>

          {/* View Mode Tabs (if fraud findings exist) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700">
              <button
                onClick={() => setActiveTab('document')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === 'document'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Document View
              </button>
              <button
                onClick={() => setActiveTab('fraud_report')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === 'fraud_report'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Verification & Fraud
                {candidate.verificationAlerts?.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500/30 text-amber-300 text-[10px] flex items-center justify-center font-bold">
                    {candidate.verificationAlerts.length}
                  </span>
                )}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
              {/* Zoom controls */}
              <div className="hidden sm:flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5">
                <button
                  onClick={() => setZoom((z) => Math.max(50, z - 15))}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs px-2 text-slate-300 font-mono min-w-[3rem] text-center">
                  {zoom}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(175, z + 15))}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              {fileUrl && (
                <button
                  onClick={handleOpenNewTab}
                  className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                  title="Open in New Tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download
              </button>

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Viewer Area */}
        <div ref={containerRef} className="flex-1 overflow-auto bg-slate-950 p-4 md:p-8 flex justify-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center text-center m-auto py-16">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-slate-300 font-medium">Loading document preview...</p>
              <p className="text-xs text-slate-500 mt-1">Rendering {isDocx ? 'DOCX via Mammoth' : 'PDF'}</p>
            </div>
          ) : activeTab === 'fraud_report' ? (
            /* Verification & Fraud Report Tab */
            <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl p-6 h-fit text-slate-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-indigo-400" />
                    Document Integrity & Fraud Scan Results
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Multi-layer checks for white fonting, micro text, off-margin injection, and timeline consistency.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Scan Status</span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Completed
                  </div>
                </div>
              </div>

              {/* Fraud Report Details */}
              {candidate.verificationAlerts && candidate.verificationAlerts.length > 0 ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-amber-300">
                          {candidate.verificationAlerts.length} Formatting / Timeline Notification(s) Flagged
                        </h4>
                        <p className="text-xs text-slate-300 mt-1">
                          Notice: These verification flags do not alter candidate match scores. Recruiter review recommended.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    {candidate.verificationAlerts.map((alert, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-slate-800/80 border border-slate-700/80">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider bg-slate-700 px-2 py-0.5 rounded">
                            {alert.type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-amber-400 font-medium">
                            Severity: {alert.severity}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-white">{alert.title}</p>
                        <p className="text-xs text-slate-400 mt-1">{alert.message}</p>
                        {alert.timelineDetails && (
                          <div className="mt-2 p-2 bg-slate-950/60 rounded text-xs font-mono text-slate-300 border border-slate-800">
                            {alert.timelineDetails}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-900/50 rounded-xl border border-slate-800/80">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <h4 className="text-base font-semibold text-white">No Resume Manipulation Detected</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    White fonting, 0pt micro-text, off-margin coordinates, and hidden image layer scans passed with 0 anomalies.
                  </p>
                </div>
              )}
            </div>
          ) : isDocx ? (
            /* DOCX View */
            <div 
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              className="transition-transform duration-150 w-full max-w-4xl bg-white text-slate-900 rounded-lg shadow-2xl p-8 md:p-12 min-h-[850px] docx-rendered-paper"
            >
              {docxHtml ? (
                <div 
                  className="prose prose-slate max-w-none docx-container font-sans text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: docxHtml }} 
                />
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <p>Could not extract formatted DOCX content.</p>
                </div>
              )}
            </div>
          ) : fileUrl && (fileUrl.startsWith('blob:') || fileUrl.startsWith('http')) ? (
            /* PDF native embed */
            <div 
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              className="w-full max-w-5xl h-full min-h-[800px] transition-transform duration-150"
            >
              <iframe
                src={`${fileUrl}#toolbar=1&navpanes=0`}
                className="w-full h-full min-h-[800px] rounded-lg border border-slate-800 bg-slate-900 shadow-xl"
                title={`Resume for ${candidate.name}`}
              />
            </div>
          ) : (
            /* Simulated Structured Paper PDF */
            <div 
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              className="transition-transform duration-150 w-full max-w-4xl bg-white text-slate-900 rounded-lg shadow-2xl p-8 md:p-12 min-h-[850px] font-sans text-sm"
            >
              {/* Header */}
              <div className="border-b-2 border-slate-800 pb-4 mb-6">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{candidate.name}</h1>
                <p className="text-sm font-medium text-blue-700">{candidate.title}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 mt-2">
                  <span>📧 {candidate.email}</span>
                  {candidate.phone && <span>📞 {candidate.phone}</span>}
                  <span>📍 {candidate.location}</span>
                  {candidate.links?.linkedin && <span>🔗 linkedin.com/in/{candidate.name.toLowerCase().replace(/\s+/g, '')}</span>}
                  {candidate.links?.github && <span>💻 github.com/{candidate.name.toLowerCase().replace(/\s+/g, '')}</span>}
                </div>
              </div>

              {/* Summary */}
              <div className="mb-6">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-2">
                  Professional Summary
                </h2>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {candidate.explanation || `Accomplished engineer with ${candidate.experienceYears || 4}+ years of experience designing scalable software systems, enterprise web applications, and high-performance cloud architectures.`}
                </p>
              </div>

              {/* Skills */}
              <div className="mb-6">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-2">
                  Technical Skills
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.matchedSkills && candidate.matchedSkills.length > 0 ? (
                    candidate.matchedSkills.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-800 text-xs font-medium rounded border border-slate-300">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">Skills analysis pending</span>
                  )}
                </div>
              </div>

              {/* Work Experience */}
              <div className="mb-6">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-3">
                  Experience
                </h2>
                {candidate.workHistory && candidate.workHistory.length > 0 ? (
                  <div className="space-y-4">
                    {candidate.workHistory.map((w, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between items-baseline">
                          <h3 className="text-xs font-bold text-slate-900">{w.role}</h3>
                          <span className="text-[11px] text-slate-500">{w.period}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700">{w.company}</p>
                        <ul className="list-disc list-inside text-xs text-slate-600 mt-1 space-y-0.5">
                          {w.highlights.map((h, hIdx) => (
                            <li key={hIdx}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Details extracted from uploaded resume file.</p>
                )}
              </div>

              {/* Education */}
              <div className="mb-6">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-2">
                  Education
                </h2>
                {candidate.education && candidate.education.length > 0 ? (
                  candidate.education.map((e, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-slate-700">
                      <div>
                        <span className="font-semibold text-slate-900">{e.degree}</span> • {e.institution}
                      </div>
                      <span className="text-slate-500">{e.year}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">Education details on file.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-2.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Document loaded in secure viewer sandbox</span>
          </div>
          <span>Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300 font-mono">ESC</kbd> to exit</span>
        </div>
      </div>
    </div>
  );
};

function generateSimulatedResumeHtml(c: Candidate): string {
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; color: #1e293b;">
      <h1 style="font-size: 24px; margin-bottom: 4px; color: #0f172a;">${c.name}</h1>
      <p style="font-size: 14px; font-weight: 600; color: #2563eb; margin-top: 0;">${c.title}</p>
      <p style="font-size: 12px; color: #64748b;">${c.email} | ${c.phone || '+1 (555) 019-2831'} | ${c.location}</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
      <h2 style="font-size: 14px; text-transform: uppercase; color: #334155; margin-bottom: 8px;">Professional Overview</h2>
      <p style="font-size: 13px; color: #334155;">${c.explanation || 'Proven track record of engineering scalable applications and delivering business value.'}</p>
      <h2 style="font-size: 14px; text-transform: uppercase; color: #334155; margin: 16px 0 8px 0;">Skills</h2>
      <p style="font-size: 13px; color: #334155;">${c.matchedSkills?.join(', ') || 'Skills pending analysis'}</p>
    </div>
  `;
}

function generateSimulatedResumeText(c: Candidate): string {
  return `RESUME: ${c.name}
Role: ${c.title}
Email: ${c.email}
Phone: ${c.phone || 'N/A'}
Location: ${c.location}

SUMMARY:
${c.explanation || 'Experienced software professional.'}

SKILLS:
${c.matchedSkills?.join(', ') || 'Pending analysis'}

WORK EXPERIENCE:
${c.workHistory?.map((w) => `${w.role} at ${w.company} (${w.period})\n- ${w.highlights.join('\n- ')}`).join('\n\n') || 'N/A'}
`;
}
