export type TitleIssueType = 'too_short' | 'too_long' | 'all_caps' | 'clickbait';

export type TitleIssue = {
  type: TitleIssueType;
  confidence: number;
};

export const checkTitleDeterministic = (title: string): TitleIssue[] => {
  const issues: TitleIssue[] = [];

  if (title.length < 10) {
    issues.push({ type: 'too_short', confidence: 95 });
  }

  if (title.length > 300) {
    issues.push({ type: 'too_long', confidence: 95 });
  }

  if (title === title.toUpperCase() && title.length > 10) {
    issues.push({ type: 'all_caps', confidence: 90 });
  }

  if (/click(bait|here)|you won't believe/i.test(title)) {
    issues.push({ type: 'clickbait', confidence: 85 });
  }

  return issues;
};
