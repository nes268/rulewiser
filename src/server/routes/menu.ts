import { Hono } from 'hono';
import type { MenuItemRequest, T3, UiResponse } from '@devvit/web/shared';
import { context, reddit, redis } from '@devvit/web/server';
import { analyzePost } from '../analysis/engine';
import { createDashboardPost, createPreCheckPost } from '../core/post';
import { savePostData, saveViolation } from '../storage/redis';
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
