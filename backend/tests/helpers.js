// Shared setup for integration tests. Uses a separate database so tests never
// touch development data. Run with: npm test
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/campusfix_test';

const http = require('http');
const mongoose = require('mongoose');
const { connectDatabase } = require('../config/db');
const app = require('../app');
const { User } = require('../models');

async function startTestServer() {
  await connectDatabase(process.env.MONGODB_URI);
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));

  const server = http.createServer(app);
  let io = null;
  try {
    // Attach Socket.IO when available so event listeners can emit.
    const { initSocket } = require('../sockets');
    io = initSocket(server);
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') throw err;
  }
  try {
    require('../events/listeners').registerListeners();
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') throw err;
  }

  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  async function stop() {
    if (io) io.close();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }

  return { baseUrl, stop };
}

// Small fetch wrapper that keeps the refresh cookie like a browser would.
function createClient(baseUrl) {
  const jar = {};
  let accessToken = null;

  async function request(method, path, body, { token } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const bearer = token === undefined ? accessToken : token;
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    const cookie = Object.entries(jar)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    if (cookie) headers.Cookie = cookie;

    const res = await fetch(baseUrl + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const line of res.headers.getSetCookie()) {
      const [pair] = line.split(';');
      const [name, ...rest] = pair.split('=');
      const value = rest.join('=');
      if (value && !/Expires=Thu, 01 Jan 1970/i.test(line)) jar[name] = value;
      else delete jar[name];
    }
    const json = await res.json().catch(() => null);
    if (json?.data?.accessToken) accessToken = json.data.accessToken;
    return { status: res.status, body: json, headers: res.headers };
  }

  return {
    request,
    get: (path, opts) => request('GET', path, undefined, opts),
    post: (path, body, opts) => request('POST', path, body, opts),
    patch: (path, body, opts) => request('PATCH', path, body, opts),
    jar,
    get token() {
      return accessToken;
    },
    set token(value) {
      accessToken = value;
    },
  };
}

async function createUser(overrides = {}) {
  const base = {
    name: 'Test Person',
    email: `user${Date.now()}${Math.floor(Math.random() * 1e6)}@campus.edu`,
    password: 'Password1',
    role: 'student',
  };
  return User.create({ ...base, ...overrides });
}

async function loginAs(baseUrl, email, password = 'Password1') {
  const client = createClient(baseUrl);
  const res = await client.post('/api/auth/login', { email, password });
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${res.body?.message}`);
  return client;
}

module.exports = { startTestServer, createClient, createUser, loginAs };
