const {
  TRIAGE_MODEL,
  TRIAGE_QUESTIONS,
  TRIAGE_THRESHOLDS,
  TRIAGE_TIMEOUT_MS,
  MAX_BODY_CHARS,
  CLOSE_ACTIONS,
  buildTriageState,
  interpretTriage,
  parseUpstreamError,
} = require('./api/src/triageQuestions.cjs');

// Builds a full answers payload, so each test can override just the part it cares about.
function makeAnswers(overrides = {}) {
  return {
    recommended_action: {
      type: 'choice',
      choice: 'implement',
      probabilities: { implement: 0.9, needs_info: 0.04, duplicate: 0.02, stale_close: 0.02, no_clear_action: 0.02 },
      confidence: 0.9,
    },
    staleness: {
      type: 'score',
      score: 0.4,
      legend: {},
      probabilities: {},
      confidence: 0.8,
    },
    effort: {
      type: 'score',
      score: 2.0,
      legend: {},
      probabilities: {},
      confidence: 0.7,
    },
    is_actionable: { type: 'noul', noul: 0.9 },
    ...overrides,
  };
}

describe('TRIAGE_QUESTIONS shape (AAA)', () => {
  it('uses the documented model alias (Arrange/Act/Assert)', () => {
    // Arrange & Act & Assert
    expect(TRIAGE_MODEL).toBe('jev-latest');
  });

  it('defines exactly the four planned questions (Arrange/Act/Assert)', () => {
    // Arrange & Act
    const questionIds = Object.keys(TRIAGE_QUESTIONS).sort();

    // Assert
    expect(questionIds).toEqual(['effort', 'is_actionable', 'recommended_action', 'staleness']);
  });

  it('gives every question a valid type and non-empty instructions (Arrange/Act/Assert)', () => {
    // Arrange
    const validTypes = ['noul', 'choice', 'score'];

    // Act & Assert
    for (const [id, question] of Object.entries(TRIAGE_QUESTIONS)) {
      expect(validTypes).toContain(question.type);
      expect(typeof question.instructions).toBe('string');
      expect(question.instructions.trim().length).toBeGreaterThan(0);
      expect(id).not.toMatch(/\s/);
    }
  });

  it('gives the choice question a non-empty criteria map with described options (Arrange/Act/Assert)', () => {
    // Arrange
    const question = TRIAGE_QUESTIONS.recommended_action;

    // Act
    const options = Object.entries(question.criteria);

    // Assert
    expect(question.type).toBe('choice');
    expect(options.length).toBeGreaterThan(1);
    for (const [option, description] of options) {
      expect(typeof description).toBe('string');
      expect(description.trim().length).toBeGreaterThan(0);
      expect(option).not.toMatch(/\s/);
    }
  });

  it('includes a no-match outcome on the choice question (Arrange/Act/Assert)', () => {
    // Arrange & Act
    const options = Object.keys(TRIAGE_QUESTIONS.recommended_action.criteria);

    // Assert
    expect(options).toContain('no_clear_action');
  });

  it('keeps every close action as a real choice option (Arrange/Act/Assert)', () => {
    // Arrange
    const options = Object.keys(TRIAGE_QUESTIONS.recommended_action.criteria);

    // Act & Assert
    for (const closeAction of CLOSE_ACTIONS) {
      expect(options).toContain(closeAction);
    }
  });

  it('gives each score question an ordered array of 2 to 10 described levels (Arrange/Act/Assert)', () => {
    // Arrange
    const scoreQuestions = [TRIAGE_QUESTIONS.staleness, TRIAGE_QUESTIONS.effort];

    // Act & Assert — 2 to 10 is the documented limit for score criteria
    for (const question of scoreQuestions) {
      expect(question.type).toBe('score');
      expect(Array.isArray(question.criteria)).toBe(true);
      expect(question.criteria.length).toBeGreaterThanOrEqual(2);
      expect(question.criteria.length).toBeLessThanOrEqual(10);
      for (const level of question.criteria) {
        expect(typeof level).toBe('string');
        expect(level.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('gives the noul question both outcome descriptions (Arrange/Act/Assert)', () => {
    // Arrange
    const question = TRIAGE_QUESTIONS.is_actionable;

    // Act & Assert
    expect(question.type).toBe('noul');
    expect(typeof question.criteria.true).toBe('string');
    expect(typeof question.criteria.false).toBe('string');
    expect(question.criteria.true.trim().length).toBeGreaterThan(0);
    expect(question.criteria.false.trim().length).toBeGreaterThan(0);
  });
});

describe('TRIAGE_THRESHOLDS (AAA)', () => {
  it('keeps confidence and probability thresholds within 0 and 1 (Arrange/Act/Assert)', () => {
    // Arrange
    const fractionKeys = [
      'minActionConfidence',
      'closeSuggestionConfidence',
      'actionableYes',
      'actionableNo',
    ];

    // Act & Assert
    for (const key of fractionKeys) {
      expect(TRIAGE_THRESHOLDS[key]).toBeGreaterThanOrEqual(0);
      expect(TRIAGE_THRESHOLDS[key]).toBeLessThanOrEqual(1);
    }
  });

  it('gates close suggestions higher than the general confidence floor (Arrange/Act/Assert)', () => {
    // Arrange & Act & Assert — closing is destructive, so it needs a clearer signal
    expect(TRIAGE_THRESHOLDS.closeSuggestionConfidence).toBeGreaterThan(
      TRIAGE_THRESHOLDS.minActionConfidence
    );
  });

  it('leaves an undecided band between the noul thresholds (Arrange/Act/Assert)', () => {
    // Arrange & Act & Assert
    expect(TRIAGE_THRESHOLDS.actionableNo).toBeLessThan(TRIAGE_THRESHOLDS.actionableYes);
  });

  it('keeps score thresholds inside their rubric ranges (Arrange/Act/Assert)', () => {
    // Arrange
    const maxStaleLevel = TRIAGE_QUESTIONS.staleness.criteria.length - 1;
    const maxEffortLevel = TRIAGE_QUESTIONS.effort.criteria.length - 1;

    // Act & Assert
    expect(TRIAGE_THRESHOLDS.staleScore).toBeGreaterThan(0);
    expect(TRIAGE_THRESHOLDS.staleScore).toBeLessThanOrEqual(maxStaleLevel);
    expect(TRIAGE_THRESHOLDS.quickWinScore).toBeGreaterThanOrEqual(0);
    expect(TRIAGE_THRESHOLDS.quickWinScore).toBeLessThanOrEqual(maxEffortLevel);
  });

  it('uses positive operational limits (Arrange/Act/Assert)', () => {
    // Arrange & Act & Assert
    expect(TRIAGE_TIMEOUT_MS).toBeGreaterThan(0);
    expect(MAX_BODY_CHARS).toBeGreaterThan(0);
  });
});

describe('buildTriageState (AAA)', () => {
  it('maps issue fields into the named state object (Arrange/Act/Assert)', () => {
    // Arrange
    const issue = {
      title: 'Export button crashes',
      body: 'It crashes in Safari.',
      labels: [{ name: 'bug' }, { name: 'ui' }],
      repository: { full_name: 'octo/api' },
      user: { login: 'someone' },
      state: 'open',
      created_at: new Date().toISOString(),
      comments: 3,
    };

    // Act
    const state = buildTriageState(issue);

    // Assert
    expect(state.issue.title).toBe('Export button crashes');
    expect(state.issue.labels).toEqual(['bug', 'ui']);
    expect(state.issue.repository).toBe('octo/api');
    expect(state.issue.author).toBe('someone');
    expect(state.issue.comment_count).toBe(3);
  });

  it('truncates bodies longer than the cap (Arrange/Act/Assert)', () => {
    // Arrange
    const oversizedBody = 'x'.repeat(MAX_BODY_CHARS + 500);
    const issue = { title: 'T', body: oversizedBody };

    // Act
    const state = buildTriageState(issue);

    // Assert
    expect(state.issue.body.length).toBeLessThan(oversizedBody.length);
    expect(state.issue.body).toContain('[truncated]');
  });

  it('leaves bodies under the cap untouched (Arrange/Act/Assert)', () => {
    // Arrange
    const issue = { title: 'T', body: 'short body' };

    // Act
    const state = buildTriageState(issue);

    // Assert
    expect(state.issue.body).toBe('short body');
  });

  it('computes age in whole days from created_at (Arrange/Act/Assert)', () => {
    // Arrange
    const tenDaysMs = 10 * 24 * 60 * 60 * 1000;
    const tenDaysAgo = new Date(Date.now() - tenDaysMs).toISOString();
    const issue = { title: 'T', created_at: tenDaysAgo };

    // Act
    const state = buildTriageState(issue);

    // Assert
    expect(state.issue.age_days).toBe(10);
  });

  it('returns null age when created_at is missing or unparseable (Arrange/Act/Assert)', () => {
    // Arrange
    const noDate = { title: 'T' };
    const badDate = { title: 'T', created_at: 'not-a-date' };

    // Act
    const stateWithoutDate = buildTriageState(noDate);
    const stateWithBadDate = buildTriageState(badDate);

    // Assert
    expect(stateWithoutDate.issue.age_days).toBeNull();
    expect(stateWithBadDate.issue.age_days).toBeNull();
  });

  it('falls back to safe defaults on a sparse issue (Arrange/Act/Assert)', () => {
    // Arrange
    const sparseIssue = {};

    // Act
    const state = buildTriageState(sparseIssue);

    // Assert
    expect(state.issue.title).toBe('');
    expect(state.issue.labels).toEqual([]);
    expect(state.issue.repository).toBe('unknown');
    expect(state.issue.author).toBe('unknown');
    expect(state.issue.comment_count).toBe(0);
  });
});

describe('parseUpstreamError (AAA)', () => {
  // These envelopes are verbatim from the live API, captured by probing
  // https://api.typesafe.ai/v1/systemone with deliberately bad credentials.
  const LIVE_MISSING_KEY = {
    detail: {
      error_type: 'authentication_error',
      message: 'Must supply an API key! Check your request and try again.',
    },
  };
  const LIVE_REJECTED_KEY = {
    detail: {
      error_type: 'authentication_error',
      message: 'Cannot authenticate with the server. Please check your API key and try again.',
    },
  };

  it('reads the nested detail.message the API actually returns (Arrange/Act/Assert)', () => {
    // Arrange & Act
    const result = parseUpstreamError(401, LIVE_REJECTED_KEY);

    // Assert — the old body.message || body.error read lost this entirely
    expect(result.message).toBe(
      'Cannot authenticate with the server. Please check your API key and try again.'
    );
  });

  it('treats a rejected key (401) as an auth failure (Arrange/Act/Assert)', () => {
    // Arrange & Act
    const result = parseUpstreamError(401, LIVE_REJECTED_KEY);

    // Assert
    expect(result.isAuthFailure).toBe(true);
  });

  it('treats a missing key (403) as an auth failure (Arrange/Act/Assert)', () => {
    // Arrange & Act — 403 is what the API returns when no key reaches it at all
    const result = parseUpstreamError(403, LIVE_MISSING_KEY);

    // Assert
    expect(result.isAuthFailure).toBe(true);
    expect(result.message).toBe('Must supply an API key! Check your request and try again.');
  });

  it('does not treat a rate limit as an auth failure (Arrange/Act/Assert)', () => {
    // Arrange & Act
    const result = parseUpstreamError(429, { detail: { message: 'Rate limit exceeded' } });

    // Assert — 429 is retryable, not a configuration problem
    expect(result.isAuthFailure).toBe(false);
    expect(result.message).toBe('Rate limit exceeded');
  });

  it('falls back to a flat message shape when present (Arrange/Act/Assert)', () => {
    // Arrange & Act
    const result = parseUpstreamError(422, { message: 'flat shape' });

    // Assert
    expect(result.message).toBe('flat shape');
  });

  it('falls back to the status code when the body carries nothing useful (Arrange/Act/Assert)', () => {
    // Arrange & Act
    const emptyBody = parseUpstreamError(529, {});
    const missingBody = parseUpstreamError(529, undefined);

    // Assert
    expect(emptyBody.message).toBe('TypeSafe returned 529');
    expect(missingBody.message).toBe('TypeSafe returned 529');
    expect(emptyBody.isAuthFailure).toBe(false);
  });
});

describe('interpretTriage badge (AAA)', () => {
  it('suggests close when a close action clears the higher gate (Arrange/Act/Assert)', () => {
    // Arrange
    const answers = makeAnswers({
      recommended_action: { type: 'choice', choice: 'stale_close', probabilities: {}, confidence: 0.9 },
    });

    // Act
    const result = interpretTriage(answers);

    // Assert
    expect(result.badge.label).toBe('SUGGESTS CLOSE');
    expect(result.badge.tone).toBe('danger');
    expect(result.badge.suggests).toBe('close');
  });

  it('withholds the close hint when confidence sits between the two gates (Arrange/Act/Assert)', () => {
    // Arrange — above the floor, below the close gate
    const answers = makeAnswers({
      recommended_action: { type: 'choice', choice: 'stale_close', probabilities: {}, confidence: 0.6 },
    });

    // Act
    const result = interpretTriage(answers);

    // Assert
    expect(result.badge.suggests).toBeNull();
    expect(result.badge.label).toBe('STALE');
  });

  it('names a possible duplicate without nudging the swipe (Arrange/Act/Assert)', () => {
    // Arrange
    const answers = makeAnswers({
      recommended_action: { type: 'choice', choice: 'duplicate', probabilities: {}, confidence: 0.55 },
    });

    // Act
    const result = interpretTriage(answers);

    // Assert
    expect(result.badge.label).toBe('POSSIBLE DUPLICATE');
    expect(result.badge.suggests).toBeNull();
  });

  it('shows no read at all below the confidence floor (Arrange/Act/Assert)', () => {
    // Arrange
    const answers = makeAnswers({
      recommended_action: { type: 'choice', choice: 'stale_close', probabilities: {}, confidence: 0.2 },
    });

    // Act
    const result = interpretTriage(answers);

    // Assert
    expect(result.badge.label).toBe('NO CLEAR READ');
    expect(result.badge.tone).toBe('muted');
    expect(result.badge.suggests).toBeNull();
  });

  it('marks a confident implement as ready to keep (Arrange/Act/Assert)', () => {
    // Arrange
    const answers = makeAnswers();

    // Act
    const result = interpretTriage(answers);

    // Assert
    expect(result.badge.label).toBe('READY');
    expect(result.badge.suggests).toBe('keep');
  });

  it('marks needs_info without suggesting a close (Arrange/Act/Assert)', () => {
    // Arrange
    const answers = makeAnswers({
      recommended_action: { type: 'choice', choice: 'needs_info', probabilities: {}, confidence: 0.8 },
    });

    // Act
    const result = interpretTriage(answers);

    // Assert
    expect(result.badge.label).toBe('NEEDS INFO');
    expect(result.badge.suggests).toBe('keep');
  });

  it('labels the no-match outcome as discussion (Arrange/Act/Assert)', () => {
    // Arrange
    const answers = makeAnswers({
      recommended_action: { type: 'choice', choice: 'no_clear_action', probabilities: {}, confidence: 0.85 },
    });

    // Act
    const result = interpretTriage(answers);

    // Assert
    expect(result.badge.label).toBe('DISCUSSION');
    expect(result.badge.suggests).toBeNull();
  });

  it('shows no read when answers are missing entirely (Arrange/Act/Assert)', () => {
    // Arrange
    const answers = undefined;

    // Act
    const result = interpretTriage(answers);

    // Assert
    expect(result.badge.label).toBe('NO CLEAR READ');
    expect(result.chips).toEqual([]);
  });
});

describe('interpretTriage chips (AAA)', () => {
  function chipLabels(result) {
    return result.chips.map((chip) => chip.label);
  }

  it('marks a high-probability noul as actionable (Arrange/Act/Assert)', () => {
    // Arrange
    const answers = makeAnswers({ is_actionable: { type: 'noul', noul: 0.95 } });

    // Act
    const result = interpretTriage(answers);

    // Assert
    expect(chipLabels(result)).toContain('ACTIONABLE');
  });

  it('marks a low-probability noul as blocked on the reporter (Arrange/Act/Assert)', () => {
    // Arrange
    const answers = makeAnswers({ is_actionable: { type: 'noul', noul: 0.1 } });

    // Act
    const result = interpretTriage(answers);

    // Assert
    expect(chipLabels(result)).toContain('BLOCKED ON REPORTER');
    expect(chipLabels(result)).not.toContain('ACTIONABLE');
  });

  it('adds no actionability chip in the undecided middle band (Arrange/Act/Assert)', () => {
    // Arrange — a noul near 0.5 is a genuine split, not a middle value
    const answers = makeAnswers({ is_actionable: { type: 'noul', noul: 0.5 } });

    // Act
    const result = interpretTriage(answers);

    // Assert
    expect(chipLabels(result)).not.toContain('ACTIONABLE');
    expect(chipLabels(result)).not.toContain('BLOCKED ON REPORTER');
  });

  it('flags a quick win when effort is small and the issue is actionable (Arrange/Act/Assert)', () => {
    // Arrange
    const answers = makeAnswers({
      effort: { type: 'score', score: 0.5, legend: {}, probabilities: {}, confidence: 0.9 },
      is_actionable: { type: 'noul', noul: 0.9 },
    });

    // Act
    const result = interpretTriage(answers);

    // Assert
    expect(chipLabels(result)).toContain('QUICK WIN');
  });

  it('withholds quick win when the work is small but blocked (Arrange/Act/Assert)', () => {
    // Arrange — small effort means nothing if nobody can start
    const answers = makeAnswers({
      effort: { type: 'score', score: 0.2, legend: {}, probabilities: {}, confidence: 0.9 },
      is_actionable: { type: 'noul', noul: 0.1 },
    });

    // Act
    const result = interpretTriage(answers);

    // Assert
    expect(chipLabels(result)).not.toContain('QUICK WIN');
  });

  it('flags a stale issue at or above the staleness threshold (Arrange/Act/Assert)', () => {
    // Arrange
    const answers = makeAnswers({
      staleness: { type: 'score', score: 2.6, legend: {}, probabilities: {}, confidence: 0.8 },
    });

    // Act
    const result = interpretTriage(answers);

    // Assert
    expect(chipLabels(result)).toContain('STALE');
  });

  it('does not flag a live issue as stale (Arrange/Act/Assert)', () => {
    // Arrange
    const answers = makeAnswers({
      staleness: { type: 'score', score: 0.3, legend: {}, probabilities: {}, confidence: 0.9 },
    });

    // Act
    const result = interpretTriage(answers);

    // Assert
    expect(chipLabels(result)).not.toContain('STALE');
  });
});

describe('interpretTriage raw values (AAA)', () => {
  it('passes raw judgments through for sorting and filtering (Arrange/Act/Assert)', () => {
    // Arrange
    const answers = makeAnswers();

    // Act
    const result = interpretTriage(answers);

    // Assert
    expect(result.raw).toEqual({
      action: 'implement',
      actionConfidence: 0.9,
      stalenessScore: 0.4,
      effortScore: 2.0,
      actionableProbability: 0.9,
    });
  });

  it('nulls raw values when answers are absent (Arrange/Act/Assert)', () => {
    // Arrange
    const answers = {};

    // Act
    const result = interpretTriage(answers);

    // Assert
    expect(result.raw.action).toBeNull();
    expect(result.raw.actionConfidence).toBeNull();
    expect(result.raw.stalenessScore).toBeNull();
    expect(result.raw.effortScore).toBeNull();
    expect(result.raw.actionableProbability).toBeNull();
  });
});
