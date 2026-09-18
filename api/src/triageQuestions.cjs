// ─── TypeSafe Structured Triage — questions, thresholds, and policy ─────────
//
// This is the single reviewable file for IssueCrush's structured triage. Everything
// a human needs to audit the AI behavior lives here: the exact question text sent to
// the model, the thresholds that gate UI behavior, and the pure function that maps
// answers to UI signals.
//
// Everything in this file is pure. No network calls, no Express, no secrets.
// The HTTP calls live in server.js (local Express) and api/src/app.js (Azure Functions).
//
// Why .cjs and why it lives here: Azure SWA deploys `api_location: "api"`, so anything
// the Functions app needs must sit inside api/. api/package.json sets "type": "module",
// so a plain .js here would be ESM and unreachable from the CommonJS root server.
// The .cjs extension lets both consume ONE file:
//   server.js      (CJS)  require('./api/src/triageQuestions.cjs')
//   api/src/app.js (ESM)  import triageConfig from './triageQuestions.cjs'
// Named ESM imports do not work against shorthand module.exports, so the ESM side
// default-imports and destructures.
//
// API contract: https://docs.typesafe.ai/api
//   POST https://api.typesafe.ai/v1/systemone
//   { state, model, questions } -> { model, answers, usage }
//   Noul   answer: { type, noul }                                (0..1, no confidence)
//   Choice answer: { type, choice, probabilities, confidence }
//   Score  answer: { type, score, legend, probabilities, confidence }

const TRIAGE_MODEL = 'jev-latest';

// Long issue bodies cost tokens without adding judgment value.
const MAX_BODY_CHARS = 4000;

// System One models answer fast. This is generous, not tight.
const TRIAGE_TIMEOUT_MS = 15000;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

// ─── Questions ──────────────────────────────────────────────────────────────
// Four independent judgments over the same state. Per the TypeSafe docs,
// independent questions go in one request and are answered in parallel.
// They cannot see one another's answers.

const TRIAGE_QUESTIONS = {
  recommended_action: {
    type: 'choice',
    instructions:
      'A maintainer is triaging this GitHub issue and must decide what to do with it next. ' +
      'Based on the title, body, labels, age, and discussion in `issue`, which single next ' +
      'step is most appropriate?',
    criteria: {
      implement:
        'The issue describes a concrete, well-understood change and there is enough detail ' +
        'to start work. The problem or request is clear, the expected behavior is stated or ' +
        'obvious, and no further input from the reporter is needed.',
      needs_info:
        'The issue is potentially valid but cannot be acted on as written. Key details are ' +
        'missing, such as reproduction steps, environment, error output, expected versus ' +
        'actual behavior, or the specific request being made. A maintainer would have to ask ' +
        'the reporter a question before any work could begin.',
      duplicate:
        'The issue restates a problem or request that the text itself indicates is already ' +
        'tracked elsewhere. For example, it references another issue covering the same thing, ' +
        'or the body says this was already reported.',
      stale_close:
        'The issue is no longer worth keeping open. It refers to a version, feature, or area ' +
        'of the codebase that the text indicates is obsolete, the reporter has withdrawn or ' +
        'resolved it themselves, or it is off topic, spam, or empty.',
      no_clear_action:
        'None of the other options fit. For example, the issue is an open-ended discussion, a ' +
        'question for the community, a tracking or meta issue holding other work, or a ' +
        'proposal that needs a product decision rather than a triage decision.',
    },
  },

  staleness: {
    type: 'score',
    instructions:
      'Judge how much this issue has gone stale: the degree to which it no longer reflects ' +
      'the current state of the project or no longer appears to matter to anyone. ' +
      '`issue.age_days` gives its age in days; weigh that together with what the text says.',
    criteria: [
      'Live. The issue reads as a current concern: it was filed recently, or it describes a ' +
        'problem that is still happening and still has attention.',
      'Quiet. The issue has sat without resolution for a while, but what it describes still ' +
        'applies to the project exactly as written.',
      'Drifting. The issue refers to an older version, a feature that has since changed, or a ' +
        'workflow the project has moved away from, so parts of it would need rechecking ' +
        'before anyone acted on it.',
      'Dead. The issue no longer applies at all: the reporter says it is resolved or ' +
        'withdrawn, it targets something that no longer exists, or it is empty, spam, or off topic.',
    ],
  },

  effort: {
    type: 'score',
    instructions:
      'How much engineering work would it take to resolve this issue as described? Judge the ' +
      'scope of the change itself, not how urgent or important it is.',
    criteria: [
      'Trivial. A typo, a copy edit, a documentation line, a config value, or a one-line ' +
        'change with no design decisions and no risk to other behavior.',
      'Small. A contained change in one place, such as fixing a single bug with a known cause, ' +
        'adding a small guard, or adjusting one component\u2019s behavior. A developer familiar ' +
        'with the code could finish it in a sitting.',
      'Substantial. Work spanning several files or components, a new feature of moderate size, ' +
        'or a bug whose cause still has to be found. Needs testing and some design thought.',
      'Large. A change that touches architecture, data models, public APIs, or many parts of ' +
        'the system at once, or an open-ended investigation with no known fix. Needs planning ' +
        'and review before work starts.',
    ],
  },

  is_actionable: {
    type: 'noul',
    instructions:
      'Could a developer start work on this issue right now without asking the reporter for ' +
      'more information?',
    criteria: {
      true:
        'Everything needed to begin is present. The problem or request is specific, and the ' +
        'expected outcome is clear enough that a developer could open the code and start, ' +
        'even if the fix itself requires investigation.',
      false:
        'Work cannot begin as written. The issue is vague, missing reproduction steps or key ' +
        'context, or asks a question rather than requesting a change, so a maintainer would ' +
        'have to reply before anything could happen.',
    },
  },
};

// ─── Thresholds ─────────────────────────────────────────────────────────────
// Starting points, not settled values. The TypeSafe docs are explicit that
// thresholds must be evaluated against real data. They live here so they can be
// tuned without touching inference or re-running anything.

const TRIAGE_THRESHOLDS = {
  // Below this the model is telling us it has no clear read. Show nothing rather
  // than a confident-looking wrong answer.
  minActionConfidence: 0.5,

  // Closing a GitHub issue is destructive and easy to miss. Keeping one is free.
  // The asymmetry in consequences is why the close hint is gated higher.
  closeSuggestionConfidence: 0.75,

  // A Noul is a probability of yes, not an intensity. Values in the middle mean
  // the model is genuinely split, so we read only the confident ends.
  actionableYes: 0.7,
  actionableNo: 0.3,

  // staleness score runs 0..3; at or above this the issue reads as no longer applying.
  staleScore: 2.0,

  // effort score runs 0..3; at or below this the work is small enough to flag.
  quickWinScore: 1.0,
};

// Which recommended_action outcomes point toward closing the issue.
const CLOSE_ACTIONS = ['stale_close', 'duplicate'];

// ─── State ──────────────────────────────────────────────────────────────────

/**
 * Shape a GitHub issue into the state object the questions reference.
 *
 * Lives beside the questions because the question text names specific state
 * fields (`issue.age_days`); definition and shaping have to stay in sync.
 *
 * Date arithmetic is a calculation, not a judgment, so age is computed here and
 * handed to the model as a fact rather than something it has to work out.
 */
function buildTriageState(issue) {
  const labelNames = issue.labels?.map((label) => label.name) ?? [];

  const fullBody = issue.body || '';
  const isBodyOversized = fullBody.length > MAX_BODY_CHARS;
  const body = isBodyOversized ? `${fullBody.slice(0, MAX_BODY_CHARS)}\n[truncated]` : fullBody;

  return {
    issue: {
      title: issue.title || '',
      body,
      labels: labelNames,
      repository: issue.repository?.full_name || 'unknown',
      author: issue.user?.login || 'unknown',
      state: issue.state || 'open',
      created_at: issue.created_at || null,
      age_days: ageInDays(issue.created_at),
      comment_count: issue.comments ?? 0,
    },
  };
}

function ageInDays(createdAt) {
  if (!createdAt) return null;

  const createdMs = Date.parse(createdAt);
  const isUnparseable = Number.isNaN(createdMs);
  if (isUnparseable) return null;

  const elapsedMs = Date.now() - createdMs;
  return Math.max(0, Math.floor(elapsedMs / MILLISECONDS_PER_DAY));
}

// ─── Policy ─────────────────────────────────────────────────────────────────

/**
 * Map raw TypeSafe answers to the signals the card renders.
 *
 * Pure. Same answers in, same signals out. Nothing here closes an issue: triage
 * decorates the card and the human still swipes.
 */
function interpretTriage(answers) {
  const action = answers?.recommended_action;
  const staleness = answers?.staleness;
  const effort = answers?.effort;
  const actionable = answers?.is_actionable;

  return {
    badge: buildBadge(action),
    chips: buildChips({ actionable, effort, staleness }),
    raw: {
      action: action?.choice ?? null,
      actionConfidence: action?.confidence ?? null,
      stalenessScore: staleness?.score ?? null,
      effortScore: effort?.score ?? null,
      actionableProbability: actionable?.noul ?? null,
    },
  };
}

function buildBadge(action) {
  const hasAction = Boolean(action?.choice);
  if (!hasAction) {
    return { label: 'NO CLEAR READ', tone: 'muted', suggests: null };
  }

  const confidence = action.confidence ?? 0;
  const isBelowFloor = confidence < TRIAGE_THRESHOLDS.minActionConfidence;
  if (isBelowFloor) {
    return { label: 'NO CLEAR READ', tone: 'muted', suggests: null };
  }

  const isCloseAction = CLOSE_ACTIONS.includes(action.choice);
  if (isCloseAction) {
    const isConfidentEnoughToHint =
      confidence >= TRIAGE_THRESHOLDS.closeSuggestionConfidence;

    // Below the close gate we still name what the model saw, but we withhold the
    // directional hint. Naming it is informative; nudging toward a destructive
    // swipe on a thin signal is not.
    if (!isConfidentEnoughToHint) {
      return { label: labelFor(action.choice), tone: 'neutral', suggests: null };
    }
    return { label: 'SUGGESTS CLOSE', tone: 'danger', suggests: 'close' };
  }

  if (action.choice === 'implement') {
    return { label: 'READY', tone: 'success', suggests: 'keep' };
  }
  if (action.choice === 'needs_info') {
    return { label: 'NEEDS INFO', tone: 'warning', suggests: 'keep' };
  }
  return { label: 'DISCUSSION', tone: 'neutral', suggests: null };
}

function labelFor(choice) {
  if (choice === 'stale_close') return 'STALE';
  if (choice === 'duplicate') return 'POSSIBLE DUPLICATE';
  return choice.toUpperCase();
}

function buildChips({ actionable, effort, staleness }) {
  const chips = [];

  const actionableProbability = actionable?.noul;
  const hasActionableAnswer = typeof actionableProbability === 'number';
  const isActionable =
    hasActionableAnswer && actionableProbability >= TRIAGE_THRESHOLDS.actionableYes;
  const isBlocked =
    hasActionableAnswer && actionableProbability <= TRIAGE_THRESHOLDS.actionableNo;

  if (isActionable) {
    chips.push({ label: 'ACTIONABLE', tone: 'success' });
  }
  if (isBlocked) {
    chips.push({ label: 'BLOCKED ON REPORTER', tone: 'warning' });
  }
  // Between the two thresholds we add nothing. A Noul near 0.5 means the model is
  // split, not that the issue is "medium actionable".

  const effortScore = effort?.score;
  const hasEffortAnswer = typeof effortScore === 'number';
  const isSmallEffort = hasEffortAnswer && effortScore <= TRIAGE_THRESHOLDS.quickWinScore;
  if (isSmallEffort && isActionable) {
    chips.push({ label: 'QUICK WIN', tone: 'success' });
  }

  const stalenessScore = staleness?.score;
  const hasStalenessAnswer = typeof stalenessScore === 'number';
  const isStale = hasStalenessAnswer && stalenessScore >= TRIAGE_THRESHOLDS.staleScore;
  if (isStale) {
    chips.push({ label: 'STALE', tone: 'danger' });
  }

  return chips;
}

module.exports = {
  TRIAGE_MODEL,
  TRIAGE_QUESTIONS,
  TRIAGE_THRESHOLDS,
  TRIAGE_TIMEOUT_MS,
  MAX_BODY_CHARS,
  CLOSE_ACTIONS,
  buildTriageState,
  interpretTriage,
};
