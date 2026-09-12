import axios from 'axios';
import { demoAnalysis, candidates as defaultCandidates } from '../data';
import type { Analysis, Candidate, ChatMessage, HiringWeights } from '../types';

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

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

export type SimulatedCandidate = Candidate & {
  rankDelta: number;
  originalRank: number;
};

export function simulateHiringWeights(
  weights: HiringWeights,
  baseCandidates: Candidate[] = defaultCandidates
): { candidates: SimulatedCandidate[]; explanation: string } {
  // Normalize weights (default 50 = neutral)
  const wFrontend = weights.frontend / 50;
  const wBackend = weights.backend / 50;
  const wCloud = weights.cloud / 50;
  const wExp = weights.experience / 50;
  const wProjects = weights.projects / 50;
  const wRequired = weights.requiredSkills / 50;
  const wEducation = weights.education / 50;

  const recalculated = baseCandidates.map((c) => {
    let multiplier = 1.0;

    // Frontend weight impact (JD-derived frontend skill categories)
    const hasAngular = c.matchedSkills.includes('Angular');
    const hasReact = c.matchedSkills.includes('React');
    if (hasAngular && hasReact) {
      multiplier *= 1 + (wFrontend - 1) * 0.18;
    } else if (hasAngular || hasReact) {
      multiplier *= 1 + (wFrontend - 1) * 0.1;
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

    // Experience weight impact — relevant experience, not raw tenure
    if (c.relevantExperienceYears >= 2.5) {
      multiplier *= 1 + (wExp - 1) * 0.12;
    } else if (c.relevantExperienceYears < 1.5) {
      multiplier *= 1 - (wExp - 1) * 0.1;
    }

    // Projects weight impact — relevant projects, not raw count
    if (c.relevantProjectsCount >= 2) {
      multiplier *= 1 + (wProjects - 1) * 0.12;
    } else if (c.relevantProjectsCount === 0) {
      multiplier *= 1 - (wProjects - 1) * 0.08;
    }

    // Required skills weight impact
    if (c.requiredSkillsMatched === c.requiredSkillsTotal) {
      multiplier *= 1 + (wRequired - 1) * 0.18;
    } else {
      multiplier *= 1 - (wRequired - 1) * 0.15;
    }

    // Education weight impact — CGPA, deliberately bounded so it never dominates
    if (c.cgpa >= 9) {
      multiplier *= 1 + (wEducation - 1) * 0.08;
    } else if (c.cgpa < 7) {
      multiplier *= 1 - (wEducation - 1) * 0.08;
    }

    const calculatedScore = Math.min(
      99.4,
      Math.max(25, Number((c.finalScore * multiplier).toFixed(1)))
    );

    return {
      ...c,
      simulatedScore: calculatedScore,
      originalRank: c.rank,
    };
  });

  // Sort descending
  recalculated.sort((a, b) => b.simulatedScore - a.simulatedScore);

  const rankedWithDelta: SimulatedCandidate[] = recalculated.map((c, index) => {
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

  // Generate clear reason explanation from the actual weight configuration
  let explanation = 'Rankings updated based on adjusted hiring parameters. ';
  if (weights.cloud > 65) {
    explanation +=
      'Increased Cloud/DevOps weighting elevated candidates with verified AWS & Docker evidence. ';
  }
  if (weights.backend > 65) {
    explanation +=
      'Elevated Backend weighting prioritized candidates with Python and relational SQL pipelines. ';
  }
  if (weights.frontend > 65) {
    explanation +=
      'Heightened Frontend weighting favored candidates with Angular and React framework evidence. ';
  }
  if (weights.experience > 65) {
    explanation +=
      'Experience weighting increased priority for candidates with 2.5+ years of relevant experience. ';
  }
  if (weights.projects > 65) {
    explanation +=
      'Project weighting boosted candidates with multiple JD-relevant projects. ';
  }
  if (weights.requiredSkills > 65) {
    explanation +=
      'Stricter required-skills weighting penalizes candidates with gaps against mandatory JD skills. ';
  }
  if (weights.education > 65) {
    explanation += 'Higher education weighting favors strong CGPA, capped so academics never dominate. ';
  }
  if (
    weights.frontend <= 65 &&
    weights.backend <= 65 &&
    weights.cloud <= 65 &&
    weights.experience <= 65 &&
    weights.projects <= 65 &&
    weights.requiredSkills <= 65 &&
    weights.education <= 65
  ) {
    explanation +=
      'Balanced weights evaluate dual semantic match and keyword skill coverage across all requirements.';
  }

  return { candidates: rankedWithDelta, explanation };
}

export async function chatWithRecruiter(
  question: string,
  candidateList: Candidate[] = defaultCandidates
): Promise<ChatMessage> {
  await wait(400);

  const lower = question.toLowerCase();
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const reply = (content: string): ChatMessage => ({
    id: crypto.randomUUID(),
    role: 'assistant',
    timestamp: time,
    content,
  });

  // ------------------------------------------------------------------
  // Candidate name resolution against the actual analysis pool
  // ------------------------------------------------------------------
  const mentioned = candidateList
    .filter((c) => {
      const firstName = c.name.toLowerCase().split(' ')[0];
      const fullName = c.name.toLowerCase();
      return lower.includes(fullName) || lower.includes(firstName);
    })
    .slice(0, 2);

  // ------------------------------------------------------------------
  // 1. "Why is X ranked ..." — ranking explanation from actual score data
  // ------------------------------------------------------------------
  if (
    (lower.includes('why') && mentioned.length > 0) ||
    lower.includes('ranked #1') ||
    lower.includes('rank 1') ||
    lower.includes('rank #1') ||
    lower.includes('ranked first') ||
    lower.includes('ranked no. 1') ||
    lower.includes('top candidate') ||
    ((lower.includes('why') || lower.includes('explain')) &&
      (lower.includes('first') || lower.includes('#1') || lower.includes('top')))
  ) {
    const target =
      mentioned[0] || [...candidateList].sort((a, b) => b.finalScore - a.finalScore)[0];
    const rankedAhead = candidateList.filter((c) => c.finalScore > target.finalScore).length;
    return reply(
      `${target.name} is ranked #${target.rank} with a ${target.finalScore.toFixed(1)}% Match Score` +
        (rankedAhead > 0
          ? ` — ${rankedAhead} candidate${rankedAhead === 1 ? '' : 's'} scored higher.`
          : ' — the highest in this pool.') +
        `\n\nScore breakdown (100-pt baseline):\n` +
        `• Semantic JD Match: ${target.semanticScoreWeight}/35 (raw ${target.semanticScore}%)\n` +
        `• Keyword / Skill Match: ${target.keywordScoreWeight}/25 (raw ${target.keywordScore}%)\n` +
        `• Relevant Experience: ${target.experienceScoreWeight}/15 (${target.relevantExperienceYears} yrs relevant)\n` +
        `• Relevant Projects: ${target.projectScoreWeight}/15 (${target.relevantProjectsCount} of ${target.totalProjects} relevant)\n` +
        `• Education / CGPA: ${target.educationScoreWeight}/10 (CGPA ${target.cgpa}/${target.cgpaScale})\n\n` +
        `Required skill coverage: ${target.requiredSkillsMatched}/${target.requiredSkillsTotal}.` +
        (target.missingSkills.length > 0
          ? ` Gaps: ${target.missingSkills.join(', ')}.`
          : ' No required-skill gaps.') +
        (target.verificationAlerts.length > 0
          ? `\n\nNote: A timeline overlap flag exists on this profile for screening verification. It does not affect the Match Score.`
          : '')
    );
  }

  // ------------------------------------------------------------------
  // 2. Compare two candidates (by name, or default top two)
  // ------------------------------------------------------------------
  if (lower.includes('compare') || mentioned.length === 2) {
    const a = mentioned[0] || candidateList[0];
    const b = mentioned[1] || candidateList[1];
    const higher = a.finalScore >= b.finalScore ? a : b;
    const other = a.finalScore >= b.finalScore ? b : a;
    const diff = (higher.finalScore - other.finalScore).toFixed(1);

    return reply(
      `Comparison — ${a.name} (#${a.rank}, ${a.finalScore.toFixed(1)}%) vs ${b.name} (#${b.rank}, ${b.finalScore.toFixed(1)}%):\n\n` +
        `• Match Scores: ${higher.name} leads by +${diff}% overall (Semantic: ${a.semanticScore}% vs ${b.semanticScore}%, Keyword: ${a.keywordScore}% vs ${b.keywordScore}%).\n` +
        `• Required Skills: ${a.requiredSkillsMatched}/${a.requiredSkillsTotal} vs ${b.requiredSkillsMatched}/${b.requiredSkillsTotal}.\n` +
        `• Experience: ${a.name} — ${a.relevantExperienceYears} yrs relevant, ${a.totalInternships} internship(s); ${b.name} — ${b.relevantExperienceYears} yrs relevant, ${b.totalInternships} internship(s).\n` +
        `• Relevant Projects: ${a.relevantProjectsCount} vs ${b.relevantProjectsCount}.\n` +
        `• CGPA: ${a.cgpa}/${a.cgpaScale} vs ${b.cgpa}/${b.cgpaScale} — education carries only 10% of the Match Score.\n` +
        `• Verification: ${
          a.verificationAlerts.length > 0
            ? `${a.name} has an open timeline check (review recommended)`
            : `${a.name} verified`
        } · ${
          b.verificationAlerts.length > 0
            ? `${b.name} has an open timeline check (review recommended)`
            : `${b.name} verified`
        }.`
    );
  }

  // ------------------------------------------------------------------
  // 3. Skill-coverage queries: who has / who is missing a known skill
  // ------------------------------------------------------------------
  const skillUniverse = Array.from(
    new Set(candidateList.flatMap((c) => [...c.matchedSkills, ...c.missingSkills]))
  );
  const askedSkill = skillUniverse.find((s) => lower.includes(s.toLowerCase()));

  if (askedSkill) {
    const withSkill = candidateList.filter((c) => c.matchedSkills.includes(askedSkill));
    const missingSkill = candidateList.filter((c) => !c.matchedSkills.includes(askedSkill));

    if (
      lower.includes('missing') ||
      lower.includes('lacks') ||
      lower.includes('without') ||
      lower.includes('no ')
    ) {
      return reply(
        `${missingSkill.length} of ${candidateList.length} candidates do not show sufficient evidence of ${askedSkill} in their resumes.\n\n` +
          (withSkill.length > 0
            ? `Candidates WITH ${askedSkill} evidence:\n` +
              withSkill
                .slice(0, 6)
                .map((c) => `• ${c.name} (#${c.rank}) — ${c.finalScore.toFixed(1)}% match`)
                .join('\n')
            : `No candidate in this pool shows evidence of ${askedSkill}.`)
      );
    }

    const strongEvidence = withSkill.filter(
      (c) => c.skillEvidence?.[askedSkill]?.level === 'strong'
    );
    return reply(
      `${withSkill.length} of ${candidateList.length} candidates show evidence of ${askedSkill}` +
        ` (${strongEvidence.length} with strong multi-source evidence):\n\n` +
        (withSkill.length > 0
          ? withSkill
              .slice(0, 6)
              .map(
                (c) =>
                  `• ${c.name} (#${c.rank}) — ${c.finalScore.toFixed(1)}% match, ${
                    c.skillEvidence?.[askedSkill]?.level ?? 'limited'
                  } evidence`
              )
              .join('\n')
          : `No candidates found.`) +
        (missingSkill.length > 0
          ? `\n\nMissing ${askedSkill}: ${missingSkill.length} candidates (inspect them in the Skill Coverage table).`
          : '')
    );
  }

  // ------------------------------------------------------------------
  // 4. Biggest skill gap across the pool
  // ------------------------------------------------------------------
  if (lower.includes('gap') || lower.includes('shortage') || lower.includes('biggest')) {
    const skillCounts = new Map<string, number>();
    candidateList.forEach((c) =>
      c.matchedSkills.forEach((s) => skillCounts.set(s, (skillCounts.get(s) ?? 0) + 1))
    );
    const gaps = skillUniverse
      .map((s) => ({
        skill: s,
        matching: skillCounts.get(s) ?? 0,
        missing: candidateList.length - (skillCounts.get(s) ?? 0),
      }))
      .sort((a, b) => b.missing - a.missing)
      .slice(0, 3);

    return reply(
      `The largest candidate gaps in this pool are:\n\n` +
        gaps
          .map(
            (g, i) =>
              `${i + 1}. ${g.skill}: ${g.missing} candidates missing (${g.matching} match, ${Math.round(
                (g.matching / candidateList.length) * 100
              )}% coverage)`
          )
          .join('\n')
    );
  }

  // ------------------------------------------------------------------
  // 5. Default overview answer, computed from actual pool data
  // ------------------------------------------------------------------
  const top3 = [...candidateList].sort((a, b) => b.finalScore - a.finalScore).slice(0, 3);
  return reply(
    `Based on the active analysis of ${candidateList.length} candidates:\n\n` +
      top3
        .map(
          (c, i) =>
            `${i + 1}. ${c.name} (#${c.rank}) — ${c.finalScore.toFixed(1)}% match (Semantic ${
              c.semanticScore
            }%, Keyword ${c.keywordScore}%)`
        )
        .join('\n') +
      `\n\nI can compare candidates, detail skill coverage (e.g. ${skillUniverse
        .slice(0, 3)
        .join(', ')}), explain rankings, or identify the biggest skill gaps — all grounded in the actual analysis data.`
  );
}
