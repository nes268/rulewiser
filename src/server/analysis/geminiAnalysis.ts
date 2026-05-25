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
};

export type GeminiAnalysisResult = {
  violatesRules: boolean;
  confidence: number;
  reasons: string[];
};

const fallbackAnalysis: GeminiAnalysisResponse = {
  violations: [],
  overallScore: 100,
  titleQuality: 70,
  suggestedTitles: [],
  spamSignals: false,
};
const geminiModel = 'gemini-2.0-flash';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const numberOrDefault = (value: unknown, fallback: number): number =>
  typeof value === 'number' ? value : fallback;

const stringOrDefault = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const booleanOrDefault = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const stringArrayOrDefault = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];

const parseViolation = (value: unknown): GeminiViolation | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    rule: stringOrDefault(value.rule, 'Unknown rule'),
    confidence: numberOrDefault(value.confidence, 0),
    explanation: stringOrDefault(value.explanation),
    suggestion: stringOrDefault(value.suggestion),
  };
};

const parseViolations = (value: unknown): GeminiViolation[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<GeminiViolation[]>((violations, item) => {
    const violation = parseViolation(item);

    if (violation) {
      violations.push(violation);
    }

    return violations;
  }, []);
};

const normalizeAnalysis = (value: unknown): GeminiAnalysisResponse => {
  if (!isRecord(value)) {
    return fallbackAnalysis;
  }

  return {
    violations: parseViolations(value.violations),
    titleQuality: numberOrDefault(value.titleQuality, fallbackAnalysis.titleQuality),
    suggestedTitles: stringArrayOrDefault(value.suggestedTitles),
    spamSignals: booleanOrDefault(value.spamSignals, fallbackAnalysis.spamSignals),
    overallScore: numberOrDefault(value.overallScore, fallbackAnalysis.overallScore),
  };
};

const extractGeminiText = (data: unknown): string => {
  if (!isRecord(data) || !Array.isArray(data.candidates)) {
    return '';
  }

  const candidate: unknown = data.candidates[0];

  if (!isRecord(candidate) || !isRecord(candidate.content)) {
    return '';
  }

  const parts = candidate.content.parts;

  if (!Array.isArray(parts)) {
    return '';
  }

  const part: unknown = parts[0];

  return isRecord(part) ? stringOrDefault(part.text) : '';
};

export const analyzeWithGemini = async (
  title: string,
  body: string,
  rules: GeminiRule[],
  customContext: string,
  apiKey: string
): Promise<GeminiAnalysisResponse> => {
  if (!apiKey.trim()) {
    return fallbackAnalysis;
  }

  const rulesText = rules
    .map((rule, index) => `Rule ${index + 1} - ${rule.name}: ${rule.description}`)
    .join('\n');

  const prompt = `You are a Reddit moderation assistant. Analyze this post for rule violations.

SUBREDDIT RULES:
${rulesText}

${customContext ? `COMMUNITY CONTEXT: ${customContext}` : ''}

POST TITLE: ${title}
POST BODY: ${body || '(no body)'}

Respond ONLY with valid JSON, no extra text:
{
  "violations": [
    {
      "rule": "rule name",
      "confidence": 85,
      "explanation": "why this violates the rule",
      "suggestion": "how to fix it"
    }
  ],
  "titleQuality": 72,
  "suggestedTitles": ["better title 1", "better title 2"],
  "spamSignals": false,
  "overallScore": 68
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1000 },
      }),
    }
  );

  if (!response.ok) {
    console.error(`Gemini analysis failed with status ${response.status}`);
    return fallbackAnalysis;
  }

  const data: unknown = await response.json();
  const text = extractGeminiText(data);

  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    const analysis = normalizeAnalysis(JSON.parse(cleaned));
    console.log(
      `Gemini analysis completed: violations=${analysis.violations.length}, spamSignals=${analysis.spamSignals}`
    );

    return analysis;
  } catch {
    return fallbackAnalysis;
  }
};

export const runGeminiAnalysis = async (
  input: GeminiAnalysisInput
): Promise<GeminiAnalysisResult> => {
  if (!input.apiKey) {
    return {
      violatesRules: false,
      confidence: 0,
      reasons: ['Gemini analysis skipped because no API key is configured.'],
    };
  }

  const result = await analyzeWithGemini(
    input.title,
    input.body ?? '',
    input.rules,
    input.customContext ?? '',
    input.apiKey
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
