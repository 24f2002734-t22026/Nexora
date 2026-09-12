export type AnalysisStatus = 'draft' | 'processing' | 'completed' | 'failed';

export type SkillPriority = 'required' | 'preferred';

export type EvidenceLevel = 'strong' | 'moderate' | 'limited' | 'not_found';

export interface SkillEvidence {
  skill: string;
  priority: SkillPriority;
  level: EvidenceLevel;
  details: string[];
  yearsOfExperience?: number;
  inProjects?: boolean;
  inSkillsSection?: boolean;
  inWorkHistory?: boolean;
}

export type VerificationStatus = 'verified' | 'review_recommended' | 'unverified';

export interface VerificationAlert {
  id: string;
  type: 'timeline_overlap' | 'unusual_gap' | 'unverified_credential';
  severity: 'warning' | 'info';
  title: string;
  message: string;
  timelineDetails?: string;
  reviewRecommended: boolean;
  impactOnScore: 0; // Explicitly zero: verification alerts never reduce candidate fit scores
}

export interface JobSkill {
  name: string;
  priority: SkillPriority;
  category: 'technical' | 'frontend' | 'backend' | 'database' | 'cloud' | 'architecture';
  matchingCount: number;
  missingCount: number;
}

export interface CandidateProject {
  title: string;
  description: string;
  technologies: string[];
  relevanceToJd: 'High' | 'Moderate' | 'Low';
  period?: string;
  contribution?: string;
  githubUrl?: string;
}

export interface CandidateExperience {
  organization: string;
  role: string;
  period: string;
  isInternship?: boolean;
  isOverlap?: boolean;
  relevanceToJd: 'High' | 'Moderate' | 'Low';
  technologies: string[];
  highlights: string[];
}

export interface CandidateEducation {
  degree: string;
  institution: string;
  year: string;
  cgpa?: number;
  cgpaScale?: number;
}

export interface CandidateLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface ExternalEvidence {
  githubRepos?: string[];
  detectedTech?: string[];
  profileHealth?: string;
}

export interface ClaimVsEvidence {
  claim: string;
  evidenceFound: string;
  strength: 'Strong' | 'Moderate' | 'Limited' | 'Not Found';
}

export interface EvidenceIntegrity {
  coveragePercent: number;
  skillEvidenceLevel: 'Strong' | 'Moderate' | 'Limited';
  projectEvidenceLevel: 'Strong' | 'Moderate' | 'Limited';
  experienceEvidenceLevel: 'Strong' | 'Moderate' | 'Limited';
  claimSpecificity: 'High' | 'Moderate' | 'Limited';
  timelineConsistency: 'Verified' | 'Review Recommended';
  aiWritingSignal: 'Low' | 'Moderate' | 'Insufficient Evidence';
}

export interface Candidate {
  id: string;
  name: string;
  title: string;
  email: string;
  phone?: string;
  location: string;
  rank: number;
  finalScore: number; // 0 - 100

  // 100-Point Baseline Evaluation Model Breakdown
  semanticScore: number; // Raw semantic alignment percentage
  keywordScore: number; // Raw keyword/skill alignment percentage
  semanticScoreWeight: number; // Points out of 35 (35% weight)
  keywordScoreWeight: number; // Points out of 25 (25% weight)
  experienceScoreWeight: number; // Points out of 15 (15% weight)
  projectScoreWeight: number; // Points out of 15 (15% weight)
  educationScoreWeight: number; // Points out of 10 (10% weight)

  // Specific Candidate Dimensions
  cgpa: number; // e.g. 9.1
  cgpaScale: number; // e.g. 10
  totalInternships: number;
  relevantInternships: number;
  relevantExperienceYears: number;
  totalProjects: number;
  relevantProjectsCount: number;

  requiredSkillsMatched: number;
  requiredSkillsTotal: number;
  preferredSkillsMatched: number;
  preferredSkillsTotal: number;
  matchedSkills: string[];
  missingSkills: string[];
  skillEvidence: Record<string, SkillEvidence>;
  claimsVsEvidence: ClaimVsEvidence[];
  evidenceIntegrity: EvidenceIntegrity;
  explanation: string;
  experience: string;
  experienceYears: number;
  education: CandidateEducation[];
  projects: CandidateProject[];
  workHistory: CandidateExperience[];
  links: CandidateLinks;
  externalEvidence?: ExternalEvidence;
  verificationAlerts: VerificationAlert[];
  verificationStatus: VerificationStatus;
}

export interface Analysis {
  id: string;
  jobTitle: string;
  jobDescriptionFileName: string;
  candidateCount: number;
  status: AnalysisStatus;
  createdAt: string;
  requiredSkills: JobSkill[];
  candidates: Candidate[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface HiringWeights {
  frontend: number; // 0-100
  backend: number; // 0-100
  cloud: number; // 0-100
  experience: number; // 0-100
  projects: number; // 0-100
  requiredSkills: number; // 0-100
  education: number; // 0-100
}
