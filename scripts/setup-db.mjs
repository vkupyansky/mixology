import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { createPool } from '../backend/config.js';

const item = z.strictObject({
  id: z.number().int().positive(),
  name: z.string(),
});
const catalogSchema = z.strictObject({
  brands: z.array(item),
  tags: z.array(item),
  flavors: z.array(
    z.strictObject({
      id: z.number().int().positive(),
      brand_id: z.number().int().positive(),
      name: z.string(),
      description: z.string(),
      tags: z.array(z.number().int().positive()),
    }),
  ),
});

export async function setupDatabase() {
  const data = catalogSchema.parse(
    JSON.parse(
      await readFile(new URL('../data.json', import.meta.url), 'utf8'),
    ),
  );
  const brands = new Map(data.brands.map((entry) => [entry.id, entry.name]));
  const tags = new Map(data.tags.map((entry) => [entry.id, entry.name]));
  for (const flavor of data.flavors) {
    if (
      !brands.has(flavor.brand_id) ||
      flavor.tags.some((tag) => !tags.has(tag))
    ) {
      throw new Error('Каталог содержит неизвестный бренд или тег');
    }
  }
  const pool = createPool();
  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');
    await connection.query('SELECT pg_advisory_xact_lock(71082911)');
    await connection.query(
      await readFile(new URL('../backend/schema.sql', import.meta.url), 'utf8'),
    );
    for (const flavor of data.flavors) {
      await connection.query(
        'INSERT INTO mixology (brand, name, description, tags) SELECT $1, $2, $3, $4 WHERE NOT EXISTS (SELECT 1 FROM mixology WHERE brand = $1 AND name = $2)',
        [
          brands.get(flavor.brand_id),
          flavor.name,
          flavor.description,
          flavor.tags.map((id) => tags.get(id)).join(', '),
        ],
      );
    }
    await connection.query('COMMIT');
    console.log('Каталог подготовлен; существующие карточки сохранены');
  } catch (error) {
    await connection.query('ROLLBACK');
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

if (import.meta.main) {
  await setupDatabase();
}
