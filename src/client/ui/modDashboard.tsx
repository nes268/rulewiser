import { motion, type Variants } from 'framer-motion';
import { type ReactNode, useEffect, useState } from 'react';
import type { DashboardResponse } from '../../shared/api';

const formatDate = (timestamp: number) => {
  if (timestamp === 0) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
};

const brandLetters = 'RULEWISER'.split('');

const brandLetterVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 34,
    scale: 0.78,
    rotateX: -70,
    filter: 'blur(10px)',
  },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    filter: 'blur(0px)',
    transition: {
      delay: index * 0.08,
      duration: 0.48,
      ease: 'easeOut',
    },
  }),
};

const insightVariants: Variants = {
  rest: {
    opacity: 0,
    y: -8,
    scale: 0.96,
    filter: 'blur(6px)',
  },
  shown: {
    opacity: 0,
    y: -8,
    scale: 0.96,
    filter: 'blur(6px)',
  },
  hover: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.18,
      ease: 'easeOut',
    },
  },
};

type InsightCardProps = {
  children: ReactNode;
  className?: string;
  insight: string;
  revealDelay?: number;
};

const InsightCard = ({
  children,
  className = '',
  insight,
  revealDelay = 0,
}: InsightCardProps) => (
  <motion.div
    animate="shown"
    className={`rw-insight-wrap ${className}`}
    initial="rest"
    tabIndex={0}
    transition={{
      delay: revealDelay,
      type: 'spring',
      stiffness: 260,
      damping: 20,
    }}
    variants={{
      rest: { opacity: 0, y: 12, scale: 1 },
      shown: { opacity: 1, y: 0, scale: 1 },
      hover: { opacity: 1, y: -4, scale: 1.015 },
    }}
    whileFocus="hover"
    whileHover="hover"
  >
    {children}
    <motion.div className="rw-insight-popover" variants={insightVariants}>
      <span className="text-[0.58rem] font-black uppercase tracking-[0.2em] text-orange-200">
        Signal
      </span>
      <p className="mt-1 text-[0.66rem] leading-4 text-slate-200">{insight}</p>
    </motion.div>
  </motion.div>
);

const getVolumeInsight = (label: string, count: number) => {
  if (count === 0) {
    return `${label}: no stored hits.`;
  }

  if (count >= 10) {
    return `${label}: ${count} hits, heavy activity.`;
  }

  return `${label}: ${count} hit${count === 1 ? '' : 's'}.`;
};

const getHealthScoreInsight = (score: number) => {
  if (score >= 85) {
    return `${score}/100: healthy.`;
  }

  if (score >= 65) {
    return `${score}/100: watch trends.`;
  }

  return `${score}/100: needs attention.`;
};

const getRuleInsight = (
  rule: DashboardResponse['topRules'][number],
  index: number
) => {
  const rank = index === 0 ? 'top rule' : `rank #${index + 1}`;
  return `${rank}: ${rule.count} hit${rule.count === 1 ? '' : 's'}.`;
};

const getRepeatViolatorInsight = (
  violator: DashboardResponse['repeatViolators'][number]
) => {
  if (violator.count >= 3) {
    return `u/${violator.username}: ${violator.count} hits. Review.`;
  }

  return `u/${violator.username}: repeat signal.`;
};

const getRecentViolationInsight = (
  violation: DashboardResponse['recentViolations'][number]
) => {
  if (violation.score < 50) {
    return `Score ${violation.score}: urgent review.`;
  }

  if (violation.violationCount > 0) {
    return `${violation.violationCount} AI flag${violation.violationCount === 1 ? '' : 's'}.`;
  }

  return `${violation.titleIssueCount} title issue${violation.titleIssueCount === 1 ? '' : 's'}.`;
};

const RuleWiserIntro = () => (
  <motion.main
    animate={{ opacity: 1 }}
    className="rw-page flex items-center justify-center px-4"
    initial={{ opacity: 0 }}
    transition={{ duration: 0.28 }}
  >
    <motion.div
      animate={{ scale: [1, 1.1, 1], y: [0, -18, 0] }}
      className="rw-orb left-8 top-14 h-32 w-32 bg-orange-500/25"
      transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      animate={{ scale: [1.08, 1, 1.08], x: [0, -18, 0] }}
      className="rw-orb bottom-12 right-10 h-40 w-40 bg-cyan-400/15"
      transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.section
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="rw-panel rw-intro-panel relative z-10 p-8 text-center"
      initial={{ opacity: 0, y: 18, scale: 0.94 }}
      transition={{ duration: 0.38, ease: 'easeOut' }}
    >
      <motion.p
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="mb-4 text-xs font-black uppercase tracking-[0.32em] text-orange-200"
        initial={{ opacity: 0, y: -8, scale: 0.96 }}
        transition={{ delay: 0.18, duration: 0.3 }}
      >
        RuleWiser is waking up
      </motion.p>
      <div className="flex flex-wrap justify-center text-4xl font-black tracking-tight sm:text-7xl">
        {brandLetters.map((letter, index) => (
          <motion.span
            animate="visible"
            className="rw-brand-letter"
            custom={index}
            initial="hidden"
            key={`${letter}-${index}`}
            variants={brandLetterVariants}
          >
            {letter}
          </motion.span>
        ))}
      </div>
      <motion.p
        animate={{ opacity: 1, y: 0 }}
        className="mt-5 text-xs font-black uppercase tracking-[0.35em] text-slate-300"
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.92, duration: 0.3 }}
      >
        Loading analytics
      </motion.p>
      <div className="mt-6 flex justify-center gap-2">
        {[0, 1, 2].map((dot) => (
          <motion.span
            animate={{ opacity: [0.35, 1, 0.35], y: [0, -8, 0] }}
            className="rw-loading-dot"
            key={dot}
            transition={{
              delay: 0.95 + dot * 0.14,
              duration: 0.72,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </motion.section>
  </motion.main>
);

export const ModDashboard = () => {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const introTimer = window.setTimeout(() => {
      setShowIntro(false);
    }, 3200);

    return () => window.clearTimeout(introTimer);
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await fetch('/api/dashboard');

        if (!response.ok) {
          throw new Error(`Dashboard failed with HTTP ${response.status}`);
        }

        const data: DashboardResponse = await response.json();
        setDashboard(data);
      } catch (caughtError) {
        console.error('Failed to load dashboard', caughtError);
        setError('Could not load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  if (showIntro) {
    return <RuleWiserIntro />;
  }

  if (loading) {
    return (
      <motion.main
        animate={{ opacity: 1 }}
        className="rw-page flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1], y: [0, -12, 0] }}
          className="rw-orb left-10 top-12 h-24 w-24 bg-orange-500/20"
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
          <div className="rw-spinner" />
          <p className="mt-5 text-lg font-semibold">
            Loading RuleWiser analytics...
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Pulling live violation data from Redis.
          </p>
        </motion.section>
      </motion.main>
    );
  }

  if (error || !dashboard) {
    return (
      <motion.main
        animate={{ opacity: 1 }}
        className="rw-page flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
      >
        <motion.section
          animate={{ opacity: 1, y: 0 }}
          className="rw-panel relative z-10 max-w-sm border-red-500/40 bg-red-500/10 p-8 text-center text-red-100"
          initial={{ opacity: 0, y: 14 }}
        >
          <p className="text-lg font-semibold">
            {error ?? 'No dashboard data found.'}
          </p>
        </motion.section>
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
        className="rw-orb -left-10 top-20 h-32 w-32 bg-orange-500/20"
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        animate={{ scale: [1.04, 1, 1.04], x: [0, -14, 0] }}
        className="rw-orb bottom-20 right-6 h-36 w-36 bg-emerald-400/15"
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <section className="rw-shell">
        <motion.div
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="rw-panel flex flex-col gap-5 p-5 sm:p-6"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="rw-kicker">RuleWiser</p>
              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                Analytics Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                Live moderation signals from RuleWiser comments, strict-mode
                removals, duplicate checks, and title quality warnings.
              </p>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-orange-200">
                Hover or focus any card for deeper insights
              </p>
            </div>
            <InsightCard
              className="rw-card px-4 py-3 text-sm text-slate-300"
              insight={`Loaded ${dashboard.totalCount} total hit${dashboard.totalCount === 1 ? '' : 's'}.`}
            >
              Updated on load
            </InsightCard>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InsightCard
              className="rw-metric rw-card-hover p-5"
              insight={getHealthScoreInsight(dashboard.healthScore)}
              revealDelay={0.04}
            >
              <p className="text-4xl font-black text-emerald-100">
                {dashboard.healthScore}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-400">
                Health Score
              </p>
            </InsightCard>
            <InsightCard
              className="rw-metric rw-card-hover p-5"
              insight={getVolumeInsight('Today', dashboard.todayCount)}
              revealDelay={0.1}
            >
              <p className="text-4xl font-black text-orange-100">
                {dashboard.todayCount}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-400">Today</p>
            </InsightCard>
            <InsightCard
              className="rw-metric rw-card-hover p-5"
              insight={getVolumeInsight('Week', dashboard.weekCount)}
              revealDelay={0.16}
            >
              <p className="text-4xl font-black text-cyan-100">
                {dashboard.weekCount}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-400">
                This Week
              </p>
            </InsightCard>
            <InsightCard
              className="rw-metric rw-card-hover p-5"
              insight={getVolumeInsight('Total', dashboard.totalCount)}
              revealDelay={0.22}
            >
              <p className="text-4xl font-black text-emerald-100">
                {dashboard.totalCount}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-400">Total</p>
            </InsightCard>
          </div>

          <motion.section
            animate={{ opacity: 1, y: 0 }}
            className="rw-card p-5"
            initial={{ opacity: 0, y: 12 }}
            transition={{ delay: 0.24 }}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-100">
                Top Rule Violations
              </h2>
              <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-200">
                This week
              </span>
            </div>
            {dashboard.topRules.length > 0 ? (
              <div className="mt-4 flex flex-col gap-2">
                {dashboard.topRules.map((rule, index) => (
                  <InsightCard
                    className="rw-card-hover flex items-center justify-between rounded-xl border border-slate-700/70 bg-slate-950/55 px-4 py-3"
                    insight={getRuleInsight(rule, index)}
                    key={rule.rule}
                    revealDelay={index * 0.04}
                  >
                    <span className="font-medium">
                      {index + 1}. {rule.rule}
                    </span>
                    <span className="rounded-full bg-orange-500/10 px-3 py-1 text-sm font-bold text-orange-200">
                      {rule.count}
                    </span>
                  </InsightCard>
                ))}
              </div>
            ) : (
              <InsightCard
                className="mt-4 rounded-xl bg-slate-950/55 p-4 text-sm text-slate-400"
                insight="This week: no rule hits."
              >
                No stored violations this week yet.
              </InsightCard>
            )}
          </motion.section>

          {dashboard.repeatViolators.length > 0 ? (
            <motion.section
              animate={{ opacity: 1, y: 0 }}
              className="rw-card border-yellow-500/35 bg-yellow-500/10 p-5"
              initial={{ opacity: 0, y: 12 }}
              transition={{ delay: 0.28 }}
            >
              <h2 className="text-lg font-bold text-yellow-100">
                Repeat Violators
              </h2>
              <div className="mt-4 flex flex-col gap-2">
                {dashboard.repeatViolators.map((violator) => (
                  <InsightCard
                    className="flex items-center justify-between rounded-xl bg-slate-950/70 px-4 py-3"
                    insight={getRepeatViolatorInsight(violator)}
                    key={violator.username}
                  >
                    <span className="font-medium">u/{violator.username}</span>
                    <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-sm font-bold text-yellow-200">
                      {violator.count} violation
                      {violator.count === 1 ? '' : 's'}
                    </span>
                  </InsightCard>
                ))}
              </div>
            </motion.section>
          ) : null}

          <motion.section
            animate={{ opacity: 1, y: 0 }}
            className="rw-card p-5"
            initial={{ opacity: 0, y: 12 }}
            transition={{ delay: 0.32 }}
          >
            <h2 className="text-lg font-bold text-slate-100">
              Recent Violations
            </h2>
            {dashboard.recentViolations.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {dashboard.recentViolations.map((violation) => (
                  <InsightCard
                    className="rw-card-hover rounded-xl border border-slate-700/70 bg-slate-950/55 px-4 py-3"
                    insight={getRecentViolationInsight(violation)}
                    key={`${violation.postId}-${violation.timestamp}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold">u/{violation.author}</p>
                      <p className="text-sm text-slate-400">
                        {formatDate(violation.timestamp)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {violation.violationCount} AI violation(s),{' '}
                      {violation.titleIssueCount} title issue(s), score{' '}
                      {violation.score}/100
                    </p>
                  </InsightCard>
                ))}
              </div>
            ) : (
              <InsightCard
                className="mt-4 rounded-xl bg-slate-950/55 p-4 text-sm text-slate-400"
                insight="Recent queue: clear."
              >
                RuleWiser has not stored any violations yet.
              </InsightCard>
            )}
          </motion.section>
        </motion.div>
      </section>
    </motion.main>
  );
};
