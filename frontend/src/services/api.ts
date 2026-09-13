import axios from 'axios';
import { demoAnalysis, candidates as defaultCandidates } from '../data';
import { getAuth } from 'firebase/auth';
import { firebaseEnabled } from '../auth/firebase';
import type {
  Analysis,
  AssessmentEvaluation,
  AssessmentInvite,
  AssessmentResult,
  Candidate,
  CandidateEvidence,
  CandidateStage,
  ChatMessage,
  EvidenceItem,
  HiringWeights,
  HRDecision,
} from '../types';

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

client.interceptors.request.use(async (config) => {
  if (firebaseEnabled) {
    const token = await getAuth().currentUser?.getIdToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

type BackendCandidate = {
  candidate_id: string;
  name: string;
  email: string;
  resume_ref: string | null;
  current_stage: CandidateStage;
  analysis_id: string;
};

type BackendRanking = {
  candidate_id: string;
  candidate_name: string;
  rank: number;
  final_score: number;
  semantic_score: number;
  keyword_score: number;
  matched_skills: string[];
  missing_skills: string[];
};

type BackendAssessmentInvite = {
  candidate_id: string;
  assessment_id: number;
  invite_id: number;
  token: string;
  status: string;
  invite_url: string | null;
};

type BackendChatResponse = {
  answer: string;
  intent: string;
  evidence?: {
    evidence_id: string;
    source: string;
    summary: string;
    candidate_id?: string | null;
    confidence?: number | null;
  }[];
  actions?: { type: string; label: string; payload: Record<string, any> }[];
  warnings?: { code: string; message: string }[];
};

function mapAssessmentInvite(raw: BackendAssessmentInvite): AssessmentInvite {
  return {
    candidateId: raw.candidate_id,
    assessmentId: raw.assessment_id,
    inviteId: raw.invite_id,
    token: raw.token,
    status: raw.status,
    inviteUrl: raw.invite_url,
  };
}

function mapEvaluation(raw: any): AssessmentEvaluation {
  return {
    id: raw.id,
    submissionId: raw.submission_id,
    correctnessScore: raw.correctness_score,
    efficiencyScore: raw.efficiency_score,
    codeQualityScore: raw.code_quality_score,
    overallScore: raw.overall_score,
    isCorrect: raw.is_correct,
    timeComplexity: raw.time_complexity,
    spaceComplexity: raw.space_complexity,
    strengths: raw.strengths || [],
    detectedIssues: raw.detected_issues || [],
    improvements: raw.improvements || [],
    explanation: raw.explanation,
  };
}

function mapAssessmentResult(raw: any): AssessmentResult {
  return {
    profileId: raw.profile_id,
    status: raw.status,
    overallScore: raw.overall_score,
    invite: raw.invite
      ? {
          id: raw.invite.id,
          testId: raw.invite.test_id,
          candidateName: raw.invite.candidate_name,
          candidateEmail: raw.invite.candidate_email,
          profileId: raw.invite.profile_id,
          token: raw.invite.token,
          status: raw.invite.status,
        }
      : null,
    assessment: raw.assessment
      ? {
          id: raw.assessment.id,
          title: raw.assessment.title,
          description: raw.assessment.description,
          interviewerId: raw.assessment.interviewer_id,
        }
      : null,
    questions: (raw.questions || []).map((q: any) => ({
      id: q.id,
      testId: q.test_id,
      questionText: q.question_text,
      language: q.language,
    })),
    submissions: (raw.submissions || []).map((s: any) => ({
      id: s.id,
      inviteId: s.invite_id,
      questionId: s.question_id,
      code: s.code,
      language: s.language,
      status: s.status,
      stdout: s.stdout,
      stderr: s.stderr,
      executionTimeMs: s.execution_time_ms,
      evaluation: s.evaluation ? mapEvaluation(s.evaluation) : null,
    })),
  };
}

function mapEvidenceItem(raw: any): EvidenceItem {
  return {
    evidenceId: raw.evidence_id,
    source: raw.source,
    category: raw.category,
    claim: raw.claim,
    value: raw.value,
    score: raw.score,
    confidence: raw.confidence,
    provenance: raw.provenance,
  };
}

function mapCandidateEvidence(raw: any): CandidateEvidence {
  return {
    candidateId: raw.candidate_id,
    candidateName: raw.candidate_name,
    resumeEvidence: (raw.resume_evidence || []).map(mapEvidenceItem),
    rankingEvidence: raw.ranking_evidence,
    assessmentEvidence: (raw.assessment_evidence || []).map(mapEvidenceItem),
    comparisonEvidence: (raw.comparison_evidence || []).map(mapEvidenceItem),
    evidenceReferences: raw.evidence_references || [],
    missingEvidence: raw.missing_evidence || [],
    overallConfidence: raw.overall_confidence,
  };
}

function mapBackendCandidate(raw: BackendCandidate, ranking?: BackendRanking): Candidate {
  const matchedSkills = ranking?.matched_skills || [];
  const missingSkills = ranking?.missing_skills || [];
  return {
    id: raw.candidate_id,
    jobId: raw.analysis_id,
    name: raw.name || ranking?.candidate_name || raw.candidate_id,
    title: 'Candidate',
    email: raw.email,
    location: 'Location unavailable',
    rank: ranking?.rank || 0,
    finalScore: ranking?.final_score,
    semanticScore: ranking?.semantic_score,
    keywordScore: ranking?.keyword_score,
    requiredSkillsMatched: matchedSkills.length,
    requiredSkillsTotal: matchedSkills.length + missingSkills.length,
    preferredSkillsMatched: 0,
    preferredSkillsTotal: 0,
    matchedSkills,
    missingSkills,
    skillEvidence: {},
    explanation: ranking
      ? `Ranked #${ranking.rank} with ${ranking.final_score}% final score.`
      : 'Ranking data is not available for this candidate.',
    experience: 'Experience details are available in the evidence record.',
    experienceYears: 0,
    education: [],
    projects: [],
    workHistory: [],
    links: {},
    verificationAlerts: [],
    verificationStatus: 'unverified',
    currentStage: raw.current_stage,
    resume: raw.resume_ref
      ? {
          id: raw.resume_ref,
          fileName: raw.resume_ref,
          fileType: 'pdf',
          uploadedAt: '',
          parsingStatus: 'completed',
        }
      : undefined,
  };
}

function mergeCandidateRanking(candidate: BackendCandidate, rankings: BackendRanking[]): Candidate {
  return mapBackendCandidate(
    candidate,
    rankings.find((ranking) => ranking.candidate_id === candidate.candidate_id)
  );
}

export async function getBackendRankings(): Promise<BackendRanking[]> {
  const { data } = await client.get<BackendRanking[]>('/rankings');
  return data;
}

export async function listBackendCandidates(): Promise<Candidate[]> {
  const [{ data: candidates }, rankings] = await Promise.all([
    client.get<BackendCandidate[]>('/candidates'),
    getBackendRankings(),
  ]);
  return candidates.map((candidate) => mergeCandidateRanking(candidate, rankings));
}

export async function getBackendCandidate(candidateId: string): Promise<Candidate> {
  const [{ data: candidate }, rankings] = await Promise.all([
    client.get<BackendCandidate>(`/candidates/${candidateId}`),
    getBackendRankings(),
  ]);
  return mergeCandidateRanking(candidate, rankings);
}

export async function shortlistCandidate(candidateId: string): Promise<{ candidate: Candidate; changed: boolean }> {
  const { data } = await client.post<{ candidate: BackendCandidate; changed: boolean }>(
    `/candidates/${candidateId}/shortlist`
  );
  const rankings = await getBackendRankings();
  return {
    candidate: mergeCandidateRanking(data.candidate, rankings),
    changed: data.changed,
  };
}

export async function createCandidateAssessment(
  candidateId: string,
  questionText = 'Implement a small REST API endpoint that validates input, stores a record, and returns a structured JSON response.',
  language = 'python'
): Promise<AssessmentInvite> {
  const { data } = await client.post<BackendAssessmentInvite>(
    `/candidates/${candidateId}/assessment`,
    { question_text: questionText, language }
  );
  return mapAssessmentInvite(data);
}

export async function getAssessmentStatus(candidateId: string): Promise<AssessmentResult> {
  const { data } = await client.get(`/candidates/${candidateId}/assessment/status`);
  return mapAssessmentResult(data);
}

export async function getAssessmentResult(candidateId: string): Promise<AssessmentResult> {
  const { data } = await client.get(`/candidates/${candidateId}/assessment/result`);
  return mapAssessmentResult(data);
}

export async function getCandidateEvidence(candidateId: string): Promise<CandidateEvidence> {
  const { data } = await client.get(`/candidates/${candidateId}/evidence/comparison`);
  return mapCandidateEvidence(data);
}

export async function submitHrDecision(candidateId: string, decision: HRDecision['decision'], reason?: string) {
  const { data } = await client.post<BackendCandidate>(`/candidates/${candidateId}/hr-decision`, {
    decision,
    reason,
  });
  const rankings = await getBackendRankings();
  return mergeCandidateRanking(data, rankings);
}

export async function chatWithRecruiterBackend(
  message: string,
  candidateIds: string[] = [],
  conversationId?: string | null
): Promise<ChatMessage> {
  const { data } = await client.post<BackendChatResponse>('/recruiter/chat', {
    message,
    candidate_ids: candidateIds,
    conversation_id: conversationId || null,
  });
  const evidence = data.evidence?.length
    ? `\n\nEvidence:\n${data.evidence.map((item) => `- [${item.source}] ${item.summary}`).join('\n')}`
    : '';
  const actions = data.actions?.length
    ? `\n\nActions:\n${data.actions.map((item) => `- ${item.label}`).join('\n')}`
    : '';
  const warnings = data.warnings?.length
    ? `\n\nWarnings:\n${data.warnings.map((item) => `- ${item.message}`).join('\n')}`
    : '';
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    content: `${data.answer}${evidence}${actions}${warnings}`,
  };
}

export async function getAnalysis(_id: string): Promise<Analysis> {
  await wait();
  return demoAnalysis;
}

export async function getRankings(id: string): Promise<Candidate[]> {
  const analysis = await getAnalysis(id);
  return analysis.candidates;
}

export async function getCandidate(id: string): Promise<Candidate> {
  await wait(180);
  return demoAnalysis.candidates.find((c) => c.id === id) || demoAnalysis.candidates[0];
}

export async function createAnalysis(): Promise<Analysis> {
  await wait();
  return { ...demoAnalysis, id: 'analysis_new', status: 'draft' };
}

export async function uploadJobDescription(file: File) {
  await wait(400);
  return {
    fileName: file.name,
    extractedSkills: demoAnalysis.requiredSkills,
  };
}

export async function uploadResumes(files: File[]) {
  await wait(400);
  return { count: files.length, fileNames: files.map((f) => f.name) };
}

export async function startAnalysis(_id: string) {
  await wait(300);
  return { status: 'processing' as const };
}

export function simulateHiringWeights(
  weights: HiringWeights,
  baseCandidates: Candidate[] = defaultCandidates
): { candidates: (Candidate & { rankDelta: number; originalRank: number })[]; explanation: string } {
  // Normalize weights (default 50)
  const wFrontend = weights.frontend / 50;
  const wBackend = weights.backend / 50;
  const wCloud = weights.cloud / 50;
  const wExp = weights.experience / 50;
  const wProjects = weights.projects / 50;
  const wRequired = weights.requiredSkills / 50;

  const recalculated = baseCandidates.map((c) => {
    let multiplier = 1.0;

    // Frontend weight impact
    const hasAngular = c.matchedSkills.includes('Angular');
    const hasReact = c.matchedSkills.includes('React');
    if (hasAngular || hasReact) {
      multiplier *= 1 + (wFrontend - 1) * 0.15;
    } else {
      multiplier *= 1 - (wFrontend - 1) * 0.1;
    }

    // Backend weight impact
    const hasPython = c.matchedSkills.includes('Python');
    const hasSQL = c.matchedSkills.includes('SQL');
    if (hasPython && hasSQL) {
      multiplier *= 1 + (wBackend - 1) * 0.16;
    } else if (hasPython || hasSQL) {
      multiplier *= 1 + (wBackend - 1) * 0.08;
    } else {
      multiplier *= 1 - (wBackend - 1) * 0.12;
    }

    // Cloud weight impact
    const hasAWS = c.matchedSkills.includes('AWS');
    const hasDocker = c.matchedSkills.includes('Docker');
    if (hasAWS && hasDocker) {
      multiplier *= 1 + (wCloud - 1) * 0.2;
    } else if (hasAWS || hasDocker) {
      multiplier *= 1 + (wCloud - 1) * 0.1;
    } else {
      multiplier *= 1 - (wCloud - 1) * 0.08;
    }

    // Experience weight impact
    if (c.experienceYears >= 3.0) {
      multiplier *= 1 + (wExp - 1) * 0.12;
    } else if (c.experienceYears < 2.0) {
      multiplier *= 1 - (wExp - 1) * 0.1;
    }

    // Projects weight impact
    const strongProjectsCount = c.projects.length;
    if (strongProjectsCount >= 2) {
      multiplier *= 1 + (wProjects - 1) * 0.1;
    }

    // Required skills weight impact
    if (c.requiredSkillsMatched === c.requiredSkillsTotal) {
      multiplier *= 1 + (wRequired - 1) * 0.18;
    } else {
      multiplier *= 1 - (wRequired - 1) * 0.15;
    }

    const calculatedScore = Math.min(99.4, Math.max(25, Number(((c.finalScore ?? 70) * multiplier).toFixed(1))));

    return {
      ...c,
      simulatedScore: calculatedScore,
      originalRank: c.rank,
    };
  });

  // Sort descending
  recalculated.sort((a, b) => b.simulatedScore - a.simulatedScore);

  const rankedWithDelta = recalculated.map((c, index) => {
    const newRank = index + 1;
    const rankDelta = c.originalRank - newRank; // positive means moved up, negative means moved down
    return {
      ...c,
      finalScore: c.simulatedScore,
      rank: newRank,
      rankDelta,
      originalRank: c.originalRank,
    };
  });

  // Generate clear reason explanation
  let explanation = 'Rankings updated based on adjusted hiring parameters. ';
  if (weights.cloud > 65) {
    explanation += 'Increased Cloud/DevOps weighting elevated candidates with verified AWS & Docker experience (e.g. Maya Patel and Leo Martin). ';
  } else if (weights.backend > 65) {
    explanation += 'Elevated Backend weighting prioritized candidates with verified Python and relational SQL pipelines. ';
  } else if (weights.frontend > 65) {
    explanation += 'Heightened Frontend weighting favored candidates with verified Angular and React enterprise experience. ';
  } else if (weights.experience > 65) {
    explanation += 'Experience weighting increased priority for candidates with 3+ years of production engineering experience. ';
  } else {
    explanation += 'Balanced weights evaluate dual semantic match and keyword skill coverage across all requirements.';
  }

  return { candidates: rankedWithDelta, explanation };
}

export async function chatWithRecruiter(
  prompt: string,
  candidates: Candidate[] = defaultCandidates
): Promise<ChatMessage> {
  const backendCandidateIds = candidates
    .filter((candidate) => candidate.currentStage)
    .map((candidate) => candidate.id);
  return chatWithRecruiterBackend(prompt, backendCandidateIds);
}
