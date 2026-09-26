// Headless checks for Easy Level. Run with `npm test` (or `node tests/run.mjs [filter]`, where the
// filter matches a level id like 1-3 or a trap id like guide).
//
//   1. Level data   every trap has its text for every version, sane zones, and a route below
//   2. Checkpoints  every checkpoint stands Pip on solid ground
//   3. Versions     dying in a trap upgrades it one version at a time and stops at the final one
//   4. Beatable     a bot beats the FINAL version of every trap, then each whole level, with no deaths
//   5. Difficulty   timing windows and the chase margin (a number to watch when you retune things)
//   6. Fuzz         random button mashing on every level and version mix must never crash the game
import { loadGame } from './harness.mjs';
import { makeBot, run, Fail } from './bot.mjs';
import { ROUTES } from './routes.mjs';

const filter = process.argv[2];
const h = await loadGame({ seed: 7 });
const { game } = h;
const LEVELS = game.LEVELS;
const idxOf = (id) => LEVELS.findIndex((l) => l.id === id);
const want = (lv, trapId) => !filter || filter === lv.id || filter === trapId;

let failed = 0, passed = 0;
const green = (s) => `\x1b[32m${s}\x1b[0m`, red = (s) => `\x1b[31m${s}\x1b[0m`, dim = (s) => `\x1b[2m${s}\x1b[0m`;
function check(name, fn) {
  try { const note = fn(); passed++; console.log(`  ${green('✓')} ${name}${note ? dim(`  ${note}`) : ''}`); }
  catch (e) { failed++; console.log(`  ${red('✗')} ${name}\n      ${red(e instanceof Fail ? e.message : e.stack)}`); }
}
function assert(ok, msg) { if (!ok) throw new Fail(msg); }
function fresh(li, stages = 'final') { h.releaseAll(); game.dev.god = game.dev.lock = false; game.playLevel(li); game.setAll(stages); }

// ---------------------------------------------------------------------------------------------
console.log('\nLevel data');
for (const lv of LEVELS) {
  if (!want(lv)) continue;
  check(`${lv.id} traps and checkpoints are well-formed`, () => {
    const traps = lv.traps(), ids = new Set();
    for (const T of traps) {
      const where = `${lv.id} ${T.id}`;
      assert(!ids.has(T.id), `${where}: duplicate trap id`); ids.add(T.id);
      assert(T.zone[0] < T.zone[1], `${where}: zone is backwards`);
      assert(Number.isInteger(T.max) && T.max >= 1, `${where}: max should be 1 or more`);
      for (const k of ['approach', 'deaths', 'patch']) assert(Array.isArray(T[k]) && T[k].length === T.max + 1, `${where}: ${k} needs ${T.max + 1} entries, has ${T[k]?.length}`);
      T.deaths.forEach((d, i) => assert(typeof d === 'string' && d, `${where}: deaths[${i}] is empty`));
      T.patch.slice(1).forEach((p, i) => assert(typeof p === 'string' && p, `${where}: patch[${i + 1}] (notes for v${i + 2}.0) is empty`));
      assert(typeof T.hint === 'string' && T.hint, `${where}: missing hint`);
      assert(typeof T.build === 'function' && typeof T.update === 'function', `${where}: needs build() and update()`);
    }
    const xs = lv.checkpoints.map((c) => c.x);
    assert(xs.every((x, i) => !i || x > xs[i - 1]), `${lv.id}: checkpoints are not in left-to-right order`);
    lv.checkpoints.slice(1).forEach((c, i) => assert(c.line, `${lv.id}: checkpoint ${i + 1} has no line`));
    const missing = traps.filter((T) => !ROUTES[lv.id]?.[T.id]).map((T) => T.id);
    assert(!missing.length, `${lv.id}: no bot route for ${missing.join(', ')} (add one in tests/routes.mjs)`);
    return `${traps.length} traps, ${lv.checkpoints.length - 1} checkpoints`;
  });
}

// ---------------------------------------------------------------------------------------------
console.log('\nCheckpoints');
for (const lv of LEVELS) {
  if (!want(lv)) continue;
  const li = idxOf(lv.id);
  lv.checkpoints.forEach((cp, i) => check(`${lv.id} checkpoint ${i} (x ${cp.x}) is on solid ground, at both first and final versions`, () => {
    for (const st of [0, 'final']) {
      fresh(li, st); game.dev.spawn = { x: cp.x, y: cp.y }; game.setAll(st);
      game.step(30);
      assert(!game.dead && game.deaths === 0, `died standing at the checkpoint (versions: ${st})`);
      assert(game.pl.ground && Math.abs(game.pl.y - cp.y) < 0.01, `not standing at y ${cp.y} (y is ${game.pl.y.toFixed(2)}, versions: ${st})`);
    }
  }));
}

// ---------------------------------------------------------------------------------------------
console.log('\nVersions');
for (const lv of LEVELS) {
  const li = idxOf(lv.id);
  for (const T0 of lv.traps()) {
    if (!want(lv, T0.id)) continue;
    check(`${lv.id} ${T0.name}: v1.0 → v${T0.max + 1}.0 then stays final`, () => {
      fresh(li, 0); game.goto(T0.id, 0);
      const T = game.TRAPS.find((t) => t.id === T0.id);
      for (let k = 1; k <= T.max + 2; k++) {
        game.pl.x = Math.max(T.zone[0], game.L.checkpoints[0].x) + 0.1 - 0.4;  // stand inside the zone…
        h.down('KeyR'); h.up('KeyR');                                         // …and retry (counts as the trap's kill)
        assert(game.dead, 'pressing R in the zone did not register a death');
        assert(T.stage === Math.min(k, T.max), `expected v${Math.min(k, T.max) + 1}.0 after ${k} deaths, got v${T.stage + 1}.0`);
        game.step(120);
        assert(!game.dead, 'did not respawn');
      }
    });
  }
}

// ---------------------------------------------------------------------------------------------
console.log('\nBeatable (final versions)');
const report = [];
for (const lv of LEVELS) {
  const li = idxOf(lv.id), route = ROUTES[lv.id] || {};
  for (const T0 of lv.traps()) {
    if (!want(lv, T0.id) || !route[T0.id]) continue;
    check(`${lv.id} ${T0.name} v${T0.max + 1}.0`, () => {
      fresh(li); game.goto(T0.id);
      const b = makeBot(h), T = b.trap(T0.id);
      const ticks = run(h, route[T0.id](b));
      assert(game.won || game.pl.x > T.zone[1] - 0.5, `route ended at x ${game.pl.x.toFixed(2)}, before the end of the trap (${T.zone[1]})`);
      if (b.stats.guideMargin != null) report.push(['1-3 chase: closest the Guide gets (perfect play)', `${b.stats.guideMargin.toFixed(2)} tiles ≈ ${(b.stats.guideMargin / 5.8).toFixed(2)} s of slack`]);
      return `${(ticks / 120).toFixed(1)} s`;
    });
  }
  if (!want(lv)) continue;
  check(`${lv.id} whole level, start to door, every trap final`, () => {
    fresh(li);
    const b = makeBot(h);
    let ticks = 0;
    for (const id of Object.keys(route)) {
      try { ticks += run(h, route[id](b)); }
      catch (e) { throw new Fail(`in segment "${id}": ${e.message}`); }
      if (game.won) break;
    }
    assert(game.won, `finished the route without winning (x ${game.pl.x.toFixed(2)})`);
    return `${(ticks / 120).toFixed(1)} s, 0 deaths`;
  });
}

// ---------------------------------------------------------------------------------------------
console.log('\nDifficulty');
// How long is the window to start running through a crusher tunnel? Sweeps a start delay (counted from
// a cue: `approach` gets Pip into position and waits for it) over a whole cycle and counts the delays that work.
function tunnelWindow(levelId, trapId, period, approach, through) {
  const li = idxOf(levelId); let good = 0; const step = 0.025;
  for (let d = 0; d < period; d += step) {
    fresh(li); game.goto(trapId);
    const b = makeBot(h), T = b.trap(trapId);
    try { run(h, (function* () { yield* approach(b, T); yield* b.hold(0, d); yield* through(b, T); })()); good++; } catch {}
  }
  return good * step;
}
const TUNNELS = [
  // [level, trap, name, cycle (s), get into position and wait for the cue, run through]
  ['1-1', 'tunnel', '1-1 Tunnel v3', 2.6, function* (b, T) {
    yield* b.go(1, () => b.pl.x > 144.3); yield* b.wait(() => T.segs[0].y < 1); yield* b.wait(() => T.segs[0].y >= 2);
  }, function* (b) { yield* b.go(1, () => b.pl.x > 151.1); yield* b.jump(1, 0.05); yield* b.go(1, () => b.pl.x > 161); }],
  ['1-3', 'lamp', '1-3 Tunnel v3, first half', 2.2, function* (b, T) {
    yield* b.go(1, () => b.pl.x > 55.2); yield* b.wait(() => T.segs[0].y < 0.01); yield* b.wait(() => T.segs[0].y > 0.05);
  }, function* (b) { yield* b.go(1, () => b.pl.x > 63.6); }],
  ['1-3', 'lamp', '1-3 Tunnel v3, second half', 1.2, function* (b, T) {
    const s0 = T.segs[0], s3 = T.segs[3];
    yield* b.go(1, () => b.pl.x > 55.2); yield* b.wait(() => s0.y < 0.01); yield* b.wait(() => s0.y > 0.05);
    yield* b.go(1, () => b.pl.x > 63.6); yield* b.wait(() => Math.abs(b.pl.vx) < 0.1);
    yield* b.wait(() => s3.y > 1.9); yield* b.wait(() => s3.y < 0.5);
  }, function* (b) { yield* b.go(1, () => b.pl.x > 72.6); }],
];
for (const [lvId, id, name, period, approach, through] of TUNNELS) {
  if (!want({ id: lvId }, id)) continue;
  check(`${name}: window to start running`, () => {
    const w = tunnelWindow(lvId, id, period, approach, through);
    assert(w > 0.15, `only ${w.toFixed(2)} s per ${period} s cycle`);
    report.push([`${name}: safe window to start running`, `${w.toFixed(2)} s out of every ${period} s`]);
    return `${w.toFixed(2)} s of every ${period} s`;
  });
}
if (want({ id: '1-3' }, 'guide')) check('1-3 chase: the Guide never gets within 1.5 tiles of a perfect player', () => {
  const r = report.find(([k]) => k.startsWith('1-3 chase'));
  if (!r) { fresh(idxOf('1-3')); game.goto('guide'); const b = makeBot(h); run(h, ROUTES['1-3'].guide(b)); report.push(['1-3 chase: closest the Guide gets (perfect play)', `${b.stats.guideMargin.toFixed(2)} tiles ≈ ${(b.stats.guideMargin / 5.8).toFixed(2)} s of slack`]); }
  const m = parseFloat(report.find(([k]) => k.startsWith('1-3 chase'))[1]);
  assert(m >= 1.5, `closest approach ${m} tiles`);
  return `${m} tiles`;
});

// ---------------------------------------------------------------------------------------------
console.log('\nFuzz');
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
for (const lv of LEVELS) {
  if (!want(lv)) continue;
  const li = idxOf(lv.id);
  for (const mix of ['all v1', 'all final', 'random versions', 'random versions', 'random versions']) {
    check(`${lv.id} ${mix}: 20 s of button mashing from random spots`, () => {
      fresh(li, mix === 'all final' ? 'final' : 0);
      if (mix.startsWith('random')) { for (const T of game.TRAPS) T.stage = Math.floor(rnd() * (T.max + 1)); game.setAll(0); for (const T of game.TRAPS) T.stage = Math.floor(rnd() * (T.max + 1)); }
      const keys = ['ArrowLeft', 'ArrowRight', 'Space', 'ArrowDown', 'KeyR'];
      let deaths0 = game.deaths;
      for (let t = 0; t < 20 * 120; t++) {
        if (t % 600 === 0) { const T = game.TRAPS[Math.floor(rnd() * game.TRAPS.length)]; game.goto(T.id); }
        if (t % 12 === 0) for (const k of keys) (rnd() < (k === 'KeyR' ? 0.01 : k === 'ArrowRight' ? 0.6 : 0.3) ? h.down : h.up)(k);
        game.step();
        if (game.won) game.goto(game.TRAPS[0].id);
        assert(Number.isFinite(game.pl.x) && Number.isFinite(game.pl.y), `Pip's position became ${game.pl.x}, ${game.pl.y}`);
      }
      h.releaseAll();
      return `${game.deaths - deaths0} deaths`;
    });
  }
}

// ---------------------------------------------------------------------------------------------
if (report.length) {
  console.log('\nNumbers to watch');
  for (const [k, v] of report) console.log(`  ${k}: ${v}`);
}
console.log(`\n${failed ? red(`${failed} failed`) : green('all passed')}, ${passed} passed\n`);
process.exit(failed ? 1 : 0);
