# Contributing to Opal Atelier

Thanks for your interest. Opal Atelier is a free-time project: issues and pull requests are welcome, and forks
too, under the same licenses.

## Licenses of contributions

By contributing, you agree that your work is published under the project's licenses:

- **code** — [GNU GPL v3.0 or later](LICENSE);
- **texts and data** (glossary, colour theory notes, poses, translations) — [CC BY-NC-SA 4.0](LICENSE-CONTENT).

## Reporting a problem

Open an issue with:

- what you did, what you expected, what happened;
- where: website, installed app (PWA) or desktop app, with the browser or the operating system;
- the version, shown in **Settings → About**.

Screenshots help. Please leave out any personal data, and any brand names from your own swatch charts.

## Working on the code

Requires Node.js 22 or later.

```sh
npm ci
npm run dev:web    # in the browser
npm run dev        # in Electron
```

Before opening a pull request, run the checks that CI runs first:

```sh
npm run check      # type checking, lint, formatting, tests
```

and keep it green. `npm run format` fixes the formatting.

On a pull request, CI then builds the website and the Windows, macOS and Linux installers: they can be
downloaded from the run (Actions → the run → Artifacts) to try the change before it is merged.

Releases are published by the maintainer, by hand (see **Publishing** in the README).

## Project rules

- **English** for code, comments, file names and docs. Every user-facing text goes through i18next, in
  **both** `en.json` and `fr.json` (a test checks they have the same keys).
- **Types next to their code**: `interface` for object shapes, string `enum` for fixed sets of values, no
  global types file.
- **Tests next to their code** (`*.test.ts` / `*.test.tsx`). Logic changes come with a test; the engines carried
  over from the original site must keep matching `tests/fixtures/`.
- **No brand data.** The app ships no paint brand, product name or manufacturer chart: users build their own
  swatch charts. Generic colour names and Colour Index codes (PB29, PY43…) are fine.
- **Nothing leaves the device.** No account, no server, no analytics, no network call for user data. What the
  user enters stays in their browser's storage.
- **Same app everywhere**: web, PWA and Electron share one renderer. Platform differences live in
  `src/renderer/src/platform/`.

## Pull requests

- One topic per pull request, with a short description of what changes and why.
- For a visible change, a before / after screenshot helps.
- Small, focused commits are easier to review; their wording is up to you.
