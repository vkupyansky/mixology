[![Русский](https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-181717?style=for-the-badge)](README.ru.md)

# Mixology

A local flavor catalog editor. Shows how complete each entry is and lets you edit flavor characteristics. The source catalog contains 95 Darkside flavors.

## Features

- Browse the catalog and individual entries.
- Edit descriptions, tags, intensity, flavor profiles, and aromatic notes.
- Store entries in PostgreSQL and repeatedly import the source catalog without losing edits.

## Installation and startup

Requires Node.js 24 LTS, pnpm 11, and PostgreSQL 16 or newer. Use the exact `engines` and `packageManager` versions in [package.json](package.json); dependencies are pinned in [pnpm-lock.yaml](pnpm-lock.yaml). Prepare a separate database and role for the project.

```bash
pnpm install --frozen-lockfile
node scripts/init-env.mjs
```

In the generated `.env`, set the only required parameter, `DATABASE_URL`, to the PostgreSQL URL of your database using [.env.example](.env.example). Keep `0600` permissions. For a remote database, enable TLS certificate verification with `sslmode=verify-full`.

```bash
pnpm db:setup
pnpm build
pnpm start
```

Open <http://127.0.0.1:3000>. The server listens only on loopback. `db:setup` creates the table if it is missing and imports the catalog from `data.json`; running it again preserves entries and your edits.

For development, run `pnpm dev` and, in a separate terminal, `pnpm dev:web`, then open <http://127.0.0.1:5173>. Vite forwards `/api` to the local server; secrets are not sent to the browser.

## Usage

Open an entry, edit its characteristics, and save. Fields remain disabled until the server responds. If an error occurs, your input stays in the editor; a successful save is confirmed only after the API response.

PostgreSQL stores the entries; `data.json` contains the source brands, tags, and descriptions. The production database and `.env` are excluded from Git.

## Checks

```bash
pnpm check
```

This checks formatting, ESLint with no warnings, strict types, API tests, the build, an isolated PostgreSQL check, and dependency advisories. The database check requires Docker: a temporary container starts from a pinned image and is removed after the test.

The PostgreSQL check covers repeated imports into an existing table without a new UNIQUE constraint, preservation of edits, and the full GET/PUT/GET cycle. Individual commands: `pnpm test`, `pnpm test:db`, `pnpm build`.

## Limitations

There are no user accounts; public access requires separate authentication in front of the application. Simultaneous edits to the same entry by multiple people are not reconciled automatically. Checks do not access production data; they do not verify public deployment or operation with an existing database.
