import { reddit } from '@devvit/web/server';

export const preCheckPostTitle = 'Check Your Post Before Submitting - RuleWiser';
export const dashboardPostTitle = 'RuleWiser Mod Dashboard';

export const createPreCheckPost = async () => {
  return await reddit.submitCustomPost({
    title: preCheckPostTitle,
    textFallback: {
      text: 'Open this post to pre-check a draft against the subreddit rules before publishing.',
    },
  });
};

export const createDashboardPost = async () => {
  return await reddit.submitCustomPost({
    title: dashboardPostTitle,
    entry: 'dashboard',
    textFallback: {
      text: 'Moderator dashboard for live RuleWiser violation data.',
    },
  });
};

const isRuleWiserManagedPost = (title: string) => {
  const normalizedTitle = title.trim().toLowerCase();

  if (
    normalizedTitle === preCheckPostTitle.toLowerCase() ||
    normalizedTitle === dashboardPostTitle.toLowerCase()
  ) {
    return true;
  }

  return (
    normalizedTitle.includes('rulewiser') &&
    (normalizedTitle.includes('dashboard') ||
      normalizedTitle.includes('pre-check') ||
      normalizedTitle.includes('precheck') ||
      normalizedTitle.includes('check your post'))
  );
};

const deleteOldPost = async (post: Awaited<ReturnType<typeof createPreCheckPost>>) => {
  try {
    await post.unsticky();
  } catch {
    // It is fine if the old post was not stickied.
  }

  try {
    await post.delete();
  } catch (deleteError) {
    console.error(`Could not delete old RuleWiser post ${post.id}:`, deleteError);
    await post.remove(false);
  }
};

export const cleanupOldRuleWiserPosts = async (
  subredditName: string,
  keepPostIds: string[]
): Promise<number> => {
  const keepIds = new Set(keepPostIds);
  const recentPosts = await reddit
    .getNewPosts({ subredditName, limit: 100, pageSize: 100 })
    .all();
  const oldRuleWiserPosts = recentPosts.filter(
    (post) => isRuleWiserManagedPost(post.title) && !keepIds.has(post.id)
  );

  await Promise.all(oldRuleWiserPosts.map((post) => deleteOldPost(post)));

  return oldRuleWiserPosts.length;
};

export const createPinnedRuleWiserPosts = async (subredditName: string) => {
  const [dashboardPost, preCheckPost] = await Promise.all([
    createDashboardPost(),
    createPreCheckPost(),
  ]);
  const deletedCount = await cleanupOldRuleWiserPosts(subredditName, [
    dashboardPost.id,
    preCheckPost.id,
  ]);

  await Promise.allSettled([preCheckPost.sticky(1), dashboardPost.sticky(2)]);

  return { dashboardPost, preCheckPost, deletedCount };
};

export const createPost = createPreCheckPost;
