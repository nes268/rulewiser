import { reddit } from '@devvit/web/server';

export const createPreCheckPost = async () => {
  return await reddit.submitCustomPost({
    title: 'Check Your Post Before Submitting - RuleWiser',
    textFallback: {
      text: 'Open this post to pre-check a draft against the subreddit rules before publishing.',
    },
  });
};

export const createDashboardPost = async () => {
  return await reddit.submitCustomPost({
    title: 'RuleWiser Mod Dashboard',
    entry: 'dashboard',
    textFallback: {
      text: 'Moderator dashboard for live RuleWiser violation data.',
    },
  });
};

export const createPost = createPreCheckPost;
