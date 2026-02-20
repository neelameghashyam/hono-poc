<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router'
import api from '@/services/api';

// ── State ────────────────────────────────────────────────────────────────────
const activeFeature = ref('routing');
const loading = ref(false);
const response = ref(null);
const responseHeaders = ref({});
const responseTime = ref(null);
const responseStatus = ref(null);
const streamOutput = ref('');
const isStreaming = ref(false);
const sseEvents = ref([]);
const isSseRunning = ref(false);
const requestLog = ref([]);

// Validation form state
const validationForm = ref({ name: '', email: '', age: '' });

// Routing params state
const routingParamId = ref('42');
const routingParamVersion = ref('v2');
const routingQueryStr = ref('search=hono&limit=10&sort=asc');

// Error type
const errorType = ref('http');

// Method chaining
const methodChainMethod = ref('GET');

// ── Features config ───────────────────────────────────────────────────────────
const features = [
  {
    id: 'routing',
    label: 'Routing',
    icon: '⇢',
    color: '#f97316',
    desc: 'Path params, query strings, method chaining',
  },
  {
    id: 'middleware',
    label: 'Middleware',
    icon: '⧖',
    color: '#a78bfa',
    desc: 'Middleware chain, c.set / c.get, timing',
  },
  {
    id: 'context',
    label: 'Context',
    icon: '◈',
    color: '#34d399',
    desc: 'The c object — req, res, env, custom vars',
  },
  {
    id: 'validation',
    label: 'Validation',
    icon: '✓',
    color: '#60a5fa',
    desc: 'Schema validation with live error feedback',
  },
  {
    id: 'streaming',
    label: 'Streaming',
    icon: '▶',
    color: '#fb7185',
    desc: 'Text streaming and Server-Sent Events',
  },
  {
    id: 'error',
    label: 'Error Handling',
    icon: '⚡',
    color: '#fbbf24',
    desc: 'HTTPException, app.onError(), typed errors',
  },
  {
    id: 'cors',
    label: 'CORS',
    icon: '⊕',
    color: '#22d3ee',
    desc: 'Built-in hono/cors middleware',
  },
];

const activeFeatureConfig = computed(() =>
  features.find((f) => f.id === activeFeature.value)
);

const router = useRouter()

function goToSimple() {
  router.push('/simple')
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatJson(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function addLog(method, path, status, ms) {
  requestLog.value.unshift({ method, path, status, ms, ts: new Date().toLocaleTimeString() });
  if (requestLog.value.length > 20) requestLog.value.pop();
}

async function fireRequest(method, path, body = null) {
  loading.value = true;
  response.value = null;
  responseHeaders.value = {};
  responseStatus.value = null;
  responseTime.value = null;

  const t0 = Date.now();
  try {
    const cfg = { method, url: path };
    if (body) {
      cfg.data = body;
      cfg.headers = { 'Content-Type': 'application/json' };
    }
    const res = await api.request(cfg);
    const ms = Date.now() - t0;

    response.value = res.data;
    responseStatus.value = res.status;
    responseTime.value = ms;

    // Grab exposed headers
    const hdrs = {};
    ['x-request-id', 'x-response-time', 'x-powered-by', 'x-hono-version',
      'content-type', 'access-control-allow-origin', 'access-control-allow-methods'].forEach((h) => {
      const v = res.headers[h];
      if (v) hdrs[h] = v;
    });
    responseHeaders.value = hdrs;

    addLog(method, path, res.status, ms);
  } catch (err) {
    const ms = Date.now() - t0;
    const status = err.response?.status || 0;
    response.value = err.response?.data || { error: err.message };
    responseStatus.value = status;
    responseTime.value = ms;
    addLog(method, path, status, ms);
  } finally {
    loading.value = false;
  }
}

// ── Feature actions ───────────────────────────────────────────────────────────
const actions = {
  routing: [
    {
      label: 'Basic GET',
      sublabel: 'GET /api/showcase/routing/basic',
      run: () => fireRequest('GET', '/api/showcase/routing/basic'),
    },
    {
      label: 'Path Params',
      sublabel: computed(() => `GET /api/showcase/routing/${routingParamVersion.value}/${routingParamId.value}`),
      run: () => fireRequest('GET', `/api/showcase/routing/${routingParamVersion.value}/${routingParamId.value}`),
      hasParams: true,
    },
    {
      label: 'Query Strings',
      sublabel: computed(() => `GET /api/showcase/routing/query?${routingQueryStr.value}`),
      run: () => fireRequest('GET', `/api/showcase/routing/query?${routingQueryStr.value}`),
      hasQuery: true,
    },
  ],
  middleware: [
    {
      label: 'Run Middleware Chain',
      sublabel: 'GET /api/showcase/middleware',
      run: () => fireRequest('GET', '/api/showcase/middleware'),
    },
  ],
  context: [
    {
      label: 'Inspect Context',
      sublabel: 'GET /api/showcase/context',
      run: () => fireRequest('GET', '/api/showcase/context'),
    },
  ],
  validation: [
    {
      label: 'Submit Form',
      sublabel: 'POST /api/showcase/validation',
      run: () => {
        const body = {
          name: validationForm.value.name,
          email: validationForm.value.email,
          ...(validationForm.value.age ? { age: Number(validationForm.value.age) } : {}),
        };
        fireRequest('POST', '/api/showcase/validation', body);
      },
    },
  ],
  error: [
    {
      label: 'HTTPException (422)',
      sublabel: 'GET /api/showcase/error?type=http',
      run: () => fireRequest('GET', '/api/showcase/error?type=http'),
    },
    {
      label: 'Not Found (404)',
      sublabel: 'GET /api/showcase/error?type=notfound',
      run: () => fireRequest('GET', '/api/showcase/error?type=notfound'),
    },
    {
      label: 'Server Error (500)',
      sublabel: 'GET /api/showcase/error?type=server',
      run: () => fireRequest('GET', '/api/showcase/error?type=server'),
    },
  ],
  cors: [
    {
      label: 'CORS Response',
      sublabel: 'GET /api/showcase/cors',
      run: () => fireRequest('GET', '/api/showcase/cors'),
    },
  ],
};

// Method chaining — dynamic
const methodChainActions = ['GET', 'POST', 'PUT', 'DELETE'].map((m) => ({
  label: m,
  run: () => {
    methodChainMethod.value = m;
    fireRequest(m, '/api/showcase/routing/methods');
  },
}));

// ── Streaming ────────────────────────────────────────────────────────────────
async function startStream() {
  if (isStreaming.value) return;
  isStreaming.value = true;
  streamOutput.value = '';
  const token = localStorage.getItem('wipo_token');
  const t0 = Date.now();

  try {
    const res = await fetch('/api/showcase/streaming', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      streamOutput.value += decoder.decode(value);
    }
    addLog('GET', '/api/showcase/streaming', 200, Date.now() - t0);
  } catch (e) {
    streamOutput.value += `\n[Error] ${e.message}`;
  } finally {
    isStreaming.value = false;
  }
}

async function startSSE() {
  if (isSseRunning.value) return;
  isSseRunning.value = true;
  sseEvents.value = [];
  const token = localStorage.getItem('wipo_token');
  const t0 = Date.now();

  try {
    const es = new EventSource(`/api/showcase/sse`, {});
    // EventSource doesn't support custom headers — use fetch SSE approach
    es.close();

    // Use fetch for SSE since we need auth header
    const res = await fetch('/api/showcase/sse', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value);
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            sseEvents.value.push(data);
          } catch {}
        }
        if (line.startsWith('event: done')) {
          addLog('GET', '/api/showcase/sse', 200, Date.now() - t0);
        }
      }
    }
  } catch (e) {
    sseEvents.value.push({ error: e.message });
  } finally {
    isSseRunning.value = false;
  }
}

// ── Method chaining demo ──────────────────────────────────────────────────────
async function fireMethodChain(method) {
  methodChainMethod.value = method;
  await fireRequest(method, '/api/showcase/routing/methods');
}

// Initial load
onMounted(() => {
  fireRequest('GET', '/api/showcase/routing/basic');
});
</script>

<template>
  <div class="showcase">

    <!-- ── TOP BAR ─────────────────────────────────────────────────── -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="hono-badge">
          <span class="hono-name">Hono</span>
        </div>
        <span class="topbar-divider">|</span>
        <span class="topbar-title">Feature Showcase</span>
      </div>
      
    <div class="topbar-right">
  <button class="simple-btn" @click="goToSimple">
    Simple Version
  </button>

  <div class="live-dot"></div>
  <span class="topbar-live">Live API</span>
  <span class="topbar-url">localhost:3001</span>
</div>
    </header>

    <div class="layout">

      <!-- ── LEFT SIDEBAR ─────────────────────────────────────────── -->
      <aside class="sidebar">
        <div class="sidebar-label">FEATURES</div>
        <nav class="feature-nav">
          <button
            v-for="f in features"
            :key="f.id"
            :class="['feature-btn', { active: activeFeature === f.id }]"
            :style="activeFeature === f.id ? { '--accent': f.color } : {}"
            @click="activeFeature = f.id; response = null; streamOutput = ''; sseEvents = []"
          >
            <span class="feature-icon" :style="{ color: f.color }">{{ f.icon }}</span>
            <div class="feature-meta">
              <span class="feature-label">{{ f.label }}</span>
              <span class="feature-desc">{{ f.desc }}</span>
            </div>
            <span v-if="activeFeature === f.id" class="active-arrow">›</span>
          </button>
        </nav>

        <!-- Request Log -->
        <div class="log-section">
          <div class="sidebar-label">REQUEST LOG</div>
          <div class="log-list">
            <div v-for="(log, i) in requestLog" :key="i" class="log-entry">
              <span :class="['log-method', `method-${log.method.toLowerCase()}`]">{{ log.method }}</span>
              <span class="log-path">{{ log.path.replace('/api/showcase/', '') }}</span>
              <span :class="['log-status', log.status >= 400 ? 'status-err' : 'status-ok']">{{ log.status }}</span>
              <span class="log-ms">{{ log.ms }}ms</span>
            </div>
            <div v-if="!requestLog.length" class="log-empty">No requests yet</div>
          </div>
        </div>
      </aside>

      <!-- ── MAIN CONTENT ──────────────────────────────────────────── -->
      <main class="main">

        <!-- Feature header -->
        <div class="feature-header">
          <span class="feature-icon-lg" :style="{ color: activeFeatureConfig.color }">
            {{ activeFeatureConfig.icon }}
          </span>
          <div>
            <h1 class="feature-title">{{ activeFeatureConfig.label }}</h1>
            <p class="feature-subtitle">{{ activeFeatureConfig.desc }}</p>
          </div>
        </div>

        <!-- ── ROUTING ─────────────────────────────────────────────── -->
        <div v-if="activeFeature === 'routing'" class="panels">

          <div class="panel">
            <div class="panel-head">
              <span class="panel-tag">DEMO</span>
              <span class="panel-title">Basic Route</span>
            </div>
            <div class="code-block">
              <span class="code-comment">// Define a route</span><br/>
              <span class="kw">app</span>.<span class="fn">get</span>(<span class="str">'/api/showcase/routing/basic'</span>, <span class="kw">(c)</span> =&gt; {<br/>
              &nbsp;&nbsp;<span class="kw">return</span> c.<span class="fn">json</span>({ method: c.req.method, path: c.req.path });<br/>
              });
            </div>
            <button class="fire-btn" @click="fireRequest('GET', '/api/showcase/routing/basic')">
              <span class="fire-icon">▶</span> Fire GET /routing/basic
            </button>
          </div>

          <div class="panel">
            <div class="panel-head">
              <span class="panel-tag">DEMO</span>
              <span class="panel-title">Path Params — :version/:id</span>
            </div>
            <div class="code-block">
              <span class="code-comment">// Dynamic path segments</span><br/>
              <span class="kw">app</span>.<span class="fn">get</span>(<span class="str">'/api/showcase/routing/<span class="hl">:version</span>/<span class="hl">:id</span>'</span>, <span class="kw">(c)</span> =&gt; {<br/>
              &nbsp;&nbsp;<span class="kw">const</span> id = c.req.<span class="fn">param</span>(<span class="str">'id'</span>);<br/>
              &nbsp;&nbsp;<span class="kw">const</span> version = c.req.<span class="fn">param</span>(<span class="str">'version'</span>);<br/>
              &nbsp;&nbsp;<span class="kw">return</span> c.<span class="fn">json</span>({ id, version });<br/>
              });
            </div>
            <div class="input-row">
              <div class="input-group">
                <label>version</label>
                <input v-model="routingParamVersion" class="code-input" placeholder="v2" />
              </div>
              <div class="input-group">
                <label>id</label>
                <input v-model="routingParamId" class="code-input" placeholder="42" />
              </div>
            </div>
            <button class="fire-btn" @click="fireRequest('GET', `/api/showcase/routing/${routingParamVersion}/${routingParamId}`)">
              <span class="fire-icon">▶</span> Fire GET /routing/{{ routingParamVersion }}/{{ routingParamId }}
            </button>
          </div>

          <div class="panel">
            <div class="panel-head">
              <span class="panel-tag">DEMO</span>
              <span class="panel-title">Method Chaining</span>
            </div>
            <div class="code-block">
              <span class="code-comment">// Chain multiple methods on same path</span><br/>
              <span class="kw">app</span><br/>
              &nbsp;&nbsp;.<span class="fn">get</span>(<span class="str">'/methods'</span>, getHandler)<br/>
              &nbsp;&nbsp;.<span class="fn">post</span>(<span class="str">'/methods'</span>, postHandler)<br/>
              &nbsp;&nbsp;.<span class="fn">put</span>(<span class="str">'/methods'</span>, putHandler)<br/>
              &nbsp;&nbsp;.<span class="fn">delete</span>(<span class="str">'/methods'</span>, deleteHandler);
            </div>
            <div class="method-btns">
              <button
                v-for="m in ['GET','POST','PUT','DELETE']"
                :key="m"
                :class="['method-btn', `meth-${m.toLowerCase()}`, { 'method-active': methodChainMethod === m }]"
                @click="fireMethodChain(m)"
              >{{ m }}</button>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <span class="panel-tag">DEMO</span>
              <span class="panel-title">Query Strings</span>
            </div>
            <div class="code-block">
              <span class="code-comment">// Access query params</span><br/>
              <span class="kw">const</span> val = c.req.<span class="fn">query</span>(<span class="str">'key'</span>);
            </div>
            <div class="input-group" style="margin-bottom:12px">
              <label>query string</label>
              <input v-model="routingQueryStr" class="code-input" style="width:100%" placeholder="key=value&foo=bar" />
            </div>
            <button class="fire-btn" @click="fireRequest('GET', `/api/showcase/routing/query?${routingQueryStr}`)">
              <span class="fire-icon">▶</span> Fire GET /routing/query?{{ routingQueryStr }}
            </button>
          </div>
        </div>

        <!-- ── MIDDLEWARE ───────────────────────────────────────────── -->
        <div v-if="activeFeature === 'middleware'" class="panels">
          <div class="panel full-panel">
            <div class="panel-head">
              <span class="panel-tag">DEMO</span>
              <span class="panel-title">Middleware Chain</span>
            </div>
            <div class="code-block">
              <span class="code-comment">// Global middleware — runs before every handler</span><br/>
              <span class="kw">app</span>.<span class="fn">use</span>(<span class="str">'/api/showcase/*'</span>, <span class="kw">async</span> (c, next) =&gt; {<br/>
              &nbsp;&nbsp;c.<span class="fn">set</span>(<span class="str">'requestId'</span>, <span class="fn">generateId</span>());&nbsp;&nbsp;<span class="code-comment">// inject</span><br/>
              &nbsp;&nbsp;c.<span class="fn">set</span>(<span class="str">'startedAt'</span>, Date.now()); &nbsp;&nbsp;<span class="code-comment">// inject</span><br/>
              &nbsp;&nbsp;c.<span class="fn">header</span>(<span class="str">'X-Powered-By'</span>, <span class="str">'Hono'</span>);<br/><br/>
              &nbsp;&nbsp;<span class="kw">await</span> <span class="fn">next</span>(); <span class="code-comment">// ← handler runs here</span><br/><br/>
              &nbsp;&nbsp;<span class="code-comment">// after handler:</span><br/>
              &nbsp;&nbsp;c.<span class="fn">header</span>(<span class="str">'X-Response-Time'</span>, `${Date.now() - startedAt}ms`);<br/>
              });
            </div>
            <div class="chain-visual">
              <div class="chain-step">
                <span class="chain-icon" style="color:#22d3ee">⊕</span>
                <span>cors()</span>
              </div>
              <span class="chain-arrow">→</span>
              <div class="chain-step">
                <span class="chain-icon" style="color:#a78bfa">⧖</span>
                <span>showcaseMiddleware</span>
              </div>
              <span class="chain-arrow">→</span>
              <div class="chain-step">
                <span class="chain-icon" style="color:#f97316">⇢</span>
                <span>your handler</span>
              </div>
            </div>
            <button class="fire-btn" @click="fireRequest('GET', '/api/showcase/middleware')">
              <span class="fire-icon">▶</span> Fire — see middleware values in response + headers
            </button>
            <div v-if="responseHeaders && Object.keys(responseHeaders).length" class="header-preview">
              <div class="panel-head" style="margin-bottom:8px">
                <span class="panel-tag">HEADERS</span>
                <span class="panel-title">Response Headers Set by Middleware</span>
              </div>
              <div v-for="(val, key) in responseHeaders" :key="key" class="header-row">
                <span class="header-key">{{ key }}</span>
                <span class="header-val">{{ val }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── CONTEXT ──────────────────────────────────────────────── -->
        <div v-if="activeFeature === 'context'" class="panels">
          <div class="panel full-panel">
            <div class="panel-head">
              <span class="panel-tag">DEMO</span>
              <span class="panel-title">The Context Object (c)</span>
            </div>
            <div class="code-block">
              <span class="code-comment">// Everything in one typed object</span><br/>
              <span class="kw">app</span>.<span class="fn">get</span>(<span class="str">'/ctx'</span>, (c) =&gt; {<br/>
              &nbsp;&nbsp;c.req.method&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="code-comment">// 'GET'</span><br/>
              &nbsp;&nbsp;c.req.path&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="code-comment">// '/ctx'</span><br/>
              &nbsp;&nbsp;c.req.url&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="code-comment">// full URL</span><br/>
              &nbsp;&nbsp;c.<span class="fn">get</span>(<span class="str">'requestId'</span>)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="code-comment">// from middleware</span><br/>
              &nbsp;&nbsp;c.<span class="fn">set</span>(<span class="str">'key'</span>, value)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="code-comment">// store on context</span><br/>
              &nbsp;&nbsp;c.env&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="code-comment">// env vars (Cloudflare)</span><br/>
              &nbsp;&nbsp;<span class="kw">return</span> c.<span class="fn">json</span>({});<span class="code-comment">&nbsp;&nbsp;// or .text() .html() .redirect()</span><br/>
              });
            </div>
            <button class="fire-btn" @click="fireRequest('GET', '/api/showcase/context')">
              <span class="fire-icon">▶</span> Fire — inspect full context snapshot
            </button>
          </div>
        </div>

        <!-- ── VALIDATION ───────────────────────────────────────────── -->
        <div v-if="activeFeature === 'validation'" class="panels">
          <div class="panel">
            <div class="panel-head">
              <span class="panel-tag">SCHEMA</span>
              <span class="panel-title">Expected Shape</span>
            </div>
            <div class="code-block">
              <span class="code-comment">// zod schema (mirrors backend logic)</span><br/>
              <span class="kw">const</span> schema = z.<span class="fn">object</span>({<br/>
              &nbsp;&nbsp;name: z.<span class="fn">string</span>().<span class="fn">min</span>(<span class="num">2</span>),<br/>
              &nbsp;&nbsp;email: z.<span class="fn">string</span>().<span class="fn">email</span>(),<br/>
              &nbsp;&nbsp;age: z.<span class="fn">number</span>().<span class="fn">min</span>(<span class="num">0</span>).<span class="fn">max</span>(<span class="num">150</span>).<span class="fn">optional</span>(),<br/>
              });<br/><br/>
              <span class="kw">app</span>.<span class="fn">post</span>(<span class="str">'/users'</span>,<br/>
              &nbsp;&nbsp;<span class="fn">zValidator</span>(<span class="str">'json'</span>, schema),<br/>
              &nbsp;&nbsp;(c) =&gt; c.<span class="fn">json</span>(c.req.<span class="fn">valid</span>(<span class="str">'json'</span>))<br/>
              );
            </div>
          </div>
          <div class="panel">
            <div class="panel-head">
              <span class="panel-tag">LIVE FORM</span>
              <span class="panel-title">Try it — break or pass validation</span>
            </div>
            <div class="form-fields">
              <div class="form-field">
                <label class="form-label">name <span class="required">*</span></label>
                <input
                  v-model="validationForm.name"
                  class="code-input form-input"
                  placeholder="min 2 chars"
                />
              </div>
              <div class="form-field">
                <label class="form-label">email <span class="required">*</span></label>
                <input
                  v-model="validationForm.email"
                  class="code-input form-input"
                  placeholder="valid@email.com"
                />
              </div>
              <div class="form-field">
                <label class="form-label">age <span class="optional">optional</span></label>
                <input
                  v-model="validationForm.age"
                  class="code-input form-input"
                  type="number"
                  placeholder="0–150"
                />
              </div>
            </div>
            <div class="form-hints">
              <button class="hint-btn" @click="validationForm = { name: 'A', email: 'bad', age: '999' }">
                ← Inject Bad Data
              </button>
              <button class="hint-btn hint-good" @click="validationForm = { name: 'Jane Doe', email: 'jane@example.com', age: '28' }">
                ← Inject Good Data
              </button>
            </div>
            <button class="fire-btn" @click="actions.validation[0].run()">
              <span class="fire-icon">▶</span> POST /validation
            </button>
          </div>
        </div>

        <!-- ── STREAMING ────────────────────────────────────────────── -->
        <div v-if="activeFeature === 'streaming'" class="panels">
          <div class="panel">
            <div class="panel-head">
              <span class="panel-tag">DEMO</span>
              <span class="panel-title">Text Streaming</span>
            </div>
            <div class="code-block">
              <span class="kw">import</span> { stream } <span class="kw">from</span> <span class="str">'hono/streaming'</span>;<br/><br/>
              <span class="kw">app</span>.<span class="fn">get</span>(<span class="str">'/stream'</span>, <span class="kw">async</span> (c) =&gt; {<br/>
              &nbsp;&nbsp;<span class="kw">return</span> <span class="fn">stream</span>(c, <span class="kw">async</span> (s) =&gt; {<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;<span class="kw">for</span> (<span class="kw">const</span> chunk <span class="kw">of</span> chunks) {<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="kw">await</span> s.<span class="fn">write</span>(chunk);<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="kw">await</span> s.<span class="fn">sleep</span>(<span class="num">350</span>);<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;}<br/>
              &nbsp;&nbsp;});<br/>
              });
            </div>
            <button class="fire-btn" :disabled="isStreaming" @click="startStream">
              <span class="fire-icon">{{ isStreaming ? '◉' : '▶' }}</span>
              {{ isStreaming ? 'Streaming...' : 'Start Stream' }}
            </button>
            <div v-if="streamOutput" class="stream-output">
              <div class="stream-line" v-for="(line, i) in streamOutput.split('\n').filter(l => l)" :key="i">
                <span class="stream-prefix">›</span> {{ line }}
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <span class="panel-tag">DEMO</span>
              <span class="panel-title">Server-Sent Events (SSE)</span>
            </div>
            <div class="code-block">
              <span class="kw">import</span> { streamSSE } <span class="kw">from</span> <span class="str">'hono/streaming'</span>;<br/><br/>
              <span class="kw">app</span>.<span class="fn">get</span>(<span class="str">'/sse'</span>, (c) =&gt; {<br/>
              &nbsp;&nbsp;<span class="kw">return</span> <span class="fn">streamSSE</span>(c, <span class="kw">async</span> (s) =&gt; {<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;<span class="kw">await</span> s.<span class="fn">writeSSE</span>({<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;event: <span class="str">'message'</span>,<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;data: JSON.<span class="fn">stringify</span>(payload),<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;});<br/>
              &nbsp;&nbsp;});<br/>
              });
            </div>
            <button class="fire-btn" :disabled="isSseRunning" @click="startSSE">
              <span class="fire-icon">{{ isSseRunning ? '◉' : '▶' }}</span>
              {{ isSseRunning ? 'Receiving events...' : 'Start SSE' }}
            </button>
            <div v-if="sseEvents.length" class="sse-events">
              <div v-for="(evt, i) in sseEvents" :key="i" class="sse-event">
                <span class="sse-num">#{{ evt.count || i + 1 }}</span>
                <span class="sse-msg">{{ evt.msg || evt.error || JSON.stringify(evt) }}</span>
                <span class="sse-ts">{{ evt.ts ? evt.ts.split('T')[1]?.slice(0, 8) : '' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── ERROR HANDLING ────────────────────────────────────────── -->
        <div v-if="activeFeature === 'error'" class="panels">
          <div class="panel full-panel">
            <div class="panel-head">
              <span class="panel-tag">DEMO</span>
              <span class="panel-title">app.onError() — Centralized Error Handler</span>
            </div>
            <div class="code-block">
              <span class="code-comment">// One handler for ALL unhandled errors</span><br/>
              <span class="kw">app</span>.<span class="fn">onError</span>((err, c) =&gt; {<br/>
              &nbsp;&nbsp;<span class="kw">if</span> (err <span class="kw">instanceof</span> HTTPException) {<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;<span class="kw">return</span> c.<span class="fn">json</span>({ error: err.message }, err.status);<br/>
              &nbsp;&nbsp;}<br/>
              &nbsp;&nbsp;<span class="kw">return</span> c.<span class="fn">json</span>({ error: <span class="str">'Internal Error'</span> }, <span class="num">500</span>);<br/>
              });<br/><br/>
              <span class="code-comment">// Throw anywhere in a handler:</span><br/>
              <span class="kw">throw new</span> <span class="fn">HTTPException</span>(<span class="num">422</span>, { message: <span class="str">'...'</span> });
            </div>
            <div class="error-btns">
              <button class="fire-btn err-btn" @click="fireRequest('GET', '/api/showcase/error?type=http')">
                <span class="fire-icon">⚡</span> HTTPException (422)
              </button>
              <button class="fire-btn err-btn" @click="fireRequest('GET', '/api/showcase/error?type=notfound')">
                <span class="fire-icon">⚡</span> Not Found (404)
              </button>
              <button class="fire-btn err-btn err-server" @click="fireRequest('GET', '/api/showcase/error?type=server')">
                <span class="fire-icon">⚡</span> Server Error (500)
              </button>
            </div>
          </div>
        </div>

        <!-- ── CORS ─────────────────────────────────────────────────── -->
        <div v-if="activeFeature === 'cors'" class="panels">
          <div class="panel full-panel">
            <div class="panel-head">
              <span class="panel-tag">DEMO</span>
              <span class="panel-title">hono/cors Middleware</span>
            </div>
            <div class="code-block">
              <span class="kw">import</span> { cors } <span class="kw">from</span> <span class="str">'hono/cors'</span>;<br/><br/>
              <span class="kw">app</span>.<span class="fn">use</span>(<span class="str">'/api/*'</span>, <span class="fn">cors</span>({<br/>
              &nbsp;&nbsp;origin: (origin) =&gt; origin, <span class="code-comment">// dynamic — echo back</span><br/>
              &nbsp;&nbsp;allowMethods: [<span class="str">'GET'</span>, <span class="str">'POST'</span>, <span class="str">'PUT'</span>, <span class="str">'DELETE'</span>],<br/>
              &nbsp;&nbsp;allowHeaders: [<span class="str">'Content-Type'</span>, <span class="str">'Authorization'</span>],<br/>
              &nbsp;&nbsp;exposeHeaders: [<span class="str">'X-Request-Id'</span>, <span class="str">'X-Response-Time'</span>],<br/>
              }));
            </div>
            <button class="fire-btn" @click="fireRequest('GET', '/api/showcase/cors')">
              <span class="fire-icon">▶</span> Fire — see CORS headers in response
            </button>
            <div v-if="responseHeaders && Object.keys(responseHeaders).length" class="header-preview">
              <div class="panel-head" style="margin-bottom:8px">
                <span class="panel-tag">HEADERS</span>
                <span class="panel-title">Response Headers</span>
              </div>
              <div v-for="(val, key) in responseHeaders" :key="key" class="header-row">
                <span class="header-key">{{ key }}</span>
                <span class="header-val">{{ val }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── RESPONSE PANEL ────────────────────────────────────────── -->
        <div class="response-panel">
          <div class="response-head">
            <span class="response-label">RESPONSE</span>
            <div v-if="responseStatus" class="response-meta">
              <span :class="['status-chip', responseStatus >= 400 ? 'chip-err' : 'chip-ok']">
                {{ responseStatus }}
              </span>
              <span class="response-time">{{ responseTime }}ms</span>
            </div>
            <div v-if="loading" class="response-loading">
              <span class="loading-dot"></span>
              <span class="loading-dot"></span>
              <span class="loading-dot"></span>
            </div>
          </div>
          <div class="response-body">
            <pre v-if="response !== null" class="json-output">{{ formatJson(response) }}</pre>
            <div v-else-if="!loading" class="response-empty">
              Fire a request to see the response here
            </div>
          </div>
        </div>

      </main>
    </div>
  </div>
</template>

<style scoped>
/* ── CSS vars for showcase ── */
.showcase {
  --bg: #0d0f12;
  --bg-2: #13161b;
  --bg-3: #1a1e26;
  --bg-4: #222732;
  --border: rgba(255,255,255,0.07);
  --border-bright: rgba(255,255,255,0.13);
  --orange: #f97316;
  --orange-dim: rgba(249,115,22,0.12);
  --text: #e2e8f0;
  --text-muted: #64748b;
  --text-dim: #475569;
  --green: #34d399;
  --blue: #60a5fa;
  --purple: #a78bfa;
  --red: #fb7185;
  --yellow: #fbbf24;
  --cyan: #22d3ee;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-mono);
  display: flex;
  flex-direction: column;
}

/* ── TOPBAR ── */
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 48px;
  background: var(--bg-2);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hono-badge {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hono-flame {
  font-size: 1.1rem;
}

.hono-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--orange);
  letter-spacing: 0.05em;
}

.hono-version {
  font-size: 0.65rem;
  color: var(--text-muted);
  background: var(--bg-4);
  padding: 1px 6px;
  border-radius: 4px;
}

.topbar-divider {
  color: var(--border-bright);
}

.topbar-title {
  font-size: 0.8rem;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.live-dot {
  width: 6px;
  height: 6px;
  background: var(--green);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.topbar-live {
  color: var(--green);
  font-weight: 600;
}

.topbar-url {
  color: var(--text-dim);
}

/* ── LAYOUT ── */
.layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  height: calc(100vh - 48px);
}

/* ── SIDEBAR ── */
.sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--bg-2);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 16px 0;
}

.sidebar-label {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--text-dim);
  padding: 0 16px;
  margin-bottom: 6px;
  margin-top: 4px;
}

.feature-nav {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.feature-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  color: var(--text-muted);
  transition: background 0.15s, color 0.15s;
  position: relative;
}

.feature-btn:hover {
  background: var(--bg-3);
  color: var(--text);
}

.feature-btn.active {
  background: var(--orange-dim);
  color: var(--text);
  border-right: 2px solid var(--accent, var(--orange));
}

.feature-icon {
  font-size: 1rem;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.feature-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.feature-label {
  font-size: 0.82rem;
  font-weight: 600;
}

.feature-desc {
  font-size: 0.62rem;
  color: var(--text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.active-arrow {
  margin-left: auto;
  color: var(--orange);
  font-size: 1rem;
}

/* Request log */
.log-section {
  padding-top: 12px;
  border-top: 1px solid var(--border);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.log-list {
  display: flex;
  flex-direction: column;
}

.log-entry {
  display: grid;
  grid-template-columns: 42px 1fr 36px 40px;
  gap: 4px;
  align-items: center;
  padding: 5px 16px;
  font-size: 0.62rem;
  border-bottom: 1px solid var(--border);
  transition: background 0.1s;
}

.log-entry:hover {
  background: var(--bg-3);
}

.log-method {
  font-weight: 700;
  font-size: 0.6rem;
}

.method-get { color: var(--green); }
.method-post { color: var(--blue); }
.method-put { color: var(--yellow); }
.method-delete { color: var(--red); }

.log-path {
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-status { font-weight: 600; text-align: right; }
.status-ok { color: var(--green); }
.status-err { color: var(--red); }

.log-ms { color: var(--text-dim); text-align: right; }

.log-empty {
  padding: 12px 16px;
  font-size: 0.65rem;
  color: var(--text-dim);
  text-align: center;
}

/* ── MAIN ── */
.main {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.feature-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 4px;
}

.feature-icon-lg {
  font-size: 2rem;
  width: 48px;
  text-align: center;
}

.feature-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 2px;
}

.feature-subtitle {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* ── PANELS ── */
.panels {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 16px;
}

.panel {
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.full-panel {
  grid-column: 1 / -1;
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel-tag {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--orange);
  background: var(--orange-dim);
  padding: 2px 8px;
  border-radius: 4px;
}

.panel-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text);
}

/* ── CODE BLOCK ── */
.code-block {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px 16px;
  font-size: 0.75rem;
  line-height: 1.7;
  color: #94a3b8;
  overflow-x: auto;
}

.kw { color: #c084fc; }
.fn { color: #60a5fa; }
.str { color: #86efac; }
.num { color: #fb923c; }
.hl { color: var(--orange); font-weight: 700; }
.code-comment { color: #475569; font-style: italic; }

/* ── INPUTS ── */
.input-row {
  display: flex;
  gap: 12px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.input-group label {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.code-input {
  background: var(--bg);
  border: 1px solid var(--border-bright);
  border-radius: 6px;
  padding: 8px 10px;
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  outline: none;
  transition: border-color 0.15s;
}

.code-input:focus {
  border-color: var(--orange);
}

/* ── FIRE BUTTON ── */
.fire-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: var(--orange);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s, transform 0.1s;
  align-self: flex-start;
}

.fire-btn:hover {
  background: #ea6c10;
  transform: translateY(-1px);
}

.fire-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.fire-icon {
  font-size: 0.9rem;
}

/* Method chain buttons */
.method-btns {
  display: flex;
  gap: 8px;
}

.method-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  background: var(--bg-4);
  color: var(--text-muted);
}

.method-btn:hover { opacity: 0.9; filter: brightness(1.2); }

.meth-get { border-left: 3px solid var(--green); }
.meth-post { border-left: 3px solid var(--blue); }
.meth-put { border-left: 3px solid var(--yellow); }
.meth-delete { border-left: 3px solid var(--red); }

.method-active.meth-get { background: rgba(52,211,153,0.15); color: var(--green); }
.method-active.meth-post { background: rgba(96,165,250,0.15); color: var(--blue); }
.method-active.meth-put { background: rgba(251,191,36,0.15); color: var(--yellow); }
.method-active.meth-delete { background: rgba(251,113,133,0.15); color: var(--red); }

/* Chain visual */
.chain-visual {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 16px;
  flex-wrap: wrap;
}

.chain-step {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--text);
}

.chain-icon {
  font-size: 1rem;
}

.chain-arrow {
  color: var(--text-dim);
  font-size: 1rem;
}

/* Header preview */
.header-preview {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px 16px;
}

.header-row {
  display: flex;
  gap: 12px;
  padding: 4px 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.72rem;
}

.header-row:last-child { border-bottom: none; }

.header-key {
  color: var(--cyan);
  min-width: 200px;
  flex-shrink: 0;
}

.header-val {
  color: var(--green);
  word-break: break-all;
}

/* Validation form */
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.simple-btn {
  margin-right: 12px;
  background: transparent;
  border: 1px solid #f97316;
  color: #f97316;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.simple-btn:hover {
  background: #f97316;
  color: #0b1220; /* dark navy background tone */
  box-shadow: 0 0 12px rgba(249, 115, 22, 0.4);
  transform: translateY(-1px);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.form-input {
  width: 100%;
}

.required { color: var(--red); }
.optional { color: var(--text-dim); font-style: italic; }

.form-hints {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.hint-btn {
  background: var(--bg-4);
  border: 1px solid var(--border-bright);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s;
}

.hint-btn:hover { border-color: var(--red); color: var(--red); }
.hint-good:hover { border-color: var(--green); color: var(--green); }

/* Streaming output */
.stream-output {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stream-line {
  display: flex;
  gap: 8px;
  align-items: baseline;
  animation: fadeIn 0.3s ease;
}

.stream-prefix { color: var(--orange); }

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(-4px); }
  to { opacity: 1; transform: translateX(0); }
}

/* SSE events */
.sse-events {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sse-event {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  gap: 10px;
  align-items: center;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.72rem;
  animation: fadeIn 0.3s ease;
}

.sse-num { color: var(--orange); font-weight: 700; }
.sse-msg { color: var(--text); }
.sse-ts { color: var(--text-dim); }

/* Error buttons */
.error-btns {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.err-btn {
  background: rgba(251,113,133,0.15);
  color: var(--red);
  border: 1px solid rgba(251,113,133,0.3);
}

.err-btn:hover { background: rgba(251,113,133,0.25); }

.err-server {
  background: rgba(251,191,36,0.1);
  color: var(--yellow);
  border-color: rgba(251,191,36,0.3);
}

.err-server:hover { background: rgba(251,191,36,0.2); }

/* ── RESPONSE PANEL ── */
.response-panel {
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}

.response-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: var(--bg-3);
  border-bottom: 1px solid var(--border);
}

.response-label {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--text-dim);
}

.response-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-chip {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 4px;
}

.chip-ok { background: rgba(52,211,153,0.15); color: var(--green); }
.chip-err { background: rgba(251,113,133,0.15); color: var(--red); }

.response-time {
  font-size: 0.68rem;
  color: var(--text-dim);
}

.response-body {
  max-height: 360px;
  overflow-y: auto;
}

.json-output {
  padding: 16px 20px;
  font-size: 0.75rem;
  line-height: 1.6;
  color: #94a3b8;
  white-space: pre-wrap;
  word-break: break-all;
}

.response-empty {
  padding: 32px;
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-dim);
}

/* Loading dots */
.response-loading {
  display: flex;
  gap: 4px;
  align-items: center;
}

.loading-dot {
  width: 5px;
  height: 5px;
  background: var(--orange);
  border-radius: 50%;
  animation: blink 1s infinite;
}

.loading-dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes blink {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--bg-4); border-radius: 4px; }
</style>