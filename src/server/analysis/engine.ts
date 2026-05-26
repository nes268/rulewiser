import type { RedditClient, RedisClient } from '@devvit/web/server';
import { cachePost, checkDuplicate, type DuplicateResult } from './duplicateDetect';
import {
  analyzeWithGemini,
  type GeminiAnalysisResponse,
  type GeminiViolation,
} from './geminiAnalysis';
import {
  scoreAnalysis,
  type ModerationClassification,
  type RiskLevel,
} from './scoring';
import { checkTitleDeterministic, type TitleIssue } from './titleCheck';
import { getSubredditRules, type RulewiserSettings } from '../storage/rules';

export type PostForAnalysis = {
  id: string;
  title: string;
  body: string;
  subreddit: string;
  url: string;
};

export type PostAnalysis = {
  violations: GeminiViolation[];
  titleIssues: TitleIssue[];
  duplicate: DuplicateResult;
  overallScore: number;
  titleQuality: number;
  suggestedTitles: string[];
  spamSignals: boolean;
  riskLevel: RiskLevel;
  classification: ModerationClassification;
  recommendation: string;
};

export const analyzePost = async (
  redditClient: RedditClient,
  redisClient: RedisClient,
  post: PostForAnalysis,
  settings: RulewiserSettings
): Promise<PostAnalysis> => {
  const [rules, duplicateResult, titleIssues] = await Promise.all([
    getSubredditRules(redditClient, redisClient, post.subreddit),
    checkDuplicate(redisClient, post.subreddit, post.title),
    Promise.resolve(checkTitleDeterministic(post.title)),
  ]);

  let aiResult: GeminiAnalysisResponse | null = null;

  try {
    aiResult = await analyzeWithGemini(
      post.title,
      post.body,
      rules,
      settings.customContext || '',
      settings.geminiApiKey || ''
    );
  } catch (error) {
    console.error('Analysis failed:', error);
  }

  await cachePost(redisClient, post.subreddit, {
    id: post.id,
    title: post.title,
    url: post.url,
  });
  const violations = aiResult?.violations ?? [];
  const spamSignals = aiResult?.spamSignals ?? false;
  const score = scoreAnalysis({
    aiOverallScore: aiResult?.overallScore,
    aiTitleQuality: aiResult?.titleQuality,
    violations,
    titleIssues,
    duplicate: duplicateResult,
    spamSignals,
  });

  return {
    violations,
    titleIssues,
    duplicate: duplicateResult,
    overallScore: score.overallScore,
    titleQuality: score.titleQuality,
    suggestedTitles: aiResult?.suggestedTitles ?? [],
    spamSignals,
    riskLevel: score.riskLevel,
    classification: score.classification,
    recommendation: score.recommendation,
  };
};
