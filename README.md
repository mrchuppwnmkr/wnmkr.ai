# winemaking-consultant

an agentic winemaking consultant subscription website for everyone
This is an agentic AI winemaking consulting project built upon the combined knowledge of Steve Burch and Michael Chupp's, winemaking knowledge, powered the best research available.

**AVAs covered:** Lodi · Livermore · Russian River Valley

## What's in this repo

> **Note — two things live here right now.** `wnmkr.ai` is still served by GitHub Pages from
> `index.html` on `main`. The Next.js application is being built on feature branches and is not
> live yet. See [`docs/vercel-cutover.md`](docs/vercel-cutover.md) for how the switch happens.


| Path | What it is |
|---|---|
| `index.html` | The public website at wnmkr.ai. One self-contained page — HTML and CSS inline, no dependencies, no build step. |
| `assets/` | Optimized images used by the site. |
| `user-stories.md` | Product requirements — epics, user stories, and acceptance criteria. |
| `session-notes.md` | Working notes. |
| `app/`, `lib/`, `components/` | The Next.js application — auth, user model and role gating. |
| `supabase/migrations/` | Database schema. |
| `specs/` | Spec Kit artifacts — one directory per feature, holding its spec, plan, research, data model, contracts and tasks. |
| `.specify/memory/constitution.md` | The project constitution. Read this before changing how anything works. |
| `docs/vercel-cutover.md` | How wnmkr.ai moves from GitHub Pages to Vercel. |
| `.gitattributes` | Line-ending normalization. |

## The website

`index.html` is currently a coming-soon holding page. Everything meant to be
replaced is marked with an `EDIT ME` comment.

Preview it by opening `index.html` in a browser — there's nothing to build or install.

### Images

Source photos live outside this repo. Images in `assets/` are optimized for web
before being committed:

- Resized to a max of 1500px on the long edge
- JPEG quality 66–80, progressive
- EXIF stripped (source photos carried GPS location data)
- Lowercase, hyphenated filenames — GitHub Pages runs on Linux and is case-sensitive

Keep committed images under ~500 KB. Git stores every version of a binary file
forever, so oversized images permanently inflate the repository.

## How to make a change

1. Create a branch off `main` — never edit `main` directly
2. Make the change and check `index.html` in a browser
3. Commit, push, open a pull request, review the diff, merge
4. Merging to `main` publishes the site automatically via GitHub Pages

## Working on the application

```bash
npm install
cp .env.example .env.local     # then fill it in
npm run dev
```

Before committing:

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

This project follows spec-driven development with [Spec Kit](https://github.com/github/spec-kit).
Features start as a spec under `specs/`, progress through a plan and a task breakdown, and only
then get implemented — see Principle I of the constitution. Setup and validation for the current
feature are in `specs/001-auth-user-model/quickstart.md`.
