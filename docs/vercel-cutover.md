# Vercel cutover — moving wnmkr.ai off GitHub Pages

**Status**: not performed. This is the checklist for when Phase 1 is ready to go live.

Right now `main` serves the static `index.html` at wnmkr.ai through GitHub Pages, and the Next.js
application lives on `phase1-auth`. Merging the app to `main` without doing the steps below would
take the live site down, because GitHub Pages would start serving a repository that no longer has a
usable static entry point.

## Before merging

1. Import the repository into Vercel and set the production branch to `main`.
2. Add every variable from `.env.example` to the Vercel project — Production and Preview both.
3. Deploy from `phase1-auth` as a preview and walk `specs/001-auth-user-model/quickstart.md`
   against the preview URL.
4. Point the Clerk webhook endpoint at the preview host and confirm a real `user.created`
   provisions a row.

## Cutover

5. In Vercel, add `wnmkr.ai` as a domain and follow its DNS instructions.
6. In the GitHub repository settings, disable GitHub Pages **before** changing DNS, so the two
   cannot both claim the domain.
7. Update DNS. Allow for propagation.
8. Delete `CNAME` — it exists only for GitHub Pages and does nothing on Vercel.
9. Merge `phase1-auth` to `main`.

## After cutover

10. Remove `index.html` once `app/page.tsx` carries all of its content. Until then it is the source
    of record for the landing copy, which is why this slice ported rather than deleted it.
11. Consolidate `assets/` into `public/assets/`. Today `hero-cluster-bottle.jpg` exists in both:
    `assets/` for the Pages site, `public/assets/` for Next. After cutover only `public/assets/`
    is needed, and `index.html`'s references go away with it.
12. Set the Clerk webhook endpoint to the production URL and rotate the signing secret.
