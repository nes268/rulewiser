export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type PreCheckRequest = {
  title: string;
  body: string;
};

export type PreCheckViolation = {
  rule: string;
  confidence: number;
  explanation: string;
  suggestion: string;
};

export type PreCheckTitleIssue = {
  type:
    | 'too_short'
    | 'too_long'
    | 'all_caps'
    | 'clickbait'
    | 'vague_title'
    | 'missing_body_context'
    | 'excessive_punctuation';
  confidence: number;
};

export type PreCheckScoreFactor = {
  label: string;
  points: number;
  detail: string;
  tone: 'positive' | 'warning' | 'danger';
};

export type PreCheckSituationSuggestion = {
  label: string;
  detail: string;
};

export type PreCheckResponse = {
  type: 'precheck';
  violations: PreCheckViolation[];
  titleIssues: PreCheckTitleIssue[];
  overallScore: number;
  titleQuality: number;
  scoreBreakdown: PreCheckScoreFactor[];
  suggestedTitles: string[];
  nextSteps: PreCheckSituationSuggestion[];
  spamSignals: boolean;
  aiEnabled: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  classification:
    | 'clean'
    | 'title_quality_risk'
    | 'rule_risk'
    | 'duplicate_risk'
    | 'spam_risk';
  recommendation: string;
};

export type DashboardRuleCount = {
  rule: string;
  count: number;
};

export type DashboardRepeatViolator = {
  username: string;
  count: number;
};

export type DashboardRecentViolation = {
  postId: string;
  author: string;
  score: number;
  timestamp: number;
  violationCount: number;
  titleIssueCount: number;
  duplicateCount: number;
  spamSignalCount: number;
  primarySignal: string;
  riskLevel: PreCheckResponse['riskLevel'];
  classification: PreCheckResponse['classification'];
};

export type DashboardResponse = {
  type: 'dashboard';
  lastUpdatedAt: number;
  healthScore: number;
  healthStatus: 'no_data' | 'healthy' | 'watch' | 'needs_attention';
  healthDescription: string;
  todayCount: number;
  weekCount: number;
  totalCount: number;
  topRules: DashboardRuleCount[];
  repeatViolators: DashboardRepeatViolator[];
  recentViolations: DashboardRecentViolation[];
};
