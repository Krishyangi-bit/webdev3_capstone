const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, createClient, createUser } = require('./helpers');
const { User } = require('../models');

let ctx;
before(async () => {
  ctx = await startTestServer();
});
after(async () => {
  await ctx.stop();
});

describe('authentication', () => {
  const student = {
    name: 'Riya Kapoor',
    email: 'riya.kapoor@campus.edu',
    password: 'Campus123',
    department: 'Computer Science',
    studentId: 'CS2023041',
  };

  test('registers a student, hashes the password and never returns it', async () => {
    const client = createClient(ctx.baseUrl);
    const res = await client.post('/api/auth/register', { ...student, role: 'admin', isActive: false });
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.role, 'student', 'role injection must be ignored');
    assert.equal(res.body.data.user.isActive, true);
    assert.equal(res.body.data.user.password, undefined);
    assert.equal(res.body.data.user.refreshSessions, undefined);
    assert.ok(res.body.data.accessToken);
    assert.ok(client.jar.cf_refresh, 'refresh cookie is set');
    assert.match(res.headers.get('set-cookie'), /HttpOnly/i);

    const stored = await User.findOne({ email: student.email }).select('+password +refreshSessions');
    assert.match(stored.password, /^\$2[aby]\$/);
    assert.notEqual(stored.refreshSessions[0].tokenHash, client.jar.cf_refresh, 'refresh token stored hashed');
  });

  test('rejects duplicate email and weak password', async () => {
    const client = createClient(ctx.baseUrl);
    const dup = await client.post('/api/auth/register', student);
    assert.equal(dup.status, 409);
    const weak = await client.post('/api/auth/register', { ...student, email: 'x@campus.edu', password: 'short' });
    assert.equal(weak.status, 400);
    assert.equal(weak.body.success, false);
  });

  test('login with wrong password is rejected with a generic message', async () => {
    const client = createClient(ctx.baseUrl);
    const res = await client.post('/api/auth/login', { email: student.email, password: 'Wrong1234' });
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Invalid email or password');
  });

  test('access token protects /me; refresh rotates the token; reuse revokes sessions', async () => {
    const client = createClient(ctx.baseUrl);
    const login = await client.post('/api/auth/login', { email: student.email, password: student.password });
    assert.equal(login.status, 200);

    const noToken = await client.get('/api/auth/me', { token: null });
    assert.equal(noToken.status, 401);
    const badToken = await client.get('/api/auth/me', { token: 'not-a-jwt' });
    assert.equal(badToken.status, 401);
    const me = await client.get('/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.data.user.email, student.email);

    const oldRefresh = client.jar.cf_refresh;
    const refreshed = await client.post('/api/auth/refresh');
    assert.equal(refreshed.status, 200);
    assert.notEqual(client.jar.cf_refresh, oldRefresh, 'refresh token rotated');

    // Replaying the old token is treated as theft: all sessions are revoked.
    const attacker = createClient(ctx.baseUrl);
    attacker.jar.cf_refresh = oldRefresh;
    const replay = await attacker.post('/api/auth/refresh');
    assert.equal(replay.status, 401);
    assert.equal(replay.body.code, 'REFRESH_REUSED');
    const legit = await client.post('/api/auth/refresh');
    assert.equal(legit.status, 401, 'legitimate session revoked too');
  });

  test('logout revokes the refresh token', async () => {
    const client = createClient(ctx.baseUrl);
    await client.post('/api/auth/login', { email: student.email, password: student.password });
    const token = client.jar.cf_refresh;
    const out = await client.post('/api/auth/logout');
    assert.equal(out.status, 200);
    const replay = createClient(ctx.baseUrl);
    replay.jar.cf_refresh = token;
    const res = await replay.post('/api/auth/refresh');
    assert.equal(res.status, 401);
  });

  test('deactivated users cannot log in or use existing tokens', async () => {
    const user = await createUser({ email: 'inactive@campus.edu' });
    const client = createClient(ctx.baseUrl);
    await client.post('/api/auth/login', { email: user.email, password: 'Password1' });
    await User.updateOne({ _id: user._id }, { isActive: false });
    const me = await client.get('/api/auth/me');
    assert.equal(me.status, 403);
    const login = await createClient(ctx.baseUrl).post('/api/auth/login', { email: user.email, password: 'Password1' });
    assert.equal(login.status, 403);
  });

  test('unknown routes and malformed JSON return consistent errors', async () => {
    const res = await fetch(`${ctx.baseUrl}/api/nope`);
    assert.equal(res.status, 404);
    assert.equal((await res.json()).success, false);
    const bad = await fetch(`${ctx.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad json',
    });
    assert.equal(bad.status, 400);
  });
});
