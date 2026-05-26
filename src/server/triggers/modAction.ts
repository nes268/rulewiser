import { reddit, redis } from '@devvit/web/server';
import type { OnModActionRequest, T1, TriggerResponse } from '@devvit/web/shared';
import type { GeminiViolation } from '../analysis/geminiAnalysis';
import { getPostData } from '../storage/redis';

type StoredPostAnalysis = {
  analysis: {
    violations: GeminiViolation[];
  };
  botCommentId?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isGeminiViolation = (value: unknown): value is GeminiViolation =>
  isRecord(value) &&
  typeof value.rule === 'string' &&
  typeof value.confidence === 'number' &&
  typeof value.explanation === 'string' &&
  typeof value.suggestion === 'string';

const isCommentId = (id: string): id is T1 => id.startsWith('t1_');

const isStoredPostAnalysis = (value: unknown): value is StoredPostAnalysis => {
  if (!isRecord(value) || !isRecord(value.analysis)) {
    return false;
  }

  const hasValidCommentId =
    value.botCommentId === undefined || typeof value.botCommentId === 'string';

  return (
    hasValidCommentId &&
    Array.isArray(value.analysis.violations) &&
    value.analysis.violations.every(isGeminiViolation)
  );
};

export const handleModAction = async (
  input: OnModActionRequest
): Promise<TriggerResponse> => {
  const postId = input.targetPost?.id;

  if (!postId) {
    return {
      status: 'ignored',
      message: `Ignored moderator action ${input.action ?? 'unknown'} without a target post.`,
    };
  }

  console.log(`RuleWiser observed mod action ${input.action ?? 'unknown'} on ${postId}`);
  const postData = await getPostData(redis, postId);

  if (!isStoredPostAnalysis(postData)) {
    return {
      status: 'success',
      message: 'No stored RuleWiser analysis found for moderated post.',
    };
  }

  if (input.action === 'approvelink') {
    const botCommentId = postData.botCommentId;

    if (botCommentId && isCommentId(botCommentId)) {
      try {
        const botComment = await reddit.getCommentById(botCommentId);
        await botComment.delete();
        return {
          status: 'success',
          message: `Deleted RuleWiser bot comment ${botCommentId} after approval.`,
        };
      } catch (error) {
        console.error('Could not delete RuleWiser bot comment:', error);
        return {
          status: 'success',
          message: `Approved post ${postId}, but could not delete RuleWiser bot comment.`,
        };
      }
    }

    return {
      status: 'success',
      message: `Approved post ${postId}; no RuleWiser bot comment stored.`,
    };
  }

  if (input.action !== 'removelink') {
    return {
      status: 'ignored',
      message: `Ignored moderator action ${input.action ?? 'unknown'}.`,
    };
  }

  const topViolation = postData.analysis.violations[0];

  if (topViolation) {
    const message = `Suggested removal reason: ${topViolation.rule} - ${topViolation.explanation}`;
    console.log(message);

    return {
      status: 'success',
      message,
    };
  }

  return {
    status: 'success',
    message: 'Removed post had no stored RuleWiser violations.',
  };
};
