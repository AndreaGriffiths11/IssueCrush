const {
  MAX_BATCH_SIZE,
  BATCH_CONCURRENCY,
  runTriage,
  runTriageBatch,
} = require('./api/src/triageQuestions.cjs');

// A minimal well-formed answers payload, so tests focus on batch mechanics
// rather than re-checking interpretTriage (covered in triageQuestions.test.js).
function okAnswers() {
  return {
    recommended_action: { type: 'choice', choice: 'implement', probabilities: {}, confidence: 0.9 },
    staleness: { type: 'score', score: 0.4, legend: {}, probabilities: {}, confidence: 0.8 },
    effort: { type: 'score', score: 1.0, legend: {}, probabilities: {}, confidence: 0.8 },
    is_actionable: { type: 'noul', noul: 0.9 },
  };
}

function makeIssue(id) {
  return {
    id,
    number: id,
    title: `Issue ${id}`,
    body: 'body',
    labels: [],
    repository: { full_name: 'o/r' },
    user: { login: 'u' },
    state: 'open',
    created_at: new Date().toISOString(),
    comments: 0,
  };
}

/** Fetch stub that always succeeds, recording how many calls overlapped. */
function makeSuccessFetch(tracker) {
  return async () => {
    tracker.inFlight += 1;
    tracker.maxInFlight = Math.max(tracker.maxInFlight, tracker.inFlight);
    tracker.calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    tracker.inFlight -= 1;
    return {
      ok: true,
      status: 200,
      json: async () => ({ model: 'jev-latest', answers: okAnswers(), usage: {} }),
    };
  };
}

describe('runTriage (AAA)', () => {
  it('returns an interpreted triage on success (Arrange/Act/Assert)', async () => {
    // Arrange
    const fetchStub = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ model: 'jev-latest', answers: okAnswers(), usage: {} }),
    });

    // Act
    const result = await runTriage(makeIssue(1), 'key', fetchStub);

    // Assert
    expect(result.ok).toBe(true);
    expect(result.triage.badge.label).toBe('READY');
    expect(result.model).toBe('jev-latest');
  });

  it('sends Bearer auth and the full question set (Arrange/Act/Assert)', async () => {
    // Arrange — Bearer is the only scheme the API accepts, verified against live
    let captured = null;
    const fetchStub = async (url, init) => {
      captured = { url, init };
      return { ok: true, status: 200, json: async () => ({ model: 'm', answers: okAnswers() }) };
    };

    // Act
    await runTriage(makeIssue(1), 'secret-key', fetchStub);

    // Assert
    expect(captured.url).toBe('https://api.typesafe.ai/v1/systemone');
    expect(captured.init.headers.Authorization).toBe('Bearer secret-key');
    const body = JSON.parse(captured.init.body);
    expect(Object.keys(body.questions).sort()).toEqual([
      'effort',
      'is_actionable',
      'recommended_action',
      'staleness',
    ]);
    expect(body.model).toBe('jev-latest');
  });

  it('reports an auth failure rather than throwing (Arrange/Act/Assert)', async () => {
    // Arrange
    const fetchStub = async () => ({
      ok: false,
      status: 401,
      json: async () => ({ detail: { message: 'Cannot authenticate with the server.' } }),
    });

    // Act
    const result = await runTriage(makeIssue(1), 'bad', fetchStub);

    // Assert
    expect(result.ok).toBe(false);
    expect(result.isAuthFailure).toBe(true);
    expect(result.message).toBe('Cannot authenticate with the server.');
  });
});

describe('runTriageBatch (AAA)', () => {
  it('triages every issue and keys results by issue id (Arrange/Act/Assert)', async () => {
    // Arrange
    const tracker = { calls: 0, inFlight: 0, maxInFlight: 0 };
    const issues = [makeIssue(11), makeIssue(22), makeIssue(33)];

    // Act
    const { results, attempted } = await runTriageBatch(issues, 'key', makeSuccessFetch(tracker));

    // Assert
    expect(attempted).toBe(3);
    expect(Object.keys(results).sort()).toEqual(['11', '22', '33']);
    expect(results['22'].ok).toBe(true);
    expect(results['22'].triage.badge.label).toBe('READY');
  });

  it('caps the batch at MAX_BATCH_SIZE to bound cost (Arrange/Act/Assert)', async () => {
    // Arrange — one API call per issue, so an uncapped batch is an uncapped bill
    const tracker = { calls: 0, inFlight: 0, maxInFlight: 0 };
    const tooMany = Array.from({ length: MAX_BATCH_SIZE + 10 }, (_, i) => makeIssue(i + 1));

    // Act
    const { attempted, requested } = await runTriageBatch(tooMany, 'key', makeSuccessFetch(tracker));

    // Assert
    expect(requested).toBe(MAX_BATCH_SIZE + 10);
    expect(attempted).toBe(MAX_BATCH_SIZE);
    expect(tracker.calls).toBe(MAX_BATCH_SIZE);
  });

  it('never exceeds BATCH_CONCURRENCY in flight (Arrange/Act/Assert)', async () => {
    // Arrange
    const tracker = { calls: 0, inFlight: 0, maxInFlight: 0 };
    const issues = Array.from({ length: 12 }, (_, i) => makeIssue(i + 1));

    // Act
    await runTriageBatch(issues, 'key', makeSuccessFetch(tracker));

    // Assert
    expect(tracker.maxInFlight).toBeLessThanOrEqual(BATCH_CONCURRENCY);
  });

  it('keeps going when a single issue fails (Arrange/Act/Assert)', async () => {
    // Arrange — one bad issue must not sink the whole deck
    const issues = [makeIssue(1), makeIssue(2), makeIssue(3)];
    const fetchStub = async (url, init) => {
      const body = JSON.parse(init.body);
      const isSecondIssue = body.state.issue.title === 'Issue 2';
      if (isSecondIssue) {
        return { ok: false, status: 500, json: async () => ({ detail: { message: 'boom' } }) };
      }
      return { ok: true, status: 200, json: async () => ({ model: 'm', answers: okAnswers() }) };
    };

    // Act
    const { results } = await runTriageBatch(issues, 'key', fetchStub);

    // Assert
    expect(results['1'].ok).toBe(true);
    expect(results['3'].ok).toBe(true);
    expect(results['2'].ok).toBe(false);
    expect(results['2'].message).toBe('boom');
  });

  it('aborts the rest of the batch on an auth failure (Arrange/Act/Assert)', async () => {
    // Arrange — if the key is bad, every remaining call fails identically.
    // Burning the rest of the batch to relearn that costs time and quota.
    const tracker = { calls: 0 };
    const issues = Array.from({ length: 20 }, (_, i) => makeIssue(i + 1));
    const fetchStub = async () => {
      tracker.calls += 1;
      return {
        ok: false,
        status: 401,
        json: async () => ({ detail: { message: 'Cannot authenticate with the server.' } }),
      };
    };

    // Act
    const { authFailure } = await runTriageBatch(issues, 'bad-key', fetchStub);

    // Assert
    expect(authFailure).toBeTruthy();
    expect(authFailure.message).toBe('Cannot authenticate with the server.');
    expect(tracker.calls).toBeLessThan(issues.length);
  });

  it('records a timeout as a per-issue failure (Arrange/Act/Assert)', async () => {
    // Arrange
    const issues = [makeIssue(1)];
    const fetchStub = async () => {
      const error = new Error('timed out');
      error.name = 'TimeoutError';
      throw error;
    };

    // Act
    const { results } = await runTriageBatch(issues, 'key', fetchStub);

    // Assert
    expect(results['1'].ok).toBe(false);
    expect(results['1'].message).toBe('Timed out');
  });

  it('handles an empty issue list without calling the API (Arrange/Act/Assert)', async () => {
    // Arrange
    const tracker = { calls: 0, inFlight: 0, maxInFlight: 0 };

    // Act
    const { results, attempted } = await runTriageBatch([], 'key', makeSuccessFetch(tracker));

    // Assert
    expect(attempted).toBe(0);
    expect(results).toEqual({});
    expect(tracker.calls).toBe(0);
  });
});
