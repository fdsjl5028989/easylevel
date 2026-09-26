// Loads easy-level.html's game script into Node with a fake browser around it, so the real
// game code (physics, traps, levels) runs headless. Rendering goes to a no-op WebGL renderer.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cache = join(here, '.cache');

// A tiny stand-in for DOM elements: enough for everything the game touches.
class FakeEl {
  constructor(id = '') {
    this.id = id; this.hidden = false; this.textContent = ''; this.innerHTML = ''; this.value = '';
    this.style = {}; this.dataset = {}; this.width = 0; this.height = 0;
    this.offsetWidth = 100; this.offsetLeft = 0; this.clientWidth = 400;
    const set = new Set();
    this.classList = { add: (c) => set.add(c), remove: (c) => set.delete(c), toggle: (c, on = !set.has(c)) => (on ? set.add(c) : set.delete(c), on), contains: (c) => set.has(c) };
  }
  addEventListener() {} removeEventListener() {} setAttribute() {} focus() {} blur() {} setPointerCapture() {}
  appendChild(c) { return c; }
  querySelector() { return null; }
  closest() { return null; }
  getContext() {
    const noop = () => {};
    return new Proxy({}, { get: (_, k) => (k === 'measureText' ? () => ({ width: 10 }) : k === 'createLinearGradient' ? () => ({ addColorStop: noop }) : noop), set: () => true });
  }
}

function installBrowser(seed) {
  const els = new Map();
  const listeners = {};
  // Deterministic Math.random so runs are reproducible (the physics doesn't use it, but narration picks do).
  let s = seed >>> 0;
  Math.random = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Object.assign(globalThis, {
    window: globalThis,
    document: {
      getElementById: (id) => { if (!els.has(id)) els.set(id, new FakeEl(id)); return els.get(id); },
      createElement: () => new FakeEl(),
      body: new FakeEl('body'),
      addEventListener: () => {},
      createRange: () => ({ selectNodeContents() {} }),
      hidden: false,
    },
    location: { search: '', hash: '' },
    matchMedia: () => ({ matches: false }),
    devicePixelRatio: 1, innerWidth: 1280, innerHeight: 720,
    localStorage: (() => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; })(),
    requestAnimationFrame: () => 0,
    getSelection: () => ({ removeAllRanges() {}, addRange() {} }),
    addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
    removeEventListener: () => {},
  });
  return listeners;
}

// Returns the game's `window.easy` hook plus helpers to press and release keys.
// `patch` can rewrite the game source before it runs (handy for trying tuning values).
export async function loadGame({ seed = 1, patch = (c) => c } = {}) {
  const html = readFileSync(join(here, '..', 'easy-level.html'), 'utf8');
  const m = /<script type="module">([\s\S]*?)<\/script>/.exec(html);
  if (!m) throw new Error('No module script found in easy-level.html');
  mkdirSync(cache, { recursive: true });
  writeFileSync(join(cache, 'three-shim.mjs'),
    `export * from 'three';\nexport class WebGLRenderer { constructor() { this.domElement = {}; } setPixelRatio() {} setSize() {} render() {} }\n`);
  const code = patch(m[1]).replace(/import \* as THREE from '[^']+';/, "import * as THREE from './three-shim.mjs';");
  const file = join(cache, `game-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
  writeFileSync(file, code);
  const listeners = installBrowser(seed);
  await import(pathToFileURL(file).href + `?v=${Date.now()}`);
  const game = globalThis.easy;
  if (!game) throw new Error('easy-level.html did not expose window.easy');
  const fire = (type, code) => (listeners[type] || []).forEach((fn) => fn({ code, repeat: false, shiftKey: false, preventDefault() {} }));
  return {
    game,
    down: (code) => { if (!game.keys[code]) fire('keydown', code); },
    up: (code) => { if (game.keys[code]) fire('keyup', code); },
    releaseAll: () => { for (const k in game.keys) if (game.keys[k]) fire('keyup', k); },
  };
}
