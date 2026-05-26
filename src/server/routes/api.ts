import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import {
  analyzeWithGemini,
  type GeminiAnalysisResponse,
} from '../analysis/geminiAnalysis';
import { scoreAnalysis } from '../analysis/scoring';
import { checkTitleDeterministic } from '../analysis/titleCheck';
import { calculateHealthScore } from '../storage/analytics';
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
    value === 'clickbait'
  ) {
    return value;
  }

  return 'too_short';
};

const getStoredViolations = (values: unknown[]): StoredViolationSummary[] => {
  return values.map((value) => {
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

    return {
      postId: stringOrDefault(record.postId, 'unknown'),
      author: stringOrDefault(record.author, 'unknown'),
      violations,
      titleIssues,
      score: numberOrDefault(record.score, 100),
      timestamp: numberOrDefault(record.timestamp, 0),
    };
  });
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
      const rule = `Title: ${titleIssue.type.replace('_', ' ')}`;
      ruleCounts[rule] = (ruleCounts[rule] ?? 0) + 1;
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
  }));
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
    const titleIssues = checkTitleDeterministic(input.title);
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
      console.error('Pre-check analysis failed, using deterministic only:', error);
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
      suggestedTitles: aiResult?.suggestedTitles ?? [],
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
    const healthScore = await calculateHealthScore(redis, context.subredditName);

    return c.json<DashboardResponse>({
      type: 'dashboard',
      lastUpdatedAt: now,
      healthScore,
      todayCount: violations.filter((violation) => violation.timestamp > today)
        .length,
      weekCount: violations.filter((violation) => violation.timestamp > thisWeek)
        .length,
      totalCount: violations.length,
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
