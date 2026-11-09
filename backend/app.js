import express from 'express';
import { resolve } from 'node:path';
import { editableFields, flavorSchema } from '../shared/flavor.js';

/** @param {import('pg').Pool} pool */
export function createApp(pool) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));

  app.use('/api/flavor/:id', (req, res, next) => {
    if (
      !/^[1-9]\d{0,9}$/.test(req.params.id) ||
      Number(req.params.id) > 2147483647
    ) {
      return res.status(400).json({ error: 'Некорректный ID вкуса' });
    }
    next();
  });

  app.get('/api/names', async (_req, res) => {
    const checks = editableFields
      .map((field) => `${field} IS NULL`)
      .join(' OR ');
    const result = await pool.query(
      `SELECT id, name, CASE WHEN ${checks} THEN 'empty' ELSE 'complete' END AS status FROM mixology ORDER BY id`,
    );
    res.json(result.rows);
  });

  app.get('/api/flavor/:id', async (req, res) => {
    const result = await pool.query('SELECT * FROM mixology WHERE id = $1', [
      req.params.id,
    ]);
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Вкус не найден' });
    }
    res.json(result.rows[0]);
  });

  app.put('/api/flavor/:id', async (req, res) => {
    const allowedOrigins = [
      'http://127.0.0.1:3000',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://localhost:5173',
    ];
    if (req.headers.origin && !allowedOrigins.includes(req.headers.origin)) {
      return res.status(403).json({ error: 'Недопустимый источник запроса' });
    }
    const parsed = flavorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Проверьте значения полей вкуса' });
    }
    const values = editableFields.map((field) => parsed.data[field]);
    const assignments = editableFields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(', ');
    const result = await pool.query(
      `UPDATE mixology SET ${assignments} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, req.params.id],
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: 'Вкус не найден' });
    }
    res.json(result.rows[0]);
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
  });
  app.use(express.static(resolve('dist')));
  app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(resolve('dist/index.html'));
  });
  /** @type {import('express').ErrorRequestHandler} */
  const handleError = (error, _req, res, _next) => {
    const status =
      error instanceof SyntaxError ? 400 : error.status === 413 ? 413 : 500;
    if (status === 500) console.error('Ошибка API:', error.name);
    return res.status(status).json({
      error:
        status === 400
          ? 'Некорректный JSON'
          : status === 413
            ? 'Запрос слишком большой'
            : 'Не удалось выполнить запрос',
    });
  };
  app.use(handleError);
  return app;
}
