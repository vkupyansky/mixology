import { readFile, writeFile } from 'node:fs/promises';

const example = await readFile(new URL('../.env.example', import.meta.url));
await writeFile(new URL('../.env', import.meta.url), example, {
  flag: 'wx',
  mode: 0o600,
});
console.log('Создан .env с правами 0600; заполните DATABASE_URL');
