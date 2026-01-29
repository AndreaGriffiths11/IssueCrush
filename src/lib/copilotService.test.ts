import { CopilotService } from './copilotService';

describe('copilotService (AAA)', () => {
  beforeEach(() => {
    jest.resetModules();
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
    expect(global.fetch).toBeCalledWith('http://localhost:3000/health');
  });

  it('summarizeIssue returns summary when backend responds OK (Arrange/Act/Assert)', async () => {
    // Arrange
    const sampleIssue = { number: 1, title: 'T', repository: { full_name: 'o/r' } } as any;
    // First fetch will be for POST /api/ai-summary
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ summary: 'ok' }) });
    const svc = new CopilotService();

    // Act
    const summary = await svc.summarizeIssue(sampleIssue);

    // Assert
    expect(summary).toBe('ok');
    expect(global.fetch).toBeCalledWith('http://localhost:3000/api/ai-summary', expect.any(Object));
  });

  it('summarizeIssue throws when backend returns error payload (Arrange/Act/Assert)', async () => {
    // Arrange
    const sampleIssue = { number: 2, title: 'X', repository: { full_name: 'o/r' } } as any;
    // response.ok false and json contains error
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'bad' }) });
    const svc = new CopilotService();

    // Act / Assert
    await expect(svc.summarizeIssue(sampleIssue)).rejects.toThrow('bad');
  });
});
