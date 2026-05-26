# RuleWiser 🛡️

### Intelligent Pre-Submission Analysis for Reddit Communities

RuleWiser is a Devvit app that helps users avoid breaking subreddit rules
before they post — and gives moderators the analytics to understand why
violations happen.

## The Problem

Every day, Reddit moderators remove posts from users who simply did not know the
rules. AutoModerator enforces rules but cannot explain why, suggest fixes, or
detect semantic duplicates. RuleWiser closes that gap.

## Features

- Pre-Check Assistant — users check their draft before posting
- Post-Submit Guardian — auto-analyzes every post and comments warnings
- Semantic Duplicate Detection — catches paraphrased duplicates AutoModerator misses
- AI Title Rewriter — suggests better titles, not just rejection
- Mod Analytics Dashboard — violation trends, repeat violators, and health score
- Smart Removal Reasons — suggests removal reasons when mods remove flagged posts
- False Positive Marking — moderators can mark RuleWiser mistakes for review

## How to Install

1. Go to your subreddit.
2. Search for RuleWiser in the Devvit app directory.
3. Click Install.
4. Go to Mod Tools → App Settings → Add your Gemini API key.
5. Two posts are auto-created: Pre-Check post and Mod Dashboard.

## Tech Stack

- Devvit Web
- React 19
- Vite
- Tailwind CSS
- Hono
- Reddit API
- Google Gemini AI
- Redis
- TypeScript

## Development

```powershell
npm install
npm run dev
```

Playtest is configured for `r/TestRuleWiser` in `devvit.json`.

Useful checks:

```powershell
npm run type-check
npx eslint "src/**/*.{ts,tsx}"
npm run build
```
