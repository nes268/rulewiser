import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import {
  analyzeWithGemini,
  type GeminiAnalysisResponse,
} from '../analysis/geminiAnalysis';
import { scoreAnalysis } from '../analysis/scoring';
import { checkTitleDeterministic } from '../analysis/titleCheck';
import { getViolations } from '../storage/redis';
import { getRulewiserSettings, getSubredditRules } from '../storage/rules';
import type {
  DashboardRecentViolation,
  DashboardRepeatViolator,
  DashboardResponse,
  DashboardRuleCount,
  DecrementResponse,
  IncrementResponse,
  InitResponse,
  PreCheckRequest,
  PreCheckResponse,
  PreCheckTitleIssue,
} from '../../shared/api';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getPreCheckRequest = (value: unknown): PreCheckRequest | undefined => {
  if (!isRecord(value) || typeof value.title !== 'string') {
    return undefined;
  }

  return {
    title: value.title,
    body: typeof value.body === 'string' ? value.body : '',
  };
};

type StoredViolationSummary = {
  postId: string;
  author: string;
  violations: PreCheckResponse['violations'];
  titleIssues: PreCheckResponse['titleIssues'];
  duplicateCount: number;
  spamSignalCount: number;
  riskLevel: PreCheckResponse['riskLevel'];
  classification: PreCheckResponse['classification'];
  score: number;
  timestamp: number;
};

const numberOrDefault = (value: unknown, fallback: number): number =>
  typeof value === 'number' ? value : fallback;

const stringOrDefault = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

const getTitleIssueType = (value: unknown): PreCheckTitleIssue['type'] => {
  if (
    value === 'too_short' ||
    value === 'too_long' ||
    value === 'all_caps' ||
    value === 'clickbait' ||
    value === 'vague_title' ||
    value === 'missing_body_context' ||
    value === 'excessive_punctuation'
  ) {
    return value;
  }

  return 'too_short';
};

const getRiskLevel = (value: unknown): PreCheckResponse['riskLevel'] => {
  if (
    value === 'low' ||
    value === 'medium' ||
    value === 'high' ||
    value === 'critical'
  ) {
    return value;
  }

  return 'medium';
};

const getClassification = (
  value: unknown
): PreCheckResponse['classification'] => {
  if (
    value === 'clean' ||
    value === 'title_quality_risk' ||
    value === 'rule_risk' ||
    value === 'duplicate_risk' ||
    value === 'spam_risk'
  ) {
    return value;
  }

  return 'title_quality_risk';
};

const getDuplicateCount = (value: unknown): number => {
  if (isRecord(value) && value.duplicate === true) {
    return 1;
  }

  return 0;
};

const getVisibleSignalCount = (violation: StoredViolationSummary): number =>
  violation.violations.length +
  violation.titleIssues.length +
  violation.duplicateCount +
  violation.spamSignalCount;

const getStoredViolations = (values: unknown[]): StoredViolationSummary[] => {
  const deduped = new Map<string, StoredViolationSummary>();

  for (const value of values) {
    const record = isRecord(value) ? value : {};
    const violations = Array.isArray(record.violations)
      ? record.violations.filter(isRecord).map((violation) => ({
          rule: stringOrDefault(violation.rule, 'Unknown rule'),
          confidence: numberOrDefault(violation.confidence, 0),
          explanation: stringOrDefault(violation.explanation, ''),
          suggestion: stringOrDefault(violation.suggestion, ''),
        }))
      : [];
    const titleIssues = Array.isArray(record.titleIssues)
      ? record.titleIssues.filter(isRecord).map((issue) => ({
          type: getTitleIssueType(issue.type),
          confidence: numberOrDefault(issue.confidence, 0),
        }))
      : [];
    const duplicateCount = getDuplicateCount(record.duplicate);
    const spamSignalCount = record.spamSignals === true ? 1 : 0;
    const summary = {
      postId: stringOrDefault(record.postId, 'unknown'),
      author: stringOrDefault(record.author, 'unknown'),
      violations,
      titleIssues,
      duplicateCount,
      spamSignalCount,
      riskLevel: getRiskLevel(record.riskLevel),
      classification: getClassification(record.classification),
      score: numberOrDefault(record.score, 100),
      timestamp: numberOrDefault(record.timestamp, 0),
    };

    if (getVisibleSignalCount(summary) === 0) {
      continue;
    }

    if (!deduped.has(summary.postId)) {
      deduped.set(summary.postId, summary);
    }
  }

  return [...deduped.values()];
};

const getTopRules = (
  violations: StoredViolationSummary[],
  thisWeek: number
): DashboardRuleCount[] => {
  const ruleCounts: Record<string, number> = {};

  for (const violationSummary of violations) {
    if (violationSummary.timestamp <= thisWeek) {
      continue;
    }

    for (const violation of violationSummary.violations) {
      ruleCounts[violation.rule] = (ruleCounts[violation.rule] ?? 0) + 1;
    }

    for (const titleIssue of violationSummary.titleIssues) {
      const rule = `Title: ${titleIssue.type.split('_').join(' ')}`;
      ruleCounts[rule] = (ruleCounts[rule] ?? 0) + 1;
    }

    if (violationSummary.duplicateCount > 0) {
      ruleCounts['Duplicate topic'] =
        (ruleCounts['Duplicate topic'] ?? 0) + violationSummary.duplicateCount;
    }

    if (violationSummary.spamSignalCount > 0) {
      ruleCounts['Spam or promotion signal'] =
        (ruleCounts['Spam or promotion signal'] ?? 0) +
        violationSummary.spamSignalCount;
    }
  }

  return Object.entries(ruleCounts)
    .sort((first, second) => second[1] - first[1])
    .slice(0, 5)
    .map(([rule, count]) => ({ rule, count }));
};

const getRepeatViolators = (
  violations: StoredViolationSummary[]
): DashboardRepeatViolator[] => {
  const userCounts: Record<string, number> = {};

  for (const violation of violations) {
    userCounts[violation.author] = (userCounts[violation.author] ?? 0) + 1;
  }

  return Object.entries(userCounts)
    .filter(([, count]) => count >= 2)
    .sort((first, second) => second[1] - first[1])
    .slice(0, 5)
    .map(([username, count]) => ({ username, count }));
};

const getRecentViolations = (
  violations: StoredViolationSummary[]
): DashboardRecentViolation[] => {
  return violations.slice(0, 10).map((violation) => ({
    postId: violation.postId,
    author: violation.author,
    score: violation.score,
    timestamp: violation.timestamp,
    violationCount: violation.violations.length,
    titleIssueCount: violation.titleIssues.length,
    duplicateCount: violation.duplicateCount,
    spamSignalCount: violation.spamSignalCount,
    primarySignal: getPrimarySignal(violation),
    riskLevel: violation.riskLevel,
    classification: violation.classification,
  }));
};

const getPrimarySignal = (violation: StoredViolationSummary): string => {
  if (violation.spamSignalCount > 0) {
    return 'Spam or promotion signal';
  }

  if (violation.duplicateCount > 0) {
    return 'Duplicate topic risk';
  }

  const firstViolation = violation.violations[0];

  if (firstViolation) {
    return firstViolation.rule;
  }

  const firstTitleIssue = violation.titleIssues[0];

  if (firstTitleIssue) {
    return `Title: ${firstTitleIssue.type.split('_').join(' ')}`;
  }

  return 'Stored moderation signal';
};

const getDashboardHealthScore = (
  violations: StoredViolationSummary[],
  thisWeek: number
): number => {
  const recentViolations = violations.filter(
    (violation) => violation.timestamp > thisWeek
  );

  if (recentViolations.length === 0) {
    return 100;
  }

  const totalScore = recentViolations.reduce(
    (sum, violation) => sum + violation.score,
    0
  );

  return Math.round(totalScore / recentViolations.length);
};

const getHealthStatus = (
  healthScore: number,
  totalCount: number
): DashboardResponse['healthStatus'] => {
  if (totalCount === 0) {
    return 'no_data';
  }

  if (healthScore >= 85) {
    return 'healthy';
  }

  if (healthScore >= 65) {
    return 'watch';
  }

  return 'needs_attention';
};

const getHealthDescription = (
  healthStatus: DashboardResponse['healthStatus']
): string => {
  switch (healthStatus) {
    case 'no_data':
      return 'No real RuleWiser flags are stored yet, so the dashboard is waiting for live moderation data.';
    case 'healthy':
      return 'Recent flagged posts are mostly low risk. Keep watching for repeat patterns.';
    case 'watch':
      return 'Recent flags show moderate risk. Review common signals before they become a trend.';
    case 'needs_attention':
      return 'Recent flags are high risk. Check the latest posts and recurring authors first.';
  }
};

api.get('/init', async (c) => {
  const { postId } = context;

  if (!postId) {
    console.error('API Init Error: postId not found in devvit context');
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required but missing from context',
      },
      400
    );
  }

  try {
    const [count, username] = await Promise.all([
      redis.get('count'),
      reddit.getCurrentUsername(),
    ]);

    return c.json<InitResponse>({
      type: 'init',
      postId: postId,
      count: count ? parseInt(count) : 0,
      username: username ?? 'anonymous',
    });
  } catch (error) {
    console.error(`API Init Error for post ${postId}:`, error);
    let errorMessage = 'Unknown error during initialization';
    if (error instanceof Error) {
      errorMessage = `Initialization failed: ${error.message}`;
    }
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage },
      400
    );
  }
});

api.post('/increment', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', 1);
  return c.json<IncrementResponse>({
    count,
    postId,
    type: 'increment',
  });
});

api.post('/decrement', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', -1);
  return c.json<DecrementResponse>({
    count,
    postId,
    type: 'decrement',
  });
});

api.post('/precheck', async (c) => {
  const input = getPreCheckRequest(await c.req.json<unknown>());

  if (!input || !input.title.trim()) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'A post title is required for pre-check analysis',
      },
      400
    );
  }

  try {
    const subredditName = context.subredditName;
    const [rulewiserSettings, rules] = await Promise.all([
      getRulewiserSettings(),
      getSubredditRules(reddit, redis, subredditName),
    ]);
    const titleIssues = checkTitleDeterministic(input.title, input.body);
    let aiResult: GeminiAnalysisResponse | null = null;

    try {
      aiResult = await analyzeWithGemini(
        input.title,
        input.body,
        rules,
        rulewiserSettings.customContext || '',
        rulewiserSettings.geminiApiKey || ''
      );
    } catch (error) {
      console.error(
        'Pre-check analysis failed, using deterministic only:',
        error
      );
    }

    const violations = aiResult?.violations ?? [];
    const spamSignals = aiResult?.spamSignals ?? false;
    const score = scoreAnalysis({
      aiOverallScore: aiResult?.overallScore,
      aiTitleQuality: aiResult?.titleQuality,
      violations,
      titleIssues,
      duplicate: null,
      spamSignals,
    });

    return c.json<PreCheckResponse>({
      type: 'precheck',
      violations,
      titleIssues,
      overallScore: score.overallScore,
      titleQuality: score.titleQuality,
      scoreBreakdown: score.scoreBreakdown,
      suggestedTitles: aiResult?.suggestedTitles ?? [],
      nextSteps: score.nextSteps,
      spamSignals,
      aiEnabled: true,
      riskLevel: score.riskLevel,
      classification: score.classification,
      recommendation: score.recommendation,
    });
  } catch (error) {
    console.error('Pre-check analysis failed:', error);
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'Pre-check analysis failed',
      },
      400
    );
  }
});

api.get('/dashboard', async (c) => {
  try {
    const now = Date.now();
    const today = now - 86_400_000;
    const thisWeek = now - 604_800_000;
    const violations = getStoredViolations(
      await getViolations(redis, context.subredditName)
    );
    const healthScore = getDashboardHealthScore(violations, thisWeek);
    const totalCount = violations.length;
    const healthStatus = getHealthStatus(healthScore, totalCount);

    return c.json<DashboardResponse>({
      type: 'dashboard',
      lastUpdatedAt: now,
      healthScore,
      healthStatus,
      healthDescription: getHealthDescription(healthStatus),
      todayCount: violations.filter((violation) => violation.timestamp > today)
        .length,
      weekCount: violations.filter(
        (violation) => violation.timestamp > thisWeek
      ).length,
      totalCount,
      topRules: getTopRules(violations, thisWeek),
      repeatViolators: getRepeatViolators(violations),
      recentViolations: getRecentViolations(violations),
    });
  } catch (error) {
    console.error('Dashboard fetch failed:', error);
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'Dashboard fetch failed',
      },
      400
    );
  }
});
