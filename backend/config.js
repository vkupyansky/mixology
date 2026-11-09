import pg from 'pg';

export function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString?.trim()) {
    throw new Error('Не задан обязательный DATABASE_URL');
  }
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error('DATABASE_URL должен содержать PostgreSQL URL');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname) {
    throw new Error('DATABASE_URL должен содержать PostgreSQL URL');
  }
  return new pg.Pool({
    connectionString,
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
    max: 5,
  });
}
