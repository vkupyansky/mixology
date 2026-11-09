import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import pg from 'pg';
import { createApp } from '../backend/app.js';
import { setupDatabase } from '../scripts/setup-db.mjs';

test('seed preserves an existing schema and edits; real API saves and reloads', async () => {
  const name = 'mixology-test-' + randomBytes(6).toString('hex');
  const password = randomBytes(32).toString('hex');
  /** @param {string[]} arguments_ */
  const docker = (arguments_) =>
    execFileSync('docker', arguments_, {
      encoding: 'utf8',
      env: { ...process.env, POSTGRES_PASSWORD: password },
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  const previous = process.env.DATABASE_URL;
  /** @type {import('pg').Pool | undefined} */
  let pool;
  /** @type {import('node:http').Server | undefined} */
  let server;
  docker([
    'run',
    '--detach',
    '--rm',
    '--name',
    name,
    '--env',
    'POSTGRES_PASSWORD',
    '--env',
    'POSTGRES_DB=mixology_test',
    '--publish',
    '127.0.0.1::5432',
    'postgres@sha256:aa6cb33cf4c19c765cefcf48d96176258800870a9a1e930ad126200f9d825139',
  ]);
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        docker([
          'exec',
          name,
          'pg_isready',
          '-h',
          '127.0.0.1',
          '-U',
          'postgres',
          '-d',
          'mixology_test',
        ]);
        ready = true;
        break;
      } catch {
        await delay(200);
      }
    }
    assert(ready, 'Изолированный PostgreSQL не запустился');
    const endpoint = docker(['port', name, '5432/tcp']);
    process.env.DATABASE_URL = `postgresql://postgres:${password}@${endpoint}/mixology_test`;
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const originalSchema = (
      await readFile(new URL('../backend/schema.sql', import.meta.url), 'utf8')
    ).replace(',\n    UNIQUE (brand, name)', '');
    await pool.query(originalSchema);
    await setupDatabase();
    const first = await pool.query('SELECT COUNT(*) AS count FROM mixology');
    assert.equal(first.rows[0].count, '95');
    await pool.query('UPDATE mixology SET description = $1 WHERE id = 1', [
      'Сохранённая правка',
    ]);
    await setupDatabase();
    const second = await pool.query('SELECT COUNT(*) AS count FROM mixology');
    assert.equal(second.rows[0].count, '95');
    const preserved = await pool.query(
      'SELECT description FROM mixology WHERE id = 1',
    );
    assert.equal(preserved.rows[0].description, 'Сохранённая правка');
    server = createApp(pool).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const listening = server.address();
    assert(listening && typeof listening === 'object');
    const base = `http://127.0.0.1:${listening.port}`;
    const names = await fetch(base + '/api/names');
    assert.equal(names.status, 200);
    assert.equal((await names.json()).length, 95);
    const detail = await fetch(base + '/api/flavor/1');
    const record = await detail.json();
    const { id, brand, name: flavorName, ...update } = record;
    assert.equal(id, 1);
    assert.equal(brand, 'Darkside');
    assert.equal(flavorName, 'Basil blast');
    update.description = '';
    update.flavor_intensity = 1;
    const saved = await fetch(base + '/api/flavor/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    assert.equal(saved.status, 200);
    const reload = await fetch(base + '/api/flavor/1');
    const actual = await reload.json();
    assert.equal(actual.description, '');
    assert.equal(actual.flavor_intensity, 1);
    const missing = await fetch(base + '/api/flavor/2147483647');
    assert.equal(missing.status, 404);
  } finally {
    if (server) {
      const active = server;
      await new Promise((resolve, reject) => {
        active.close((error) => (error ? reject(error) : resolve(undefined)));
        active.closeIdleConnections();
      });
    }
    await pool?.end();
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
    docker(['rm', '--force', name]);
  }
});
