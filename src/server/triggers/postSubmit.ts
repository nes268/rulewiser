import { context, reddit, redis } from '@devvit/web/server';
import type { OnPostSubmitRequest, T3, TriggerResponse } from '@devvit/web/shared';
import { analyzePost } from '../analysis/engine';
import { buildWarningComment } from '../comments/warningComment';
import { rememberPostTitle, savePostData, saveViolation } from '../storage/redis';
import { getRulewiserSettings } from '../storage/rules';

const isPostId = (id: string): id is T3 => id.startsWith('t3_');

export const handlePostSubmit = async (
  input: OnPostSubmitRequest
): Promise<TriggerResponse> => {
  const post = input.post;

  if (!post) {
    return {
      status: 'ignored',
      message: 'PostSubmit trigger did not include a post.',
    };
  }

  console.log(`PostSubmit firing for post ${post.id}`);

  const subredditName = input.subreddit?.name ?? context.subredditName;
  const authorName = input.author?.name ?? 'there';
  const rulewiserSettings = await getRulewiserSettings();
  const analysis = await analyzePost(
    reddit,
    redis,
    {
      id: post.id,
      title: post.title,
      body: post.selftext || '',
      subreddit: subredditName,
      url: post.permalink || post.url,
    },
    rulewiserSettings
  );

  const analyzedAt = Date.now();
  await Promise.all([
    rememberPostTitle(post.id, post.title),
    savePostData(redis, post.id, { analysis, timestamp: analyzedAt }),
  ]);

  const hasViolations = analysis.violations.some(
    (violation) => violation.confidence >= rulewiserSettings.violationThreshold
  );
  const hasTitleIssues = analysis.titleIssues.some(
    (issue) => issue.confidence >= rulewiserSettings.violationThreshold
  );

  console.log(
    `RuleWiser analysis for ${post.id}: score=${analysis.overallScore}, risk=${analysis.riskLevel}, classification=${analysis.classification}, violations=${analysis.violations.length}, titleIssues=${analysis.titleIssues.length}, duplicate=${analysis.duplicate ? 'yes' : 'no'}, threshold=${rulewiserSettings.violationThreshold}, commentOnViolation=${rulewiserSettings.commentOnViolation}`
  );

  if (hasViolations || hasTitleIssues || analysis.duplicate) {
    if (rulewiserSettings.commentOnViolation && isPostId(post.id)) {
      const comment = buildWarningComment(authorName, analysis);
      const postedComment = await reddit.submitComment({ id: post.id, text: comment });
      await savePostData(redis, post.id, {
        analysis,
        timestamp: analyzedAt,
        botCommentId: postedComment.id,
      });
      console.log(`RuleWiser warning comment posted for ${post.id}`);
    }

    const hasSevereViolation = analysis.violations.some(
      (violation) => violation.confidence >= 90
    );
    const hasSevereTitleIssue = analysis.titleIssues.some(
      (issue) => issue.confidence >= 90
    );
    const hasSevereDuplicate =
      analysis.duplicate !== null && analysis.duplicate.confidence >= 90;

    if (
      rulewiserSettings.strictMode &&
      (hasSevereViolation || hasSevereTitleIssue || hasSevereDuplicate) &&
      isPostId(post.id)
    ) {
      await reddit.remove(post.id, false);
      console.log(`RuleWiser strict mode removed ${post.id}`);
    }

    await saveViolation(redis, subredditName, {
      postId: post.id,
      author: authorName,
      violations: analysis.violations,
      titleIssues: analysis.titleIssues,
      score: analysis.overallScore,
    });
  }

  return {
    status: 'success',
    message: `Analyzed post ${post.id} with ${analysis.violations.length} AI violation(s).`,
  };
};
