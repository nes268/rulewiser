import type { RedisClient } from '@devvit/web/server';

export type RecentPost = {
  id: string;
  title: string;
  url: string;
};

export type DuplicateResult = {
  duplicate: true;
  matchedPost: RecentPost;
  confidence: number;
} | null;

const recentPostsKey = (subreddit: string) => `recentposts:${subreddit}`;
const recentPostCacheSeconds = 604_800;
const maxRecentPosts = 100;
const ruleWiserPostTitles = new Set([
  'check your post before submitting - rulewiser',
  'rulewiser mod dashboard',
  'rulewiser pre-post check: test your draft before submitting',
  'rulewiser moderator signal dashboard',
]);
const weakDuplicateWords = new Set([
  'about',
  'after',
  'again',
  'anyone',
  'before',
  'could',
  'first',
  'help',
  'issue',
  'please',
  'problem',
  'question',
  'should',
  'thing',
  'where',
  'which',
  'would',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isRecentPost = (value: unknown): value is RecentPost =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.title === 'string' &&
  typeof value.url === 'string';

const parseRecentPosts = (cached: string | undefined): RecentPost[] => {
  if (!cached) {
    return [];
  }

  const parsed: unknown = JSON.parse(cached);

  return Array.isArray(parsed) ? parsed.filter(isRecentPost) : [];
};

const getKeywords = (text: string): Set<string> => {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .split(' ')
      .filter((word) => word.length > 4 && !weakDuplicateWords.has(word))
  );
};

const shouldSkipDuplicateCheck = (title: string): boolean => {
  const normalized = title.trim().toLowerCase();

  return (
    ruleWiserPostTitles.has(normalized) ||
    (normalized.includes('rulewiser') &&
      (normalized.includes('dashboard') ||
        normalized.includes('pre-check') ||
        normalized.includes('pre-post') ||
        normalized.includes('check your post')))
  );
};

export const checkDuplicate = async (
  redisClient: RedisClient,
  subreddit: string,
  title: string
): Promise<DuplicateResult> => {
  if (shouldSkipDuplicateCheck(title)) {
    return null;
  }

  const recentPosts = parseRecentPosts(
    await redisClient.get(recentPostsKey(subreddit))
  ).filter((post) => !shouldSkipDuplicateCheck(post.title));

  if (recentPosts.length === 0) {
    return null;
  }

  const newKeywords = getKeywords(title);

  if (newKeywords.size < 2) {
    return null;
  }

  for (const post of recentPosts) {
    const existingKeywords = getKeywords(post.title);
    const intersection = new Set(
      [...newKeywords].filter((keyword) => existingKeywords.has(keyword))
    );
    if (existingKeywords.size < 2) {
      continue;
    }

    const overlap =
      intersection.size / Math.max(newKeywords.size, existingKeywords.size);

    if (overlap >= 0.65 && intersection.size >= 2) {
      return {
        duplicate: true,
        matchedPost: post,
        confidence: Math.round(overlap * 100),
      };
    }
  }

  return null;
};

export const cachePost = async (
  redisClient: RedisClient,
  subreddit: string,
  post: RecentPost
): Promise<void> => {
  if (shouldSkipDuplicateCheck(post.title)) {
    return;
  }

  const cacheKey = recentPostsKey(subreddit);
  const posts = parseRecentPosts(await redisClient.get(cacheKey)).filter(
    (recentPost) =>
      recentPost.id !== post.id && !shouldSkipDuplicateCheck(recentPost.title)
  );

  posts.unshift(post);

  if (posts.length > maxRecentPosts) {
    posts.pop();
  }

  await redisClient.set(cacheKey, JSON.stringify(posts));
  await redisClient.expire(cacheKey, recentPostCacheSeconds);
};
