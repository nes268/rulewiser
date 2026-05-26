import type { DuplicateResult } from './duplicateDetect';
import type { GeminiViolation } from './geminiAnalysis';
import type { TitleIssue } from './titleCheck';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ModerationClassification =
  | 'clean'
  | 'title_quality_risk'
  | 'rule_risk'
  | 'duplicate_risk'
  | 'spam_risk';

export type AnalysisScoreInput = {
  aiOverallScore?: number;
  aiTitleQuality?: number;
  violations: GeminiViolation[];
  titleIssues: TitleIssue[];
  duplicate: DuplicateResult;
  spamSignals: boolean;
};

export type AnalysisScore = {
  overallScore: number;
  titleQuality: number;
  scoreBreakdown: ScoreFactor[];
  riskLevel: RiskLevel;
  classification: ModerationClassification;
  recommendation: string;
  nextSteps: SituationSuggestion[];
};

export type ScoreFactor = {
  label: string;
  points: number;
  detail: string;
  tone: 'positive' | 'warning' | 'danger';
};

export type SituationSuggestion = {
  label: string;
  detail: string;
};

const clampScore = (score: number): number => {
  return Math.max(0, Math.min(100, Math.round(score)));
};

const getTitleIssuePenalty = (issue: TitleIssue): number => {
  const basePenalty = (() => {
    switch (issue.type) {
      case 'too_short':
        return 18;
      case 'too_long':
        return 12;
      case 'all_caps':
        return 15;
      case 'clickbait':
        return 24;
      case 'vague_title':
        return 16;
      case 'missing_body_context':
        return 14;
      case 'excessive_punctuation':
        return 12;
    }
  })();

  return Math.round((basePenalty * issue.confidence) / 100);
};

const getViolationPenalty = (violation: GeminiViolation): number => {
  if (violation.confidence >= 90) {
    return 38;
  }

  if (violation.confidence >= 70) {
    return 28;
  }

  return 14;
};

const getClassification = (
  violations: GeminiViolation[],
  titleIssues: TitleIssue[],
  duplicate: DuplicateResult,
  spamSignals: boolean
): ModerationClassification => {
  if (spamSignals) {
    return 'spam_risk';
  }

  if (duplicate) {
    return 'duplicate_risk';
  }

  if (violations.length > 0) {
    return 'rule_risk';
  }

  if (titleIssues.length > 0) {
    return 'title_quality_risk';
  }

  return 'clean';
};

const getRiskLevel = (
  score: number,
  violations: GeminiViolation[],
  titleIssues: TitleIssue[],
  duplicate: DuplicateResult,
  spamSignals: boolean
): RiskLevel => {
  const hasSevereViolation = violations.some(
    (violation) => violation.confidence >= 90
  );
  const hasSevereTitleIssue = titleIssues.some(
    (issue) => issue.confidence >= 90
  );
  const hasHighConfidenceDuplicate = Boolean(
    duplicate && duplicate.confidence >= 90
  );

  if (
    score <= 40 ||
    hasSevereViolation ||
    hasHighConfidenceDuplicate ||
    (spamSignals && score <= 70)
  ) {
    return 'critical';
  }

  if (
    score <= 65 ||
    violations.some((violation) => violation.confidence >= 70) ||
    titleIssues.some((issue) => issue.type === 'clickbait') ||
    hasSevereTitleIssue ||
    Boolean(duplicate && duplicate.confidence >= 70)
  ) {
    return 'high';
  }

  if (score < 90 || titleIssues.length > 0) {
    return 'medium';
  }

  return 'low';
};

const getRecommendation = (
  riskLevel: RiskLevel,
  classification: ModerationClassification
): string => {
  if (riskLevel === 'critical') {
    return 'Do not post yet. Rewrite the post or wait for moderator review.';
  }

  if (riskLevel === 'high') {
    return 'Revise before posting. The current draft is likely to receive a warning or removal.';
  }

  if (riskLevel === 'medium') {
    return 'Minor edits recommended before posting.';
  }

  if (classification === 'clean') {
    return 'Looks safe to post based on the available checks.';
  }

  return 'Review the highlighted signals before posting.';
};

const getTitleIssueSummary = (titleIssues: TitleIssue[]): string => {
  if (titleIssues.length === 0) {
    return 'No title clarity deductions.';
  }

  const issueLabels = titleIssues
    .map((issue) => issue.type.split('_').join(' '))
    .join(', ');

  return `Title deductions from: ${issueLabels}.`;
};

const getScoreBreakdown = ({
  aiOverallScore,
  deterministicScore,
  titleIssues,
  titlePenalty,
  violations,
  violationPenalty,
  duplicate,
  duplicatePenalty,
  spamPenalty,
}: AnalysisScoreInput & {
  deterministicScore: number;
  titlePenalty: number;
  violationPenalty: number;
  duplicatePenalty: number;
  spamPenalty: number;
}): ScoreFactor[] => {
  const factors: ScoreFactor[] = [
    {
      label: 'Starting score',
      points: 100,
      detail:
        'Every draft starts at 100, then RuleWiser subtracts only for signals it actually finds.',
      tone: 'positive',
    },
  ];

  if (titlePenalty > 0) {
    factors.push({
      label: 'Title clarity',
      points: -titlePenalty,
      detail: getTitleIssueSummary(titleIssues),
      tone: titlePenalty >= 28 ? 'danger' : 'warning',
    });
  }

  if (violationPenalty > 0) {
    factors.push({
      label: 'Rule signals',
      points: -violationPenalty,
      detail: `${violations.length} rule signal${violations.length === 1 ? '' : 's'} affected the score.`,
      tone: violationPenalty >= 38 ? 'danger' : 'warning',
    });
  }

  if (duplicatePenalty > 0 && duplicate) {
    factors.push({
      label: 'Duplicate risk',
      points: -duplicatePenalty,
      detail: `${duplicate.confidence}% similarity to a recent stored post.`,
      tone: duplicatePenalty >= 25 ? 'danger' : 'warning',
    });
  }

  if (spamPenalty > 0) {
    factors.push({
      label: 'Spam or promotion signal',
      points: -spamPenalty,
      detail:
        'Promotional wording, suspicious links, or spam-style calls to action were detected.',
      tone: 'danger',
    });
  }

  if (
    typeof aiOverallScore === 'number' &&
    aiOverallScore < deterministicScore
  ) {
    factors.push({
      label: 'Rule engine cap',
      points: aiOverallScore - deterministicScore,
      detail:
        'The local rule engine produced a lower score than the deterministic pass, so RuleWiser used the stricter score.',
      tone: aiOverallScore < 65 ? 'danger' : 'warning',
    });
  }

  if (factors.length === 1) {
    factors.push({
      label: 'No deductions',
      points: 0,
      detail:
        'No title, rule, duplicate, or spam deductions were found for this draft.',
      tone: 'positive',
    });
  }

  return factors;
};

const getNextSteps = (
  riskLevel: RiskLevel,
  classification: ModerationClassification,
  violations: GeminiViolation[],
  titleIssues: TitleIssue[],
  duplicate: DuplicateResult,
  spamSignals: boolean
): SituationSuggestion[] => {
  const suggestions: SituationSuggestion[] = [];

  if (riskLevel === 'critical' || riskLevel === 'high') {
    suggestions.push({
      label: 'Revise before posting',
      detail:
        'Fix the strongest signal first, then run the pre-check again before submitting.',
    });
  }

  if (classification === 'rule_risk' && violations.length > 0) {
    const firstRule = violations[0]?.rule ?? 'the highlighted rule';

    suggestions.push({
      label: 'Match the community rule',
      detail: `Start with "${firstRule}" and rewrite the draft so the issue is clearly addressed.`,
    });
  }

  if (classification === 'spam_risk' || spamSignals) {
    suggestions.push({
      label: 'Remove promo language',
      detail:
        'Cut referral codes, sales language, repeated links, and direct calls to message or follow you.',
    });
  }

  if (classification === 'duplicate_risk' && duplicate) {
    suggestions.push({
      label: 'Make the angle new',
      detail:
        'Search recent posts, then add what is different about your case or update.',
    });
  }

  if (titleIssues.some((issue) => issue.type === 'missing_body_context')) {
    suggestions.push({
      label: 'Add body context',
      detail:
        'Include what happened, what you already tried, and the exact help or discussion you want.',
    });
  }

  if (titleIssues.length > 0) {
    suggestions.push({
      label: 'Tighten the title',
      detail:
        'Name the topic, the situation, and the outcome you want without vague openers or loud punctuation.',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      label: 'Ready with normal caution',
      detail:
        'The draft has no major flags. Keep the title specific and leave useful context in the body.',
    });
  }

  return suggestions.slice(0, 4);
};

export const scoreAnalysis = ({
  aiOverallScore,
  aiTitleQuality,
  violations,
  titleIssues,
  duplicate,
  spamSignals,
}: AnalysisScoreInput): AnalysisScore => {
  const titlePenalty = titleIssues.reduce(
    (total, issue) => total + getTitleIssuePenalty(issue),
    0
  );
  const violationPenalty = violations.reduce(
    (total, violation) => total + getViolationPenalty(violation),
    0
  );
  const duplicatePenalty = duplicate
    ? Math.round((duplicate.confidence * 35) / 100)
    : 0;
  const spamPenalty = spamSignals ? 25 : 0;
  const deterministicScore = clampScore(
    100 - titlePenalty - violationPenalty - duplicatePenalty - spamPenalty
  );
  const overallScore = clampScore(
    Math.min(aiOverallScore ?? 100, deterministicScore)
  );
  const titleQuality = clampScore(
    Math.min(aiTitleQuality ?? 100, 100 - titlePenalty)
  );
  const classification = getClassification(
    violations,
    titleIssues,
    duplicate,
    spamSignals
  );
  const riskLevel = getRiskLevel(
    overallScore,
    violations,
    titleIssues,
    duplicate,
    spamSignals
  );

  return {
    overallScore,
    titleQuality,
    scoreBreakdown: getScoreBreakdown({
      aiOverallScore,
      aiTitleQuality,
      violations,
      titleIssues,
      duplicate,
      spamSignals,
      deterministicScore,
      titlePenalty,
      violationPenalty,
      duplicatePenalty,
      spamPenalty,
    }),
    riskLevel,
    classification,
    recommendation: getRecommendation(riskLevel, classification),
    nextSteps: getNextSteps(
      riskLevel,
      classification,
      violations,
      titleIssues,
      duplicate,
      spamSignals
    ),
  };
};
