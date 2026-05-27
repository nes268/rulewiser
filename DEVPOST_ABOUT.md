# RuleWiser

### Intelligent pre-submission analysis for Reddit communities

---

## Inspiration

Reddit moderation is often reactive. A user submits a post, the post breaks a rule, a moderator removes it, and the user is left frustrated because they do not always understand what went wrong.

RuleWiser moves that guidance earlier. It helps users improve drafts before posting and gives moderators a clearer view of recurring community issues.

The goal is simple: fewer accidental rule breaks, less moderator cleanup, and a healthier posting experience for everyone.

---

## What It Does

### For Users: Pre-Check Assistant

RuleWiser creates a pinned custom post where users can paste a draft title and body before submitting. The app returns:

- Overall post score
- Risk classification
- Rule-aware warnings
- Title quality feedback
- Suggested title rewrites
- Clear recommendation for what to fix next

### For Users: Post-Submit Guardian

If someone skips pre-check, RuleWiser analyzes new posts through Devvit's `onPostSubmit` trigger. When it finds a strong issue, it posts a warning comment with the main signal, confidence score, explanation, and suggested fix.

If a moderator later approves the post, RuleWiser can remove its own bot comment to keep the thread clean.

### For Moderators: Live Dashboard

Moderators get a dedicated dashboard with:

- Community health status
- Last 24 hours, 7-day, and total flag counts
- Top recurring rule, title, duplicate, and spam patterns
- Repeat flagged authors
- Recent flagged posts with the exact reason shown
- Live refresh and manual refresh

### For Moderators: Menu Tools

RuleWiser adds practical moderation actions:

- **Re-Analyze**: rerun analysis on a post and show the latest result.
- **Mark as False Positive**: store incorrect detections for review.
- **Clean RuleWiser Posts**: remove older RuleWiser-created posts and pin the latest Pre-Check and Dashboard posts.

---

## Key Features

**Pre-Check Assistant**  
Users can test a title and body before submitting, reducing avoidable removals.

**Local Deterministic Intelligence Engine**  
The analyzer gives clear explanations, confidence scores, risk levels, and title suggestions without depending on an external AI service.

**Rule-Aware Analysis**  
RuleWiser reads subreddit rules and moderator context, then explains why a draft may be risky in that specific community.

**Title Rewrite Suggestions**  
Users receive specific title improvements instead of a generic rejection.

**Duplicate-Risk Detection**  
For submitted posts, recent titles are compared against new posts to highlight likely repeated topics.

**Live Moderator Dashboard**  
Moderators can see which rules cause friction, which users are repeatedly flagged, which signals are trending, and why each recent post appeared on the dashboard.

**Zero External AI Cost Today**  
Because the current system is local-first, it avoids AI API bills, rate limits, and demo-breaking request failures.

---

## How It Was Built

### Tech Stack

- **Devvit Web** for Reddit app integration, custom posts, triggers, menu items, settings, and scheduler routes.
- **React 19** for the Pre-Check and Dashboard interfaces.
- **Framer Motion** for animated loading, hover insights, and polished UI motion.
- **Tailwind CSS 4** for styling.
- **Hono** for server routing.
- **Devvit data storage** for rules cache, recent post cache, flag history, analytics, and false-positive markers.
- **Reddit API** for subreddit rules, posts, comments, and moderator workflows.
- **TypeScript** for shared client/server contracts.

### Analysis Pipeline

RuleWiser uses a layered local engine:

**1. Title quality checks**  
The app detects very short titles, all-caps titles, vague openers such as "help" or "question", clickbait phrases, excessive punctuation, weak descriptive detail, and missing body context.

**2. Built-in safety and quality signals**  
The analyzer looks for promotional spam, suspicious link patterns, self-promo phrases, harassment or civility concerns, possible privacy exposure, spoilers, and commonly off-topic terms.

**3. Rule-aware matching**  
The engine compares post content against actual subreddit rules and custom moderator context. If a subreddit has rules about titles, questions, spoilers, memes, account age, body requirements, or promotion, RuleWiser can connect the signal to that community's rule language.

**4. Duplicate-risk detection**  
Recent submitted post titles are compared against new titles using cleaned keyword overlap, while app-created RuleWiser posts and weak generic words are ignored to reduce false positives.

**5. Scoring and recommendations**  
RuleWiser combines violations, title quality, spam signals, and duplicate risk into an overall score, risk label, classification, score explanation, and next-step recommendation.

---

## Data Flow

```text
User submits a post
        |
Devvit post-submit trigger runs
        |
RuleWiser loads rules, settings, and recent post cache
        |
Local analyzer scores title, body, rules, spam, and duplicate risk
        |
If a real issue is found:
  - Warning comment is posted
  - The visible reason is saved with the score
  - Dashboard analytics are updated without duplicating the same post
        |
Moderators review signals in dashboard or menu actions
```

---

## Challenges

### Giving helpful feedback quickly

RuleWiser needs to respond fast while still giving users useful guidance. I focused on a local analysis flow that can explain scores, risks, and title suggestions right inside the Reddit app.

### Making each result feel specific

Different posts need different advice. RuleWiser checks title clarity, body context, duplicate topics, spam-like wording, and subreddit rules so the feedback matches the actual draft.

### Keeping the dashboard clear

Moderators need a dashboard that feels real and easy to trust. RuleWiser saves the visible reason with each flagged post, avoids duplicate rows for the same post, and shows the main signal clearly.

### Making the UI feel natural on Reddit

The Pre-Check and Dashboard both run inside Reddit, so the interface has to be simple, fast, and comfortable to use. The final UI uses clear cards, hover insights, and smooth motion to guide users without overwhelming them.

---

## What I Learned

- How to build a Devvit Web app with custom posts, triggers, menu items, scheduler endpoints, app settings, and saved moderation signals.
- How to design moderation tools for both users and moderators.
- How to turn platform constraints into a local-first product experience.
- How important clear explanations are when moderation feedback affects real users.

---

## Impact

RuleWiser changes moderation from a cleanup task into a guided workflow.

Users get feedback while they can still fix their post. Moderators get better visibility into repeated issues. Communities get a smoother posting experience without relying only on removals.

Expected benefits:

- Fewer accidental rule-breaking posts.
- More useful feedback for users.
- Faster moderator review.
- Better visibility into recurring rule confusion.
- Cleaner threads after moderator approval through bot-comment cleanup.

---

## Current Status

Implemented:

- Pre-Check custom post.
- Post-submit analysis.
- Warning comments.
- Local deterministic intelligence engine.
- Rule-aware analysis using subreddit rules and moderator context.
- Title quality checks and title suggestions.
- Duplicate-risk detection for submitted posts.
- Live moderator dashboard.
- Score breakdown and situation-specific next steps.
- Recent flagged posts with visible rule, title, duplicate, or spam reasons.
- Health score and analytics rollup endpoint.
- Re-analyze, false-positive, and cleanup menu actions.
- Bot comment cleanup after moderator approval.

In development / future plans:

- Real external AI API integration after access approval.
- Deeper semantic duplicate matching beyond keyword overlap.
- Richer false-positive review and learning workflow.
- Dashboard charts for 7-day, 30-day, and 90-day trends.
- More configurable rule templates per subreddit.
- Public review completion and broader marketplace availability.

---

## Links

| Resource | Link |
| --- | --- |
| Live app | [RuleWiser on Reddit](https://developers.reddit.com/apps/rulewiserr) |
| Presentation | [rulewiser_presentation.pdf](https://drive.google.com/file/d/1SDGqHUroe3Gx8VGqNB9FZB2OUcHhpqzA/view?usp=sharing) |
| Documentation | [RuleWiser_Documentation.pdf](https://drive.google.com/file/d/1uOtZxP5OJ1emqVB7kcE5OEBsxe1KInuJ/view?usp=sharing) |

## Try It

Install [RuleWiser](https://developers.reddit.com/apps/rulewiserr) on a subreddit you moderate. The app creates the Pre-Check post and Mod Dashboard, then starts analyzing new posts through Devvit triggers.

For a quick overview, see the [presentation deck](https://drive.google.com/file/d/1SDGqHUroe3Gx8VGqNB9FZB2OUcHhpqzA/view?usp=sharing). For full details, see the [documentation PDF](https://drive.google.com/file/d/1uOtZxP5OJ1emqVB7kcE5OEBsxe1KInuJ/view?usp=sharing).
