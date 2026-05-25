import { redis, type RedisClient } from '@devvit/web/server';

const postTitleKey = (postId: string) => `post-title:${postId}`;
const postDataKey = (postId: string) => `post:${postId}`;
const violationsKey = (subreddit: string) => `violations:${subreddit}`;
const oneWeekInSeconds = 604_800;
const maxStoredViolations = 500;

export type PostData = Record<string, unknown>;
export type Violation = Record<string, unknown>;
export type StoredViolation = Violation & {
  timestamp: number;
};

const parseJson = (data: string): unknown => JSON.parse(data);

export const savePostData = async (
  redisClient: RedisClient,
  postId: string,
  data: PostData
): Promise<void> => {
  const key = postDataKey(postId);

  await redisClient.set(key, JSON.stringify(data));
  await redisClient.expire(key, oneWeekInSeconds);
};

export const getPostData = async (
  redisClient: RedisClient,
  postId: string
): Promise<unknown | null> => {
  const data = await redisClient.get(postDataKey(postId));

  return data ? parseJson(data) : null;
};

export const saveViolation = async (
  redisClient: RedisClient,
  subreddit: string,
  violation: Violation
): Promise<void> => {
  const key = violationsKey(subreddit);
  const existing = await redisClient.get(key);
  const parsed = existing ? parseJson(existing) : [];
  const list = Array.isArray(parsed) ? parsed : [];

  list.unshift({ ...violation, timestamp: Date.now() });

  if (list.length > maxStoredViolations) {
    list.pop();
  }

  await redisClient.set(key, JSON.stringify(list));
};

export const getViolations = async (
  redisClient: RedisClient,
  subreddit: string
): Promise<unknown[]> => {
  const data = await redisClient.get(violationsKey(subreddit));
  const parsed = data ? parseJson(data) : [];

  return Array.isArray(parsed) ? parsed : [];
};

export const rememberPostTitle = async (
  postId: string,
  title: string
): Promise<void> => {
  await redis.set(postTitleKey(postId), title);
};

export const getRememberedPostTitle = async (
  postId: string
): Promise<string | undefined> => {
  const title = await redis.get(postTitleKey(postId));

  return title ?? undefined;
};
