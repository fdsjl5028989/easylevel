// A scripted player. Route segments are generator functions: every `yield` is one 120 Hz physics
// tick with the given input held. The bot only presses real keys (arrows and Space), so remaps,
// reversed controls and jump heights all go through the game's own input code.

export class Fail extends Error {}

export function makeBot(h) {
  const { game } = h;
  const b = {
    game,
    get pl() { return game.pl; },
    get cx() { return game.pl.x + 0.4; }, // Pip's centre
    trap: (id) => game.TRAPS.find((T) => T.id === id),
    stats: {},
    // Reaction time: after every go/wait condition comes true, keep doing the same thing for a random
    // 0..lag seconds. 0 is a perfect player; ~0.15 is a decent human.
    lag: 0,

    // Hold a direction (a number or a function returning one) until pred() is true.
    *go(dir, pred, max = 8, why = 'go') {
      const d = () => (typeof dir === 'function' ? dir() : dir);
      for (let n = 0; !pred(); n++) {
        if (n > max * 120) throw new Fail(`timed out (${why}) at x=${game.pl.x.toFixed(2)}`);
        yield { dir: d() };
      }
      for (let n = Math.round(Math.random() * b.lag * 120); n > 0; n--) yield { dir: d() };
    },
    *wait(pred, max = 8, why = 'wait') { yield* b.go(0, pred, max, why); },
    *hold(dir, secs) { for (let i = Math.round(secs * 120); i > 0; i--) yield { dir: typeof dir === 'function' ? dir() : dir }; },
    // Press jump, keep it held for `hold` seconds (longer = higher, up to the full jump), steer with
    // `dir` the whole time, and return once Pip lands again.
    // With `rehold`, jump is pressed again once Pip starts falling and kept down through the landing
    // (that's how you get the big bounce off a spring).
    *jump(dir = 1, hold = 0.35, max = 4, rehold = false) {
      const d = () => (typeof dir === 'function' ? dir() : dir);
      yield { dir: d(), jump: true };
      for (let n = 0; n < hold * 120 && !game.pl.ground; n++) yield { dir: d(), jump: true };
      yield { dir: d() };
      let again = false;
      for (let n = 0; !game.pl.ground; n++) {
        if (n > (max || 4) * 120) throw new Fail(`timed out (landing) at x=${game.pl.x.toFixed(2)}`);
        again ||= rehold && game.pl.vy < 0;
        yield { dir: d(), jump: again };
      }
    },
    // Jump and steer in the air to land with Pip's centre on `tx` (like a player aiming for a
    // platform; `tx` can be a function for moving targets), then stop. `key` maps the direction you mean to the arrow to press (for swapped or
    // reversed controls).
    *jumpTo(tx, hold = 0.35, key = (d) => d, max = 4) {
      const aim = () => { const dx = (typeof tx === 'function' ? tx() : tx) - b.cx; return key(Math.abs(dx) < 0.12 ? 0 : Math.sign(dx)); };
      yield { dir: key(1), jump: true };
      for (let n = 0; n < hold * 120 && !game.pl.ground; n++) yield { dir: aim(), jump: true };
      for (let n = 0; !game.pl.ground; n++) {
        if (n > max * 120) throw new Fail(`timed out (landing) at x=${game.pl.x.toFixed(2)}`);
        yield { dir: aim() };
      }
      yield* b.go(aim, () => Math.abs(game.pl.vx) < 0.5, 1, 'stopping');
    },
    // Walk right until Pip is standing at the right edge of the thing he's on (minus `margin`).
    *toEdge(margin = 0.05, dir = 1) {
      yield* b.go(dir, () => { const g = game.pl.ground; return g && game.pl.x + 0.8 >= g.x + g.w - margin; }, 5, 'toEdge');
    },
  };
  return b;
}

// Runs one generator to completion. Throws Fail on death or timeout.
export function run(h, gen) {
  const { game, down, up } = h;
  const deaths0 = game.deaths;
  let ticks = 0;
  for (const inp of gen) {
    const dir = inp?.dir || 0;
    dir > 0 ? down('ArrowRight') : up('ArrowRight');
    dir < 0 ? down('ArrowLeft') : up('ArrowLeft');
    inp?.jump ? down('Space') : up('Space');
    game.step(); ticks++;
    if (game.deaths > deaths0 || game.dead) {
      const T = game.trapAt(game.pl.x + 0.4);
      throw new Fail(`died at x=${game.pl.x.toFixed(2)} y=${game.pl.y.toFixed(2)}${T ? ` in ${T.name} v${T.stage + 1}` : ''} after ${(ticks / 120).toFixed(2)} s`);
    }
    if (game.won) break;
  }
  h.releaseAll();
  return ticks;
}
