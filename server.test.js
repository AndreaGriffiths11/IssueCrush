const fetch = require('cross-fetch');
const request = require('supertest');

describe('server endpoints (AAA)', () => {
  let proc;

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

  it('GET /health returns ok (Arrange/Act/Assert)', async () => {
    // Arrange & Act
    const res = await request('http://localhost:3000').get('/health');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('copilotAvailable', true);
  });

  it('POST /api/github-token without code returns 400 (Arrange/Act/Assert)', async () => {
    const res = await request('http://localhost:3000').post('/api/github-token').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/ai-summary without issue returns 400 (Arrange/Act/Assert)', async () => {
    const res = await request('http://localhost:3000').post('/api/ai-summary').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
