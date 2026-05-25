import { redis } from '@devvit/web/server';
import type { OnModActionRequest, TriggerResponse } from '@devvit/web/shared';
import type { GeminiViolation } from '../analysis/geminiAnalysis';
import { getPostData } from '../storage/redis';

type StoredPostAnalysis = {
  analysis: {
    violations: GeminiViolation[];
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isGeminiViolation = (value: unknown): value is GeminiViolation =>
  isRecord(value) &&
  typeof value.rule === 'string' &&
  typeof value.confidence === 'number' &&
  typeof value.explanation === 'string' &&
  typeof value.suggestion === 'string';

const isStoredPostAnalysis = (value: unknown): value is StoredPostAnalysis => {
  if (!isRecord(value) || !isRecord(value.analysis)) {
    return false;
  }

  return (
    Array.isArray(value.analysis.violations) &&
    value.analysis.violations.every(isGeminiViolation)
  );
};

export const handleModAction = async (
  input: OnModActionRequest
): Promise<TriggerResponse> => {
  if (input.action !== 'removelink' || !input.targetPost?.id) {
    return {
      status: 'ignored',
      message: `Ignored moderator action ${input.action ?? 'unknown'}.`,
    };
  }

  const postData = await getPostData(redis, input.targetPost.id);

  if (!isStoredPostAnalysis(postData)) {
    return {
      status: 'success',
      message: 'No stored RuleWiser analysis found for removed post.',
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
