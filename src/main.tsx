import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import {
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  ArrowRight,
  Bell,
  Check,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Upload,
  X,
  Users,
  AlertTriangle,
  FileCheck2,
  Cpu,
  Layers,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Columns2
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { demoAnalysis, candidates as initialCandidates, jobSkills } from './data';
import { firebaseAuth, firebaseEnabled } from './auth/firebase';
import { SkillCoverageTable } from './components/SkillCoverageTable';
import { SkillCandidatesDrawer } from './components/SkillCandidatesDrawer';
import { CandidateDetailView } from './components/CandidateDetailView';
import { CandidateComparisonModal } from './components/CandidateComparisonModal';
import { HiringSimulator } from './components/HiringSimulator';
import { RecruiterChatbot } from './components/RecruiterChatbot';
import type { Candidate, JobSkill, HiringWeights } from './types';
import './styles.css';

// ---------------------------------------------------------------------------
// AUTHENTICATION CONTEXT
// ---------------------------------------------------------------------------
interface User {
  name: string;
  email: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  signIn: () => Promise<void>;
  signInDemo: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  signIn: async () => {},
  signInDemo: () => {},
  signOut: async () => {},
});

const useAuth = () => useContext(AuthContext);

// ---------------------------------------------------------------------------
// APPLICATION SHELL & BRAND LOGO
// ---------------------------------------------------------------------------
function NexoraLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`nexora-logo ${className}`}>
      <div className="logo-badge">
        <Sparkles size={16} />
      </div>
      <div className="logo-text">
        <span className="brand-name">NEXORA</span>
      </div>
    </div>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navItems: [string, React.ComponentType<{ size?: number }>, string][] = [
    ['/dashboard', LayoutDashboard, 'Dashboard'],
    ['/analysis/new', Plus, 'New Analysis'],
    ['/candidates', Users, 'Candidates'],
    ['/settings', Settings, 'Settings'],
  ];

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <aside className={`app-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <NexoraLogo />
        </div>

        <nav className="sidebar-nav">
          {navItems.map(([to, Icon, label]) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-widget">
            <div className="avatar avatar-sm">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AR'}
            </div>
            <div className="user-meta">
              <span className="user-name">{user?.name || 'Alex Recruiter'}</span>
              <small className="user-email">{user?.email || 'alex@nexora.app'}</small>
            </div>
            <button
              type="button"
              className="signout-btn"
              onClick={signOut}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="app-main-viewport">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu-trigger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            <Menu size={20} />
          </button>

          <div className="topbar-context">
            <span className="topbar-crumb">Workspace / Candidate Intelligence</span>
            <h2 className="topbar-title">{demoAnalysis.jobTitle}</h2>
          </div>

          <div className="topbar-actions">
            <div
              className="topbar-search-bar"
              onClick={() => navigate('/candidates')}
              title="Search candidate pool"
            >
              <Search size={15} />
              <span>Search candidate pool or skills...</span>
            </div>

            <button
              type="button"
              className="icon-button"
              title="Notifications"
              aria-label="Notifications"
              onClick={() =>
                toast.info(`All ${demoAnalysis.candidateCount} candidates processed successfully.`)
              }
            >
              <Bell size={18} />
            </button>

            <div className="avatar avatar-sm">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AR'}
            </div>
          </div>
        </header>

        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LOGIN PAGE
// ---------------------------------------------------------------------------
function LoginPage() {
  const { signIn, signInDemo } = useAuth();

  return (
    <div className="login-screen">
      <div className="login-container">
        {!firebaseEnabled && (
          <div className="env-setup-note">
            <b>Google OAuth not configured in this environment.</b> Copy .env.example to .env.local
            and add your Firebase keys to enable real Google Sign-In. For now you can explore with
            the demo workspace below.
          </div>
        )}
        <div className="login-brand-header">
          <NexoraLogo />
          <p className="login-tagline">Candidate intelligence for better hiring.</p>
        </div>

        <div className="login-card">
          <div className="login-card-header">
            <h2>Recruiter Sign In</h2>
            <p>Access your recruitment workspace to analyze candidates and skill coverage.</p>
          </div>

          <div className="login-actions">
            <button type="button" className="btn-google" onClick={signIn}>
              <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
              <ArrowRight size={16} />
            </button>

            <div className="login-divider">
              <span>or</span>
            </div>

            <button type="button" className="btn-demo-signin" onClick={signInDemo}>
              <Sparkles size={16} />
              <span>Enter with Demo Recruiter Workspace</span>
            </button>
          </div>

          <div className="login-card-footer">
            <small>
              By continuing, you agree to Nexora’s Terms of Service and Privacy Policy.
            </small>
          </div>
        </div>

        <footer className="login-footer">
          <span>© 2026 NEXORA · Candidate intelligence for better hiring</span>
        </footer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DASHBOARD (WITH INTEGRATED HIRING ANALYTICS)
// ---------------------------------------------------------------------------
function DashboardPage() {
  const navigate = useNavigate();

  const pool = demoAnalysis.candidates;
  const jdSkills = demoAnalysis.requiredSkills;

  // Score distribution histogram (computed from actual pool)
  const scoreBuckets = [
    { range: '90–100', min: 90, max: 100.01, fill: '#2563eb' },
    { range: '80–89', min: 80, max: 90, fill: '#3b82f6' },
    { range: '70–79', min: 70, max: 80, fill: '#60a5fa' },
    { range: '60–69', min: 60, max: 70, fill: '#f59e0b' },
    { range: '<60', min: 0, max: 60, fill: '#94a3b8' },
  ];
  const scoreDistribution = scoreBuckets.map((b) => ({
    range: b.range,
    fill: b.fill,
    count: pool.filter((c) => c.finalScore >= b.min && c.finalScore < b.max).length,
  }));

  // Skill coverage chart (computed from actual pool)
  const skillCoverageData = jdSkills.map((s) => ({
    skill: s.name,
    matching: s.matchingCount,
    missing: s.missingCount,
  }));

  // Match quality donut chart (computed from actual pool)
  const matchQualityData = [
    { name: 'Strong Match (≥80%)', value: pool.filter((c) => c.finalScore >= 80).length, color: '#16a34a' },
    { name: 'Good Match (70–79%)', value: pool.filter((c) => c.finalScore >= 70 && c.finalScore < 80).length, color: '#2563eb' },
    { name: 'Needs Review (60–69%)', value: pool.filter((c) => c.finalScore >= 60 && c.finalScore < 70).length, color: '#f59e0b' },
    { name: 'Low Match (<60%)', value: pool.filter((c) => c.finalScore < 60).length, color: '#94a3b8' },
  ];

  // CGPA distribution (computed from actual pool)
  const cgpaBuckets = [
    { range: '9–10', min: 9, max: 11, fill: '#4F46E5' },
    { range: '8–9', min: 8, max: 9, fill: '#6366F1' },
    { range: '7–8', min: 7, max: 8, fill: '#60a5fa' },
    { range: '6–7', min: 6, max: 7, fill: '#f59e0b' },
  ];
  const cgpaDistribution = cgpaBuckets.map((b) => ({
    range: b.range,
    fill: b.fill,
    count: pool.filter((c) => c.cgpa >= b.min && c.cgpa < b.max).length,
  }));

  // Relevant-experience profile (computed from actual pool)
  const expBuckets = [
    { range: '0–1 yr', min: 0, max: 1, fill: '#94a3b8' },
    { range: '1–2 yrs', min: 1, max: 2, fill: '#60a5fa' },
    { range: '2–3 yrs', min: 2, max: 3, fill: '#3b82f6' },
    { range: '3+ yrs', min: 3, max: 99, fill: '#10B981' },
  ];
  const expDistribution = expBuckets.map((b) => ({
    range: b.range,
    fill: b.fill,
    count: pool.filter((c) => c.relevantExperienceYears >= b.min && c.relevantExperienceYears < b.max).length,
  }));

  // Headline stats (computed from actual pool)
  const strongMatches = pool.filter((c) => c.finalScore >= 80).length;
  const needsReview = pool.filter((c) => c.verificationAlerts.length > 0 || c.finalScore < 70).length;
  const requiredSkills = jdSkills.filter((s) => s.priority === 'required');
  const topCandidate = [...pool].sort((a, b) => b.finalScore - a.finalScore)[0];

  return (
    <div className="dashboard-view">
      {/* Welcome Banner */}
      <div className="dashboard-welcome-banner">
        <div>
          <span className="eyebrow">NEXORA DASHBOARD</span>
          <h1>Recruiter Intelligence Overview</h1>
          <p>
            Candidate intelligence for better hiring. Active analysis for <b>{demoAnalysis.jobTitle}</b>.
          </p>
        </div>
        <div className="welcome-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/candidates')}
          >
            <Users size={16} /> View All Candidates
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/analysis/new')}
          >
            <Plus size={16} /> New Analysis
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="stat-cards-grid">
        <div className="stat-card">
          <div className="stat-card-head">
            <span className="stat-label">Candidates Analyzed</span>
            <Users size={16} className="stat-icon" />
          </div>
          <div className="stat-number">{pool.length}</div>
          <small className="stat-sub">100% parsed & scored from active pool</small>
        </div>

        <div className="stat-card">
          <div className="stat-card-head">
            <span className="stat-label">Strong Matches</span>
            <CheckCircle2 size={16} className="stat-icon text-success" />
          </div>
          <div className="stat-number">{strongMatches}</div>
          <small className="stat-sub">Match scores ≥ 80% with dual validation</small>
        </div>

        <div className="stat-card">
          <div className="stat-card-head">
            <span className="stat-label">Need Review</span>
            <AlertTriangle size={16} className="stat-icon text-warning" />
          </div>
          <div className="stat-number">{needsReview}</div>
          <small className="stat-sub">Timeline checks or partial skill coverage</small>
        </div>

        <div className="stat-card">
          <div className="stat-card-head">
            <span className="stat-label">Required Skills</span>
            <FileCheck2 size={16} className="stat-icon text-primary" />
          </div>
          <div className="stat-number">{requiredSkills.length}</div>
          <small className="stat-sub">{requiredSkills.map((s) => s.name).join(', ')}</small>
        </div>
      </div>

      {/* Recent Analysis Card */}
      <div className="recent-analysis-card">
        <div className="recent-file-icon">
          <FileText size={22} />
        </div>
        <div className="recent-info">
          <div className="recent-title-wrap">
            <h4>Senior Full Stack Engineer</h4>
            <span className="status-badge-inline status-strong">
              <CheckCircle2 size={12} /> Analysis Completed
            </span>
          </div>
          <p>
            {demoAnalysis.jobDescriptionFileName} · {demoAnalysis.candidateCount} candidate resumes ·
            Evaluated Sep 12, 2026
          </p>
        </div>
        <div className="recent-score-preview">
          <small>Top Candidate Match</small>
          <b>{topCandidate ? `${topCandidate.finalScore.toFixed(1)}%` : '—'}</b>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('/analysis/analysis_123/results')}
        >
          View Analysis Results <ChevronRight size={16} />
        </button>
      </div>

      {/* Analytics Visualization Section */}
      <div className="dashboard-charts-grid">
        {/* Chart 1: Candidate Score Distribution */}
        <div className="chart-panel">
          <div className="chart-head">
            <h3>Candidate Score Distribution</h3>
            <p>Histogram of candidate match scores across the talent pool.</p>
          </div>
          <div className="chart-body" style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="range" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(value) => [`${value} Candidates`, 'Count']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {scoreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Skill Coverage */}
        <div className="chart-panel">
          <div className="chart-head">
            <h3>Skill Coverage Overview</h3>
            <p>Candidate evidence counts across extracted role skills.</p>
          </div>
          <div className="chart-body" style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={skillCoverageData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} domain={[0, pool.length]} />
                <YAxis dataKey="skill" type="category" stroke="#475569" fontSize={12} tickLine={false} width={80} />
                <Tooltip
                  formatter={(val, name) => [
                    `${val} Candidates`,
                    name === 'matching' ? 'Matching' : 'Missing',
                  ]}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="matching" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Match Quality */}
        <div className="chart-panel">
          <div className="chart-head">
            <h3>Match Quality Breakdown</h3>
            <p>Proportion of candidate tiers in active pool.</p>
          </div>
          <div className="chart-body donut-chart-wrap" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={matchQualityData}
                  dataKey="value"
                  innerRadius={48}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {matchQualityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [`${val} Candidates`, 'Count']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-legend">
              {matchQualityData.map((item) => (
                <div key={item.name} className="legend-item">
                  <span className="legend-color-dot" style={{ backgroundColor: item.color }} />
                  <span className="legend-label">{item.name}</span>
                  <b>{item.value}</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 4: Skill Gaps Shortage */}
        <div className="chart-panel">
          <div className="chart-head">
            <h3>Candidate Skill Shortages</h3>
            <p>Required and preferred skills with the largest candidate gaps.</p>
          </div>
          <div className="skill-gaps-list">
            {jdSkills
              .map((s) => {
                const coverage = pool.length > 0 ? (s.matchingCount / pool.length) * 100 : 0;
                return { ...s, coverage };
              })
              .sort((a, b) => a.coverage - b.coverage)
              .slice(0, 5)
              .map((s) => (
                <div key={s.name} className="skill-gap-item">
                  <div className="gap-info">
                    <b>
                      {s.name} ({s.category.charAt(0).toUpperCase() + s.category.slice(1)})
                    </b>
                    <span className={`gap-tag ${s.priority}`}>{s.priority === 'required' ? 'Required' : 'Preferred'}</span>
                  </div>
                  <div className="gap-bar-wrap">
                    <div className="gap-bar-fill" style={{ width: `${s.coverage}%` }} />
                  </div>
                  <span className="gap-count">
                    {s.missingCount} missing ({Math.round(s.coverage)}% coverage)
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Chart 5: CGPA Distribution */}
        <div className="chart-panel">
          <div className="chart-head">
            <h3>CGPA Distribution</h3>
            <p>Academic spread of the evaluated pool (CGPA never dominates the Match Score).</p>
          </div>
          <div className="chart-body" style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cgpaDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="range" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(value) => [`${value} Candidates`, 'Count']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {cgpaDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 6: Relevant Experience Profile */}
        <div className="chart-panel">
          <div className="chart-head">
            <h3>Relevant Experience Profile</h3>
            <p>JD-relevant experience (not raw tenure) across the pool.</p>
          </div>
          <div className="chart-body" style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="range" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(value) => [`${value} Candidates`, 'Count']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {expDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Candidates Quick Preview */}
      <div className="section-header-row">
        <div>
          <h2>Top Ranked Candidates</h2>
          <p>Highest-scoring candidates evaluating semantic and keyword signals.</p>
        </div>
        <button
          type="button"
          className="btn btn-text"
          onClick={() => navigate('/analysis/analysis_123/results')}
        >
          Inspect Full Ranking <ChevronRight size={15} />
        </button>
      </div>

      <div className="top-candidates-preview-grid">
        {pool.slice(0, 3).map((c) => (
          <div
            key={c.id}
            className="top-candidate-card"
            onClick={() => navigate(`/candidate/${c.id}`)}
          >
            <div className="top-card-header">
              <span className="top-rank-badge">#{c.rank}</span>
              <div className="top-score-badge">
                <b>{c.finalScore.toFixed(1)}%</b>
                <small>Match</small>
              </div>
            </div>
            <h3 className="top-candidate-name">{c.name}</h3>
            <p className="top-candidate-role">{c.title}</p>
            <div className="top-card-skills">
              {c.matchedSkills.slice(0, 3).map((s) => (
                <span key={s} className="skill-tag">
                  {s}
                </span>
              ))}
            </div>
            <div className="top-card-footer">
              <span className="top-exp">{c.experienceYears} Years Exp</span>
              <span className="view-link">
                View Dossier <ChevronRight size={13} />
              </span>
            </div>
          </div>
        ))}
      </div>

      <RecruiterChatbot candidates={initialCandidates} jobTitle={demoAnalysis.jobTitle} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// NEW ANALYSIS PAGE (BALANCED 2-COLUMN UPLOAD)
// ---------------------------------------------------------------------------
function NewAnalysisPage() {
  const navigate = useNavigate();
  const [jdFiles, setJdFiles] = useState<File[]>([]);
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);

  // React Dropzone for Job Description
  const {
    getRootProps: getJdProps,
    getInputProps: getJdInputProps,
    isDragActive: isJdDrag,
  } = useDropzone({
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    onDrop: (accepted) => {
      if (accepted.length > 0) {
        setJdFiles([accepted[0]]);
        toast.success(`Job Description "${accepted[0].name}" loaded`);
      }
    },
  });

  // React Dropzone for Resumes
  const {
    getRootProps: getResumeProps,
    getInputProps: getResumeInputProps,
    isDragActive: isResumeDrag,
  } = useDropzone({
    multiple: true,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    onDrop: (accepted) => {
      setResumeFiles((prev) => {
        const combined = [...prev, ...accepted];
        return combined.slice(0, 25);
      });
      toast.success(`Added ${accepted.length} candidate resumes`);
    },
  });

  // Quick Loader for Demo Package (18 resumes expected)
  const handleLoadDemoPackage = () => {
    // Generate 18 synthetic mock file objects
    const mockJd = new File(['Role: Senior Full Stack Engineer...'], 'Full_Stack_Developer_JD.pdf', {
      type: 'application/pdf',
    });
    const mockResumes = initialCandidates.map((c) => {
      return new File([`Resume for ${c.name}`], `${c.name.replace(/\s+/g, '_')}_Resume.pdf`, {
        type: 'application/pdf',
      });
    });

    setJdFiles([mockJd]);
    setResumeFiles(mockResumes);
    toast.success('Loaded Job Description + 18 candidate resumes');
  };

  const handleRemoveResume = (index: number) => {
    setResumeFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartAnalysis = () => {
    if (jdFiles.length === 0 || resumeFiles.length === 0) {
      toast.error('Please upload both a Job Description and candidate resumes.');
      return;
    }
    navigate('/analysis/analysis_123/loading');
  };

  return (
    <div className="new-analysis-view">
      <div className="new-analysis-header">
        <div>
          <span className="eyebrow">NEW ANALYSIS PIPELINE</span>
          <h1>Upload Documents for Intelligence Analysis</h1>
          <p>
            Upload one Job Description and candidate resumes. Nexora will parse requirements, extract skills, and run dual semantic/keyword evaluations.
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleLoadDemoPackage}
            title="Populate with the 18 demo candidate resumes"
          >
            <Sparkles size={15} /> Load 18 Demo Resumes Package
          </button>
        </div>
      </div>

      {/* Balanced 2-Column Upload Layout */}
      <div className="upload-two-column-grid">
        {/* Column 1: Job Description */}
        <div className="upload-column-card">
          <div className="column-head">
            <div className="column-step-badge">01</div>
            <div>
              <h3>Job Description</h3>
              <p>Upload the target role requirements (PDF, DOCX, TXT).</p>
            </div>
          </div>

          <div
            {...getJdProps()}
            className={`dropzone-box ${isJdDrag ? 'drag-active' : ''} ${jdFiles.length > 0 ? 'has-file' : ''}`}
          >
            <input {...getJdInputProps()} />
            <div className="dropzone-icon">
              <Upload size={24} />
            </div>
            <b>{jdFiles.length > 0 ? 'Replace Job Description' : 'Drop Job Description here'}</b>
            <p>or click to browse files</p>
            <small>Supports PDF, DOCX, TXT (up to 10MB)</small>
          </div>

          {jdFiles.length > 0 && (
            <div className="file-preview-card">
              <div className="file-icon">
                <FileText size={20} />
              </div>
              <div className="file-details">
                <b>{jdFiles[0].name}</b>
                <small>{(jdFiles[0].size / 1024).toFixed(1)} KB · Ready for parsing</small>
              </div>
              <span className="status-badge-inline status-strong">
                <Check size={13} /> Loaded
              </span>
              <button
                type="button"
                className="remove-file-btn"
                onClick={() => setJdFiles([])}
                aria-label="Remove JD"
              >
                <X size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Column 2: Candidate Resumes */}
        <div className="upload-column-card">
          <div className="column-head">
            <div className="column-step-badge">02</div>
            <div>
              <h3>Candidate Resumes</h3>
              <p>Upload applicant profiles for batch evaluation.</p>
            </div>
            <div className="resume-counter-badge">
              <b>{resumeFiles.length}</b> resumes loaded
            </div>
          </div>

          <div
            {...getResumeProps()}
            className={`dropzone-box ${isResumeDrag ? 'drag-active' : ''}`}
          >
            <input {...getResumeInputProps()} />
            <div className="dropzone-icon">
              <Users size={24} />
            </div>
            <b>Drop candidate resumes here</b>
            <p>or click to select multiple files</p>
            <span className="expected-notice">
              <Sparkles size={12} /> 15–18 resumes expected for optimal ranking
            </span>
          </div>

          {/* Uploaded File List */}
          {resumeFiles.length > 0 && (
            <div className="uploaded-resumes-list">
              <div className="list-meta-bar">
                <span>Uploaded Resumes ({resumeFiles.length})</span>
                <button
                  type="button"
                  className="btn-clear-all"
                  onClick={() => setResumeFiles([])}
                >
                  Clear all
                </button>
              </div>
              <div className="files-scroll-box">
                {resumeFiles.map((file, idx) => (
                  <div key={`${file.name}-${idx}`} className="resume-file-row">
                    <FileText size={16} className="file-row-icon" />
                    <div className="file-row-info">
                      <b>{file.name}</b>
                      <small>{(file.size / 1024).toFixed(1)} KB</small>
                    </div>
                    <span className="ready-indicator">Ready</span>
                    <button
                      type="button"
                      className="remove-file-btn"
                      onClick={() => handleRemoveResume(idx)}
                      aria-label={`Remove ${file.name}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Launch Bar */}
      <div className="analysis-launch-bar">
        <div className="launch-summary">
          <span className="summary-title">PIPELINE READINESS</span>
          <p>
            {jdFiles.length > 0 ? (
              <span className="ready-text">✓ Job Description: {jdFiles[0].name}</span>
            ) : (
              <span className="pending-text">○ Job Description pending upload</span>
            )}
            <br />
            {resumeFiles.length > 0 ? (
              <span className="ready-text">
                ✓ {resumeFiles.length} candidate resumes staged (15–18 expected)
              </span>
            ) : (
              <span className="pending-text">○ Candidate resumes pending upload</span>
            )}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={jdFiles.length === 0 || resumeFiles.length === 0}
          onClick={handleStartAnalysis}
        >
          <span>Analyze Candidates</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ANALYSIS LOADING STATE (MULTI-STAGE PIPELINE)
// ---------------------------------------------------------------------------
function LoadingPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const pipelineStages = [
    { title: 'Uploading documents', desc: 'Securely staging JD and candidate resumes' },
    { title: 'Reading Job Description', desc: 'Extracting seniority, role scope, and objectives' },
    { title: 'Extracting required skills', desc: 'Categorizing required vs preferred capabilities' },
    { title: 'Analyzing candidate resumes', desc: 'Parsing employment history, education, and projects' },
    { title: 'Calculating semantic matches', desc: 'Evaluating contextual architecture alignment' },
    { title: 'Calculating keyword matches', desc: 'Checking direct technical terms & evidence depth' },
    { title: 'Generating candidate rankings', desc: 'Synthesizing dual scores and verification checks' },
    { title: 'Preparing skill coverage', desc: 'Compiling coverage ratios and gap analysis' },
  ];

  useEffect(() => {
    if (currentStep >= pipelineStages.length) {
      const timer = setTimeout(() => {
        navigate('/analysis/analysis_123/results');
      }, 700);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, 480);
    return () => clearTimeout(timer);
  }, [currentStep, navigate, pipelineStages.length]);

  return (
    <div className="loading-pipeline-view">
      <div className="pipeline-card">
        <div className="pipeline-spinner-head">
          <div className="pipeline-icon-wrap">
            <Cpu size={32} />
          </div>
          <span className="eyebrow">INTELLIGENCE PIPELINE IN PROGRESS</span>
          <h2>Analyzing Candidates & Skill Coverage</h2>
          <p>
            NEXORA is executing a multi-tier evaluation pipeline across your candidate pool.
          </p>
        </div>

        <div className="pipeline-stages-list">
          {pipelineStages.map((stage, idx) => {
            const isDone = idx < currentStep;
            const isActive = idx === currentStep;

            return (
              <div
                key={stage.title}
                className={`pipeline-stage-item ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}
              >
                <div className="stage-indicator">
                  {isDone ? <Check size={14} /> : <span>0{idx + 1}</span>}
                </div>
                <div className="stage-content">
                  <b>{stage.title}</b>
                  <small>{stage.desc}</small>
                </div>
                <span className="stage-badge">
                  {isDone ? 'Completed' : isActive ? 'Processing...' : 'Queued'}
                </span>
              </div>
            );
          })}
        </div>

        <div className="pipeline-footer-note">
          <small>
            Processing results conform strictly to extracted Job Description skills and candidate evidence.
          </small>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ANALYSIS RESULTS PAGE (SKILL-FIRST WITH PROMINENT COVERAGE TABLE)
// ---------------------------------------------------------------------------
function AnalysisResultsPage() {
  const navigate = useNavigate();
  const [candidates] = useState<Candidate[]>(initialCandidates);
  const [skills] = useState<JobSkill[]>(jobSkills);

  // Pool statistics derived from actual analysis data
  const topCandidate = [...candidates].sort((a, b) => b.finalScore - a.finalScore)[0];
  const avgScore =
    candidates.length > 0
      ? candidates.reduce((sum, c) => sum + c.finalScore, 0) / candidates.length
      : 0;
  const strongMatchCount = candidates.filter((c) => c.finalScore >= 80).length;
  const requiredSkillCount = skills.filter((s) => s.priority === 'required').length;

  // Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSkill, setDrawerSkill] = useState('Angular');
  const [drawerMode, setDrawerMode] = useState<'matching' | 'missing'>('matching');

  // Simulator & Comparison modal states
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareA, setCompareA] = useState<Candidate>(initialCandidates[0]);
  const [compareB, setCompareB] = useState<Candidate>(initialCandidates[1]);

  const handleViewMatching = (skillName: string) => {
    setDrawerSkill(skillName);
    setDrawerMode('matching');
    setDrawerOpen(true);
  };

  const handleViewMissing = (skillName: string) => {
    setDrawerSkill(skillName);
    setDrawerMode('missing');
    setDrawerOpen(true);
  };

  const handleQuickCompare = (candA: Candidate, candB: Candidate) => {
    setCompareA(candA);
    setCompareB(candB);
    setCompareModalOpen(true);
  };

  return (
    <div className="analysis-results-view">
      {/* Header */}
      <div className="results-header-banner">
        <div>
          <span className="eyebrow">RECRUITMENT INTELLIGENCE DOSSIER</span>
          <h1>{demoAnalysis.jobTitle}</h1>
          <p>
            {demoAnalysis.jobDescriptionFileName} · <b>{candidates.length}</b> Candidates Evaluated ·
            Completed Sep 12, 2026
          </p>
        </div>
        <div className="results-head-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSimulatorOpen(true)}
          >
            <SlidersHorizontal size={16} /> Hiring Simulator
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/analysis/new')}
          >
            <Plus size={16} /> New Analysis
          </button>
        </div>
      </div>

      {/* Overview Statistics */}
      <div className="results-stats-row">
        <div className="stat-card">
          <span className="stat-label">Candidate Pool</span>
          <div className="stat-number">{candidates.length}</div>
          <small className="stat-sub">Parsed & evaluated</small>
        </div>
        <div className="stat-card">
          <span className="stat-label">Top Match Score</span>
          <div className="stat-number text-primary">{topCandidate.finalScore.toFixed(1)}%</div>
          <small className="stat-sub">
            {topCandidate.name} (#{topCandidate.rank})
          </small>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pool Average Match</span>
          <div className="stat-number">{avgScore.toFixed(1)}%</div>
          <small className="stat-sub">Across {requiredSkillCount} required skills</small>
        </div>
        <div className="stat-card">
          <span className="stat-label">Strong Matches</span>
          <div className="stat-number text-success">{strongMatchCount}</div>
          <small className="stat-sub">Scores ≥ 80% with dual fit</small>
        </div>
      </div>

      {/* =====================================================================
          MOST IMPORTANT SECTION: SKILL COVERAGE TABLE
          ===================================================================== */}
      <section className="results-section skill-first-section">
        <SkillCoverageTable
          skills={skills}
          onViewMatching={handleViewMatching}
          onViewMissing={handleViewMissing}
          onViewEvidence={handleViewMatching}
        />
      </section>

      {/* Top 3 Candidates Highlight with Why Rationale */}
      <section className="results-section">
        <div className="section-head-bar">
          <div>
            <h2>Top Recommended Candidates</h2>
            <p>High-signal candidates with verified evidence and dual matching validation.</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleQuickCompare(candidates[0], candidates[1])}
          >
            <Columns2 size={14} /> Compare Top 2
          </button>
        </div>

        <div className="top-candidates-why-grid">
          {candidates.slice(0, 3).map((c) => (
            <article key={c.id} className="top-why-card">
              <div className="why-card-top">
                <div className="avatar avatar-md">
                  {c.name
                    .split(' ')
                    .map((x) => x[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <div className="why-name-row">
                    <b>{c.name}</b>
                    <span className="rank-tag">#{c.rank}</span>
                  </div>
                  <small>{c.title}</small>
                </div>
                <div className="why-score-pill">
                  <b>{c.finalScore.toFixed(1)}%</b>
                </div>
              </div>

              <div className="why-dual-scores">
                <span className="dual-chip">Semantic: <b>{c.semanticScore}%</b></span>
                <span className="dual-chip">Keywords: <b>{c.keywordScore}%</b></span>
                <span className="dual-chip">Exp: <b>{c.experienceYears} yrs</b></span>
              </div>

              <p className="why-explanation">{c.explanation}</p>

              <div className="why-skills-breakdown">
                <div className="matched-line">
                  <small>Matched:</small>
                  <span>{c.matchedSkills.slice(0, 4).join(' · ')}</span>
                </div>
                {c.missingSkills.length > 0 && (
                  <div className="missing-line">
                    <small>Gaps:</small>
                    <span>{c.missingSkills.join(' · ')}</span>
                  </div>
                )}
              </div>

              {c.verificationAlerts.length > 0 && (
                <div className="why-alert-badge">
                  <ShieldAlert size={12} />
                  <span>Review Recommended: Timeline overlap</span>
                </div>
              )}

              <div className="why-card-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm full-width"
                  onClick={() => navigate(`/candidate/${c.id}`)}
                >
                  View Candidate Dossier <ArrowRight size={13} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* All Candidates Ranked Table */}
      <section className="results-section">
        <div className="section-head-bar">
          <div>
            <h2>Complete Candidate Pool Rankings</h2>
            <p>Dual semantic and keyword evaluations across all {candidates.length} applicant resumes.</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/candidates')}
          >
            <Users size={15} /> Search & Filter Pool
          </button>
        </div>

        <div className="rankings-table-wrap">
          <table className="rankings-table">
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Candidate</th>
                <th scope="col">Key Evidenced Skills</th>
                <th scope="col" className="text-center">Semantic</th>
                <th scope="col" className="text-center">Keywords</th>
                <th scope="col" className="text-center">Verification</th>
                <th scope="col" className="text-right">Match Score</th>
                <th scope="col" className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id} className="candidate-table-row">
                  <td className="rank-cell">
                    <span className="rank-pill">#{c.rank}</span>
                  </td>
                  <td>
                    <div className="candidate-cell-info">
                      <b>{c.name}</b>
                      <small>{c.title} · {c.location}</small>
                    </div>
                  </td>
                  <td>
                    <div className="skills-inline-wrap">
                      {c.matchedSkills.slice(0, 3).map((s) => (
                        <span key={s} className="skill-tag">
                          {s}
                        </span>
                      ))}
                      {c.matchedSkills.length > 3 && (
                        <small className="more-skills">+{c.matchedSkills.length - 3}</small>
                      )}
                    </div>
                  </td>
                  <td className="text-center">
                    <span className="score-subtle">{c.semanticScore}%</span>
                  </td>
                  <td className="text-center">
                    <span className="score-subtle">{c.keywordScore}%</span>
                  </td>
                  <td className="text-center">
                    {c.verificationAlerts.length > 0 ? (
                      <span className="status-badge-inline status-review" title="Timeline verification recommended">
                        <ShieldAlert size={12} /> Review
                      </span>
                    ) : (
                      <span className="status-badge-inline status-strong" title="Verified - No flaws detected">
                        <ShieldCheck size={12} /> Verified
                      </span>
                    )}
                  </td>
                  <td className="text-right">
                    <b className="final-score-text">{c.finalScore.toFixed(1)}%</b>
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/candidate/${c.id}`)}
                    >
                      <Eye size={13} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Slide-over Drawer for Matching/Missing Candidates */}
      <SkillCandidatesDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        skillName={drawerSkill}
        mode={drawerMode}
        candidates={candidates}
      />

      {/* Hiring Simulator Drawer */}
      <HiringSimulator
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        baseCandidates={candidates}
      />

      {/* Comparison Modal */}
      <CandidateComparisonModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        candidateA={compareA}
        candidateB={compareB}
      />

      {/* Recruiter Intelligence Chatbot */}
      <RecruiterChatbot candidates={candidates} jobTitle={demoAnalysis.jobTitle} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// CANDIDATES POOL VIEW (WITH SEARCH, FILTERS & COMPARISON)
// ---------------------------------------------------------------------------
function CandidatesPage() {
  const navigate = useNavigate();
  const [candidates] = useState<Candidate[]>(initialCandidates);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'strong' | 'good' | 'review'>('all');
  const [skillFilter, setSkillFilter] = useState('all');
  const [verifFilter, setVerifFilter] = useState('all');
  const [cgpaMin, setCgpaMin] = useState(0);
  const [internshipsMin, setInternshipsMin] = useState(0);
  const [expMin, setExpMin] = useState(0);
  const [projectsMin, setProjectsMin] = useState(0);
  const [coverageMin, setCoverageMin] = useState(0);
  const [sortBy, setSortBy] = useState<
    'rank' | 'score' | 'semantic' | 'keyword' | 'exp' | 'cgpa' | 'relevantProjects' | 'coverage'
  >('rank');
  // Multi-select for side-by-side comparison
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) {
        toast.info('Comparing 2 candidates. Selection updated.');
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const filteredCandidates = useMemo(() => {
    return candidates
      .filter((c) => {
        // Search query
        const matchesQuery =
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.matchedSkills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
        if (!matchesQuery) return false;

        // Tier filter
        if (tierFilter === 'strong' && c.finalScore < 80) return false;
        if (tierFilter === 'good' && (c.finalScore < 70 || c.finalScore >= 80)) return false;
        if (tierFilter === 'review' && c.finalScore >= 70) return false;

        // Skill filter
        if (skillFilter !== 'all' && !c.matchedSkills.includes(skillFilter)) return false;

        // Verification filter
        if (verifFilter === 'verified' && c.verificationAlerts.length > 0) return false;
        if (verifFilter === 'review' && c.verificationAlerts.length === 0) return false;

        // Numeric threshold filters (recruiter-grade narrowing)
        if (cgpaMin > 0 && c.cgpa < cgpaMin) return false;
        if (internshipsMin > 0 && c.totalInternships < internshipsMin) return false;
        if (expMin > 0 && c.relevantExperienceYears < expMin) return false;
        if (projectsMin > 0 && c.relevantProjectsCount < projectsMin) return false;
        const coverage = c.requiredSkillsTotal > 0 ? c.requiredSkillsMatched / c.requiredSkillsTotal : 0;
        if (coverageMin > 0 && coverage < coverageMin / 100) return false;

        return true;
      })
      .sort((a, b) => {
        const coverageA = a.requiredSkillsTotal > 0 ? a.requiredSkillsMatched / a.requiredSkillsTotal : 0;
        const coverageB = b.requiredSkillsTotal > 0 ? b.requiredSkillsMatched / b.requiredSkillsTotal : 0;
        if (sortBy === 'score') return b.finalScore - a.finalScore;
        if (sortBy === 'semantic') return b.semanticScore - a.semanticScore;
        if (sortBy === 'keyword') return b.keywordScore - a.keywordScore;
        if (sortBy === 'exp') return b.relevantExperienceYears - a.relevantExperienceYears;
        if (sortBy === 'cgpa') return b.cgpa - a.cgpa;
        if (sortBy === 'relevantProjects') return b.relevantProjectsCount - a.relevantProjectsCount;
        if (sortBy === 'coverage') return coverageB - coverageA;
        return a.rank - b.rank;
      });
  }, [candidates, searchQuery, tierFilter, skillFilter, verifFilter, cgpaMin, internshipsMin, expMin, projectsMin, coverageMin, sortBy]);

  const activeFiltersCount =
    (tierFilter !== 'all' ? 1 : 0) +
    (skillFilter !== 'all' ? 1 : 0) +
    (verifFilter !== 'all' ? 1 : 0) +
    (cgpaMin > 0 ? 1 : 0) +
    (internshipsMin > 0 ? 1 : 0) +
    (expMin > 0 ? 1 : 0) +
    (projectsMin > 0 ? 1 : 0) +
    (coverageMin > 0 ? 1 : 0);

  const resetFilters = () => {
    setTierFilter('all');
    setSkillFilter('all');
    setVerifFilter('all');
    setCgpaMin(0);
    setInternshipsMin(0);
    setExpMin(0);
    setProjectsMin(0);
    setCoverageMin(0);
    setSearchQuery('');
  };

  const candidateA = candidates.find((c) => c.id === selectedIds[0]) || candidates[0];
  const candidateB = candidates.find((c) => c.id === selectedIds[1]) || candidates[1];

  return (
    <div className="candidates-view">
      <div className="candidates-header">
        <div>
          <span className="eyebrow">APPLICANT POOL</span>
          <h1>Candidate Pool Intelligence</h1>
          <p>
            Search, filter, and inspect all {candidates.length} evaluated profiles with dual score
            validation.
          </p>
        </div>

        {selectedIds.length === 2 && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCompareOpen(true)}
          >
            <Columns2 size={16} /> Compare 2 Selected Candidates
          </button>
        )}
      </div>

      {/* Filters & Search Toolbar */}
      <div className="filter-toolbar-card">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate name, role, or technical skill..."
          />
        </div>

        <div className="dropdown-filters-wrap">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as any)}
            className="filter-select"
            aria-label="Filter by Match Tier"
          >
            <option value="all">All Match Tiers</option>
            <option value="strong">Strong Match (≥80%)</option>
            <option value="good">Good Match (70–79%)</option>
            <option value="review">Needs Review (&lt;70%)</option>
          </select>

          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="filter-select"
            aria-label="Filter by Skill"
          >
            <option value="all">All Skills</option>
            <option value="Python">Python</option>
            <option value="Angular">Angular</option>
            <option value="React">React</option>
            <option value="SQL">SQL</option>
            <option value="TypeScript">TypeScript</option>
            <option value="AWS">AWS</option>
            <option value="Docker">Docker</option>
          </select>

          <select
            value={verifFilter}
            onChange={(e) => setVerifFilter(e.target.value)}
            className="filter-select"
            aria-label="Filter by Verification Status"
          >
            <option value="all">All Verification</option>
            <option value="verified">Verified Only</option>
            <option value="review">Review Recommended</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="filter-select"
            aria-label="Sort Candidates"
          >
            <option value="rank">Sort by Default Rank</option>
            <option value="score">Sort by Final Score</option>
            <option value="semantic">Sort by Semantic Match</option>
            <option value="keyword">Sort by Keyword Match</option>
            <option value="cgpa">Sort by CGPA</option>
            <option value="exp">Sort by Relevant Experience</option>
            <option value="relevantProjects">Sort by Relevant Projects</option>
            <option value="coverage">Sort by Required Skill Coverage</option>
          </select>

          <select
            value={cgpaMin}
            onChange={(e) => setCgpaMin(Number(e.target.value))}
            className="filter-select"
            aria-label="Filter by Minimum CGPA"
          >
            <option value={0}>Min CGPA: Any</option>
            <option value={6}>CGPA ≥ 6.0</option>
            <option value={7}>CGPA ≥ 7.0</option>
            <option value={8}>CGPA ≥ 8.0</option>
            <option value={9}>CGPA ≥ 9.0</option>
          </select>

          <select
            value={internshipsMin}
            onChange={(e) => setInternshipsMin(Number(e.target.value))}
            className="filter-select"
            aria-label="Filter by Minimum Internships"
          >
            <option value={0}>Internships: Any</option>
            <option value={1}>1+ Internship</option>
            <option value={2}>2+ Internships</option>
          </select>

          <select
            value={expMin}
            onChange={(e) => setExpMin(Number(e.target.value))}
            className="filter-select"
            aria-label="Filter by Minimum Relevant Experience"
          >
            <option value={0}>Relevant Exp: Any</option>
            <option value={1}>1+ yr relevant</option>
            <option value={2}>2+ yrs relevant</option>
            <option value={3}>3+ yrs relevant</option>
          </select>

          <select
            value={projectsMin}
            onChange={(e) => setProjectsMin(Number(e.target.value))}
            className="filter-select"
            aria-label="Filter by Minimum Relevant Projects"
          >
            <option value={0}>Relevant Projects: Any</option>
            <option value={1}>1+ relevant</option>
            <option value={2}>2+ relevant</option>
            <option value={3}>3+ relevant</option>
          </select>

          <select
            value={coverageMin}
            onChange={(e) => setCoverageMin(Number(e.target.value))}
            className="filter-select"
            aria-label="Filter by Required Skill Coverage"
          >
            <option value={0}>Req. Skill Coverage: Any</option>
            <option value={40}>≥ 40% coverage</option>
            <option value={60}>≥ 60% coverage</option>
            <option value={80}>≥ 80% coverage</option>
            <option value={100}>100% coverage</option>
          </select>

          {activeFiltersCount > 0 && (
            <button type="button" className="btn btn-text" onClick={resetFilters}>
              Reset filters ({activeFiltersCount})
            </button>
          )}
        </div>
      </div>

      {/* Candidates Table */}
      <div className="rankings-table-wrap">
        <table className="rankings-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: 40 }}>
                Compare
              </th>
              <th scope="col">Rank</th>
              <th scope="col">Candidate</th>
              <th scope="col">Evidenced Skills</th>
              <th scope="col" className="text-center">Semantic</th>
              <th scope="col" className="text-center">Keywords</th>
              <th scope="col" className="text-center">CGPA</th>
              <th scope="col" className="text-center">Relevant Exp</th>
              <th scope="col" className="text-center">Rel. Projects</th>
              <th scope="col" className="text-center">Req. Coverage</th>
              <th scope="col" className="text-center">Verification</th>
              <th scope="col" className="text-right">Match Score</th>
              <th scope="col" className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredCandidates.map((c) => {
              const isSelected = selectedIds.includes(c.id);

              return (
                <tr key={c.id} className={`candidate-table-row ${isSelected ? 'row-selected' : ''}`}>
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(c.id)}
                      title="Select to compare"
                      aria-label={`Select ${c.name} for comparison`}
                    />
                  </td>
                  <td className="rank-cell">
                    <span className="rank-pill">#{c.rank}</span>
                  </td>
                  <td>
                    <div className="candidate-cell-info">
                      <b>{c.name}</b>
                      <small>{c.title} · {c.location}</small>
                    </div>
                  </td>
                  <td>
                    <div className="skills-inline-wrap">
                      {c.matchedSkills.slice(0, 4).map((s) => (
                        <span key={s} className="skill-tag">
                          {s}
                        </span>
                      ))}
                      {c.matchedSkills.length > 4 && (
                        <small className="more-skills">+{c.matchedSkills.length - 4}</small>
                      )}
                    </div>
                  </td>
                  <td className="text-center">
                    <span className="score-subtle">{c.semanticScore}%</span>
                  </td>
                  <td className="text-center">
                    <span className="score-subtle">{c.keywordScore}%</span>
                  </td>
                  <td className="text-center">
                    <span className="score-subtle">{c.cgpa.toFixed(1)}</span>
                  </td>
                  <td className="text-center">
                    <span className="exp-subtle">{c.relevantExperienceYears} yrs</span>
                  </td>
                  <td className="text-center">
                    <span className="exp-subtle">{c.relevantProjectsCount}</span>
                  </td>
                  <td className="text-center">
                    <span className="exp-subtle">
                      {Math.round((c.requiredSkillsMatched / Math.max(1, c.requiredSkillsTotal)) * 100)}%
                    </span>
                  </td>
                  <td className="text-center">
                    {c.verificationAlerts.length > 0 ? (
                      <span className="status-badge-inline status-review">
                        <ShieldAlert size={12} /> Review
                      </span>
                    ) : (
                      <span className="status-badge-inline status-strong">
                        <ShieldCheck size={12} /> Verified
                      </span>
                    )}
                  </td>
                  <td className="text-right">
                    <b className="final-score-text">{c.finalScore.toFixed(1)}%</b>
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/candidate/${c.id}`)}
                    >
                      <Eye size={13} /> View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Side-by-side comparison modal */}
      <CandidateComparisonModal
        isOpen={compareOpen}
        onClose={() => setCompareOpen(false)}
        candidateA={candidateA}
        candidateB={candidateB}
      />

      <RecruiterChatbot candidates={candidates} jobTitle={demoAnalysis.jobTitle} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// CANDIDATE DETAILS ROUTE WRAPPER
// ---------------------------------------------------------------------------
function CandidateDetailsPage() {
  const { id } = useParams();
  const candidate = initialCandidates.find((c) => c.id === id) || initialCandidates[0];

  return (
    <div className="candidate-details-route-view">
      <CandidateDetailView candidate={candidate} />
      <RecruiterChatbot candidates={initialCandidates} jobTitle={demoAnalysis.jobTitle} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SETTINGS PAGE
// ---------------------------------------------------------------------------
function SettingsPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="settings-view">
      <div className="settings-header">
        <span className="eyebrow">WORKSPACE PREFERENCES</span>
        <h1>Settings & Configuration</h1>
        <p>Manage your recruiter profile, theme preferences, and system versioning.</p>
      </div>

      <div className="settings-card-stack">
        <div className="settings-panel-card">
          <div className="panel-avatar">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AR'}
          </div>
          <div className="panel-info">
            <h3>{user?.name || 'Alex Recruiter'}</h3>
            <p>{user?.email || 'alex@nexora.app'} · Enterprise Recruiter Workspace</p>
          </div>
          <button type="button" className="btn btn-secondary">
            Manage Profile
          </button>
        </div>

        <div className="settings-panel-card">
          <div>
            <h3>Design Theme</h3>
            <p>
              NEXORA uses an enterprise light theme built for readable, high-contrast recruiter workflows.
            </p>
          </div>
          <span className="status-badge-inline status-strong">
            <Check size={13} /> Light Theme Active
          </span>
        </div>

        <div className="settings-panel-card">
          <div>
            <h3>Application Information</h3>
            <p>NEXORA Candidate Intelligence · v1.0.0 · Dual Matching Engine Active</p>
          </div>
          <button type="button" className="btn btn-danger" onClick={signOut}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ROOT APPLICATION & ROUTER
// ---------------------------------------------------------------------------
function App() {
  const [user, setUser] = useState<User | null>({
    name: 'Alex Recruiter',
    email: 'alex@nexora.app',
  });

  // Observe Firebase Auth state if configured
  useEffect(() => {
    if (!firebaseEnabled) return;
    const unsubscribe = firebaseAuth.observe((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          name: firebaseUser.displayName || 'Alex Recruiter',
          email: firebaseUser.email || 'alex@nexora.app',
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const authValue = useMemo<AuthContextType>(
    () => ({
      user,
      signIn: async () => {
        if (!firebaseEnabled) {
          toast.error(
            'Google Sign-In is not configured. Add Firebase keys to .env.local — or use the demo workspace.',
            { duration: 5000 }
          );
          return;
        }
        const firebaseUser = await firebaseAuth.signIn();
        if (firebaseUser) {
          setUser({
            name: firebaseUser.displayName || 'Recruiter',
            email: firebaseUser.email || '',
          });
          toast.success('Signed in via Google');
        }
      },
      signInDemo: () => {
        setUser({ name: 'Alex Recruiter', email: 'alex@nexora.app' });
        toast.success('Entered Nexora Recruiter Workspace');
      },
      signOut: async () => {
        if (firebaseEnabled) {
          await firebaseAuth.signOut();
        }
        setUser(null);
        toast.info('Signed out successfully');
      },
    }),
    [user]
  );

  return (
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        {user ? (
          <AppShell>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/analysis/new" element={<NewAnalysisPage />} />
              <Route path="/analysis/:id/loading" element={<LoadingPage />} />
              <Route path="/analysis/:id/results" element={<AnalysisResultsPage />} />
              <Route path="/candidates" element={<CandidatesPage />} />
              <Route path="/candidate/:id" element={<CandidateDetailsPage />} />
              {/* Analytics route redirects to Dashboard where analytics is integrated */}
              <Route path="/analytics" element={<DashboardPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<DashboardPage />} />
            </Routes>
          </AppShell>
        ) : (
          <Routes>
            <Route path="*" element={<LoginPage />} />
          </Routes>
        )}
      </BrowserRouter>
      <Toaster theme="light" position="top-right" richColors />
    </AuthContext.Provider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
