import { motion, type Variants } from 'framer-motion';
import { type ReactNode, useState } from 'react';
import type { PreCheckResponse } from '../../shared/api';

const getTitleIssueLabel = (
  type: PreCheckResponse['titleIssues'][number]['type']
) => {
  return type
    .split('_')
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ');
};

const getTitleIssueDescription = (
  type: PreCheckResponse['titleIssues'][number]['type']
) => {
  switch (type) {
    case 'too_short':
      return 'Add more specific context so readers understand what the post is about.';
    case 'too_long':
      return 'Shorten the title and move extra context into the body.';
    case 'all_caps':
      return 'Avoid all caps because it can look like shouting or spam.';
    case 'clickbait':
      return 'Rewrite the title to describe the post directly.';
  }
};

const getScoreTone = (score: number) => {
  if (score >= 85) {
    return 'text-emerald-200';
  }

  if (score >= 65) {
    return 'text-yellow-200';
  }

  return 'text-red-200';
};

const getClassificationLabel = (
  classification: PreCheckResponse['classification']
) => {
  return classification
    .split('_')
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ');
};

const getRiskClasses = (riskLevel: PreCheckResponse['riskLevel']) => {
  switch (riskLevel) {
    case 'low':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
    case 'medium':
      return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-100';
    case 'high':
      return 'border-orange-500/30 bg-orange-500/10 text-orange-100';
    case 'critical':
      return 'border-red-500/30 bg-red-500/10 text-red-100';
  }
};

const preCheckCardVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay, duration: 0.34, ease: 'easeOut' },
  }),
  hover: {
    opacity: 1,
    y: -4,
    scale: 1.012,
    transition: { type: 'spring', stiffness: 260, damping: 20 },
  },
};

const preCheckPopoverVariants: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.96, filter: 'blur(6px)' },
  show: { opacity: 0, y: -8, scale: 0.96, filter: 'blur(6px)' },
  hover: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.18, ease: 'easeOut' },
  },
};

type PreCheckInsightCardProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  insight: string;
};

const PreCheckInsightCard = ({
  children,
  className = '',
  delay = 0,
  insight,
}: PreCheckInsightCardProps) => (
  <motion.div
    animate="show"
    className={`rw-insight-wrap ${className}`}
    custom={delay}
    initial="hidden"
    tabIndex={0}
    variants={preCheckCardVariants}
    whileFocus="hover"
    whileHover="hover"
  >
    {children}
    <motion.div
      className="rw-insight-popover"
      variants={preCheckPopoverVariants}
    >
      <span className="text-[0.58rem] font-black uppercase tracking-[0.2em] text-orange-200">
        Signal
      </span>
      <p className="mt-1 text-[0.66rem] leading-4 text-slate-200">{insight}</p>
    </motion.div>
  </motion.div>
);

const getOverallScoreInsight = (score: number) => {
  if (score >= 85) {
    return `${score}/100: likely safe.`;
  }

  if (score >= 65) {
    return `${score}/100: revise first.`;
  }

  return `${score}/100: high risk.`;
};

const getRiskInsight = (result: PreCheckResponse) =>
  `${getClassificationLabel(result.classification)}: ${result.riskLevel} risk.`;

const getSignalCountInsight = (count: number) => {
  if (count === 0) {
    return '0 signals: clean pass.';
  }

  return `${count} signal${count === 1 ? '' : 's'}: review cards.`;
};

const getTitleQualityInsight = (quality: number) => {
  if (quality >= 85) {
    return `${quality}/100: strong title.`;
  }

  if (quality >= 65) {
    return `${quality}/100: usable, polish.`;
  }

  return `${quality}/100: rewrite title.`;
};

const getAiStatusInsight = (aiEnabled: boolean) =>
  aiEnabled
    ? 'Local rules engine completed.'
    : 'Rules-only fallback completed.';

const getViolationInsight = (
  violation: PreCheckResponse['violations'][number]
) =>
  `${violation.confidence}%: ${violation.suggestion ? 'fix available' : 'manual review'}.`;

const getTitleIssueInsight = (issue: PreCheckResponse['titleIssues'][number]) =>
  `${issue.confidence}%: ${getTitleIssueLabel(issue.type)}.`;

const getSuggestedTitlesInsight = (count: number) =>
  `${count} rewrite option${count === 1 ? '' : 's'} based on this draft.`;

const loadingDots = [0, 1, 2];

export const PreCheckPost = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [result, setResult] = useState<PreCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!title.trim()) {
      setError('Add a title before running the pre-check.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/precheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      });

      if (!response.ok) {
        throw new Error(`Pre-check failed with HTTP ${response.status}`);
      }

      const data: PreCheckResponse = await response.json();
      setResult(data);
    } catch (caughtError) {
      console.error('Pre-check failed', caughtError);
      setError('Could not analyze this draft. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <motion.main
        animate={{ opacity: 1 }}
        className="rw-page flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1], y: [0, -12, 0] }}
          className="rw-orb left-8 top-10 h-24 w-24 bg-orange-500/20"
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          animate={{ scale: [1.06, 1, 1.06], x: [0, -12, 0] }}
          className="rw-orb bottom-10 right-8 h-28 w-28 bg-cyan-400/15"
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.section
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="rw-panel relative z-10 flex max-w-sm flex-col items-center p-8 text-center"
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <div className="flex justify-center gap-2">
            {loadingDots.map((dot) => (
              <motion.span
                animate={{ opacity: [0.35, 1, 0.35], y: [0, -8, 0] }}
                className="rw-loading-dot"
                key={dot}
                transition={{
                  delay: dot * 0.14,
                  duration: 0.72,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
          <p className="mt-5 text-lg font-semibold">
            Checking against subreddit rules...
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            RuleWiser is reviewing your draft title and body.
          </p>
        </motion.section>
      </motion.main>
    );
  }

  if (result) {
    const issueCount =
      result.violations.length +
      result.titleIssues.length +
      (result.spamSignals ? 1 : 0);

    return (
      <motion.main
        animate={{ opacity: 1 }}
        className="rw-page px-4 py-6"
        initial={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1], y: [0, -12, 0] }}
          className="rw-orb -left-8 top-16 h-28 w-28 bg-orange-500/20"
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          animate={{ scale: [1.04, 1, 1.04], x: [0, -14, 0] }}
          className="rw-orb bottom-14 right-8 h-32 w-32 bg-emerald-400/15"
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <section className="rw-shell">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="rw-panel flex flex-col gap-5 p-5 sm:p-6"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="rw-kicker">Analysis Complete</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                  RuleWiser verdict
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  {result.aiEnabled
                    ? 'The local rules engine reviewed this draft.'
                    : 'RuleWiser reviewed this draft with fallback checks.'}
                </p>
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-orange-200">
                  Hover or focus any result card to see why it matters
                </p>
              </div>
              <PreCheckInsightCard
                className="rw-metric min-w-36 p-4 text-center"
                insight={getOverallScoreInsight(result.overallScore)}
              >
                <p
                  className={`text-4xl font-black ${getScoreTone(result.overallScore)}`}
                >
                  {result.overallScore}
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Overall Score
                </p>
              </PreCheckInsightCard>
            </div>

            <PreCheckInsightCard
              className={`rounded-2xl border p-4 ${getRiskClasses(result.riskLevel)}`}
              delay={0.05}
              insight={getRiskInsight(result)}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] opacity-80">
                    {result.riskLevel} risk
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    {getClassificationLabel(result.classification)}
                  </h2>
                </div>
                <span className="rounded-full border border-current/20 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                  Classified
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 opacity-90">
                {result.recommendation}
              </p>
            </PreCheckInsightCard>

            <div className="grid gap-3 sm:grid-cols-3">
              <PreCheckInsightCard
                className="rw-metric p-4"
                delay={0.08}
                insight={getSignalCountInsight(issueCount)}
              >
                <p className="text-2xl font-black text-slate-100">
                  {issueCount}
                </p>
                <p className="text-sm text-slate-400">Signals found</p>
              </PreCheckInsightCard>
              <PreCheckInsightCard
                className="rw-metric p-4"
                delay={0.14}
                insight={getTitleQualityInsight(result.titleQuality)}
              >
                <p className="text-2xl font-black text-slate-100">
                  {result.titleQuality}
                </p>
                <p className="text-sm text-slate-400">Title quality</p>
              </PreCheckInsightCard>
              <PreCheckInsightCard
                className="rw-metric p-4"
                delay={0.2}
                insight={getAiStatusInsight(result.aiEnabled)}
              >
                <p className="text-2xl font-black text-slate-100">
                  {result.aiEnabled ? 'Local' : 'Fallback'}
                </p>
                <p className="text-sm text-slate-400">Analysis mode</p>
              </PreCheckInsightCard>
            </div>

            {result.violations.length > 0 ? (
              <div className="flex flex-col gap-3">
                {result.violations.map((violation, index) => (
                  <PreCheckInsightCard
                    className="rw-card rw-card-hover border-orange-500/40 bg-orange-500/10 p-4"
                    delay={index * 0.05}
                    insight={getViolationInsight(violation)}
                    key={`${violation.rule}-${index}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-bold text-orange-100">
                        {violation.rule}
                      </h2>
                      <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-bold text-orange-200">
                        {violation.confidence}% confidence
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-200">
                      {violation.explanation}
                    </p>
                    {violation.suggestion ? (
                      <p className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm leading-6 text-emerald-100">
                        Suggested fix: {violation.suggestion}
                      </p>
                    ) : null}
                  </PreCheckInsightCard>
                ))}
              </div>
            ) : null}

            {result.titleIssues.length > 0 ? (
              <div className="flex flex-col gap-3">
                {result.titleIssues.map((issue) => (
                  <PreCheckInsightCard
                    className="rw-card rw-card-hover border-yellow-500/40 bg-yellow-500/10 p-4"
                    delay={0.08}
                    insight={getTitleIssueInsight(issue)}
                    key={issue.type}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-bold text-yellow-100">
                        Title Warning - {getTitleIssueLabel(issue.type)}
                      </h2>
                      <span className="rounded-full bg-yellow-500/15 px-3 py-1 text-xs font-bold text-yellow-200">
                        {issue.confidence}% confidence
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-200">
                      {getTitleIssueDescription(issue.type)}
                    </p>
                  </PreCheckInsightCard>
                ))}
              </div>
            ) : null}

            {result.suggestedTitles.length > 0 ? (
              <PreCheckInsightCard
                className="rw-card border-emerald-500/30 bg-emerald-500/10 p-4"
                delay={0.12}
                insight={getSuggestedTitlesInsight(
                  result.suggestedTitles.length
                )}
              >
                <h2 className="font-bold text-emerald-100">
                  Stronger title options
                </h2>
                <p className="mt-2 text-sm leading-6 text-emerald-50/80">
                  These use the topic from your draft instead of generic filler.
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
                  {result.suggestedTitles.map((suggestedTitle) => (
                    <li
                      className="rounded-lg bg-slate-950/45 p-3"
                      key={suggestedTitle}
                    >
                      {suggestedTitle}
                    </li>
                  ))}
                </ul>
              </PreCheckInsightCard>
            ) : null}

            {result.violations.length === 0 &&
            result.titleIssues.length === 0 ? (
              <PreCheckInsightCard
                className="rw-card border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100"
                insight={`Score ${result.overallScore}: no major flags.`}
              >
                No major issues found. Your draft looks ready to post.
              </PreCheckInsightCard>
            ) : null}

            <motion.button
              whileHover={{ scale: 1.015, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="rw-button px-5 py-3"
              onClick={() => setResult(null)}
              type="button"
            >
              Check another draft
            </motion.button>
          </motion.div>
        </section>
      </motion.main>
    );
  }

  return (
    <motion.main
      animate={{ opacity: 1 }}
      className="rw-page px-4 py-6"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        animate={{ scale: [1, 1.08, 1], y: [0, -12, 0] }}
        className="rw-orb left-6 top-12 h-28 w-28 bg-orange-500/20"
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        animate={{ scale: [1.04, 1, 1.04], x: [0, -14, 0] }}
        className="rw-orb bottom-12 right-6 h-32 w-32 bg-cyan-400/15"
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <section className="rw-shell">
        <motion.div
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="rw-panel rw-precheck-panel"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <div className="rw-precheck-hero border-b border-slate-700/50 p-5 sm:p-6">
            <div className="flex flex-col gap-5">
              <div>
                <p className="rw-kicker">RuleWiser</p>
                <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                  Pre-Post Check
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                  Test a real draft before it hits the queue. RuleWiser reads
                  the title and body together, then points out rule, duplicate,
                  spam, and title-quality risks.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-200">
                {['Rule scan', 'Title clarity', 'Posting risk'].map(
                  (label, index) => (
                    <motion.span
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-full border border-orange-300/25 bg-slate-950/45 px-4 py-2 shadow-sm shadow-orange-950/20"
                      initial={{ opacity: 0, y: 10 }}
                      key={label}
                      transition={{ delay: 0.08 + index * 0.05 }}
                    >
                      {label}
                    </motion.span>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_0.8fr]">
            <div className="flex flex-col gap-4">
              <label className="rw-card rw-card-hover flex flex-col gap-2 p-4">
                <span className="flex items-center justify-between gap-3 text-sm font-bold text-slate-200">
                  Draft title
                  <span className="text-xs font-semibold text-slate-500">
                    Required
                  </span>
                </span>
                <input
                  className="rw-field px-4 py-3"
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Example: Need advice on fixing a Vite deploy error"
                  value={title}
                />
              </label>

              <label className="rw-card rw-card-hover flex flex-col gap-2 p-4">
                <span className="text-sm font-bold text-slate-200">
                  Draft body{' '}
                  <span className="font-medium text-slate-500">(optional)</span>
                </span>
                <textarea
                  className="rw-field min-h-44 resize-none px-4 py-3"
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Add the context moderators need: what happened, what you tried, and what help you want."
                  value={body}
                />
              </label>

              {error ? (
                <p className="rw-card border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">
                  {error}
                </p>
              ) : null}

              <motion.button
                whileHover={{ scale: 1.015, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="rw-button px-5 py-3"
                disabled={!title.trim()}
                onClick={() => void handleAnalyze()}
                type="button"
              >
                Analyze my draft
              </motion.button>
            </div>

            <motion.aside
              animate={{ opacity: 1, x: 0 }}
              className="rw-card flex flex-col justify-between gap-5 p-5"
              initial={{ opacity: 0, x: 16 }}
              transition={{ delay: 0.12, duration: 0.4 }}
            >
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                  What RuleWiser checks
                </p>
                <div className="mt-4 flex flex-col gap-3 text-sm leading-6 text-slate-300">
                  <PreCheckInsightCard
                    className="rounded-2xl border border-slate-700/70 bg-slate-950/45 p-3"
                    delay={0.16}
                    insight="Rule hits explain which subreddit expectation might be broken and how confident RuleWiser is."
                  >
                    Rule-specific warnings tied to the draft.
                  </PreCheckInsightCard>
                  <PreCheckInsightCard
                    className="rounded-2xl border border-slate-700/70 bg-slate-950/45 p-3"
                    delay={0.22}
                    insight="Title checks catch wording that can look spammy, vague, clickbait, or too loud."
                  >
                    Title clarity checks for vague, loud, or clickbait wording.
                  </PreCheckInsightCard>
                  <PreCheckInsightCard
                    className="rounded-2xl border border-slate-700/70 bg-slate-950/45 p-3"
                    delay={0.28}
                    insight="Suggestions are meant to help you fix the post before moderators need to intervene."
                  >
                    Title rewrites that use your actual topic and body context.
                  </PreCheckInsightCard>
                </div>
              </div>
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4"
                initial={{ opacity: 0, y: 12 }}
                transition={{ delay: 0.35, duration: 0.3 }}
              >
                <p className="text-sm font-semibold text-orange-100">
                  Tip: paste the same title and body you plan to submit. More
                  context makes the result feel less generic.
                </p>
              </motion.div>
            </motion.aside>
          </div>
        </motion.div>
      </section>
    </motion.main>
  );
};
