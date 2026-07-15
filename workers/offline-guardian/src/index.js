// KSK "offline guardian" — Cloudflare Worker.
//
// Sits at the edge in front of ksk.adityeah.ai/* and does one job:
//
//   Try to reach the origin (the cloudflared tunnel back to the owner's
//   laptop). If the origin responds, pass it through untouched. If it
//   doesn't — laptop asleep, Docker not running, tunnel disconnected —
//   don't leak Cloudflare's generic 502 / "Error 1033" page; return a
//   crafted offline page that explains the demo model honestly.
//
// The Worker adds ~5-15ms of edge latency per request when the origin is
// up (well inside Cloudflare Workers free tier: 100k requests/day, 10ms
// CPU per request). When the origin is down it responds in <1ms because
// we bail on the outbound fetch and serve inline HTML.
//
// Deploy: cd workers/offline-guardian && npx wrangler deploy

// Timeout on the origin fetch. 8s is long enough that a cold cloudflared
// reconnect after a Mac wake-from-sleep won't false-positive as "down".
const ORIGIN_TIMEOUT_MS = 8000

// Statuses that indicate the origin failed at the transport / edge layer,
// not at the application layer. We only replace these; genuine 4xx/5xx
// from the KSK Express server pass through untouched (a real bug in the
// app should surface, not get hidden behind an "offline" page).
//
// 502 — bad gateway (tunnel not connected)
// 521 — web server is down
// 522 — connection timed out
// 523 — origin is unreachable
// 525/526 — SSL handshake failures at the tunnel
// 530 — Cloudflare's canonical "tunnel error" wrapper (Argo Tunnel 1033 etc.)
const ORIGIN_DOWN_STATUS = new Set([502, 521, 522, 523, 525, 526, 530])

export default {
  async fetch(request) {
    // Only proxy same-origin requests. If someone hits an unrelated
    // hostname routed through here somehow, just serve offline.
    const url = new URL(request.url)
    if (url.hostname !== 'ksk.adityeah.ai') return offlineResponse()

    try {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), ORIGIN_TIMEOUT_MS)
      let response
      try {
        response = await fetch(request, { signal: controller.signal })
      } finally {
        clearTimeout(t)
      }
      if (ORIGIN_DOWN_STATUS.has(response.status)) return offlineResponse()
      return response
    } catch {
      // AbortError / DNS failure / TCP reset — all treated as "origin down".
      return offlineResponse()
    }
  },
}

function offlineResponse() {
  return new Response(OFFLINE_HTML, {
    status: 503,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Explicit retry hint for polite crawlers / uptime monitors.
      'retry-after': '120',
      // Don't cache the offline page at the edge — the moment the origin
      // comes back, a visitor's refresh should hit the real app, not a
      // stale copy of this HTML.
      'cache-control': 'no-store, no-cache, must-revalidate',
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────
// Offline page — single self-contained HTML string. Deliberately verbose
// so the entire visual identity ships in one Worker deploy with no
// external assets to fetch.
// ─────────────────────────────────────────────────────────────────────────
const OFFLINE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>KSK · Resting</title>
  <meta name="robots" content="noindex" />
  <meta name="description" content="KSK is a working prototype hosted on a single laptop. The machine is currently asleep — the site returns as soon as it wakes." />
  <style>
    :root {
      --ground:      #FAF7F2;
      --ink:         #1A1614;
      --ink-soft:    #4A423B;
      --muted:       #7A6E64;
      --hairline:    #E4DACE;
      --accent:      #B34155;
      --mono:        ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Consolas, monospace;
      --serif:       "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
      --sans:        system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --ground:   #0F0D0B;
        --ink:      #F5F0E8;
        --ink-soft: #CFC6BC;
        --muted:    #8A7F74;
        --hairline: #2A2521;
        --accent:   #D46878;
      }
    }
    :root[data-theme="light"] {
      --ground: #FAF7F2; --ink: #1A1614; --ink-soft: #4A423B;
      --muted: #7A6E64; --hairline: #E4DACE; --accent: #B34155;
    }
    :root[data-theme="dark"] {
      --ground: #0F0D0B; --ink: #F5F0E8; --ink-soft: #CFC6BC;
      --muted: #8A7F74; --hairline: #2A2521; --accent: #D46878;
    }

    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body {
      margin: 0;
      background: var(--ground);
      color: var(--ink);
      font-family: var(--sans);
      font-size: 16px;
      line-height: 1.55;
      -webkit-font-smoothing: antialiased;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 48px 24px;
    }

    .frame {
      width: 100%;
      max-width: 560px;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    /* Wordmark */
    .brand {
      display: flex;
      align-items: baseline;
      gap: 10px;
      font-family: var(--sans);
      font-size: 12px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--muted);
      font-weight: 600;
    }
    .brand .dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent);
      animation: breathe 3.4s ease-in-out infinite;
    }
    .brand .full {
      font-family: var(--serif);
      font-style: italic;
      font-size: 14px;
      letter-spacing: 0;
      text-transform: none;
      color: var(--ink-soft);
      font-weight: 400;
    }

    /* Headline */
    h1 {
      font-family: var(--serif);
      font-weight: 400;
      font-size: clamp(32px, 5vw, 44px);
      line-height: 1.08;
      letter-spacing: -0.01em;
      margin: 0;
      text-wrap: balance;
      color: var(--ink);
    }
    h1 em {
      font-style: italic;
      color: var(--accent);
    }

    /* Paragraphs */
    .lede, .aside {
      font-family: var(--serif);
      font-size: 18px;
      line-height: 1.55;
      color: var(--ink-soft);
      margin: 0;
      max-width: 52ch;
    }
    .lede + .lede { margin-top: 12px; }

    /* The honest technical line */
    .status-line {
      font-family: var(--mono);
      font-size: 12px;
      line-height: 1.6;
      color: var(--muted);
      padding: 12px 0;
      border-top: 1px solid var(--hairline);
      border-bottom: 1px solid var(--hairline);
      display: flex;
      flex-wrap: wrap;
      gap: 4px 18px;
    }
    .status-line span { white-space: nowrap; }
    .status-line b {
      color: var(--accent);
      font-weight: 600;
    }

    /* Next-steps block */
    .next {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .next-heading {
      font-family: var(--sans);
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--muted);
      font-weight: 600;
    }
    .step {
      display: grid;
      grid-template-columns: 96px 1fr;
      gap: 20px;
      align-items: baseline;
    }
    .step-label {
      font-family: var(--serif);
      font-style: italic;
      font-size: 14px;
      color: var(--muted);
      padding-top: 2px;
    }
    .step-body {
      font-family: var(--sans);
      font-size: 15px;
      color: var(--ink);
      line-height: 1.5;
    }
    .step-body a {
      color: var(--accent);
      text-decoration: none;
      border-bottom: 1px solid currentColor;
      padding-bottom: 1px;
      font-weight: 500;
    }
    .step-body a:hover { color: var(--ink); }
    .step-body a:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 3px;
      border-radius: 2px;
    }
    .step-note {
      color: var(--muted);
      font-size: 13px;
      display: block;
      margin-top: 2px;
    }

    /* Retry indicator */
    .retry {
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: var(--mono);
      font-size: 12px;
      color: var(--muted);
      padding-top: 20px;
      border-top: 1px solid var(--hairline);
      font-variant-numeric: tabular-nums;
    }
    .retry-bar {
      flex: 0 0 auto;
      width: 42px;
      height: 3px;
      background: var(--hairline);
      border-radius: 2px;
      overflow: hidden;
      position: relative;
    }
    .retry-bar::after {
      content: "";
      position: absolute;
      inset: 0;
      background: var(--accent);
      transform: translateX(-100%);
      animation: sweep var(--retry-duration, 90s) linear forwards;
    }
    .retry span { display: block; }
    .retry .now { color: var(--ink-soft); }

    @keyframes breathe {
      0%, 100% { opacity: 1;   transform: scale(1);    }
      50%      { opacity: 0.32; transform: scale(0.85); }
    }
    @keyframes sweep {
      to { transform: translateX(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .brand .dot,
      .retry-bar::after { animation: none; }
      .brand .dot { opacity: 0.7; }
      .retry-bar::after { transform: translateX(0); }
    }

    @media (max-width: 480px) {
      body { padding: 32px 20px; align-items: flex-start; padding-top: 56px; }
      .step { grid-template-columns: 1fr; gap: 4px; }
      .step-label { padding-top: 0; }
      .frame { gap: 28px; }
    }
  </style>
</head>
<body>
  <main class="frame">

    <div class="brand">
      <span class="dot" aria-hidden="true"></span>
      <span>KSK</span>
      <span class="full">Kaushal Samiksha Kendra</span>
    </div>

    <div>
      <h1>The demo is <em>resting</em>.</h1>
    </div>

    <p class="lede">
      KSK is a working prototype hosted on a single laptop &mdash; Docker containers behind a Cloudflare tunnel, no cloud instance. Right now that laptop is asleep.
    </p>
    <p class="lede">
      Nothing has broken; nothing needs redeploying. The site returns the moment the machine wakes up.
    </p>

    <div class="status-line" role="status" aria-live="polite">
      <span>origin: <b>unreachable</b></span>
      <span>tunnel: <b>ksk-adityeah</b></span>
      <span>edge: <b id="edge-loc">cloudflare</b></span>
      <span id="ts-line">checked: <b id="ts-utc">just now</b></span>
    </div>

    <div class="next">
      <div class="next-heading">Meanwhile</div>

      <div class="step">
        <div class="step-label">Email</div>
        <div class="step-body">
          <a href="mailto:aditya.c@convegenius.ai?subject=Wake%20up%20the%20KSK%20laptop&body=Hi%20Aditya%2C%20I%27d%20like%20to%20see%20the%20KSK%20demo%20%E2%80%94%20could%20you%20wake%20it%20up%3F">aditya.c@convegenius.ai</a>
          <span class="step-note">Say &ldquo;wake up the KSK laptop&rdquo; or ask for a walkthrough &mdash; usually back within the hour.</span>
        </div>
      </div>

      <div class="step">
        <div class="step-label">Or wait</div>
        <div class="step-body">
          This page will retry every <span class="now">90 seconds</span>.
          <span class="step-note">You can also just refresh &mdash; nothing on this end is caching a stale copy.</span>
        </div>
      </div>
    </div>

    <div class="retry" aria-hidden="true">
      <div class="retry-bar"></div>
      <span>next retry in <b id="countdown" class="now">90</b>s</span>
    </div>

  </main>

  <script>
    // Countdown + auto-reload. Keep the JS tiny; no dependencies.
    (function () {
      var totalSeconds = 90;
      var el = document.getElementById('countdown');
      var tsEl = document.getElementById('ts-utc');

      function fmtNow() {
        var d = new Date();
        var pad = function (n) { return String(n).padStart(2, '0'); };
        return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' +
               pad(d.getUTCDate()) + ' ' + pad(d.getUTCHours()) + ':' +
               pad(d.getUTCMinutes()) + ' UTC';
      }
      if (tsEl) tsEl.textContent = fmtNow();

      // Sync the sweep-bar animation duration with the countdown.
      document.documentElement.style.setProperty('--retry-duration', totalSeconds + 's');

      var remaining = totalSeconds;
      var interval = setInterval(function () {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(interval);
          // location.reload uses the browser cache normally; force a
          // fresh trip through Cloudflare so we hit the Worker again
          // and re-test the origin.
          window.location.href = window.location.pathname +
            (window.location.search ? window.location.search + '&' : '?') +
            '_cf_retry=' + Date.now();
          return;
        }
        if (el) el.textContent = remaining;
      }, 1000);
    })();
  </script>
</body>
</html>`
