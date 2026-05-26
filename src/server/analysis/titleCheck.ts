export type TitleIssueType =
  | 'too_short'
  | 'too_long'
  | 'all_caps'
  | 'clickbait'
  | 'vague_title'
  | 'missing_body_context'
  | 'excessive_punctuation';

export type TitleIssue = {
  type: TitleIssueType;
  confidence: number;
};

export const checkTitleDeterministic = (
  title: string,
  body: string = ''
): TitleIssue[] => {
  const issues: TitleIssue[] = [];
  const trimmedTitle = title.trim();
  const wordCount = trimmedTitle.split(/\s+/).filter(Boolean).length;
  const bodyWordCount = body.trim().split(/\s+/).filter(Boolean).length;

  if (trimmedTitle.length < 10 || wordCount < 3) {
    issues.push({ type: 'too_short', confidence: 95 });
  }

  if (title.length > 300) {
    issues.push({ type: 'too_long', confidence: 95 });
  }

  if (title === title.toUpperCase() && title.length > 10) {
    issues.push({ type: 'all_caps', confidence: 90 });
  }

  if (/\?\s*\?|!!+|\.{3,}/.test(title)) {
    issues.push({ type: 'excessive_punctuation', confidence: 86 });
  }

  if (
    /click(bait|here)|you won't believe|must see|shocking|gone wrong/i.test(
      title
    )
  ) {
    issues.push({ type: 'clickbait', confidence: 85 });
  }

  if (
    /^(help|question|issue|problem|anyone|pls|please help)\b/i.test(
      trimmedTitle
    ) ||
    /^(help|question|issue|problem|anyone|pls|please help)$/i.test(trimmedTitle)
  ) {
    issues.push({ type: 'vague_title', confidence: wordCount <= 2 ? 92 : 82 });
  }

  if (bodyWordCount < 8 && wordCount < 7) {
    issues.push({ type: 'missing_body_context', confidence: 80 });
  }

  return issues;
};
