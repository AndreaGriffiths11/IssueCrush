describe('server endpoints (AAA)', () => {
  let proc;
  const baseUrl = 'http://localhost:3000';

  beforeAll((done) => {
    // start server as a child process so we can control shutdown
    const { spawn } = require('child_process');
    proc = spawn('node', ['server.js'], { cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'] });
    // wait for server log that indicates readiness
    const onData = (chunk) => {
      const s = chunk.toString();
      if (s.includes('Server running')) {
        proc.stdout.off('data', onData);
        done();
      }
    };
    proc.stdout.on('data', onData);
  });

  afterAll(() => {
    if (proc && !proc.killed) proc.kill();
  });

  async function postJson(path, body) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const responseBody = await response.json();
    return { status: response.status, body: responseBody };
  }

  it('GET /health returns ok (Arrange/Act/Assert)', async () => {
    // Arrange & Act
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toHaveProperty('copilotAvailable', true);
  });

  it('POST /api/github-token without code returns 400 (Arrange/Act/Assert)', async () => {
    const res = await postJson('/api/github-token', {});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/ai-summary without session returns 401 (Arrange/Act/Assert)', async () => {
    const res = await postJson('/api/ai-summary', {});
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/triage without session returns 401 (Arrange/Act/Assert)', async () => {
    const res = await postJson('/api/triage', {});
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('GET /api/health reports triage availability (Arrange/Act/Assert)', async () => {
    // Arrange & Act
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();

    // Assert — a boolean either way, so the UI can hide the button when unconfigured
    expect(response.status).toBe(200);
    expect(typeof body.triageAvailable).toBe('boolean');
  });
});
