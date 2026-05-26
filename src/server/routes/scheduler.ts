import { Hono } from 'hono';
import { context, redis } from '@devvit/web/server';
import type { TaskResponse } from '@devvit/web/server';
import {
  getDailyAnalyticsRollup,
  saveAnalyticsRollup,
} from '../storage/analytics';

export const schedulerRoutes = new Hono();

schedulerRoutes.post('/daily-analytics-rollup', async (c) => {
  const subredditName = context.subredditName;
  const rollup = await getDailyAnalyticsRollup(redis, subredditName);

  await saveAnalyticsRollup(redis, subredditName, rollup);
  console.log(
    `Saved RuleWiser analytics rollup for ${subredditName}: count=${rollup.count}, avgScore=${rollup.avgScore}`
  );

  return c.json<TaskResponse>({}, 200);
});
