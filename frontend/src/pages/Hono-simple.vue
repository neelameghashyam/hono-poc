<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '@/services/api';
import { useRouter } from 'vue-router'

const activeFeature = ref('routing');
const loading = ref(false);
const response = ref(null);
const responseHeaders = ref({});
const responseTime = ref(null);
const responseStatus = ref(null);
const streamOutput = ref([]);
const isStreaming = ref(false);
const sseEvents = ref([]);
const isSseRunning = ref(false);
const showCode = ref({});
const methodChainMethod = ref(null);
const routingParamId = ref('42');
const routingParamVersion = ref('v2');
const routingQueryStr = ref('plant=pineapple&limit=5');
const validationForm = ref({ name: '', email: '', age: '' });
const lastAction = ref('');

const features = [
  { id: 'routing',    emoji: '🗺️', label: 'Routing',        color: '#f97316', short: 'How requests find the right place' },
  { id: 'middleware', emoji: '🔗', label: 'Middleware',     color: '#a78bfa', short: 'Auto-checks that run on every request' },
  { id: 'context',   emoji: '🎒', label: 'Context',        color: '#34d399', short: 'A bag that carries request info around' },
  { id: 'validation',emoji: '✅', label: 'Validation',     color: '#60a5fa', short: 'Catching bad data before it causes problems' },
  { id: 'streaming', emoji: '📡', label: 'Streaming',      color: '#fb7185', short: 'Sending data in real-time, bit by bit' },
  { id: 'error',     emoji: '🛡️', label: 'Error Handling', color: '#fbbf24', short: 'One safety net for the whole app' },
  { id: 'cors',      emoji: '🌐', label: 'CORS',           color: '#22d3ee', short: 'Letting your website talk to the server' },
];
const router = useRouter()

function goToNormal() {
  router.push('/')
}
const storyContent = {
  routing: {
    title: 'Routing — the post office of your app',
    story: `Imagine a busy post office. Hundreds of letters arrive every day. Each one has a different address, and the post office knows exactly which counter to send it to.\n\nHono does the same thing for web requests. When someone visits a URL — like "/plants/42" or "/search?type=fruit" — Hono reads that address and sends it to the right piece of code you wrote.\n\nNo manual sorting needed. Just tell Hono "when someone asks for /plants/:id, run this function" — and it handles the rest.`,
    demos: [
      {
        id: 'basic',
        title: '📬 Simple address matching',
        story: 'Someone visits "/showcase/routing/basic" — Hono sees the address, recognises it, and runs your code.',
        action: 'Watch Hono route this request',
        run: (f) => f('GET', '/api/showcase/routing/basic'),
        result: (d) => `Hono matched the URL and ran the right code. The request came in as a ${d.method}, hit the path "${d.path}", and your function responded instantly.`,
        code: `app.get('/species/latest', (c) => {\n  return c.json({ plants: ['Pineapple', 'Agapanthus'] });\n});`,
      },
      {
        id: 'params',
        title: '🏷️ Catching the variable parts of a URL',
        story: 'URLs often have changing parts — like a plant ID or a version number. Hono captures those automatically.',
        action: 'Try it with your own values',
        hasParamInputs: true,
        run: (f, s) => f('GET', `/api/showcase/routing/${s.routingParamVersion.value}/${s.routingParamId.value}`),
        result: (d) => `Hono automatically pulled version="${d.params?.version}" and id="${d.params?.id}" out of the URL — no manual string splitting needed.`,
        code: `// The parts with : are captured automatically\napp.get('/species/:version/:id', (c) => {\n  const id      = c.req.param('id');      // "42"\n  const version = c.req.param('version'); // "v2"\n  return c.json({ id, version });\n});`,
      },
      {
        id: 'methods',
        title: '🔄 Same address, different actions',
        story: 'The same URL can mean different things depending on what you\'re doing. Looking something up vs. creating vs. deleting.',
        action: 'Pick an action and see the response change',
        hasMethodBtns: true,
        run: (f, s, method) => f(method || 'GET', '/api/showcase/routing/methods'),
        result: (d) => `You used ${d.method}. Hono knew exactly which function to run for that combination of URL + action. GET means "look it up", POST means "create it", etc.`,
        code: `// One URL, four different behaviours\napp\n  .get('/plant',    () => /* look it up */)\n  .post('/plant',   () => /* create it  */)\n  .put('/plant',    () => /* update it  */)\n  .delete('/plant', () => /* remove it  */);`,
      },
      {
        id: 'query',
        title: '🔍 Filters in the URL',
        story: 'You know those "?search=pineapple" bits at the end of URLs? Those are filters. Hono reads them easily.',
        action: 'Change the filters and see what Hono reads',
        hasQueryInput: true,
        run: (f, s) => f('GET', `/api/showcase/routing/query?${s.routingQueryStr.value}`),
        result: (d) => `Hono read ${Object.keys(d.query || {}).length} filter(s) from the URL: ${Object.entries(d.query || {}).map(([k,v]) => `${k}="${v}"`).join(', ')}. These are called query parameters.`,
        code: `// URL: /search?plant=pineapple&limit=5\nconst plant = c.req.query('plant'); // "pineapple"\nconst limit = c.req.query('limit'); // "5"`,
      },
    ],
  },
  middleware: {
    title: 'Middleware — the airport security of your app',
    story: `Picture an airport. Before any passenger reaches their gate, they all go through the same security checkpoint — ID check, bag scan, boarding pass verification. Nobody skips it. Nobody has to set it up individually for each gate.\n\nMiddleware in Hono works exactly like that. You write a piece of code once, tell Hono "run this before every request", and it does. Automatically.\n\nThis is perfect for checking if someone is logged in, adding a timestamp to every request, logging what's happening, or adding security headers.`,
    demos: [
      {
        id: 'chain',
        title: '⏱️ The checkpoint in action',
        story: 'This request passes through our middleware before reaching the destination. The middleware stamps a unique ID on it and starts a timer — then your actual code runs — then the middleware adds the elapsed time to the response.',
        action: 'Watch the checkpoint work',
        run: (f) => f('GET', '/api/showcase/middleware'),
        result: (d) => `The middleware ran before the main code! It created a unique tracking ID (${d.context_from_middleware?.requestId?.slice(0, 16)}...) and measured that everything took ${d.context_from_middleware?.elapsed}. These values were passed along to the handler automatically.`,
        showHeaders: true,
        code: `app.use('/api/*', async (c, next) => {\n  // This runs BEFORE your handler\n  c.set('requestId', generateUniqueId());\n  c.set('startedAt', Date.now());\n\n  await next(); // ← your actual handler runs here\n\n  // This runs AFTER your handler\n  const elapsed = Date.now() - c.get('startedAt');\n  c.header('X-Response-Time', elapsed + 'ms');\n});`,
      },
    ],
  },
  context: {
    title: 'Context — the backpack every request carries',
    story: `Imagine every request that comes into your server is a person walking through a building. When they arrive, they're given a backpack.\n\nAs they move through the building — past the security checkpoint (middleware), through the corridors, to their destination — anyone can put things in the backpack or take things out.\n\nThe security guard might put in "this person is logged in as Jane". The timer might put in "they arrived at 3:04pm". And when they finally reach the destination, all of that information is right there in the backpack.\n\nIn Hono, this backpack is called the Context object — written as "c". It's the one object that travels through your entire app.`,
    demos: [
      {
        id: 'ctx',
        title: '🎒 Peek inside the backpack',
        story: 'This will show you a snapshot of everything the "c" object is carrying for this specific request — the URL, the method, and values that middleware put in.',
        action: 'Open the backpack',
        run: (f) => f('GET', '/api/showcase/context'),
        result: (d) => `Here's the backpack! It's carrying: the URL (${d.context_properties?.['c.req.url']?.split('?')[0]}), the method (${d.context_properties?.['c.req.method']}), and values that middleware put in — like the request ID that was generated automatically.`,
        code: `app.get('/example', (c) => {\n  // Everything lives on one object: c\n  const url    = c.req.url;             // the full URL\n  const method = c.req.method;          // GET, POST, etc.\n  const userId = c.get('loggedInUser'); // put in by middleware\n\n  c.header('X-Custom', 'hello');        // add to response\n  return c.json({ url, method });       // send response\n});`,
      },
    ],
  },
  validation: {
    title: 'Validation — the bouncer at the door',
    story: `Imagine a government office where you submit forms. The clerk at the front desk checks every form before it goes through: "Did you fill in your name? Is this a real date? That phone number has letters in it — rejected."\n\nIf the form is wrong, you get it back immediately. The clerk doesn't let broken forms through to the people in the back office.\n\nHono's validation works the same way. You describe what good data looks like. Hono checks every incoming request against those rules before your code ever runs. Bad data? Rejected at the door, with a clear explanation of why.`,
    demos: [
      {
        id: 'valid',
        title: '📋 Submit a form — try to sneak bad data in',
        story: 'We\'re expecting a name (at least 2 letters), a valid email, and optionally an age. Try filling in nonsense and see what Hono says.',
        action: 'Submit the form',
        hasValidationForm: true,
        run: (f, s) => f('POST', '/api/showcase/validation', {
          name: s.validationForm.value.name,
          email: s.validationForm.value.email,
          ...(s.validationForm.value.age ? { age: Number(s.validationForm.value.age) } : {}),
        }),
        result: (d, status) => status < 300
          ? `✅ All good! The data passed every check and made it through to the actual code. Name: "${d.data?.name}", Email: "${d.data?.email}".`
          : `🚫 Hono rejected the request before your code even ran! ${d.errors?.length} problem(s) found: ${d.errors?.map(e => `"${e.field}" — ${e.message}`).join('; ')}.`,
        code: `import { zValidator } from '@hono/zod-validator';\nimport { z } from 'zod';\n\n// Describe what valid data looks like\nconst rules = z.object({\n  name:  z.string().min(2),          // at least 2 letters\n  email: z.string().email(),         // must be a real email\n  age:   z.number().max(150).optional(), // optional\n});\n\n// Hono checks the data BEFORE your handler runs\napp.post('/users', zValidator('json', rules), (c) => {\n  const data = c.req.valid('json'); // guaranteed clean!\n  return c.json({ success: true, data });\n});`,
      },
    ],
  },
  streaming: {
    title: 'Streaming — dripping water vs. filling a bucket',
    story: `Imagine two ways to serve someone a drink. The first way: fill the entire glass, walk over, hand it to them. They wait until it's completely full.\n\nThe second way: hand them the glass immediately and pour as you walk. They start drinking before you're even done pouring.\n\nStreaming is the second way. Instead of waiting for all your data to be ready before sending anything, Hono lets you send it piece by piece the moment each piece is ready.\n\nThis is how modern AI chatbots show words appearing one at a time, how live sports scores update in real time, and how large file downloads work.`,
    demos: [
      {
        id: 'stream',
        title: '🌊 Watch data arrive in real-time',
        story: 'The server will send 5 messages, one at a time with a short pause between each. Watch them appear one by one — you\'re seeing streaming in action.',
        action: 'Start the stream',
        isStream: true,
        code: `import { stream } from 'hono/streaming';\n\napp.get('/live-updates', async (c) => {\n  return stream(c, async (s) => {\n    for (const update of updates) {\n      await s.write(update);  // send a piece\n      await s.sleep(350);     // short pause\n    }\n    // no need to "close" — Hono handles it\n  });\n});`,
      },
      {
        id: 'sse',
        title: '📻 Server-Sent Events — like a news ticker',
        story: 'SSE takes streaming further — the server can keep sending numbered updates at any time, and the browser listens like a radio receiver.',
        action: 'Start receiving updates',
        isSSE: true,
        code: `import { streamSSE } from 'hono/streaming';\n\napp.get('/live-feed', (c) => {\n  return streamSSE(c, async (s) => {\n    while (true) { // keep sending forever\n      await s.writeSSE({\n        event: 'update',\n        data: JSON.stringify({ msg: 'New data!', ts: Date.now() }),\n      });\n      await sleep(1000); // every second\n    }\n  });\n});`,
      },
    ],
  },
  error: {
    title: 'Error Handling — the hospital emergency room',
    story: `A hospital doesn't put a doctor in every room hoping that nothing goes wrong. Instead, there's an emergency room — one central place that's ready to handle any crisis, wherever it happens.\n\nWithout central error handling, every part of your code needs its own try/catch. If you forget one, your app crashes with an ugly error message.\n\nHono's app.onError() is the emergency room. You write it once. Any time anything goes wrong anywhere in your app, Hono sends it there. You return a clean, friendly error message. The app stays running.`,
    demos: [
      {
        id: 'err422',
        title: '⚠️ A known problem (wrong input)',
        story: 'Someone sent the wrong type of data. The code knows about this possibility and deliberately reports it as a 422 error.',
        action: 'Trigger this error',
        run: (f) => f('GET', '/api/showcase/error?type=http'),
        result: (d, status) => `The code deliberately threw a "422 Unprocessable" error. app.onError() caught it and returned this tidy message instead of crashing. Status: ${status}.`,
        code: `import { HTTPException } from 'hono/http-exception';\n\napp.get('/submit', (c) => {\n  if (dataIsWrong) {\n    // Deliberately signal a problem\n    throw new HTTPException(422, {\n      message: 'The data you sent cannot be processed'\n    });\n  }\n  return c.json({ success: true });\n});\n\n// ONE handler for ALL errors, anywhere in the app\napp.onError((err, c) => {\n  return c.json({ error: err.message }, err.status);\n});`,
      },
      {
        id: 'err404',
        title: '🔍 Something doesn\'t exist (404)',
        story: 'The requested thing doesn\'t exist. Instead of a confusing crash, Hono gives a clear "not found" response.',
        action: 'Trigger a 404',
        run: (f) => f('GET', '/api/showcase/error?type=notfound'),
        result: (d, status) => `A 404 was thrown. app.onError() caught it just like the 422. Every type of error — known or unknown — goes through the same central handler. Consistent, clean responses every time.`,
        code: `throw new HTTPException(404, {\n  message: 'That plant variety does not exist'\n});\n// app.onError() catches this too`,
      },
      {
        id: 'err500',
        title: '💥 A total surprise (unexpected crash)',
        story: 'Something completely unexpected went wrong — a bug, a database hiccup, anything. Without app.onError(), your users would see a raw crash. With it, they still get a clean response.',
        action: 'Trigger an unexpected crash',
        run: (f) => f('GET', '/api/showcase/error?type=server'),
        result: (d, status) => `An unhandled error was thrown. Even this was caught by app.onError(). Your app stayed running and returned a readable message instead of going down. This is the safety net.`,
        code: `// Even if you forget to handle something...\napp.get('/risky', (c) => {\n  throw new Error('Unexpected crash!');\n});\n\n// ...app.onError() still catches it\napp.onError((err, c) => {\n  console.error('Something broke:', err);\n  return c.json({ error: 'Something went wrong' }, 500);\n});`,
      },
    ],
  },
  cors: {
    title: 'CORS — the nightclub with a guest list',
    story: `Imagine a nightclub with a strict bouncer. By default, the bouncer only lets in people who live on the same street. Anyone from another neighbourhood? Turned away — even if they're perfectly nice people.\n\nBrowsers do exactly this with web requests. By default, a website at "mysite.com" is blocked from talking to an API at "myapi.com" — it's a security feature to protect users.\n\nCORS (Cross-Origin Resource Sharing) is how you tell the bouncer "people from these addresses are on the guest list — let them in." Hono makes this a one-liner.`,
    demos: [
      {
        id: 'cors',
        title: '🎟️ The guest list in action',
        story: 'When your frontend (localhost:5173) talks to this API (localhost:3001), CORS headers are what make the browser allow it. See those headers for yourself.',
        action: 'See the CORS headers',
        run: (f) => f('GET', '/api/showcase/cors'),
        result: () => `The browser was allowed in! The "Access-Control-Allow-Origin" header is the bouncer saying "yes, you're on the list." Without this, your frontend would get a CORS error and see nothing.`,
        showHeaders: true,
        code: `import { cors } from 'hono/cors';\n\n// One line — that's it\napp.use('/api/*', cors({\n  origin: 'http://localhost:5173', // your frontend's address\n  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],\n}));\n\n// Now your frontend can call this API freely`,
      },
    ],
  },
};

const activeFeatureConfig = computed(() => features.find((f) => f.id === activeFeature.value));
const activeStory = computed(() => storyContent[activeFeature.value]);

function toggleCode(id) {
  showCode.value = { ...showCode.value, [id]: !showCode.value[id] };
}

function formatJson(obj) {
  try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
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
    if (body) { cfg.data = body; cfg.headers = { 'Content-Type': 'application/json' }; }
    const res = await api.request(cfg);
    response.value = res.data;
    responseStatus.value = res.status;
    responseTime.value = Date.now() - t0;
    const hdrs = {};
    ['x-request-id','x-response-time','x-powered-by','x-hono-version','access-control-allow-origin','access-control-allow-methods'].forEach(h => {
      if (res.headers[h]) hdrs[h] = res.headers[h];
    });
    responseHeaders.value = hdrs;
  } catch (err) {
    response.value = err.response?.data || { error: err.message };
    responseStatus.value = err.response?.status || 0;
    responseTime.value = Date.now() - t0;
  } finally {
    loading.value = false;
  }
}

async function startStream() {
  if (isStreaming.value) return;
  isStreaming.value = true;
  streamOutput.value = [];
  const token = localStorage.getItem('wipo_token');
  try {
    const res = await fetch('/api/showcase/streaming', { headers: { Authorization: `Bearer ${token}` } });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value);
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const l of lines) if (l.trim()) streamOutput.value.push(l.trim());
    }
    if (buf.trim()) streamOutput.value.push(buf.trim());
  } catch (e) {
    streamOutput.value.push(`Error: ${e.message}`);
  } finally {
    isStreaming.value = false;
  }
}

async function startSSE() {
  if (isSseRunning.value) return;
  isSseRunning.value = true;
  sseEvents.value = [];
  const token = localStorage.getItem('wipo_token');
  try {
    const res = await fetch('/api/showcase/sse', { headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' } });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value);
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try { sseEvents.value.push(JSON.parse(line.slice(6))); } catch {}
        }
      }
    }
  } catch (e) {
    sseEvents.value.push({ msg: `Error: ${e.message}` });
  } finally {
    isSseRunning.value = false;
  }
}

function runDemo(demo) {
  lastAction.value = demo.id;
  if (demo.isStream) { startStream(); return; }
  if (demo.isSSE) { startSSE(); return; }
  const state = { routingParamId, routingParamVersion, routingQueryStr, validationForm };
  demo.run(fireRequest, state, methodChainMethod.value);
}

function switchFeature(id) {
  activeFeature.value = id;
  response.value = null;
  responseHeaders.value = {};
  responseStatus.value = null;
  streamOutput.value = [];
  sseEvents.value = [];
  lastAction.value = '';
  methodChainMethod.value = null;
}

onMounted(() => fireRequest('GET', '/api/showcase/routing/basic'));
</script>

<template>
  <div class="page">

    <!-- HEADER -->
  <header class="hdr">
  <div class="hdr-brand">
    <span class="hdr-name">Hono</span>
    <span class="hdr-pill">What does it actually do?</span>
  </div>

  <div class="hdr-right">
    <button class="normal-btn" @click="goToNormal">
      Normal Version
    </button>

    <div class="hdr-live">
      <span class="pip"></span>
      Connected to live server
    </div>
  </div>
</header>

    <div class="body">

      <!-- LEFT NAV -->
      <nav class="sidenav">
        <p class="nav-label">Pick a feature</p>
        <button
          v-for="f in features" :key="f.id"
          :class="['nav-item', { 'nav-item--active': activeFeature === f.id }]"
          :style="activeFeature === f.id ? { '--c': f.color } : {}"
          @click="switchFeature(f.id)"
        >
          <span class="nav-emoji">{{ f.emoji }}</span>
          <div class="nav-text">
            <span class="nav-name">{{ f.label }}</span>
            <span class="nav-short">{{ f.short }}</span>
          </div>
          <span v-if="activeFeature === f.id" class="nav-dot" :style="{ background: f.color }"></span>
        </button>
      </nav>

      <!-- CONTENT -->
      <main class="content">

        <!-- STORY HEADER -->
        <div class="story-header" :style="{ '--c': activeFeatureConfig.color }">
          <span class="story-emoji">{{ activeFeatureConfig.emoji }}</span>
          <div class="story-text">
            <h1 class="story-title">{{ activeStory.title }}</h1>
          </div>
        </div>

        <!-- THE STORY -->
        <div class="story-card">
          <p v-for="(para, i) in activeStory.story.split('\n\n')" :key="i" class="story-para">
            {{ para }}
          </p>
        </div>

        <!-- DEMOS -->
        <div class="demos-label">Try it yourself</div>

        <div class="demos">
          <div
            v-for="demo in activeStory.demos"
            :key="demo.id"
            class="demo"
            :class="{ 'demo--ran': lastAction === demo.id && (response !== null || streamOutput.length || sseEvents.length) }"
          >
            <!-- Demo header -->
            <div class="demo-top">
              <h3 class="demo-title">{{ demo.title }}</h3>
              <button class="code-peek" @click="toggleCode(demo.id)">
                {{ showCode[demo.id] ? '▲ Hide code' : '{ } See the code' }}
              </button>
            </div>

            <p class="demo-story">{{ demo.story }}</p>

            <!-- Optional code reveal -->
            <div v-if="showCode[demo.id]" class="code-reveal">
              <div class="code-label">How this works in Hono</div>
              <pre class="code-pre">{{ demo.code }}</pre>
            </div>

            <!-- Inputs for routing params demo -->
            <div v-if="demo.hasParamInputs" class="input-row">
              <div class="input-group">
                <label>version <span class="input-hint">(e.g. v2)</span></label>
                <input v-model="routingParamVersion" class="text-input" />
              </div>
              <div class="input-group">
                <label>id <span class="input-hint">(e.g. 42)</span></label>
                <input v-model="routingParamId" class="text-input" />
              </div>
            </div>

            <!-- Query string input -->
            <div v-if="demo.hasQueryInput" class="input-group" style="margin-bottom:12px">
              <label>URL filters <span class="input-hint">(key=value&key2=value2)</span></label>
              <input v-model="routingQueryStr" class="text-input" style="width:100%" />
            </div>

            <!-- HTTP method buttons -->
            <div v-if="demo.hasMethodBtns" class="method-picker">
              <p class="method-label">What do you want to do?</p>
              <div class="method-btns">
                <button v-for="m in [
                  { v:'GET',    label:'👀 Look it up',  color:'#34d399' },
                  { v:'POST',   label:'✏️ Create it',   color:'#60a5fa' },
                  { v:'PUT',    label:'🔄 Update it',   color:'#fbbf24' },
                  { v:'DELETE', label:'🗑️ Delete it',   color:'#fb7185' },
                ]" :key="m.v"
                  :class="['meth', { 'meth--active': methodChainMethod === m.v }]"
                  :style="methodChainMethod === m.v ? { '--mc': m.color } : {}"
                  @click="methodChainMethod = m.v; runDemo(demo)"
                >{{ m.label }}</button>
              </div>
            </div>

            <!-- Validation form -->
            <div v-if="demo.hasValidationForm" class="val-form">
              <div class="val-presets">
                <span class="val-presets-label">Quick fill:</span>
                <button class="preset preset--bad" @click="validationForm = { name: 'X', email: 'not-an-email', age: '999' }">
                  😈 Bad data (will fail)
                </button>
                <button class="preset preset--good" @click="validationForm = { name: 'Jane Doe', email: 'jane@example.com', age: '28' }">
                  😇 Good data (will pass)
                </button>
              </div>
              <div class="val-fields">
                <div class="val-field">
                  <label>Name <span class="req">required</span></label>
                  <input v-model="validationForm.name" class="text-input" placeholder="must be at least 2 letters" />
                </div>
                <div class="val-field">
                  <label>Email <span class="req">required</span></label>
                  <input v-model="validationForm.email" class="text-input" placeholder="must look like an email" />
                </div>
                <div class="val-field">
                  <label>Age <span class="opt">optional</span></label>
                  <input v-model="validationForm.age" class="text-input" type="number" placeholder="0 to 150" />
                </div>
              </div>
            </div>

            <!-- Stream output -->
            <div v-if="demo.isStream">
              <button class="action-btn" :disabled="isStreaming" @click="runDemo(demo)">
                <span>{{ isStreaming ? '⏳ Data is flowing...' : '▶ ' + demo.action }}</span>
              </button>
              <div v-if="streamOutput.length" class="stream-display">
                <div class="stream-display-label">Messages arriving from server:</div>
                <div v-for="(line, i) in streamOutput" :key="i" class="stream-line">
                  <span class="stream-num">{{ i + 1 }}</span>
                  <span>{{ line }}</span>
                </div>
                <div v-if="!isStreaming && streamOutput.length" class="stream-done">
                  ✓ Stream complete — all data received
                </div>
              </div>
            </div>

            <!-- SSE output -->
            <div v-else-if="demo.isSSE">
              <button class="action-btn" :disabled="isSseRunning" @click="runDemo(demo)">
                <span>{{ isSseRunning ? '📻 Receiving live updates...' : '▶ ' + demo.action }}</span>
              </button>
              <div v-if="sseEvents.length" class="sse-display">
                <div class="sse-display-label">Updates pushed by the server:</div>
                <div v-for="(evt, i) in sseEvents" :key="i" class="sse-row">
                  <span class="sse-badge">#{{ evt.count || i + 1 }}</span>
                  <span class="sse-msg">{{ evt.msg }}</span>
                  <span class="sse-time">{{ evt.ts?.split('T')[1]?.slice(0, 8) }}</span>
                </div>
              </div>
            </div>

            <!-- Default action button -->
            <button v-else-if="!demo.hasMethodBtns" class="action-btn" :disabled="loading && lastAction === demo.id" @click="runDemo(demo)">
              <span v-if="loading && lastAction === demo.id">⏳ Asking the server...</span>
              <span v-else>▶ {{ demo.action }}</span>
            </button>

            <!-- Result card -->
            <transition name="result-fade">
              <div v-if="lastAction === demo.id && response !== null && !loading" class="result-card"
                :class="responseStatus >= 400 ? 'result-card--err' : 'result-card--ok'">
                <div class="result-badge">
                  <span>{{ responseStatus >= 400 ? '❌' : '✅' }} {{ responseStatus >= 400 ? 'Rejected' : 'Success' }}</span>
                  <span class="result-ms">{{ responseTime }}ms</span>
                </div>
                <p class="result-text">{{ demo.result ? demo.result(response, responseStatus) : '' }}</p>

                <!-- Headers for CORS / middleware -->
                <div v-if="demo.showHeaders && Object.keys(responseHeaders).length" class="result-headers">
                  <div class="rh-label">Response headers added by Hono:</div>
                  <div v-for="(val, key) in responseHeaders" :key="key" class="rh-row">
                    <span class="rh-key">{{ key }}</span>
                    <span class="rh-val">{{ val }}</span>
                  </div>
                </div>

                <!-- Errors for validation -->
                <div v-if="response?.errors?.length" class="result-errors">
                  <div class="re-label">Problems found:</div>
                  <div v-for="err in response.errors" :key="err.field" class="re-row">
                    <span class="re-field">{{ err.field }}</span>
                    <span class="re-msg">{{ err.message }}</span>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>

      </main>
    </div>
  </div>
</template>

<style scoped>
/* ── VARIABLES ── */
.page {
  --bg: #f8f9fb;
  --bg2: #ffffff;
  --bg3: #f1f3f7;
  --border: #e4e7ed;
  --orange: #f97316;
  --text: #0f172a;
  --muted: #64748b;
  --dim: #94a3b8;
  --green: #16a34a;
  --red: #dc2626;
  --mono: 'JetBrains Mono', 'Fira Code', monospace;

  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
}

/* ── HEADER ── */
.hdr {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 52px;
  background: #fff;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 50;
}
.hdr-brand { display: flex; align-items: center; gap: 10px; }
.hdr-flame { font-size: 1.3rem; }
.hdr-name { font-weight: 800; font-size: 1.1rem; color: var(--orange); letter-spacing: -0.01em; }
.hdr-pill {
  background: #fff7ed;
  color: #c2410c;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid #fed7aa;
}
.hdr-live { display: flex; align-items: center; gap: 7px; font-size: 0.75rem; color: var(--muted); }
.pip { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; animation: pip 2s infinite; }
@keyframes pip { 0%,100%{opacity:1} 50%{opacity:.3} }

/* ── LAYOUT ── */
.body { display: flex; flex: 1; height: calc(100vh - 52px); overflow: hidden; }

.hdr-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.normal-btn {
  background: #f97316;
  color: white;
  border: none;
  padding: 7px 14px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.normal-btn:hover {
  background: #ea6c10;
  transform: translateY(-1px);
}

/* ── SIDENAV ── */
.sidenav {
  width: 220px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid var(--border);
  padding: 16px 0;
  overflow-y: auto;
}
.nav-label { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.12em; color: var(--dim); text-transform: uppercase; padding: 0 16px 8px; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 16px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  color: var(--muted);
  position: relative;
  transition: background 0.12s;
}
.nav-item:hover { background: var(--bg); color: var(--text); }
.nav-item--active { background: #fff7ed; color: var(--text); }
.nav-emoji { font-size: 1.15rem; width: 24px; flex-shrink: 0; }
.nav-text { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
.nav-name { font-size: 0.85rem; font-weight: 600; }
.nav-short { font-size: 0.62rem; color: var(--dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nav-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

/* ── CONTENT ── */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 860px;
}

/* ── STORY HEADER ── */
.story-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 4px;
  border-bottom: 3px solid var(--c, var(--orange));
  padding-bottom: 14px;
}
.story-emoji { font-size: 2.4rem; }
.story-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1.25;
  letter-spacing: -0.02em;
}

/* ── STORY CARD ── */
.story-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 22px 26px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.story-para {
  font-size: 0.93rem;
  line-height: 1.75;
  color: #334155;
}

/* ── DEMOS SECTION ── */
.demos-label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--dim);
}
.demos { display: flex; flex-direction: column; gap: 14px; }

/* ── DEMO CARD ── */
.demo {
  background: #fff;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.2s;
}
.demo--ran { border-color: #e2e8f0; }

.demo-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.demo-title { font-size: 1rem; font-weight: 700; color: var(--text); }
.code-peek {
  background: none;
  border: 1px solid var(--border);
  color: var(--muted);
  font-size: 0.7rem;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  font-family: var(--mono);
}
.code-peek:hover { border-color: var(--orange); color: var(--orange); }

.demo-story { font-size: 0.85rem; color: #475569; line-height: 1.65; }

/* ── CODE REVEAL ── */
.code-reveal {
  background: #0f172a;
  border-radius: 10px;
  overflow: hidden;
}
.code-label {
  padding: 8px 14px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #64748b;
  background: #0f172a;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  text-transform: uppercase;
}
.code-pre {
  padding: 14px 16px;
  font-family: var(--mono);
  font-size: 0.73rem;
  line-height: 1.75;
  color: #94a3b8;
  white-space: pre;
  overflow-x: auto;
  margin: 0;
}

/* ── INPUTS ── */
.input-row { display: flex; gap: 12px; }
.input-group { display: flex; flex-direction: column; gap: 5px; flex: 1; }
.input-group label, .val-field label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--muted);
}
.input-hint { font-weight: 400; color: var(--dim); }
.text-input {
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: 8px 11px;
  font-size: 0.85rem;
  color: var(--text);
  background: var(--bg);
  outline: none;
  transition: border-color 0.15s;
  font-family: var(--mono);
}
.text-input:focus { border-color: var(--orange); background: #fff; }

/* ── METHOD PICKER ── */
.method-picker { display: flex; flex-direction: column; gap: 8px; }
.method-label { font-size: 0.78rem; font-weight: 600; color: var(--muted); }
.method-btns { display: flex; gap: 8px; flex-wrap: wrap; }
.meth {
  padding: 9px 16px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--muted);
}
.meth:hover { border-color: #94a3b8; color: var(--text); }
.meth--active { background: color-mix(in srgb, var(--mc) 10%, white); color: var(--mc); border-color: var(--mc); }

/* ── VALIDATION FORM ── */
.val-form { display: flex; flex-direction: column; gap: 14px; }
.val-presets { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.val-presets-label { font-size: 0.72rem; font-weight: 600; color: var(--muted); }
.preset {
  padding: 6px 12px;
  border-radius: 7px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  border: 1.5px solid var(--border);
  background: var(--bg);
  color: var(--muted);
  transition: all 0.15s;
}
.preset--bad:hover { background: #fff1f2; color: #be123c; border-color: #fda4af; }
.preset--good:hover { background: #f0fdf4; color: #15803d; border-color: #86efac; }
.val-fields { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.val-field { display: flex; flex-direction: column; gap: 5px; }
.req { color: #dc2626; font-weight: 400; font-size: 0.65rem; }
.opt { color: var(--dim); font-weight: 400; font-size: 0.65rem; }

/* ── ACTION BUTTON ── */
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  background: var(--orange);
  color: #fff;
  border: none;
  border-radius: 9px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s, opacity 0.15s;
  align-self: flex-start;
}
.action-btn:hover { background: #ea6c10; transform: translateY(-1px); }
.action-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

/* ── STREAM DISPLAY ── */
.stream-display {
  background: #0f172a;
  border-radius: 10px;
  overflow: hidden;
}
.stream-display-label {
  padding: 8px 14px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #475569;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  text-transform: uppercase;
}
.stream-line {
  display: flex;
  gap: 12px;
  padding: 7px 14px;
  font-size: 0.8rem;
  color: #94a3b8;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  animation: fadein 0.3s ease;
}
.stream-num { color: var(--orange); font-family: var(--mono); font-weight: 700; width: 18px; flex-shrink: 0; }
.stream-done { padding: 8px 14px; font-size: 0.72rem; color: #34d399; }
@keyframes fadein { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:none} }

/* ── SSE DISPLAY ── */
.sse-display { display: flex; flex-direction: column; gap: 6px; }
.sse-display-label { font-size: 0.7rem; font-weight: 600; color: var(--muted); }
.sse-row {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 10px;
  align-items: center;
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 9px 13px;
  font-size: 0.8rem;
  animation: fadein 0.3s ease;
}
.sse-badge { color: var(--orange); font-weight: 800; font-family: var(--mono); }
.sse-msg { color: var(--text); }
.sse-time { color: var(--dim); font-family: var(--mono); font-size: 0.68rem; }

/* ── RESULT CARD ── */
.result-fade-enter-active { transition: all 0.3s ease; }
.result-fade-enter-from { opacity: 0; transform: translateY(6px); }

.result-card {
  border-radius: 10px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.result-card--ok { background: #f0fdf4; border: 1.5px solid #bbf7d0; }
.result-card--err { background: #fff1f2; border: 1.5px solid #fecdd3; }

.result-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  font-weight: 700;
}
.result-card--ok .result-badge { color: var(--green); }
.result-card--err .result-badge { color: var(--red); }
.result-ms { font-weight: 400; font-size: 0.72rem; color: var(--dim); font-family: var(--mono); }

.result-text { font-size: 0.85rem; line-height: 1.65; color: #334155; }

/* Headers in result */
.result-headers { border-top: 1px solid rgba(0,0,0,0.06); padding-top: 10px; }
.rh-label { font-size: 0.7rem; font-weight: 700; color: var(--muted); margin-bottom: 6px; }
.rh-row { display: flex; gap: 10px; font-size: 0.72rem; font-family: var(--mono); padding: 3px 0; }
.rh-key { color: #0284c7; min-width: 180px; flex-shrink: 0; }
.rh-val { color: #15803d; word-break: break-all; }

/* Errors in result */
.result-errors { border-top: 1px solid rgba(220,38,38,0.15); padding-top: 10px; }
.re-label { font-size: 0.7rem; font-weight: 700; color: #dc2626; margin-bottom: 6px; }
.re-row { display: flex; gap: 10px; font-size: 0.78rem; padding: 3px 0; }
.re-field { font-family: var(--mono); font-weight: 700; color: #be123c; min-width: 60px; }
.re-msg { color: #9f1239; }

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
</style>