"use strict";
/* The SnapHit arcade cabinet, behaviour half. Styles live in arcade.css.

   Lifted from the studio homepage. The differences from the original, all
   forced by this domain rather than chosen:

   1. One machine, not a rack. Beakdown only.
   2. The game is the site root, so src is "/". The game detects being framed
      on its own and hides its nav and credit and starts muted, so nothing in
      public/index.html needed touching.
   3. The iframe carries the long control description these pages already used
      as its accessible name, rather than just the game's name.

   Markup is built here rather than written into each page because the deck
   artwork is about 25KB on its own and four copies is four places to edit.
   Nothing here loads from another domain. */

(function () {

  const GAME = {
    name: 'Beakdown',
    src:  '/',
    site: 'https://beakdown.fun/',
    label: 'Beakdown, a playable arcade game. Hold the left or right side of the screen ' +
           'to fly that way. On a keyboard, use the arrow keys or A and D to steer and ' +
           'space to climb.'
  };

  const mounts = document.querySelectorAll('.arcade');
  if (!mounts.length) return;

  /* The wordmark is drawn once and referenced by the marquee. */
  document.body.insertAdjacentHTML('afterbegin', "<svg width=\"0\" height=\"0\" aria-hidden=\"true\" style=\"position:absolute\">\n  <symbol id=\"wm\" viewBox=\"0 0 4789 719\">\n    <path d=\"M182 502H0Q2 571 38.5 620Q75 669 136 694Q197 719 274 719Q353 719 411 690Q469 661 499.5 612Q530 563 530 503Q530 440 499 400Q468 360 425.5 339Q383 318 315 295Q247 273 215 254Q183 235 183 201Q183 170 202 153.5Q221 137 252 137Q288 137 311 156.5Q334 176 336 210H521Q516 111 445 55.5Q374 0 258 0Q144 0 73 55.5Q2 111 2 209Q2 275 33 316Q64 357 107 378Q150 399 218 420Q265 434 290.5 445Q316 456 333.5 473Q351 490 351 516Q351 547 329 564.5Q307 582 269 582Q232 582 209 561.5Q186 541 182 502ZM1177 712H1348V10H1177V445L891 10H720V712H891V279L1177 712ZM1732 588H1994L2036 712H2217L1963 10H1765L1511 712H1690L1732 588ZM1863 199 1950 456H1777L1863 199ZM2550 460H2656Q2742 460 2800 429Q2858 398 2886 347.5Q2914 297 2914 236Q2914 170 2885 119Q2856 68 2798 39Q2740 10 2656 10H2379V712H2550V460ZM2716 171Q2740 194 2740 236Q2740 278 2716 301Q2692 324 2643 324H2550V148H2643Q2692 148 2716 171ZM3696 712V10H3525V285H3259V10H3088V712H3259V423H3525V712H3696ZM3904 10V712H4075V10ZM4789 147V10H4246V147H4432V712H4603V147H4789Z\" fill=\"#ffffff\" stroke=\"currentColor\"\n          stroke-linejoin=\"round\" stroke-linecap=\"round\"/>\n  </symbol>\n</svg>");

  /* One close button serves whichever machine is expanded. */
  const shrinkBtn = document.createElement('button');
  shrinkBtn.className = 'shrink';
  shrinkBtn.type = 'button';
  shrinkBtn.setAttribute('aria-label', 'Close full screen');
  shrinkBtn.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>';
  document.body.appendChild(shrinkBtn);

  let zoomed = null;

  function zoom(phone){
    zoomed = phone;
    phone.classList.add('big');
    document.body.classList.add('zoomed');
    shrinkBtn.focus();
  }
  function unzoom(){
    if (!zoomed) return;
    zoomed.classList.remove('big');
    document.body.classList.remove('zoomed');
    const g = zoomed.querySelector('.grow');
    zoomed = null;
    if (g) g.focus();
  }
  shrinkBtn.addEventListener('click', unzoom);
  addEventListener('keydown', e => { if (e.key === 'Escape') unzoom(); });

  /* Keyboard relay, moved here from the four pages that each carried a copy.
     It has to live with the iframe now: the old copies resolved #game once at
     load, and a machine that does not build its iframe until it is tapped
     would have left them disabled, so arrow keys and space would scroll the
     page instead of flying the bird. The guards are the ones those pages used.
     live is the iframe currently running, or null. */
  const GK = {' ':1,'ArrowLeft':1,'ArrowRight':1,'a':1,'d':1,'A':1,'D':1};
  let live = null;

  function relay(type, e){
    if (!live || !GK[e.key] || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && t !== document.body && t !== document.documentElement) return;
    const r = live.getBoundingClientRect();
    if (!(r.bottom > 60 && r.top < window.innerHeight - 60)) return;
    let w = null;
    try { w = live.contentWindow; } catch(err){ return; }
    if (!w || !w.document) return;
    if (w.document.hasFocus && w.document.hasFocus()) return;
    e.preventDefault();
    try { w.focus(); } catch(err){}
    try { w.dispatchEvent(new w.KeyboardEvent(type, { key:e.key, repeat:!!e.repeat })); }
    catch(err){
      try { w.dispatchEvent(new KeyboardEvent(type, { key:e.key, repeat:!!e.repeat })); }
      catch(e2){}
    }
  }
  addEventListener('keydown', e => relay('keydown', e));
  addEventListener('keyup',   e => relay('keyup', e));

  const attractInner =
    '<span class="title">' + GAME.name + '</span>' +
    '<span class="play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3 L21 12 L6 21 Z"/></svg></span>' +
    '<span class="hint">TAP TO PLAY</span>';

  for (const mount of mounts){
    mount.textContent = '';

    const cab = document.createElement('article');
    cab.className = 'cab';
    cab.innerHTML =
      '<div class="cab-body">' +
        '<div class="marquee"><svg class="wm wm-marq" viewBox="0 0 4789 719" role="img" aria-label="SnapHit"><use href="#wm"/></svg></div>' +
        '<div class="aperture">' +
          '<div class="phone">' +
            '<span class="key vol v1"></span><span class="key vol v2"></span>' +
            '<span class="key pwr"></span>' +
            '<button class="grow" type="button" aria-label="Expand to full screen">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6"/></svg>' +
            '</button>' +
            '<div class="screen">' +
              '<button class="attract" type="button">' + attractInner + '</button>' +
              '<div class="island"><span class="lens"></span></div>' +
              '<div class="glass"></div><div class="bar"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="deck">' +
          "<svg class=\"panel\" viewBox=\"0 0 200 74\" aria-hidden=\"true\"><defs><linearGradient id=\"gwall\" x1=\"0\" x2=\"1\"><stop offset=\"0\" stop-color=\"#0a1420\"/><stop offset=\".35\" stop-color=\"#223a52\"/><stop offset=\".62\" stop-color=\"#16283b\"/><stop offset=\"1\" stop-color=\"#070e18\"/></linearGradient><radialGradient id=\"gface\" cx=\"40%\" cy=\"26%\" r=\"82%\"><stop offset=\"0\" stop-color=\"#1d3a55\"/><stop offset=\".62\" stop-color=\"#0e2135\"/><stop offset=\"1\" stop-color=\"#060e18\"/></radialGradient><linearGradient id=\"gstem\" x1=\"0\" x2=\"1\"><stop offset=\"0\" stop-color=\"#6b4a12\"/><stop offset=\".26\" stop-color=\"#ffe0a0\"/><stop offset=\".52\" stop-color=\"#c9922e\"/><stop offset=\"1\" stop-color=\"#4d3208\"/></linearGradient><radialGradient id=\"gorb\" cx=\"34%\" cy=\"26%\" r=\"80%\"><stop offset=\"0\" stop-color=\"#16233a\"/><stop offset=\".7\" stop-color=\"#080f1b\"/><stop offset=\"1\" stop-color=\"#03060c\"/></radialGradient><radialGradient id=\"gb1\" cx=\"32%\" cy=\"24%\" r=\"82%\"><stop offset=\"0\" stop-color=\"#fff\"/><stop offset=\".28\" stop-color=\"#93ecff\"/><stop offset=\".7\" stop-color=\"#1fbde8\"/><stop offset=\"1\" stop-color=\"#06566f\"/></radialGradient><radialGradient id=\"gb2\" cx=\"32%\" cy=\"24%\" r=\"82%\"><stop offset=\"0\" stop-color=\"#fff7e6\"/><stop offset=\".28\" stop-color=\"#ffc478\"/><stop offset=\".7\" stop-color=\"#ff8c1c\"/><stop offset=\"1\" stop-color=\"#853a03\"/></radialGradient><radialGradient id=\"gb3\" cx=\"32%\" cy=\"24%\" r=\"82%\"><stop offset=\"0\" stop-color=\"#fff\"/><stop offset=\".28\" stop-color=\"#ffe4b0\"/><stop offset=\".7\" stop-color=\"#ffb43f\"/><stop offset=\"1\" stop-color=\"#855105\"/></radialGradient><clipPath id=\"deck\"><rect x=\"5\" y=\"4\" width=\"190\" height=\"66\" rx=\"9\"/></clipPath></defs><rect x=\"5\" y=\"4\" width=\"190\" height=\"66\" rx=\"9\" fill=\"#050b14\"/><g clip-path=\"url(#deck)\" opacity=\".55\"><line x1=\"14\" y1=\"4\" x2=\"14\" y2=\"70\" stroke=\"#2ba6d8\" stroke-width=\".4\"/><line x1=\"27\" y1=\"4\" x2=\"27\" y2=\"70\" stroke=\"#2ba6d8\" stroke-width=\".4\"/><line x1=\"40\" y1=\"4\" x2=\"40\" y2=\"70\" stroke=\"#2ba6d8\" stroke-width=\".4\"/><line x1=\"53\" y1=\"4\" x2=\"53\" y2=\"70\" stroke=\"#2ba6d8\" stroke-width=\".4\"/><line x1=\"66\" y1=\"4\" x2=\"66\" y2=\"70\" stroke=\"#2ba6d8\" stroke-width=\".4\"/><line x1=\"79\" y1=\"4\" x2=\"79\" y2=\"70\" stroke=\"#2ba6d8\" stroke-width=\".4\"/><line x1=\"92\" y1=\"4\" x2=\"92\" y2=\"70\" stroke=\"#2ba6d8\" stroke-width=\".4\"/><line x1=\"105\" y1=\"4\" x2=\"105\" y2=\"70\" stroke=\"#2ba6d8\" stroke-width=\".4\"/><line x1=\"118\" y1=\"4\" x2=\"118\" y2=\"70\" stroke=\"#2ba6d8\" stroke-width=\".4\"/><line x1=\"131\" y1=\"4\" x2=\"131\" y2=\"70\" stroke=\"#2ba6d8\" stroke-width=\".4\"/><line x1=\"144\" y1=\"4\" x2=\"144\" y2=\"70\" stroke=\"#2ba6d8\" stroke-width=\".4\"/><line x1=\"157\" y1=\"4\" x2=\"157\" y2=\"70\" stroke=\"#2ba6d8\" stroke-width=\".4\"/><line x1=\"170\" y1=\"4\" x2=\"170\" y2=\"70\" stroke=\"#2ba6d8\" stroke-width=\".4\"/><line x1=\"183\" y1=\"4\" x2=\"183\" y2=\"70\" stroke=\"#2ba6d8\" stroke-width=\".4\"/><line x1=\"5\" y1=\"11\" x2=\"195\" y2=\"11\" stroke=\"#2ba6d8\" stroke-width=\".4\"/><line x1=\"5\" y1=\"22\" x2=\"195\" y2=\"22\" stroke=\"#2ba6d8\" stroke-width=\".4\"/><line x1=\"5\" y1=\"33\" x2=\"195\" y2=\"33\" stroke=\"#2ba6d8\" stroke-width=\".4\"/><line x1=\"5\" y1=\"44\" x2=\"195\" y2=\"44\" stroke=\"#2ba6d8\" stroke-width=\".4\"/><line x1=\"5\" y1=\"55\" x2=\"195\" y2=\"55\" stroke=\"#2ba6d8\" stroke-width=\".4\"/><line x1=\"5\" y1=\"66\" x2=\"195\" y2=\"66\" stroke=\"#2ba6d8\" stroke-width=\".4\"/></g><rect x=\"5\" y=\"4\" width=\"190\" height=\"66\" rx=\"9\" fill=\"none\" stroke=\"#ff9424\" stroke-width=\"3.4\" opacity=\".18\"/><rect x=\"5\" y=\"4\" width=\"190\" height=\"66\" rx=\"9\" fill=\"none\" stroke=\"#ff9424\" stroke-width=\"1.8\" opacity=\".55\"/><rect x=\"5\" y=\"4\" width=\"190\" height=\"66\" rx=\"9\" fill=\"none\" stroke=\"#ffd9a2\" stroke-width=\".8\"/><ellipse cx=\"46\" cy=\"49\" rx=\"22.5\" ry=\"7.4\" fill=\"#02060c\" opacity=\".6\"/><path d=\"M25.00 43.00 A21.00 6.90 0 0 0 67.00 43.00 L67.00 47.20 A21.00 6.90 0 0 1 25.00 47.20 Z\" fill=\"url(#gwall)\"/><path d=\"M25.00 44.26 A21.00 6.90 0 0 0 67.00 44.26\" fill=\"none\" stroke=\"#ff9a24\" stroke-width=\".34\" opacity=\"0.68\"/><path d=\"M25.00 45.60 A21.00 6.90 0 0 0 67.00 45.60\" fill=\"none\" stroke=\"#ff9a24\" stroke-width=\".34\" opacity=\"0.59\"/><path d=\"M25.00 46.86 A21.00 6.90 0 0 0 67.00 46.86\" fill=\"none\" stroke=\"#ff9a24\" stroke-width=\".34\" opacity=\"0.52\"/><ellipse cx=\"46\" cy=\"43\" rx=\"21\" ry=\"6.9\" fill=\"url(#gface)\"/><ellipse cx=\"46\" cy=\"43\" rx=\"21\" ry=\"6.9\" fill=\"none\" stroke=\"#ff9424\" stroke-width=\"1.5\" opacity=\".5\"/><ellipse cx=\"46\" cy=\"43\" rx=\"21\" ry=\"6.9\" fill=\"none\" stroke=\"#ffd9a2\" stroke-width=\".6\"/><rect x=\"55.62\" y=\"43.12\" width=\"1.50\" height=\"0.85\" rx=\".25\" fill=\"#ffb04a\" opacity=\".85\"/><rect x=\"58.14\" y=\"44.41\" width=\"2.00\" height=\"0.85\" rx=\".25\" fill=\"#4fd8ff\" opacity=\".85\"/><rect x=\"59.20\" y=\"46.13\" width=\"2.50\" height=\"0.85\" rx=\".25\" fill=\"#4fd8ff\" opacity=\".85\"/><rect x=\"53.10\" y=\"45.73\" width=\"1.50\" height=\"0.85\" rx=\".25\" fill=\"#4fd8ff\" opacity=\".85\"/><rect x=\"51.95\" y=\"47.37\" width=\"2.00\" height=\"0.85\" rx=\".25\" fill=\"#ffb04a\" opacity=\".85\"/><rect x=\"46.86\" y=\"45.95\" width=\"2.50\" height=\"0.85\" rx=\".25\" fill=\"#4fd8ff\" opacity=\".85\"/><rect x=\"44.69\" y=\"47.26\" width=\"1.50\" height=\"0.85\" rx=\".25\" fill=\"#4fd8ff\" opacity=\".85\"/><rect x=\"39.99\" y=\"48.28\" width=\"2.00\" height=\"0.85\" rx=\".25\" fill=\"#4fd8ff\" opacity=\".85\"/><rect x=\"38.57\" y=\"46.10\" width=\"2.50\" height=\"0.85\" rx=\".25\" fill=\"#ffb04a\" opacity=\".85\"/><rect x=\"34.06\" y=\"46.41\" width=\"1.50\" height=\"0.85\" rx=\".25\" fill=\"#4fd8ff\" opacity=\".85\"/><rect x=\"36.13\" y=\"44.42\" width=\"2.00\" height=\"0.85\" rx=\".25\" fill=\"#4fd8ff\" opacity=\".85\"/><rect x=\"31.21\" y=\"44.07\" width=\"2.50\" height=\"0.85\" rx=\".25\" fill=\"#4fd8ff\" opacity=\".85\"/><rect x=\"27.25\" y=\"43.06\" width=\"1.50\" height=\"0.85\" rx=\".25\" fill=\"#ffb04a\" opacity=\".85\"/><rect x=\"32.77\" y=\"41.93\" width=\"2.00\" height=\"0.85\" rx=\".25\" fill=\"#4fd8ff\" opacity=\".85\"/><rect x=\"29.87\" y=\"40.50\" width=\"2.50\" height=\"0.85\" rx=\".25\" fill=\"#4fd8ff\" opacity=\".85\"/><rect x=\"36.85\" y=\"40.51\" width=\"1.50\" height=\"0.85\" rx=\".25\" fill=\"#4fd8ff\" opacity=\".85\"/><rect x=\"35.96\" y=\"38.94\" width=\"2.00\" height=\"0.85\" rx=\".25\" fill=\"#ffb04a\" opacity=\".85\"/><rect x=\"36.99\" y=\"37.22\" width=\"2.50\" height=\"0.85\" rx=\".25\" fill=\"#4fd8ff\" opacity=\".85\"/><rect x=\"42.76\" y=\"38.59\" width=\"1.50\" height=\"0.85\" rx=\".25\" fill=\"#4fd8ff\" opacity=\".85\"/><rect x=\"45.63\" y=\"37.27\" width=\"2.00\" height=\"0.85\" rx=\".25\" fill=\"#4fd8ff\" opacity=\".85\"/><rect x=\"47.66\" y=\"39.26\" width=\"2.50\" height=\"0.85\" rx=\".25\" fill=\"#ffb04a\" opacity=\".85\"/><rect x=\"52.38\" y=\"38.51\" width=\"1.50\" height=\"0.85\" rx=\".25\" fill=\"#4fd8ff\" opacity=\".85\"/><rect x=\"57.50\" y=\"38.29\" width=\"2.00\" height=\"0.85\" rx=\".25\" fill=\"#4fd8ff\" opacity=\".85\"/><rect x=\"55.21\" y=\"40.40\" width=\"2.50\" height=\"0.85\" rx=\".25\" fill=\"#4fd8ff\" opacity=\".85\"/><rect x=\"60.58\" y=\"40.89\" width=\"1.50\" height=\"0.85\" rx=\".25\" fill=\"#ffb04a\" opacity=\".85\"/><rect x=\"55.47\" y=\"42.29\" width=\"2.00\" height=\"0.85\" rx=\".25\" fill=\"#4fd8ff\" opacity=\".85\"/><line x1=\"54.43\" y1=\"43.86\" x2=\"63.25\" y2=\"44.75\" stroke=\"#ff9a24\" stroke-width=\".38\" opacity=\".72\"/><line x1=\"53.03\" y1=\"44.75\" x2=\"60.39\" y2=\"46.59\" stroke=\"#ff9a24\" stroke-width=\".38\" opacity=\".72\"/><line x1=\"50.78\" y1=\"45.44\" x2=\"55.79\" y2=\"47.99\" stroke=\"#ff9a24\" stroke-width=\".38\" opacity=\".72\"/><line x1=\"47.96\" y1=\"45.83\" x2=\"50.00\" y2=\"48.79\" stroke=\"#ff9a24\" stroke-width=\".38\" opacity=\".72\"/><line x1=\"44.90\" y1=\"45.88\" x2=\"43.74\" y2=\"48.89\" stroke=\"#ff9a24\" stroke-width=\".38\" opacity=\".72\"/><line x1=\"41.97\" y1=\"45.58\" x2=\"37.75\" y2=\"48.28\" stroke=\"#ff9a24\" stroke-width=\".38\" opacity=\".72\"/><line x1=\"39.53\" y1=\"44.97\" x2=\"32.75\" y2=\"47.03\" stroke=\"#ff9a24\" stroke-width=\".38\" opacity=\".72\"/><line x1=\"37.87\" y1=\"44.12\" x2=\"29.35\" y2=\"45.30\" stroke=\"#ff9a24\" stroke-width=\".38\" opacity=\".72\"/><line x1=\"37.19\" y1=\"43.14\" x2=\"27.96\" y2=\"43.29\" stroke=\"#ff9a24\" stroke-width=\".38\" opacity=\".72\"/><line x1=\"37.57\" y1=\"42.14\" x2=\"28.75\" y2=\"41.25\" stroke=\"#ff9a24\" stroke-width=\".38\" opacity=\".72\"/><line x1=\"38.97\" y1=\"41.25\" x2=\"31.61\" y2=\"39.41\" stroke=\"#ff9a24\" stroke-width=\".38\" opacity=\".72\"/><line x1=\"41.22\" y1=\"40.56\" x2=\"36.21\" y2=\"38.01\" stroke=\"#ff9a24\" stroke-width=\".38\" opacity=\".72\"/><line x1=\"44.04\" y1=\"40.17\" x2=\"42.00\" y2=\"37.21\" stroke=\"#ff9a24\" stroke-width=\".38\" opacity=\".72\"/><line x1=\"47.10\" y1=\"40.12\" x2=\"48.26\" y2=\"37.11\" stroke=\"#ff9a24\" stroke-width=\".38\" opacity=\".72\"/><line x1=\"50.03\" y1=\"40.42\" x2=\"54.25\" y2=\"37.72\" stroke=\"#ff9a24\" stroke-width=\".38\" opacity=\".72\"/><line x1=\"52.47\" y1=\"41.03\" x2=\"59.25\" y2=\"38.97\" stroke=\"#ff9a24\" stroke-width=\".38\" opacity=\".72\"/><line x1=\"54.13\" y1=\"41.88\" x2=\"62.65\" y2=\"40.70\" stroke=\"#ff9a24\" stroke-width=\".38\" opacity=\".72\"/><line x1=\"54.81\" y1=\"42.86\" x2=\"64.04\" y2=\"42.71\" stroke=\"#ff9a24\" stroke-width=\".38\" opacity=\".72\"/><ellipse cx=\"46\" cy=\"43\" rx=\"15.5\" ry=\"5.1\" fill=\"none\" stroke=\"#2ba6d8\" stroke-width=\".4\" opacity=\".7\"/><ellipse cx=\"46\" cy=\"43\" rx=\"10.5\" ry=\"3.5\" fill=\"none\" stroke=\"#ff9a24\" stroke-width=\".5\" opacity=\".8\"/><ellipse cx=\"46\" cy=\"42.4\" rx=\"7.6\" ry=\"2.5\" fill=\"#0d1c2c\" stroke=\"#ffb04a\" stroke-width=\".45\"/><ellipse cx=\"46\" cy=\"41.6\" rx=\"5.2\" ry=\"1.75\" fill=\"#152a40\" stroke=\"#ffd9a2\" stroke-width=\".4\"/><ellipse cx=\"46\" cy=\"40.9\" rx=\"3.1\" ry=\"1.05\" fill=\"#070f1a\" stroke=\"#ffb04a\" stroke-width=\".35\"/><path d=\"M43.6 41 L44.3 24.6 L47.7 24.6 L48.4 41 Z\" fill=\"url(#gstem)\"/><ellipse cx=\"46\" cy=\"24.8\" rx=\"2.6\" ry=\".9\" fill=\"#ffe0a0\" opacity=\".85\"/><circle cx=\"46\" cy=\"16.5\" r=\"10.2\" fill=\"url(#gorb)\"/><path d=\"M46.84 7.26 L46.00 7.75 L45.16 7.26 L45.16 6.30 L46.00 5.81 L46.84 6.30 Z\" fill=\"rgb(30,31,33)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M42.84 9.82 L41.79 10.42 L40.74 9.82 L40.74 8.60 L41.79 8.00 L42.84 8.60 Z\" fill=\"rgb(139,111,70)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M45.74 9.87 L44.60 10.53 L43.45 9.87 L43.45 8.55 L44.60 7.89 L45.74 8.55 Z\" fill=\"rgb(108,88,60)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M48.55 9.87 L47.40 10.53 L46.26 9.87 L46.26 8.55 L47.40 7.89 L48.55 8.55 Z\" fill=\"rgb(44,41,38)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M51.26 9.82 L50.21 10.42 L49.16 9.82 L49.16 8.60 L50.21 8.00 L51.26 8.60 Z\" fill=\"rgb(10,16,26)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M38.42 12.12 L37.58 12.61 L36.75 12.12 L36.75 11.16 L37.58 10.67 L38.42 11.16 Z\" fill=\"rgb(95,78,55)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M41.54 12.30 L40.39 12.96 L39.24 12.30 L39.24 10.98 L40.39 10.32 L41.54 10.98 Z\" fill=\"rgb(174,136,82)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M44.46 12.37 L43.19 13.11 L41.93 12.37 L41.93 10.91 L43.19 10.17 L44.46 10.91 Z\" fill=\"rgb(186,143,84)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M47.30 12.39 L46.00 13.15 L44.70 12.39 L44.70 10.89 L46.00 10.13 L47.30 10.89 Z\" fill=\"rgb(122,91,56)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M50.07 12.37 L48.81 13.11 L47.54 12.37 L47.54 10.91 L48.81 10.17 L50.07 10.91 Z\" fill=\"rgb(42,32,28)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M52.76 12.30 L51.61 12.96 L50.46 12.30 L50.46 10.98 L51.61 10.32 L52.76 10.98 Z\" fill=\"rgb(10,16,26)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M55.25 12.12 L54.42 12.61 L53.58 12.12 L53.58 11.16 L54.42 10.67 L55.25 11.16 Z\" fill=\"rgb(10,16,26)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M40.13 14.73 L38.99 15.39 L37.84 14.73 L37.84 13.41 L38.99 12.75 L40.13 13.41 Z\" fill=\"rgb(117,94,63)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M43.10 14.82 L41.79 15.58 L40.49 14.82 L40.49 13.32 L41.79 12.56 L43.10 13.32 Z\" fill=\"rgb(179,133,76)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M45.97 14.86 L44.60 15.65 L43.23 14.86 L43.23 13.28 L44.60 12.49 L45.97 13.28 Z\" fill=\"rgb(170,116,60)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M48.77 14.86 L47.40 15.65 L46.03 14.86 L46.03 13.28 L47.40 12.49 L48.77 13.28 Z\" fill=\"rgb(127,74,34)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M51.51 14.82 L50.21 15.58 L48.90 14.82 L48.90 13.32 L50.21 12.56 L51.51 13.32 Z\" fill=\"rgb(66,37,21)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M54.16 14.73 L53.01 15.39 L51.87 14.73 L51.87 13.41 L53.01 12.75 L54.16 13.41 Z\" fill=\"rgb(13,17,26)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M38.63 17.11 L37.58 17.71 L36.53 17.11 L36.53 15.89 L37.58 15.29 L38.63 15.89 Z\" fill=\"rgb(41,39,37)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M41.66 17.23 L40.39 17.97 L39.12 17.23 L39.12 15.77 L40.39 15.03 L41.66 15.77 Z\" fill=\"rgb(122,84,48)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M44.57 17.29 L43.19 18.08 L41.82 17.29 L41.82 15.71 L43.19 14.92 L44.57 15.71 Z\" fill=\"rgb(167,101,45)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M47.40 17.31 L46.00 18.12 L44.60 17.31 L44.60 15.69 L46.00 14.88 L47.40 15.69 Z\" fill=\"rgb(179,91,27)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M50.18 17.29 L48.81 18.08 L47.43 17.29 L47.43 15.71 L48.81 14.92 L50.18 15.71 Z\" fill=\"rgb(136,62,15)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M52.88 17.23 L51.61 17.97 L50.34 17.23 L50.34 15.77 L51.61 15.03 L52.88 15.77 Z\" fill=\"rgb(74,39,20)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M55.47 17.11 L54.42 17.71 L53.37 17.11 L53.37 15.89 L54.42 15.29 L55.47 15.89 Z\" fill=\"rgb(10,16,26)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M40.13 19.59 L38.99 20.25 L37.84 19.59 L37.84 18.27 L38.99 17.61 L40.13 18.27 Z\" fill=\"rgb(39,27,23)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M43.10 19.68 L41.79 20.44 L40.49 19.68 L40.49 18.18 L41.79 17.42 L43.10 18.18 Z\" fill=\"rgb(118,60,22)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M45.97 19.72 L44.60 20.51 L43.23 19.72 L43.23 18.14 L44.60 17.35 L45.97 18.14 Z\" fill=\"rgb(183,79,11)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M48.77 19.72 L47.40 20.51 L46.03 19.72 L46.03 18.14 L47.40 17.35 L48.77 18.14 Z\" fill=\"rgb(193,83,10)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M51.51 19.68 L50.21 20.44 L48.90 19.68 L48.90 18.18 L50.21 17.42 L51.51 18.18 Z\" fill=\"rgb(121,57,16)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M54.16 19.59 L53.01 20.25 L51.87 19.59 L51.87 18.27 L53.01 17.61 L54.16 18.27 Z\" fill=\"rgb(50,30,23)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M38.42 21.84 L37.58 22.33 L36.75 21.84 L36.75 20.88 L37.58 20.39 L38.42 20.88 Z\" fill=\"rgb(10,16,26)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M41.54 22.02 L40.39 22.68 L39.24 22.02 L39.24 20.70 L40.39 20.04 L41.54 20.70 Z\" fill=\"rgb(61,35,22)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M44.46 22.09 L43.19 22.83 L41.93 22.09 L41.93 20.63 L43.19 19.89 L44.46 20.63 Z\" fill=\"rgb(122,57,16)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M47.30 22.11 L46.00 22.87 L44.70 22.11 L44.70 20.61 L46.00 19.85 L47.30 20.61 Z\" fill=\"rgb(157,70,13)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M50.07 22.09 L48.81 22.83 L47.54 22.09 L47.54 20.63 L48.81 19.89 L50.07 20.63 Z\" fill=\"rgb(130,60,16)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M52.76 22.02 L51.61 22.68 L50.46 22.02 L50.46 20.70 L51.61 20.04 L52.76 20.70 Z\" fill=\"rgb(70,38,21)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M55.25 21.84 L54.42 22.33 L53.58 21.84 L53.58 20.88 L54.42 20.39 L55.25 20.88 Z\" fill=\"rgb(10,16,26)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M42.84 24.40 L41.79 25.00 L40.74 24.40 L40.74 23.18 L41.79 22.58 L42.84 23.18 Z\" fill=\"rgb(52,32,22)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M45.74 24.45 L44.60 25.11 L43.45 24.45 L43.45 23.13 L44.60 22.47 L45.74 23.13 Z\" fill=\"rgb(88,45,19)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M48.55 24.45 L47.40 25.11 L46.26 24.45 L46.26 23.13 L47.40 22.47 L48.55 23.13 Z\" fill=\"rgb(91,46,19)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M51.26 24.40 L50.21 25.00 L49.16 24.40 L49.16 23.18 L50.21 22.58 L51.26 23.18 Z\" fill=\"rgb(59,34,22)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><path d=\"M46.84 26.70 L46.00 27.19 L45.16 26.70 L45.16 25.74 L46.00 25.25 L46.84 25.74 Z\" fill=\"rgb(33,24,24)\" stroke=\"rgba(120,200,240,.20)\" stroke-width=\".18\"/><ellipse cx=\"41.9\" cy=\"11.6\" rx=\"3.3\" ry=\"2.1\" fill=\"#eaf6ff\" opacity=\".5\"/><path d=\"M38.4 23.6 a10.2 10.2 0 0 0 15 -1.4\" fill=\"none\" stroke=\"#ffb04a\" stroke-width=\".9\" opacity=\".5\"/><circle cx=\"46\" cy=\"16.5\" r=\"10.2\" fill=\"none\" stroke=\"#7fc9e8\" stroke-width=\".4\" opacity=\".45\"/><ellipse cx=\"120\" cy=\"48.0\" rx=\"8.9\" ry=\"6\" fill=\"#02070e\" opacity=\".5\"/><ellipse cx=\"120\" cy=\"46.0\" rx=\"8.5\" ry=\"6.2\" fill=\"#070e18\"/><ellipse cx=\"120\" cy=\"46.0\" rx=\"8.5\" ry=\"6.2\" fill=\"none\" stroke=\"#8299af\" stroke-width=\".7\" opacity=\".55\"/><ellipse cx=\"120\" cy=\"45.4\" rx=\"6.7\" ry=\"4.9\" fill=\"url(#gb1)\"/><path d=\"M115.7 42.8 a6.7 4.9 0 0 1 5.4 -2.3\" fill=\"none\" stroke=\"#fff\" stroke-width=\"1.2\" stroke-linecap=\"round\" opacity=\".68\"/><ellipse cx=\"144\" cy=\"43.0\" rx=\"8.9\" ry=\"6\" fill=\"#02070e\" opacity=\".5\"/><ellipse cx=\"144\" cy=\"41.0\" rx=\"8.5\" ry=\"6.2\" fill=\"#070e18\"/><ellipse cx=\"144\" cy=\"41.0\" rx=\"8.5\" ry=\"6.2\" fill=\"none\" stroke=\"#8299af\" stroke-width=\".7\" opacity=\".55\"/><ellipse cx=\"144\" cy=\"40.4\" rx=\"6.7\" ry=\"4.9\" fill=\"url(#gb2)\"/><path d=\"M139.7 37.8 a6.7 4.9 0 0 1 5.4 -2.3\" fill=\"none\" stroke=\"#fff\" stroke-width=\"1.2\" stroke-linecap=\"round\" opacity=\".68\"/><ellipse cx=\"168\" cy=\"44.0\" rx=\"8.9\" ry=\"6\" fill=\"#02070e\" opacity=\".5\"/><ellipse cx=\"168\" cy=\"42.0\" rx=\"8.5\" ry=\"6.2\" fill=\"#070e18\"/><ellipse cx=\"168\" cy=\"42.0\" rx=\"8.5\" ry=\"6.2\" fill=\"none\" stroke=\"#8299af\" stroke-width=\".7\" opacity=\".55\"/><ellipse cx=\"168\" cy=\"41.4\" rx=\"6.7\" ry=\"4.9\" fill=\"url(#gb3)\"/><path d=\"M163.7 38.8 a6.7 4.9 0 0 1 5.4 -2.3\" fill=\"none\" stroke=\"#fff\" stroke-width=\"1.2\" stroke-linecap=\"round\" opacity=\".68\"/><rect x=\"115\" y=\"10\" width=\"15\" height=\"5\" rx=\"2.5\" fill=\"#0a1420\" stroke=\"#37d0f5\" stroke-width=\".7\" opacity=\".8\"/><rect x=\"135\" y=\"10\" width=\"15\" height=\"5\" rx=\"2.5\" fill=\"#0a1420\" stroke=\"#ff9424\" stroke-width=\".7\" opacity=\".8\"/><text x=\"144\" y=\"62.5\" text-anchor=\"middle\" font-family=\"Arial Black,Impact,sans-serif\" font-size=\"6.6\" font-weight=\"900\" fill=\"#ffd9a2\" opacity=\".95\">SnapHit</text><text x=\"144\" y=\"67.6\" text-anchor=\"middle\" font-family=\"system-ui,sans-serif\" font-size=\"3.5\" font-weight=\"800\" letter-spacing=\"1.1\" fill=\"#ff9424\" opacity=\".9\">STUDIOS</text></svg>" +
        '</div>' +
        '<div class="coin">' +
          '<span class="slot"></span><span class="ret"></span><span class="slot"></span>' +
        '</div>' +
      '</div>' +
      '<a class="visit" target="_blank" rel="noopener">PLAY IT FULL SIZE</a>';

    const visit = cab.querySelector('.visit');
    visit.href = GAME.site;
    visit.setAttribute('aria-label', 'Open ' + GAME.name + ' on its own site');

    const screen = cab.querySelector('.screen');
    const phone  = cab.querySelector('.phone');
    const grow   = cab.querySelector('.grow');

    grow.addEventListener('click', () => zoom(phone));

    /* Nothing loads until it is asked for. A live canvas on page load would
       cost these pages dearly on the phones most of this traffic arrives on. */
    function arm(attract){
      attract.setAttribute('aria-label', 'Play ' + GAME.name);
      attract.addEventListener('click', () => {
        if (screen.querySelector('iframe')) return;
        const f = document.createElement('iframe');
        f.src = GAME.src;
        f.title = GAME.label;
        f.setAttribute('scrolling', 'no');
        f.setAttribute('allow', 'accelerometer; gyroscope; fullscreen');
        screen.appendChild(f);
        attract.remove();
        phone.classList.add('live');
        live = f;
        watch(f);
      });
    }

    /* Stop the loop once it has scrolled well clear, and put the attract
       screen back so it can be started again. A run does not survive this,
       which is the price of not leaving a canvas spinning behind the reader. */
    function watch(el){
      if (!('IntersectionObserver' in window)) return;
      const io = new IntersectionObserver(en => {
        for (const e of en){
          if (document.body.classList.contains('zoomed')) continue;
          if (!e.isIntersecting && e.target.src){
            if (live === e.target) live = null;
            e.target.removeAttribute('src');
            e.target.remove();
            const again = document.createElement('button');
            again.className = 'attract';
            again.type = 'button';
            again.innerHTML = attractInner;
            arm(again);
            phone.classList.remove('live');
            screen.insertBefore(again, screen.firstChild);
            io.unobserve(e.target);
          }
        }
      }, { rootMargin: '120px' });
      io.observe(el);
    }

    arm(cab.querySelector('.attract'));
    mount.appendChild(cab);
  }

})();
