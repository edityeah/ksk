# ksk-offline-guardian

A tiny Cloudflare Worker that sits in front of `ksk.adityeah.ai/*` and
replaces Cloudflare's default "Error 1033 / Bad Gateway" screen with a
crafted offline page whenever the origin — the Cloudflare Tunnel back
to the laptop hosting KSK — is unreachable.

## What it does

```
                             ┌────────────────────────┐
[ visitor ] ─── HTTPS ───►   │  Cloudflare edge       │
                             │                        │
                             │  Worker: this Worker   │
                             │  ├─ try origin (8s)    │
                             │  ├─ status OK?  ────── ├──► cloudflared tunnel ──► laptop
                             │  └─ down / timeout ──► │        │
                             │     serve offline.html │        └── if laptop asleep, times out
                             └────────────────────────┘
```

- Success path: 5–15 ms of edge latency, then the KSK app response
  passes through unmodified. Same HTML, same status codes, same
  headers — the Worker only replaces the response when it detects a
  transport-layer failure.
- Failure path: no origin fetch; the inline offline HTML returns with
  `503 Service Unavailable` + `Retry-After: 120`. Auto-reloads every
  90 s client-side so a visitor who leaves the tab open sees the app
  return the moment the laptop wakes.

## What counts as "down"

Only transport-layer failures. The Worker specifically DOES NOT hide
genuine 4xx / 5xx from the KSK Express app — if the app returns 500 on
a bad request, that surfaces to the visitor. The replaced statuses:

| Status | Meaning |
|--:|---|
| 502 | Bad gateway (tunnel not connected) |
| 521 | Web server is down |
| 522 | Connection timed out |
| 523 | Origin is unreachable |
| 525 / 526 | Tunnel SSL handshake failed |
| 530 | Cloudflare's canonical tunnel-error wrapper (Argo 1033 etc.) |

Plus: any thrown exception from the fetch (DNS failure, TCP reset,
`AbortError` from the 8 s timeout).

## Deploy

```bash
cd workers/offline-guardian
npx wrangler deploy
```

That's it. First deploy also creates the route
`ksk.adityeah.ai/*` on the adityeah.ai zone; subsequent deploys just
update the script. `wrangler.toml` has no secrets, no KV, no env vars
— everything ships in one file.

## Test the offline path

To force the offline branch without actually putting the laptop to
sleep:

```bash
# Stop just the app container (leave the DB + tunnel up so the tunnel
# is still connected but forwards to a dead port).
docker stop ksk-prod-app

# Any request to ksk.adityeah.ai now returns the offline page.
curl -s https://ksk.adityeah.ai/ | grep -oE '<title>[^<]+</title>'
# → <title>KSK · Resting</title>

# Bring it back
docker start ksk-prod-app
```

Or stop the tunnel process to test the "no tunnel at all" case:

```bash
pkill -f "ksk.yml run ksk"
# ... test ...
nohup cloudflared tunnel --config ~/.cloudflared/ksk.yml run ksk &
```

## Costs

Free tier: 100,000 requests/day, 10 ms CPU per request. KSK demo
traffic is comfortably inside that; the Worker itself uses <2 ms of
CPU per pass-through.
