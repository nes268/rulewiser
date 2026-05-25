import {
  settings,
  type RedditClient,
  type RedisClient,
} from '@devvit/web/server';

export type RulewiserSettings = {
  aiEnabled: boolean;
  strictMode: boolean;
  violationThreshold: number;
  commentOnViolation: boolean;
  customContext: string;
  geminiApiKey: string;
};

export type SubredditRuleSummary = {
  name: string;
  description: string;
  violationReason: string;
};

const subredditRulesKey = (subredditName: string) => `rules:${subredditName}`;
const rulesCacheSeconds = 3_600;

export const getRulewiserSettings = async (): Promise<RulewiserSettings> => {
  const [
    aiEnabled,
    strictMode,
    violationThreshold,
    commentOnViolation,
    customContext,
    geminiApiKey,
  ] = await Promise.all([
    settings.get<boolean>('aiEnabled'),
    settings.get<boolean>('strictMode'),
    settings.get<number>('violationThreshold'),
    settings.get<boolean>('commentOnViolation'),
    settings.get<string>('customContext'),
    settings.get<string>('geminiApiKey'),
  ]);

  return {
    aiEnabled: aiEnabled ?? true,
    strictMode: strictMode ?? false,
    violationThreshold: violationThreshold ?? 70,
    commentOnViolation: commentOnViolation ?? true,
    customContext: customContext ?? '',
    geminiApiKey: geminiApiKey ?? '',
  };
};

export const getSubredditRules = async (
  redditClient: RedditClient,
  redisClient: RedisClient,
  subredditName: string
): Promise<SubredditRuleSummary[]> => {
  const cacheKey = subredditRulesKey(subredditName);
  const cached = await redisClient.get(cacheKey);

  if (cached) {
    const parsed: unknown = JSON.parse(cached);

    return Array.isArray(parsed) ? parsed : [];
  }

  const subreddit = await redditClient.getSubredditByName(subredditName);
  const rules = await subreddit.getRules();
  const formatted = rules.map((rule) => ({
    name: rule.shortName,
    description: rule.description,
    violationReason: rule.violationReason,
  }));

  await redisClient.set(cacheKey, JSON.stringify(formatted));
  await redisClient.expire(cacheKey, rulesCacheSeconds);

  return formatted;
};
