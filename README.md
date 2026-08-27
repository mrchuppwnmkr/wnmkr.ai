# winemaking-consultant

an agentic winemaking consultant subscription website for everyone
This is an agentic AI winemaking consulting project built upon the combined knowledge of Steve Burch and Michael Chupp's, winemaking knowledge, powered the best research available.

**AVAs covered:** Lodi · Livermore · Russian River Valley

## What's in this repo

| Path | What it is |
|---|---|
| `index.html` | The public website at wnmkr.ai. One self-contained page — HTML and CSS inline, no dependencies, no build step. |
| `assets/` | Optimized images used by the site. |
| `user-stories.md` | Product requirements — epics, user stories, and acceptance criteria. |
| `session-notes.md` | Working notes. |
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
