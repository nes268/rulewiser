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
      .filter((word) => word.length > 4)
  );
};

export const checkDuplicate = async (
  redisClient: RedisClient,
  subreddit: string,
  title: string
): Promise<DuplicateResult> => {
  const recentPosts = parseRecentPosts(
    await redisClient.get(recentPostsKey(subreddit))
  );

  if (recentPosts.length === 0) {
    return null;
  }

  const newKeywords = getKeywords(title);

  if (newKeywords.size === 0) {
    return null;
  }

  for (const post of recentPosts) {
    const existingKeywords = getKeywords(post.title);
    const intersection = new Set(
      [...newKeywords].filter((keyword) => existingKeywords.has(keyword))
    );
    const overlap =
      intersection.size / Math.max(newKeywords.size, existingKeywords.size);

    if (overlap > 0.6) {
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
  const cacheKey = recentPostsKey(subreddit);
  const posts = parseRecentPosts(await redisClient.get(cacheKey));

  posts.unshift(post);

  if (posts.length > maxRecentPosts) {
    posts.pop();
  }

  await redisClient.set(cacheKey, JSON.stringify(posts));
  await redisClient.expire(cacheKey, recentPostCacheSeconds);
};
