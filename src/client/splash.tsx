import './index.css';

import { navigateTo } from '@devvit/web/client';
import { requestExpandedMode } from '@devvit/web/client';
import { motion } from 'framer-motion';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const Splash = () => {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="rw-page flex min-h-screen items-center justify-center px-4 py-5"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
    >
      <motion.div
        animate={{ scale: [1, 1.08, 1], x: [0, 10, 0], y: [0, -12, 0] }}
        className="rw-orb left-8 top-8 h-20 w-20 bg-orange-500/20"
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        animate={{ scale: [1.05, 1, 1.05], x: [0, -12, 0], y: [0, 10, 0] }}
        className="rw-orb bottom-8 right-8 h-24 w-24 bg-cyan-400/15"
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.section
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="rw-panel relative z-10 w-full max-w-md p-5 text-center"
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <motion.div
          animate={{ rotate: [0, -4, 4, 0] }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 shadow-lg shadow-orange-950/30"
          transition={{ delay: 0.35, duration: 0.9, ease: 'easeInOut' }}
        >
          <img className="h-10 w-10 object-contain" src="/snoo.png" alt="Snoo" />
        </motion.div>
        <p className="rw-kicker mx-auto mt-5">RuleWiser</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
          Check before you post
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">
          Get a fast rule check, title quality review, and moderation guidance
          before publishing.
        </p>
        <div className="mt-6 flex items-center justify-center">
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="rw-button px-5 py-3"
            onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
          >
            Open Pre-Check
          </motion.button>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-400">
          <span className="text-orange-200/90">
            AI review
          </span>
          <span className="h-1 w-1 rounded-full bg-slate-600" />
          <span>
            Duplicates
          </span>
          <span className="h-1 w-1 rounded-full bg-slate-600" />
          <span>
            Title check
          </span>
        </div>
      </motion.section>
      <footer className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-3 text-[0.75em] text-slate-500">
        <button
          className="transition-colors hover:text-orange-200"
          onClick={() => navigateTo('https://developers.reddit.com/docs')}
        >
          Docs
        </button>
        <span className="text-slate-700">|</span>
        <button
          className="transition-colors hover:text-orange-200"
          onClick={() => navigateTo('https://www.reddit.com/r/Devvit')}
        >
          r/Devvit
        </button>
        <span className="text-slate-700">|</span>
        <button
          className="transition-colors hover:text-orange-200"
          onClick={() => navigateTo('https://discord.com/invite/R7yu2wh9Qz')}
        >
          Discord
        </button>
      </footer>
    </motion.div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
