import { TriageService } from './triageService';

// Mock tokenStorage to return a session ID
jest.mock('./tokenStorage', () => ({
  getToken: jest.fn(async () => 'mock-session-id'),
}));

describe('triageService (AAA)', () => {
  const sampleIssue = { number: 1, title: 'T', repository: { full_name: 'o/r' } } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore
    global.fetch = jest.fn();
  });

  it('triageIssue returns typed triage when backend responds OK (Arrange/Act/Assert)', async () => {
    // Arrange
    const triagePayload = {
      badge: { label: 'READY', tone: 'success', suggests: 'keep' },
      chips: [{ label: 'ACTIONABLE', tone: 'success' }],
      raw: {
        action: 'implement',
        actionConfidence: 0.9,
        stalenessScore: 0.3,
        effortScore: 1.2,
        actionableProbability: 0.88,
      },
    };
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ triage: triagePayload }) });
    const svc = new TriageService();

    // Act
    const result = await svc.triageIssue(sampleIssue);

    // Assert
    expect(result.triage).toEqual(triagePayload);
    expect(result.unavailable).toBeUndefined();
  });

  it('triageIssue sends the session token header (Arrange/Act/Assert)', async () => {
    // Arrange
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ triage: {} }) });
    const svc = new TriageService();

    // Act
    await svc.triageIssue(sampleIssue);

    // Assert
    expect(global.fetch).toBeCalledWith(
      '/api/triage',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Session-Token': 'mock-session-id',
        }),
      })
    );
  });

  it('triageIssue reports unavailable when the server has no API key (Arrange/Act/Assert)', async () => {
    // Arrange — a missing key is configuration, not an error the user can act on
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({
        error: 'Triage unavailable',
        message: 'Structured triage requires TYPESAFE_API_KEY in the server environment.',
        requiresTypeSafeKey: true,
      }),
    });
    const svc = new TriageService();

    // Act
    const result = await svc.triageIssue(sampleIssue);

    // Assert
    expect(result.unavailable).toBe(true);
    expect(result.message).toContain('TYPESAFE_API_KEY');
    expect(result.triage).toBeUndefined();
  });

  it('triageIssue throws a sign-in message on 401 (Arrange/Act/Assert)', async () => {
    // Arrange
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'nope' }) });
    const svc = new TriageService();

    // Act / Assert
    await expect(svc.triageIssue(sampleIssue)).rejects.toThrow('Session expired. Please sign in again.');
  });

  it('triageIssue throws when backend returns an error payload (Arrange/Act/Assert)', async () => {
    // Arrange
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'bad' }) });
    const svc = new TriageService();

    // Act / Assert
    await expect(svc.triageIssue(sampleIssue)).rejects.toThrow('bad');
  });

  it('triageIssue throws when no session token is stored (Arrange/Act/Assert)', async () => {
    // Arrange
    const { getToken } = require('./tokenStorage');
    getToken.mockResolvedValueOnce(null);
    const svc = new TriageService();

    // Act / Assert
    await expect(svc.triageIssue(sampleIssue)).rejects.toThrow('No session available — please sign in');
    expect(global.fetch).not.toBeCalled();
  });
});
