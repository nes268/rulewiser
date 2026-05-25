import type {
  OnAppInstallRequest,
  OnAppUpgradeRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { createDashboardPost, createPreCheckPost } from '../core/post';

export const handleAppInstall = async (
  input: OnAppInstallRequest | OnAppUpgradeRequest
): Promise<TriggerResponse> => {
  console.log('RuleWiser installed on', input.subreddit?.name);
  const [dashboardPost, preCheckPost] = await Promise.all([
    createDashboardPost(),
    createPreCheckPost(),
  ]);

  try {
    await preCheckPost.sticky(1);
  } catch (error) {
    console.error('Failed to sticky RuleWiser Check post:', error);
  }

  try {
    await dashboardPost.sticky(2);
  } catch (error) {
    console.error('Failed to sticky RuleWiser Dashboard post:', error);
  }

  return {
    status: 'success',
    message: `RuleWiser posts created in ${input.subreddit?.name ?? 'unknown subreddit'}: check=${preCheckPost.id}, dashboard=${dashboardPost.id}.`,
  };
};
