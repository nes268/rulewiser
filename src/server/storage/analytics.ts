import type { RedisClient } from '@devvit/web/server';
import { getViolations } from './redis';

const analyticsKey = (subreddit: string, date: string) =>
  `analytics:${subreddit}:${date}`;

const ninetyDaysInSeconds = 7_776_000;
const oneDayInMilliseconds = 86_400_000;
const oneWeekInMilliseconds = 604_800_000;

type ScoredViolation = {
  score: number;
  timestamp: number;
};

export type AnalyticsRollup = {
  date: string;
  count: number;
  avgScore: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getScoredViolations = (violations: unknown[]): ScoredViolation[] =>
  violations.map((violation) => {
    const record = isRecord(violation) ? violation : {};

    return {
      score: typeof record.score === 'number' ? record.score : 100,
      timestamp: typeof record.timestamp === 'number' ? record.timestamp : 0,
    };
  });

const getIsoDate = () => new Date().toISOString().split('T')[0] ?? 'unknown';

export const calculateHealthScore = async (
  redisClient: RedisClient,
  subreddit: string
): Promise<number> => {
  const violations = getScoredViolations(await getViolations(redisClient, subreddit));
  const weekAgo = Date.now() - oneWeekInMilliseconds;
  const recentViolations = violations.filter(
    (violation) => violation.timestamp > weekAgo
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

export const getDailyAnalyticsRollup = async (
  redisClient: RedisClient,
  subreddit: string
): Promise<AnalyticsRollup> => {
  const violations = getScoredViolations(await getViolations(redisClient, subreddit));
  const today = Date.now() - oneDayInMilliseconds;
  const todayViolations = violations.filter(
    (violation) => violation.timestamp > today
  );
  const totalScore = todayViolations.reduce(
    (sum, violation) => sum + violation.score,
    0
  );

  return {
    date: getIsoDate(),
    count: todayViolations.length,
    avgScore: Math.round(totalScore / (todayViolations.length || 1)),
  };
};

export const saveAnalyticsRollup = async (
  redisClient: RedisClient,
  subreddit: string,
  data: AnalyticsRollup
): Promise<void> => {
  await redisClient.set(analyticsKey(subreddit, data.date), JSON.stringify(data));
  await redisClient.expire(analyticsKey(subreddit, data.date), ninetyDaysInSeconds);
};
