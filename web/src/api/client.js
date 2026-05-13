// Thin fetch wrapper. Reads JWT from localStorage; throws on non-2xx.

const TOKEN_KEY = 'ksk.token.v1'

export function getToken() { return localStorage.getItem(TOKEN_KEY) }
export function setToken(t) { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY) }
export function clearToken() { localStorage.removeItem(TOKEN_KEY) }

// Cross-tab session invalidation. Any one 401 from any authed endpoint means
// our JWT is stale or signed with a different secret than the server is now
// running. Clear the token + session and let AppContext bounce back to splash
// on the next render. This stops the "every endpoint 401s in a loop" trap.
let invalidating = false
function invalidateSession() {
  if (invalidating) return
  invalidating = true
  try {
    clearToken()
    localStorage.removeItem('ksk.session.v1')
  } catch {}
  // Force a hard refresh to kick the user back to splash. Using a query
  // param so any in-flight redirect / state isn't preserved.
  try { window.location.assign('/?sessionExpired=1') } catch {}
}

async function req(method, path, body) {
  const headers = { 'content-type': 'application/json' }
  const tok = getToken()
  if (tok) headers.authorization = `Bearer ${tok}`
  const res = await fetch(path.startsWith('http') ? path : path, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  })
  // 401 with a token attached means the token itself is no longer valid —
  // wipe the session before anything else can read stale state.
  if (res.status === 401 && tok) {
    invalidateSession()
  }
  let json = null
  try { json = await res.json() } catch {}
  if (!res.ok) {
    const err = new Error(json?.error || `http_${res.status}`)
    err.status = res.status; err.payload = json
    throw err
  }
  return json
}

export const api = {
  get:  (p)        => req('GET',  p),
  post: (p, body)  => req('POST', p, body),
  put:  (p, body)  => req('PUT',  p, body),
  del:  (p)        => req('DELETE', p),

  // auth
  requestPhoneOtp: (phone) => req('POST', '/api/auth/phone/request-otp', { phone }),
  verifyPhoneOtp:  (phone, code) => req('POST', '/api/auth/phone/verify-otp', { phone, code }),
  requestAadhaarOtp: (aadhaar) => req('POST', '/api/auth/aadhaar/request-otp', { aadhaar }),
  verifyAadhaarOtp:  (aadhaar, code) => req('POST', '/api/auth/aadhaar/verify-otp', { aadhaar, code }),
  sidhLogin: (sidhId, password) => req('POST', '/api/auth/sidh/login', { sidhId, password }),

  me: () => req('GET', '/api/me'),

  // domain
  placements:        () => req('GET', '/api/placements'),
  placement:         (id) => req('GET', `/api/placements/${id}`),
  declarePlacement:  (body) => req('POST', '/api/placements/declare', body),
  traineeConfirmPlc: (id, body) => req('POST', `/api/placements/${id}/trainee-confirm`, body),
  employerConfirmPlc:(id, body) => req('POST', `/api/placements/${id}/employer-confirm`, body),

  retentionDue:        () => req('GET', '/api/retention/due'),
  retentionTraineeRespond: (id, body) => req('POST', `/api/retention/${id}/trainee-respond`, body),
  retentionEmployerRespond:(id, body) => req('POST', `/api/retention/${id}/employer-respond`, body),

  trainees:    () => req('GET', '/api/trainees'),
  trainee:     (id) => req('GET', `/api/trainees/${id}`),
  batches:     () => req('GET', '/api/batches'),
  batch:       (id) => req('GET', `/api/batches/${id}`),
  certificatesMine: () => req('GET', '/api/certificates/mine'),
  notifications: () => req('GET', '/api/notifications'),
  markRead: (id) => req('POST', `/api/notifications/${id}/read`),

  // dashboards
  nationalOverview: () => req('GET', '/api/dashboards/national-overview'),
  placementFunnel:  () => req('GET', '/api/dashboards/placement-funnel'),
  retentionCohorts: () => req('GET', '/api/dashboards/retention-cohorts'),
  stateLeaderboard: () => req('GET', '/api/dashboards/state-leaderboard'),
  funderOutcomes:   () => req('GET', '/api/dashboards/funder-outcomes'),

  // ai
  aiMessage: (text, language) => req('POST', '/api/ai/message', { text, language }),
  aiAsk:     (question, module) => req('POST', '/api/ai/ask', { question, module }),

  // chats / threads
  listThreads:     ()                       => req('GET',  '/api/chats'),
  createThread:    (title, bot)             => req('POST', '/api/chats', { title, bot }),
  threadMessages:  (id)                     => req('GET',  `/api/chats/${id}/messages`),
  postMessage:     (id, role, text, meta)   => req('POST', `/api/chats/${id}/messages`, { role, text, meta }),

  // lookups
  schemes:   () => req('GET', '/api/lookups/schemes'),
  sectors:   () => req('GET', '/api/lookups/sectors'),
  courses:   () => req('GET', '/api/lookups/courses'),
  demoUsers: () => req('GET', '/api/lookups/demo-users'),
}
