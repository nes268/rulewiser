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
  riskLevel: RiskLevel;
  classification: ModerationClassification;
  recommendation: string;
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
  const hasSevereTitleIssue = titleIssues.some((issue) => issue.confidence >= 90);
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
  const titleQuality = clampScore(Math.min(aiTitleQuality ?? 100, 100 - titlePenalty));
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
    riskLevel,
    classification,
    recommendation: getRecommendation(riskLevel, classification),
  };
};
