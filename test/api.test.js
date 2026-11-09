import { strict as assert } from 'node:assert';
import { after, before, test } from 'node:test';
import { once } from 'node:events';
import pg from 'pg';
import { createApp } from '../backend/app.js';
import { flavorSchema } from '../shared/flavor.js';
import { createPool } from '../backend/config.js';

const pool = new pg.Pool({
  connectionString: 'postgresql://127.0.0.1:1/isolated_test',
  connectionTimeoutMillis: 50,
});
const app = createApp(pool);
const server = app.listen(0, '127.0.0.1');
let address = '';
before(async () => {
  await once(server, 'listening');
  const endpoint = server.address();
  assert(endpoint && typeof endpoint === 'object');
  address = `http://127.0.0.1:${endpoint.port}`;
});
after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve(undefined)));
    server.closeIdleConnections();
  });
  await pool.end();
});

test('invalid IDs are rejected before database access', async () => {
  const response = await fetch(address + '/api/flavor/not-an-id');
  assert.equal(response.status, 400);
});

test('cross-origin updates are rejected', async () => {
  const response = await fetch(address + '/api/flavor/1', {
    method: 'PUT',
    headers: {
      Origin: 'https://example.invalid',
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  assert.equal(response.status, 403);
});

test('malformed JSON is rejected', async () => {
  const response = await fetch(address + '/api/flavor/1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: '{broken',
  });
  assert.equal(response.status, 400);
});

test('incomplete updates do not silently erase fields', async () => {
  const response = await fetch(address + '/api/flavor/1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: '{"description":"test"}',
  });
  assert.equal(response.status, 400);
});

test('oversized requests are rejected', async () => {
  const response = await fetch(address + '/api/flavor/1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: 'x'.repeat(70000) }),
  });
  assert.equal(response.status, 413);
});

test('numeric bounds and unknown fields are validated', () => {
  const empty = Object.fromEntries(
    Object.keys(flavorSchema.shape).map((key) => [key, null]),
  );
  assert(flavorSchema.safeParse(empty).success);
  assert(!flavorSchema.safeParse({ ...empty, flavor_intensity: 0 }).success);
  assert(
    !flavorSchema.safeParse({ ...empty, flavor_profile: { sweet: 6 } }).success,
  );
  assert(!flavorSchema.safeParse({ ...empty, admin: true }).success);
  const valid = flavorSchema.parse({
    ...empty,
    description: '',
    flavor_intensity: 1,
  });
  assert.equal(valid.description, '');
  assert.equal(valid.flavor_intensity, 1);
});

test('missing configuration fails without credentials in error', () => {
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    assert.throws(createPool, /Не задан обязательный DATABASE_URL/);
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});
