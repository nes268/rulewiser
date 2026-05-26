import { Hono } from 'hono';
import type { MenuItemRequest, T3, UiResponse } from '@devvit/web/shared';
import { context, reddit, redis } from '@devvit/web/server';
import { analyzePost } from '../analysis/engine';
import {
  createDashboardPost,
  createPinnedRuleWiserPosts,
  createPreCheckPost,
} from '../core/post';
import { markFalsePositive, savePostData, saveViolation } from '../storage/redis';
import { getRulewiserSettings } from '../storage/rules';

export const menu = new Hono();

const isPostId = (id: string): id is T3 => id.startsWith('t3_');

menu.post('/post-create', async (c) => {
  try {
    const post = await createPreCheckPost();

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to create post',
      },
      400
    );
  }
});

menu.post('/cleanup-rulewiser-posts', async (c) => {
  try {
    const { dashboardPost, deletedCount } = await createPinnedRuleWiserPosts(
      context.subredditName
    );

    return c.json<UiResponse>(
      {
        showToast: `Pinned latest RuleWiser posts and removed ${deletedCount} old post(s).`,
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${dashboardPost.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error cleaning RuleWiser posts: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to clean old RuleWiser posts',
      },
      400
    );
  }
});

menu.post('/reanalyze-post', async (c) => {
  try {
    const input = await c.req.json<MenuItemRequest>();

    if (!isPostId(input.targetId)) {
      return c.json<UiResponse>(
        {
          showToast: 'RuleWiser can only re-analyze posts',
        },
        400
      );
    }

    const [post, rulewiserSettings] = await Promise.all([
      reddit.getPostById(input.targetId),
      getRulewiserSettings(),
    ]);
    const analysis = await analyzePost(
      reddit,
      redis,
      {
        id: post.id,
        title: post.title,
        body: post.body || '',
        subreddit: post.subredditName,
        url: post.url,
      },
      rulewiserSettings
    );
    const issueCount =
      analysis.violations.length +
      analysis.titleIssues.length +
      (analysis.duplicate ? 1 : 0);

    await savePostData(redis, post.id, { analysis, timestamp: Date.now() });

    if (issueCount > 0) {
      await saveViolation(redis, post.subredditName, {
        postId: post.id,
        author: post.authorName,
        violations: analysis.violations,
        titleIssues: analysis.titleIssues,
        score: analysis.overallScore,
      });
    }

    return c.json<UiResponse>(
      {
        showToast: `Score: ${analysis.overallScore}/100 - ${issueCount} issue(s) found`,
      },
      200
    );
  } catch (error) {
    console.error(`Error re-analyzing post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'RuleWiser re-analysis failed',
      },
      400
    );
  }
});

menu.post('/false-positive-post', async (c) => {
  try {
    const input = await c.req.json<MenuItemRequest>();

    if (!isPostId(input.targetId)) {
      return c.json<UiResponse>(
        {
          showToast: 'RuleWiser can only mark posts as false positives',
        },
        400
      );
    }

    await markFalsePositive(redis, input.targetId);

    return c.json<UiResponse>(
      {
        showToast: 'Marked as false positive. RuleWiser will learn from this.',
      },
      200
    );
  } catch (error) {
    console.error(`Error marking false positive: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Could not mark this post as false positive',
      },
      400
    );
  }
});

menu.post('/dashboard-create', async (c) => {
  try {
    const post = await createDashboardPost();

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating dashboard post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to create dashboard post',
      },
      400
    );
  }
});
