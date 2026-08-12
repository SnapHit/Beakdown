# Beakdown

A browser arcade game and its content cluster. Live at **https://beakdown.fun**

You fly a bird by flapping. Enemy birds fly around the same arena. When two birds
collide, the one whose lance is higher wins and the other is destroyed. That is the
entire rule, and it is never written down in the game because the freeze-frame on every
clash teaches it better than words did.

## What is in here

```
public/                          everything that gets served
  index.html                     the whole game, one self-contained file
  flappy-bird-online.html        content pages
  flappy-bird-2.html
  what-happened-to-flappy-bird.html
  about-beakdown.html
  404.html
  _redirects                     301s for retired paths
  sitemap.xml  robots.txt  llms.txt
  icon.png                       512x512, favicon and home screen
  og.png                         1200x630, social preview
scripts/verify.mjs               the checks CI runs
.github/workflows/deploy.yml     verify, then deploy
.feel-lock                       hash of the physics constants
CLAUDE.md                        working rules. read before editing.
beakdown-spec.md                 full rebuild spec and tuning history
wrangler.jsonc                   Cloudflare config
```

Nothing outside `public/` is ever served.

## The stack, and why it is this small

The game is one HTML file. Canvas 2D written from scratch, no framework, no build step,
no dependencies, no npm packages at runtime. Audio is synthesised with Web Audio rather
than loaded, so there are no media files.

**The site makes zero external requests.** Not one. No fonts, no CDN, no analytics
beacon. Everything loads from `beakdown.fun` or is generated in the browser.

Hosting is Cloudflare Workers Static Assets with **no Worker script and no `main`
entry**. Static asset requests on Cloudflare are free and unlimited and only Worker
invocations are billable, so that absence is the entire cost model. The site costs
nothing at any traffic level, and it has already taken a Hacker News front page without
a bill.

Traffic is measured by Cloudflare's edge analytics, which needs no client script.
Search performance comes from Search Console.

## Deployment

Push to `main` and it goes live. There is no staging environment.

Every push and pull request runs `scripts/verify.mjs`. The deploy job depends on that
job passing, so a red build cannot ship.

Two repository secrets are required:

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | a token with the **Edit Cloudflare Workers** permission |
| `CLOUDFLARE_ACCOUNT_ID` | the Cloudflare account ID |

If the deploy job fails on authentication, check the token's permission scope first. A
token with the wrong permission reports an auth failure rather than a missing one, which
sends people looking in the wrong place.

## The checks

`node scripts/verify.mjs` runs twenty-two checks. Each one exists because something went
wrong once. The important ones:

- **The ten physics constants have not changed**, verified against `.feel-lock`
- **Nothing is fetched off-domain**
- **Every internal link resolves**, nothing is orphaned, the sitemap matches the routes
- **The game boots** with `localStorage` throwing and Web Audio absent
- The `roundRect` polyfill is present, without which the game is a black screen on any
  browser older than about mid-2022

## Working on it

Branch, change one thing, open a pull request, let CI run, merge. See **CLAUDE.md** for
the rules and the reasoning behind them. It is written for whoever edits next, human or
agent, and it is worth reading even if you wrote the thing originally.

## House style

Australian spelling. Sentence case headings. No em or en dashes anywhere, in code
comments or in copy.

## Credits

Built by [Nathan Haslewood](https://nathanhaslewood.com.au).
