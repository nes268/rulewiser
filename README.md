# RuleWiser

### Intelligent pre-submission analysis for Reddit communities

RuleWiser is a Devvit Web app that helps Reddit users understand subreddit rules
before they post, while giving moderators a live view of recurring rule issues,
duplicate patterns, and community health.

## Links

| Resource | Description |
| --- | --- |
| [Live app](https://developers.reddit.com/apps/rulewiserr) | Install and try RuleWiser on Reddit |
| [Presentation](https://drive.google.com/file/d/1SDGqHUroe3Gx8VGqNB9FZB2OUcHhpqzA/view?usp=sharing) | Project overview deck (PDF) |
| [Documentation](https://drive.google.com/file/d/1uOtZxP5OJ1emqVB7kcE5OEBsxe1KInuJ/view?usp=sharing) | Full project documentation (PDF) |

---

## Why It Matters

Most removed posts are not malicious. They come from users who missed a rule,
wrote an unclear title, reposted a common question, or did not understand the
community’s posting expectations.

RuleWiser moves moderation earlier in the workflow. Instead of only reacting
after a bad post appears, it gives users practical feedback before submission and
gives moderators analytics after submission.

---

## Product Overview

### Pre-Check Assistant

A pinned custom post where users can paste a draft title and body before
submitting. RuleWiser returns:

- Overall post score
- Risk classification
- Rule-aware warnings
- Title quality feedback
- Suggested title rewrites
- Clear recommendation for what to fix next

### Post-Submit Guardian

Every new post is analyzed through Devvit’s `onPostSubmit` trigger. If RuleWiser
finds issues, it posts a clear warning comment with the relevant signal and a
suggested fix.

### Moderator Dashboard

A live dashboard shows saved moderation signals:

- Community health status
- Last 24 hours, 7-day, and total flag counts
- Top rule, title, duplicate, and spam patterns
- Repeat flagged authors
- Recent flagged posts with the exact reason shown
- Live refresh status and manual refresh

### Moderator Actions

RuleWiser adds moderator menu tools:

- **Re-Analyze** — rerun analysis on a post and show the latest score
- **Mark as False Positive** — store a false-positive marker for review
- **Clean RuleWiser Posts** — create the latest app posts, pin them, and remove
  older RuleWiser-managed posts

---

## How The Analysis Works

RuleWiser reads the draft the way a moderator would: it looks at the title, the
body, the community rules, and recent post patterns together. The result is a
clear score, a risk label, the reason behind the score, and practical next steps.

### 1. Title Quality Checks

Fast deterministic checks look for:

- Very short titles
- ALL CAPS
- Vague openers such as “help” or “question”
- Clickbait phrases
- Excessive punctuation
- Low descriptive detail
- Missing body context

### 2. Rule-Aware Pattern Matching

RuleWiser fetches and caches the subreddit’s rules, then checks post content
against rule text and moderator-provided context. It can flag patterns such as:

- Self-promotion or spam language
- Suspicious promotional links
- Harassment or civility concerns
- Possible privacy exposure
- Spoiler wording
- Off-topic terms
- Meme or reaction-post language
- Question-post restrictions
- Account-age or karma requirement notes

Each match includes a confidence score, explanation, and suggested fix.

### 3. Duplicate-Risk Detection

Recent post titles are compared against new submissions to identify likely
reposts or repeated questions. RuleWiser-managed app posts are ignored so the
dashboard stays focused on real community posts.

### 4. Score And Dashboard

When a post is flagged, RuleWiser saves the visible reason with the score. The
dashboard only shows records that have an actual signal, groups repeated checks
for the same post, and labels each recent item with the main reason it was
flagged.

---

## Architecture

```text
src/client
  splash.tsx              Inline feed card
  game.tsx                Pre-check app entry
  dashboard.tsx           Dashboard app entry
  ui/preCheckPost.tsx     Pre-check UI
  ui/modDashboard.tsx     Live analytics dashboard

src/server
  analysis/               Local analysis, scoring, title checks, duplicates
  comments/               Warning comment generation
  core/                   Custom post creation and cleanup
  routes/                 API, menu, trigger, scheduler endpoints
  storage/                Redis, rules cache, analytics helpers
  triggers/               App install, post submit, mod action handlers

src/shared
  api.ts                  Shared client/server response types
```

---

## Tech Stack

- **Devvit Web** — Reddit app platform
- **React 19** — custom post interfaces
- **Framer Motion** — polished motion and hover interactions
- **Tailwind CSS 4** — styling
- **Hono** — server route handling
- **Redis** — rules cache, post cache, analytics, violation history
- **Reddit API** — subreddit rules, posts, comments, triggers
- **TypeScript** — type-safe client, server, and shared contracts

---

## Installation

1. Open the RuleWiser app page.
2. Install it on a subreddit you moderate.
3. RuleWiser creates the Pre-Check post and Mod Dashboard post.
4. Optional: configure strict mode, warning comments, thresholds, and custom
   subreddit context in app settings.

No external AI key is required for the current local analysis engine.

---

## Local Development

Install dependencies:

```powershell
npm install
```

Run Devvit playtest:

```powershell
npm run dev
```

The playtest subreddit is configured in `devvit.json`.

Run checks:

```powershell
npm run type-check
npx eslint "src/**/*.{ts,tsx}"
npm run build
```

Upload a new app version:

```powershell
devvit upload
```

Submit for public review:

```powershell
$env:DEVVIT_ALLOW_SOURCE_UPLOAD="1"
devvit publish --public
```

---

## Current Status

Implemented:

- Pre-check custom post
- Post-submit analysis
- Warning comments
- Local deterministic intelligence engine
- Title suggestions
- Duplicate-risk detection
- Live moderator dashboard
- Health score
- Score breakdown and situation-specific next steps
- Recent flagged posts with visible rule, title, duplicate, or spam reasons
- Repeat violator reporting
- Re-analyze menu action
- False-positive menu action
- RuleWiser post cleanup menu action
- Bot comment cleanup on moderator approval
- Daily analytics rollup endpoint

In development / future plans:

- External AI API integration after access approval
- Deeper semantic duplicate matching beyond keyword overlap
- Richer false-positive review workflow
- Dashboard charts for longer time ranges
- More configurable rule-pattern templates per subreddit
- Public app review completion and broader marketplace availability

---

## License

BSD-3-Clause
