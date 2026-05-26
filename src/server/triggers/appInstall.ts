import type {
  OnAppInstallRequest,
  OnAppUpgradeRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { createPinnedRuleWiserPosts } from '../core/post';

export const handleAppInstall = async (
  input: OnAppInstallRequest | OnAppUpgradeRequest
): Promise<TriggerResponse> => {
  const subredditName = input.subreddit?.name;

  if (!subredditName) {
    return {
      status: 'ignored',
      message: 'App install trigger did not include a subreddit.',
    };
  }

  console.log('RuleWiser installed on', subredditName);
  const { dashboardPost, preCheckPost, deletedCount } =
    await createPinnedRuleWiserPosts(subredditName);

  return {
    status: 'success',
    message: `RuleWiser posts created in ${subredditName}: check=${preCheckPost.id}, dashboard=${dashboardPost.id}, cleaned=${deletedCount}.`,
  };
};
