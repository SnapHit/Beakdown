# Beakdown

A browser arcade game and its content cluster, served as static files from Cloudflare
Workers. Live at https://beakdown.fun

**Read this before changing anything.** Most of what follows was learned by shipping
something broken and then fixing it.

---

## The situation you are working in

The person you are working for is **on a phone**. Not sometimes, always.

That has consequences you need to design around:

- **They cannot run the checks locally.** CI is the only gate. Do not ask them to run
  `node scripts/verify.mjs` and report back, because they cannot.
- **They are reviewing your diff on a phone screen.** A pull request touching nine files
  is not reviewable. Change one thing.
- **They cannot easily read a stack trace or open dev tools.** If something might break,
  say so in the pull request before it is merged, not after.
- **Screenshots are how they check visual work.** Anything you change visually, describe
  precisely enough that they know what to look for and where on the screen.

Write pull request descriptions accordingly: what changed, why, what to look at, and
what might have broken. Three sentences beats three paragraphs.

## What this is

`public/index.html` is the entire game: one self-contained file, Canvas 2D, no
framework, no build step, no dependencies. Everything else in `public/` is a content
page, an image, or a routing file.

There is deliberately **no Worker script and no `main` entry** in `wrangler.jsonc`.
Static asset requests on Cloudflare are free and unlimited, and only Worker invocations
are billable, so that absence is the entire cost model. The site costs nothing at any
traffic level.

## How to work in this repo

1. **Branch.** Never commit directly to `main`.
2. **Change one thing.** Resist tidying unrelated code you happen to be looking at.
3. **Open a pull request.** CI runs the checks automatically.
4. **Read the CI result yourself** and fix failures before asking for a review. Do not
   hand over a red build for someone on a phone to diagnose.
5. A human merges. **Merging to `main` is a live deploy.** There is no staging.

If a check fails and you believe the check itself is wrong, say so and stop. Do not edit
the check to make it pass.

## Things that will fail the build

Run `node scripts/verify.mjs` and read the failure. Every check exists because
something went wrong once.

### The feel constants

```js
G=1150  FLAP=340  MAXUP=430  MAXFALL=820  PUSH=230
HDRAG=2.6  MAXH=380  FLAPCD=115  HEIGHT_TIE=6  BODY=17
```

Ten numbers set on the first playable evening. They are the entire feel of flying and
they have not moved in twenty-seven versions. It is very easy to nudge one while adding
something unrelated, and the failure mode is horrible: the game feels subtly wrong and
nobody can say why, three versions after the mistake.

CI hashes the block and compares it to `.feel-lock`. **Do not update `.feel-lock` to
make a failing build pass.** That is the single worst thing you could do in this
repository. If a change to feel was genuinely requested, update the lock in the same
commit and say so explicitly in the pull request, so the diff shows a human what
happened.

There is an eleventh constant, `PUSH * 3.2`, sitting inline in the update loop rather
than in the block. It sets the drift speed of the hold control and it is the single most
likely thing in the file to be broken by accident.

### Zero external requests

No scripts, fonts, stylesheets, images, beacons or media from any domain other than
`beakdown.fun`. Not one, for any reason.

The audience includes school and corporate networks whose content filters block
third-party domains, and every external request is a way for the page to fail before it
starts. There is no analytics beacon: it was installed, found to be blocked by ad
blockers and filters alike, and removed in favour of Cloudflare's edge analytics.

Outbound `<a href>` links to other sites are fine. Those are not requests.

### URLs

Flat files in `public/`. `public/about-beakdown.html` serves at `/about-beakdown`.

- Internal links and canonicals use the **extension-less** form
- Retiring a path means a line in `public/_redirects` with an explicit `301`, because
  Workers defaults to 302 when the code is omitted
- **The word "unblocked" never appears in a filename or a path.** Content filters
  keyword-match URLs before fetching. It belongs in titles and body copy, which is where
  the ranking value sits anyway.

### Banned words

Joust, Skirmish, Williams, Midway and Harriman appear nowhere in any published file.
The game is described on its own terms.

### House style

Australian spelling. Sentence case headings. **No em or en dashes, ever.** Restructure
the sentence instead.

## Browser compatibility

Audit any modern API against its first supported browser version before using it.

`ctx.roundRect` is Chrome 99, Safari 16, Firefox 112. It is used eight times including
in a per-frame draw call, and without the polyfill at the top of the script the game
throws on its first draw and shows a black screen. That nearly shipped. Managed school
Chromebooks run old Chrome and are a large part of the audience.

## Performance

The target device is a five-year-old Celeron Chromebook with integrated graphics.

`shadowBlur` is the most expensive operation in the renderer and roughly ten objects
request it per frame at high waves. The loop samples real frame time and disables every
glow after three consecutive 30-frame windows below 36fps. It never re-enables mid-run,
because oscillating between quality levels reads worse than staying low.

## Audio

Entirely synthesised with Web Audio. **No audio files, ever**, because that would be an
external request in all but name and a lot of weight.

Sound and music default to **on** when the game is loaded directly and **off inside an
iframe**, because the embedded copies sit on pages aimed at school hardware. An explicit
choice by the player overrides both and persists in `localStorage`.

## Storage

`localStorage` only, every call wrapped in try/catch. Blocked, full and unavailable
stores are common on locked-down profiles and in private browsing, and the game must
degrade to playing perfectly with no memory rather than throwing.

## Layout traps

**Do not add a persistent header or nav bar to the game page.** It resizes the canvas,
which changes the arena geometry the game was tuned against, and it intercepts taps
where people are trying to play.

The footer links live in a `position: fixed` container that is `display: none` during
play. Because the splash is the page's default state, crawlers see the links without
running any JavaScript.

**Touch targets are 44pt minimum**, which is why the in-play controls are 54px circles.
Any control container spanning the screen must carry `pointer-events: none` with the
buttons re-enabling it, or the gaps between buttons swallow flap taps.

**Do not pin overlays to the viewport bottom on the game page.** An earlier version put
the credit there and it landed exactly on the horizon line of the sky gradient, which is
the highest-contrast strip on the screen. Anchor to a world coordinate on a flat surface
instead. The in-play credit is painted into the canvas inside the floor band.

## Verifying a deploy

Cloudflare caches misses, so a bare request to a path that once 404ed will lie. Always
verify with a cache-busting query string:

```
https://beakdown.fun/?v=1
https://beakdown.fun/flappy-bird-unblocked?v=1     # must return 301, not 302
https://beakdown.fun/nonsense?v=1                  # must show the 404 page
```

`beakdown-spec.md` is the full rebuild specification and carries the reasoning behind
every tuning decision. Read it before changing gameplay.
