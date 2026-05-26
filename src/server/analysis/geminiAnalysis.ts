export type GeminiAnalysisInput = {
  title: string;
  body?: string;
  rules: GeminiRule[];
  customContext?: string;
  apiKey?: string;
};

export type GeminiRule = {
  name: string;
  description: string;
  violationReason?: string;
};

export type GeminiViolation = {
  rule: string;
  confidence: number;
  explanation: string;
  suggestion: string;
};

export type GeminiAnalysisResponse = {
  violations: GeminiViolation[];
  titleQuality: number;
  suggestedTitles: string[];
  spamSignals: boolean;
  overallScore: number;
  titleWarnings: string[];
};

export type GeminiAnalysisResult = {
  violatesRules: boolean;
  confidence: number;
  reasons: string[];
};

type RuleMatch = {
  ruleName: string;
  ruleText: string;
};

type TextSignal = {
  matched: string;
  confidence: number;
  explanation: string;
  suggestion: string;
  ruleHints: string[];
  fallbackRule: string;
  spam?: boolean;
};

const getNormalizedText = (value: string): string => value.trim().toLowerCase();

const getRuleMatch = (rule: GeminiRule, customContext: string): RuleMatch => {
  const ruleName = rule.name || 'Community rule';
  const ruleText = [
    rule.name,
    rule.description,
    rule.violationReason,
    customContext,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' ')
    .toLowerCase();

  return { ruleName, ruleText };
};

const findIncludedTerm = (text: string, terms: string[]): string | undefined =>
  terms.find((term) => text.includes(term));

const findMatchingRule = (
  rules: RuleMatch[],
  hints: string[],
  fallbackRule: string
): string => {
  const matchedRule = rules.find(({ ruleText }) =>
    hints.some((hint) => ruleText.includes(hint))
  );

  return matchedRule?.ruleName ?? fallbackRule;
};

const addViolation = (
  violations: GeminiViolation[],
  violation: GeminiViolation
): void => {
  const alreadyAdded = violations.some(
    (existing) =>
      existing.rule === violation.rule &&
      existing.explanation === violation.explanation
  );

  if (!alreadyAdded) {
    violations.push(violation);
  }
};

const addSignalViolation = (
  violations: GeminiViolation[],
  rules: RuleMatch[],
  signal: TextSignal
): void => {
  addViolation(violations, {
    rule: findMatchingRule(rules, signal.ruleHints, signal.fallbackRule),
    confidence: signal.confidence,
    explanation: signal.explanation,
    suggestion: signal.suggestion,
  });
};

const getPromotionSignals = (title: string, body: string): TextSignal[] => {
  const fullText = `${title} ${body}`;
  const signals: TextSignal[] = [];

  const hardPromo = findIncludedTerm(fullText, [
    'buy now',
    'limited time',
    'use my code',
    'discount',
    'coupon',
    'affiliate',
    'referral',
    'free giveaway',
    'dm me for',
    'contact me at',
  ]);

  if (hardPromo) {
    signals.push({
      matched: hardPromo,
      confidence: 94,
      explanation: `The post contains direct promotional language ("${hardPromo}"), which commonly triggers spam or self-promotion rules.`,
      suggestion:
        'Remove the promotional call-to-action, coupon, referral, or contact request before posting.',
      ruleHints: ['self-promo', 'promotion', 'advertis', 'spam', 'market'],
      fallbackRule: 'Promotion / spam signal',
      spam: true,
    });
  }

  const softPromo = findIncludedTerm(fullText, [
    'my channel',
    'my product',
    'my app',
    'my course',
    'subscribe',
    'follow me',
    'check out my',
  ]);

  if (softPromo) {
    signals.push({
      matched: softPromo,
      confidence: hardPromo ? 82 : 88,
      explanation: `The wording suggests self-promotion ("${softPromo}") rather than a neutral discussion post.`,
      suggestion:
        'Rewrite the post around the useful information you want to share, not the account, product, or channel.',
      ruleHints: ['self-promo', 'promotion', 'advertis', 'spam', 'market'],
      fallbackRule: 'Self-promotion signal',
      spam: true,
    });
  }

  const suspiciousLink = findIncludedTerm(fullText, [
    'bit.ly',
    'tinyurl',
    't.co/',
    'shorturl',
    'www.',
    'http://',
    'https://',
  ]);

  if (
    suspiciousLink &&
    (hardPromo || softPromo || /free|deal|offer/i.test(fullText))
  ) {
    signals.push({
      matched: suspiciousLink,
      confidence: 86,
      explanation: `The post combines a link ("${suspiciousLink}") with promotional wording, which can look unsafe to moderators.`,
      suggestion:
        'Use a clear source link only when it is necessary and explain why it helps the discussion.',
      ruleHints: ['link', 'spam', 'self-promo', 'advertis'],
      fallbackRule: 'Link spam signal',
      spam: true,
    });
  }

  return signals;
};

const getBehaviorSignals = (title: string, body: string): TextSignal[] => {
  const fullText = `${title} ${body}`;
  const signals: TextSignal[] = [];

  const harassment = findIncludedTerm(fullText, [
    'idiot',
    'moron',
    'stupid',
    'shut up',
    'hate you',
    'kill yourself',
  ]);

  if (harassment) {
    signals.push({
      matched: harassment,
      confidence: harassment === 'kill yourself' ? 98 : 88,
      explanation: `The post includes hostile or abusive wording ("${harassment}") that may violate civility rules.`,
      suggestion:
        'Remove insults and rewrite the point in neutral, constructive language.',
      ruleHints: ['civil', 'respect', 'harass', 'abuse', 'personal attack'],
      fallbackRule: 'Civility / harassment signal',
    });
  }

  const personalInfo = findIncludedTerm(fullText, [
    'phone number',
    'home address',
    'email address',
    'real name',
    'dox',
    'doxx',
  ]);

  if (personalInfo) {
    signals.push({
      matched: personalInfo,
      confidence: 92,
      explanation: `The post may expose personal information ("${personalInfo}"), which is high risk on Reddit.`,
      suggestion:
        'Remove private information and describe the situation without identifying details.',
      ruleHints: ['privacy', 'personal information', 'dox', 'doxx'],
      fallbackRule: 'Privacy signal',
    });
  }

  return signals;
};

const getSpoilerSignals = (title: string, body: string): TextSignal[] => {
  const fullText = `${title} ${body}`;
  const spoiler = findIncludedTerm(fullText, [
    'dies',
    'killed',
    'ending',
    'plot twist',
    'finale',
    'dead',
    'survives',
  ]);

  if (!spoiler) {
    return [];
  }

  return [
    {
      matched: spoiler,
      confidence: 80,
      explanation: `The post may reveal a spoiler ("${spoiler}") and could need a spoiler tag or clearer title.`,
      suggestion:
        'Add a spoiler tag/flair and remove direct spoiler details from the title.',
      ruleHints: ['spoiler'],
      fallbackRule: 'Spoiler signal',
    },
  ];
};

const getOffTopicSignals = (title: string, body: string): TextSignal[] => {
  const fullText = `${title} ${body}`;
  const offTopic = findIncludedTerm(fullText, [
    'politics',
    'election',
    'democrat',
    'republican',
    'trump',
    'biden',
    'vaccine',
    'covid',
  ]);

  if (!offTopic) {
    return [];
  }

  return [
    {
      matched: offTopic,
      confidence: 72,
      explanation: `The post mentions "${offTopic}", which is often off-topic unless the community explicitly allows it.`,
      suggestion:
        'Confirm this topic fits the subreddit or move the post to a more relevant community.',
      ruleHints: ['off-topic', 'off topic', 'stay on topic', 'relevant'],
      fallbackRule: 'Possible off-topic signal',
    },
  ];
};

const detectRuleSpecificViolations = (
  violations: GeminiViolation[],
  rule: RuleMatch,
  title: string,
  titleLower: string,
  fullText: string
): void => {
  const { ruleName, ruleText } = rule;

  if (
    (ruleText.includes('title must') ||
      ruleText.includes('title should') ||
      ruleText.includes('title include') ||
      ruleText.includes('title format')) &&
    (title.length < 15 || title.trim().split(/\s+/).filter(Boolean).length < 4)
  ) {
    addViolation(violations, {
      rule: ruleName,
      confidence: 82,
      explanation: `The title "${title}" may not satisfy this community's title-format rule because it lacks detail.`,
      suggestion: `Review rule "${ruleName}" and include the required context directly in the title.`,
    });
  }

  if (
    (ruleText.includes('no question') ||
      ruleText.includes('questions not allowed')) &&
    title.trim().endsWith('?')
  ) {
    addViolation(violations, {
      rule: ruleName,
      confidence: 85,
      explanation:
        'This community appears to restrict question-format posts, and the title is written as a question.',
      suggestion:
        'Rephrase the title as a discussion topic or statement if questions are not allowed here.',
    });
  }

  if (
    ruleText.includes('account age') ||
    ruleText.includes('karma requirement')
  ) {
    addViolation(violations, {
      rule: ruleName,
      confidence: 60,
      explanation:
        'This community mentions account age or karma requirements. New accounts may be filtered automatically.',
      suggestion:
        'Make sure the account meets the listed requirements before posting.',
    });
  }

  if (
    ruleText.includes('no meme') ||
    ruleText.includes('image macro') ||
    ruleText.includes('no reaction')
  ) {
    const memeTerm = findIncludedTerm(titleLower, [
      'meme',
      'lol',
      'lmao',
      'bruh',
      'based',
      'ratio',
      'ngl fr',
    ]);

    if (memeTerm) {
      addViolation(violations, {
        rule: ruleName,
        confidence: 78,
        explanation: `The title contains meme-style wording ("${memeTerm}") that may not fit this subreddit.`,
        suggestion:
          'Use a direct, descriptive title instead of casual meme wording.',
      });
    }
  }

  if (
    ruleText.includes('body required') &&
    fullText.trim().split(/\s+/).length < 12
  ) {
    addViolation(violations, {
      rule: ruleName,
      confidence: 75,
      explanation:
        'The post appears too short for a rule that requires meaningful body/context.',
      suggestion:
        'Add the background, what you tried, and the exact question or discussion point.',
    });
  }
};

const getTitleWarnings = (title: string, body: string): string[] => {
  const warnings: string[] = [];
  const trimmedTitle = title.trim();
  const titleWordCount = trimmedTitle.split(/\s+/).filter(Boolean).length;
  const bodyWordCount = body.trim().split(/\s+/).filter(Boolean).length;

  if (trimmedTitle.length < 10) {
    warnings.push('Title is too short - add the exact topic or context.');
  }

  if (titleWordCount < 4) {
    warnings.push('Title has too few words to be descriptive.');
  }

  if (trimmedTitle.length > 250) {
    warnings.push(
      'Title is very long - shorten it and move detail into the body.'
    );
  }

  if (trimmedTitle === trimmedTitle.toUpperCase() && trimmedTitle.length > 8) {
    warnings.push('Avoid writing in ALL CAPS.');
  }

  if (/\?\s*\?|!!+/.test(trimmedTitle)) {
    warnings.push('Avoid excessive punctuation like !! or ??.');
  }

  if (
    /^(help|question|issue|problem|anyone|pls|please help)\b/i.test(
      trimmedTitle
    )
  ) {
    warnings.push(
      'Starting with vague words like "Help" or "Question" makes titles unclear.'
    );
  }

  if (
    /click here|you won't believe|must see|gone wrong|shocking/i.test(
      trimmedTitle
    )
  ) {
    warnings.push('Title appears clickbait-style. Be specific and honest.');
  }

  if (bodyWordCount === 0 && titleWordCount < 7) {
    warnings.push(
      'Post has little body context, so the title must be more complete.'
    );
  }

  return warnings;
};

const getTitleWarningPenalty = (warning: string): number => {
  if (warning.includes('too short')) {
    return 30;
  }

  if (warning.includes('ALL CAPS')) {
    return 20;
  }

  if (warning.includes('clickbait')) {
    return 25;
  }

  if (warning.includes('too few words')) {
    return 20;
  }

  if (warning.includes('little body context')) {
    return 16;
  }

  return 10;
};

const getTitleQuality = (warnings: string[]): number => {
  const penalty = warnings.reduce(
    (total, warning) => total + getTitleWarningPenalty(warning),
    0
  );

  return Math.max(0, 100 - penalty);
};

const commonTopicWords = new Set([
  'about',
  'after',
  'again',
  'because',
  'before',
  'could',
  'draft',
  'having',
  'please',
  'question',
  'really',
  'should',
  'someone',
  'there',
  'thing',
  'things',
  'trying',
  'would',
]);

const countWords = (value: string): number =>
  value.trim().split(/\s+/).filter(Boolean).length;

const sentenceCase = (value: string): string => {
  const cleaned = value.trim();

  if (cleaned.length === 0) {
    return '';
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const trimTitlePunctuation = (value: string): string =>
  value
    .trim()
    .replace(/[.!?,:;-]+$/g, '')
    .trim();

const getSuggestionKey = (value: string): string =>
  trimTitlePunctuation(value).replace(/\s+/g, ' ').toLowerCase();

const addTitleSuggestion = (
  suggestions: string[],
  suggestion: string
): void => {
  const cleaned = sentenceCase(suggestion).replace(/\s+/g, ' ').trim();

  if (cleaned.length < 8) {
    return;
  }

  const normalized = getSuggestionKey(cleaned);
  const alreadyAdded = suggestions.some(
    (existing) => getSuggestionKey(existing) === normalized
  );

  if (!alreadyAdded) {
    suggestions.push(cleaned);
  }
};

const cleanTitleForSuggestion = (title: string): string => {
  let improved = title.trim();

  if (improved === improved.toUpperCase() && improved.length > 5) {
    improved =
      improved.charAt(0).toUpperCase() + improved.slice(1).toLowerCase();
  }

  improved = improved.replace(/!{2,}/g, '!').replace(/\?{2,}/g, '?');
  improved = improved
    .replace(/^(help|question|issue|problem|anyone|pls)\s*[-:,]\s*/i, '')
    .replace(/^please help\s*[-:,]?\s*/i, '')
    .replace(/^(click here|must see|shocking)\s*[-:,]?\s*/i, '')
    .replace(/\byou won't believe\b/gi, '')
    .replace(/\bgone wrong\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (
    /^(help|question|issue|problem|anyone|pls|please help)$/i.test(improved)
  ) {
    improved = '';
  }

  return sentenceCase(trimTitlePunctuation(improved));
};

const getReadableSnippet = (value: string): string => {
  const cleaned = value
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length === 0) {
    return '';
  }

  const sentence = cleaned
    .split(/[.!?]/)
    .map((part) => part.trim())
    .find((part) => countWords(part) >= 4);
  const source = sentence ?? cleaned;

  return trimTitlePunctuation(source.split(/\s+/).slice(0, 11).join(' '));
};

const getKeywordTopic = (value: string): string => {
  const keywords = value
    .toLowerCase()
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 4 && !commonTopicWords.has(word))
    .slice(0, 5);

  return keywords.length > 0 ? keywords.join(' ') : 'this post';
};

const getDraftTopic = (title: string, body: string): string => {
  const cleanedTitle = cleanTitleForSuggestion(title);

  if (countWords(cleanedTitle) >= 4 && cleanedTitle.length >= 18) {
    return trimTitlePunctuation(cleanedTitle);
  }

  const bodySnippet = getReadableSnippet(body);

  if (bodySnippet.length > 0) {
    return bodySnippet;
  }

  if (cleanedTitle.length > 0) {
    return trimTitlePunctuation(cleanedTitle);
  }

  return getKeywordTopic(`${title} ${body}`);
};

const getQuestionSuggestion = (topic: string, keywordTopic: string): string => {
  const cleanedTopic = trimTitlePunctuation(topic);

  if (
    /^(how|what|where|when|why|can|should|does|do|is|are)\b/i.test(cleanedTopic)
  ) {
    return `${sentenceCase(cleanedTopic)}?`;
  }

  return `What should I do next about ${keywordTopic}?`;
};

const getAdviceSuggestion = (topic: string): string =>
  `Need advice: ${sentenceCase(trimTitlePunctuation(topic))}`;

const getContextSuggestion = (keywordTopic: string): string =>
  `Help with ${keywordTopic}: what happened and what I tried`;

const generateTitleSuggestions = (
  title: string,
  body: string,
  violations: GeminiViolation[]
): string[] => {
  const suggestions: string[] = [];
  const cleaned = cleanTitleForSuggestion(title);
  const titleWordCount = title.trim().split(/\s+/).filter(Boolean).length;
  const draftTopic = getDraftTopic(title, body);
  const keywordTopic = getKeywordTopic(`${title} ${body}`);
  const hasPromoViolation = violations.some(
    (violation) =>
      violation.rule.toLowerCase().includes('promo') ||
      violation.rule.toLowerCase().includes('spam') ||
      violation.explanation.toLowerCase().includes('promotion')
  );

  if (cleaned !== title.trim() && countWords(cleaned) >= 3) {
    addTitleSuggestion(suggestions, cleaned);
  }

  if (hasPromoViolation) {
    addTitleSuggestion(
      suggestions,
      `Discussion: what I learned about ${keywordTopic}`
    );
  }

  if (titleWordCount < 4 && title.length < 40) {
    addTitleSuggestion(suggestions, getAdviceSuggestion(draftTopic));
    addTitleSuggestion(
      suggestions,
      getQuestionSuggestion(draftTopic, keywordTopic)
    );
    addTitleSuggestion(suggestions, getContextSuggestion(keywordTopic));
  } else if (title.length > 100) {
    const shortened = cleaned.split(/\s+/).slice(0, 12).join(' ');
    addTitleSuggestion(suggestions, shortened);
  }

  return suggestions.slice(0, 3);
};

const checkSpamSignals = (signals: TextSignal[]): boolean =>
  signals.some((signal) => signal.spam);

const getViolationPenalty = (violation: GeminiViolation): number => {
  if (violation.confidence >= 90) {
    return 34;
  }

  if (violation.confidence >= 75) {
    return 24;
  }

  return 12;
};

const clampScore = (score: number): number =>
  Math.max(0, Math.min(100, Math.round(score)));

const smartAnalyze = (
  title: string,
  body: string,
  rules: GeminiRule[],
  customContext: string
): GeminiAnalysisResponse => {
  const violations: GeminiViolation[] = [];
  const normalizedTitle = getNormalizedText(title);
  const normalizedBody = getNormalizedText(body || '');
  const fullText = `${normalizedTitle} ${normalizedBody}`;
  const ruleMatches = rules.map((rule) => getRuleMatch(rule, customContext));
  const signals = [
    ...getPromotionSignals(normalizedTitle, normalizedBody),
    ...getBehaviorSignals(normalizedTitle, normalizedBody),
    ...getSpoilerSignals(normalizedTitle, normalizedBody),
    ...getOffTopicSignals(normalizedTitle, normalizedBody),
  ];

  for (const signal of signals) {
    addSignalViolation(violations, ruleMatches, signal);
  }

  for (const rule of ruleMatches) {
    detectRuleSpecificViolations(
      violations,
      rule,
      title,
      normalizedTitle,
      fullText
    );
  }

  const titleWarnings = getTitleWarnings(title, body || '');
  const titleQuality = getTitleQuality(titleWarnings);
  const suggestedTitles = generateTitleSuggestions(
    title,
    body || '',
    violations
  );
  const spamSignals = checkSpamSignals(signals);
  const overallScore = clampScore(
    100 -
      violations.reduce(
        (total, violation) => total + getViolationPenalty(violation),
        0
      ) -
      titleWarnings.reduce(
        (total, warning) =>
          total + Math.round(getTitleWarningPenalty(warning) * 0.55),
        0
      ) -
      (spamSignals ? 16 : 0)
  );

  return {
    violations,
    titleQuality,
    suggestedTitles,
    spamSignals,
    overallScore,
    titleWarnings,
  };
};

export const analyzeWithGemini = async (
  title: string,
  body: string,
  rules: GeminiRule[],
  customContext: string,
  _apiKey: string
): Promise<GeminiAnalysisResponse> => {
  return smartAnalyze(title, body, rules, customContext);
};

export const runGeminiAnalysis = async (
  input: GeminiAnalysisInput
): Promise<GeminiAnalysisResult> => {
  const result = await analyzeWithGemini(
    input.title,
    input.body ?? '',
    input.rules,
    input.customContext ?? '',
    input.apiKey ?? ''
  );
  const confidence = Math.max(
    result.spamSignals ? 80 : 0,
    ...result.violations.map((violation) => violation.confidence)
  );

  return {
    violatesRules: result.violations.length > 0 || result.spamSignals,
    confidence,
    reasons: result.violations.map(
      (violation) =>
        `${violation.rule}: ${violation.explanation} Suggestion: ${violation.suggestion}`
    ),
  };
};
