import { CopilotService } from './copilotService';

// Mock tokenStorage to return a session ID
jest.mock('./tokenStorage', () => ({
  getToken: jest.fn(async () => 'mock-session-id'),
}));

describe('copilotService (AAA)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore
    global.fetch = jest.fn();
  });

  it('initialize should succeed when backend health reports copilotAvailable (Arrange/Act/Assert)', async () => {
    // Arrange
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ copilotAvailable: true }) });
    const svc = new CopilotService();

    // Act
    await svc.initialize();

    // Assert
    expect(global.fetch).toBeCalledWith('/api/health');
  });

  it('summarizeIssue returns summary when backend responds OK (Arrange/Act/Assert)', async () => {
    // Arrange
    const sampleIssue = { number: 1, title: 'T', repository: { full_name: 'o/r' } } as any;
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ summary: 'ok' }) });
    const svc = new CopilotService();

    // Act
    const result = await svc.summarizeIssue(sampleIssue);

    // Assert
    expect(result.summary).toBe('ok');
    expect(global.fetch).toBeCalledWith(
      '/api/ai-summary',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-session-id',
        }),
      })
    );
  });

  it('summarizeIssue throws when backend returns error payload (Arrange/Act/Assert)', async () => {
    // Arrange
    const sampleIssue = { number: 2, title: 'X', repository: { full_name: 'o/r' } } as any;
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'bad' }) });
    const svc = new CopilotService();

    // Act / Assert
    await expect(svc.summarizeIssue(sampleIssue)).rejects.toThrow('bad');
  });
});
