import { extractRepoPath, fetchIssues, updateIssueState } from './github';

describe('github api (AAA)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    // @ts-ignore
    global.fetch = jest.fn();
  });

  it('extractRepoPath extracts path from repository url (Arrange/Act/Assert)', () => {
    // Arrange
    const url = 'https://api.github.com/repos/owner/repo';

    // Act
    const path = extractRepoPath(url);

    // Assert
    expect(path).toBe('owner/repo');
  });

  it('fetchIssues returns issues from server proxy (Arrange/Act/Assert)', async () => {
    // Arrange — server already filters PRs, client receives clean array
    const mockIssues = [
      { id: 1, number: 1, title: 'I' },
    ];
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockIssues });

    // Act
    const result = await fetchIssues('session-id');

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('I');
  });

  it('fetchIssues throws on 404 and 401 (Arrange/Act/Assert)', async () => {
    // Arrange: 404
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ message: 'not' }) });
    await expect(fetchIssues('t', 'repo')).rejects.toThrow('Repository not found');

    // Arrange: 401
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ message: 'unauth' }) });
    await expect(fetchIssues('t')).rejects.toThrow('Session expired');
  });

  it('updateIssueState sends PATCH and returns updated issue (Arrange/Act/Assert)', async () => {
    // Arrange
    const returned = { id: 3, number: 10, title: 'Updated' };
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => returned });

    // Act
    const res = await updateIssueState('session-id', { number: 10, repository_url: 'https://api.github.com/repos/o/r' }, 'closed');

    // Assert
    expect(res.id).toBe(3);
  });
});
