export type TitleIssueType = 'too_short' | 'too_long' | 'all_caps' | 'clickbait';

export type TitleIssue = {
  type: TitleIssueType;
  confidence: number;
};

export const checkTitleDeterministic = (title: string): TitleIssue[] => {
  const issues: TitleIssue[] = [];
  const trimmedTitle = title.trim();
  const wordCount = trimmedTitle.split(/\s+/).filter(Boolean).length;

  if (trimmedTitle.length < 10 || wordCount < 3) {
    issues.push({ type: 'too_short', confidence: 95 });
  }

  if (title.length > 300) {
    issues.push({ type: 'too_long', confidence: 95 });
  }

  if (title === title.toUpperCase() && title.length > 10) {
    issues.push({ type: 'all_caps', confidence: 90 });
  }

  if (
    /click(bait|here)|you won't believe|must see|shocking|gone wrong/i.test(title) ||
    /\?\s*\?|!!+/.test(title) ||
    /^(help|question|issue|problem|anyone|pls|please help)\b/i.test(trimmedTitle)
  ) {
    issues.push({ type: 'clickbait', confidence: 85 });
  }

  return issues;
};
