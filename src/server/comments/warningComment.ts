import type { PostAnalysis } from '../analysis/engine';
import type { TitleIssue } from '../analysis/titleCheck';

const getTitleIssueMessage = (issue: TitleIssue): string => {
  switch (issue.type) {
    case 'too_short':
      return 'Your title is very short. Add specific details so moderators and readers can understand the post.';
    case 'too_long':
      return 'Your title is unusually long. Shorten it and move extra context into the body.';
    case 'all_caps':
      return 'Your title is written in all caps, which can look like shouting or spam.';
    case 'clickbait':
      return 'Your title contains clickbait phrasing. Rewrite it to describe the post directly.';
  }
};

const getClassificationLabel = (classification: PostAnalysis['classification']) => {
  return classification
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
};

export const buildWarningComment = (
  username: string,
  analysis: PostAnalysis
): string => {
  let comment = '🛡️ **RuleWiser Check** — *Automated posting assistant*\n\n';
  comment += `Hi u/${username}! I analyzed your post and found some things that might get it removed.\n\n---\n\n`;
  comment += `**Score:** ${analysis.overallScore}/100  \n`;
  comment += `**Risk:** ${analysis.riskLevel.toUpperCase()}  \n`;
  comment += `**Classification:** ${getClassificationLabel(analysis.classification)}\n\n`;
  comment += `${analysis.recommendation}\n\n---\n\n`;

  for (const violation of analysis.violations) {
    if (violation.confidence >= 70) {
      comment += `⚠️ **Warning — ${violation.rule}** *(Confidence: ${violation.confidence}%)*\n\n`;
      comment += `${violation.explanation}\n\n`;

      if (violation.suggestion) {
        comment += `> 💡 **Suggested fix:** ${violation.suggestion}\n\n`;
      }

      comment += '---\n\n';
    }
  }

  for (const issue of analysis.titleIssues) {
    if (issue.confidence >= 70) {
      comment += `⚠️ **Title Warning — ${issue.type.replace('_', ' ')}** *(Confidence: ${issue.confidence}%)*\n\n`;
      comment += `${getTitleIssueMessage(issue)}\n\n`;
      comment += '---\n\n';
    }
  }

  if (analysis.duplicate) {
    comment += `🔁 **Possible Duplicate** *(Confidence: ${analysis.duplicate.confidence}%)*\n\n`;
    comment += `This topic was recently discussed: ${analysis.duplicate.matchedPost.url}\n\n---\n\n`;
  }

  comment += '*You can edit your post to fix these issues.*\n';
  comment +=
    '*If this analysis is wrong, downvote this comment so a moderator can review.*';

  return comment;
};
