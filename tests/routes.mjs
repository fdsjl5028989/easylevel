// Solutions for the FINAL version of every trap, one segment per trap, in level order.
// Each segment starts anywhere before its trap (the dev "jump to trap" spot, or wherever the
// previous segment ended) and must end past the trap's zone, or win the level.
// Segments may read game state the player can see on screen (positions, the controls badge…).

export const ROUTES = {
  '1-1': {
    // Floor drops once you pass x 5; the platform is real but falls 0.35 s after you land.
    *gap(b) {
      yield* b.go(1, () => b.pl.x > 10.8);
      yield* b.jump(1, 0.4);
      yield* b.jump(1, 0.4);
    },
    // Let the spike come to you and hop it, then wait for the chase and hop it again from far enough
    // away that it doesn't copy the jump. It sulks off once it's 3 tiles past you.
    *spike(b) {
      const T = b.trap('spike'), sc = () => T.sp.x + 0.5;
      yield* b.go(1, () => b.pl.x > 23.5);
      yield* b.wait(() => sc() - b.cx < 2.4);
      yield* b.jump(1, 0.4);
      yield* b.wait(() => T.phase === 'chase' && b.cx - sc() < 3.4);
      yield* b.jump(0, 0.4);
      yield* b.wait(() => T.phase === 'leave');
      yield* b.go(1, () => b.pl.x > 41);
    },
    // Asleep: walk up close (under 2.2 tiles, or he wakes) and land on him with a medium jump.
    *blob(b) {
      const e = b.trap('blob').e, ec = () => e.x + e.w / 2;
      yield* b.go(1, () => ec() - b.cx < 1.75);
      yield* b.jump(1, 0.03);
      if (!e.dead) throw new Error('blob not stomped');
      yield* b.go(1, () => b.pl.x > 63.1);
    },
    // Hop onto the steps, tiny hop under the (now visible) block onto the cracked tiles, then jump on.
    *stairs(b) {
      yield* b.go(1, () => b.pl.x > 63.5);
      yield* b.jump(1, 0.1);           // onto the brick at 66
      yield* b.jump(1, 0.25);          // onto the step at 69.5
      yield* b.jump(1, 0.05);          // small hop under the block, onto the cracked tiles
      yield* b.go(1, () => b.pl.x > 73.4);
      yield* b.jump(1, 0.1);           // over the fake tile onto solid ground
      yield* b.go(1, () => b.pl.x > 77);
    },
    // Not a trap: two ordinary blobs patrol the big step. Stomp them on the way past.
    *_blobs(b) {
      const ahead = () => b.game.enemies.find((e) => !e.dead && !e.trap && e.x + e.w / 2 > b.cx);
      while (b.pl.x < 97) {
        const e = ahead();
        if (e && e.x + e.w / 2 - b.cx < 1.75 + (e.vx < 0 ? 0.35 : 0)) yield* b.jump(1, 0.03);
        else yield { dir: 1 };
      }
    },
    // Hop onto the spring (it's a 1-tile target), then hold jump as you land on it and hold right
    // the whole way over the wall.
    *spring(b) {
      yield* b.go(1, () => b.pl.x > 98.8);
      yield* b.jump(1, 0.35);          // over the pit at 100-102
      yield* b.go(1, () => b.pl.x > 104.2);
      yield* b.jump(1, 0.07, 0, true); // little hop, then hold jump again as it starts to fall
      yield* b.go(1, () => b.pl.ground && b.pl.x > 117.2, 3, 'over the wall');
    },
    // Controls flip every 1.6 s. The bot waits on each platform until it has *seen* a flip (a quarter
    // second of reaction time), then walks to the edge and jumps before the next one.
    *reverse(b) {
      const T = b.trap('reverse'), key = (d) => (b.game.invert ? -d : d);
      for (const [edge, target] of [[122, 125.25], [126, 129.25], [130, 133.25], [134, 138.5]]) {
        if (b.pl.x > 121) yield* b.wait(() => T.t % 1.6 > 0.25 && T.t % 1.6 < 0.3, 4, 'a fresh flip');
        yield* b.go(() => key(1), () => b.pl.x + 0.8 > edge - 0.05, 2, `edge ${edge}`);
        yield* b.jumpTo(target, 0.3, key);
      }
      yield* b.go(() => key(1), () => b.pl.x > 138);
    },
    // Wait for the first crusher to come down and go back up, then run straight through.
    *tunnel(b) {
      const s0 = b.trap('tunnel').segs[0];
      yield* b.go(1, () => b.pl.x > 144.3);
      yield* b.wait(() => s0.y < 1);
      yield* b.wait(() => s0.y >= 2);
      yield* b.go(1, () => b.pl.x > 161);
    },
    // The obvious door is real now.
    *door(b) { yield* b.go(1, () => b.game.won); },
  },

  '1-2': {
    // Part one: a spike from behind (left). Part two, after the loading bar "finishes": one from the right.
    *loading(b) {
      const [k1, k2] = b.trap('loading').sps;
      yield* b.wait(() => b.cx - (k1.sp.x + 0.5) < 1.3, 6, 'spike from behind');
      yield* b.jump(0, 0.4);
      yield* b.wait(() => k2.live && k2.sp.x + 0.5 - b.cx < 1.3, 8, 'spike from the right');
      yield* b.jump(0, 0.4);
      yield* b.go(1, () => b.pl.x > 14.6);
    },
    // The lift stops 3.5 tiles short of the far ledge now (and sinks while you ride it). Ride it at its
    // right end and jump as it reaches the end of its run.
    *gap2(b) {
      const T = b.trap('gap2'), p = T.p;
      yield* b.go(1, () => b.pl.x > 14.9);
      yield* b.wait(() => T.dir < 0 && p.x < 18.4, 6, 'lift coming back');
      yield* b.jumpTo(() => p.x + 1.5, 0.2);
      yield* b.wait(() => T.dir > 0 && p.x > 22.2, 6, 'lift at the far end');
      yield* b.jumpTo(29.5, 0.45);
      yield* b.go(1, () => b.pl.x > 28.5);
    },
    // Go through the NOT THE EXIT door: it's a portal past the wall.
    *fakewin(b) {
      yield* b.go(1, () => b.pl.x > 46, 6, 'through the door');
      yield* b.go(1, () => b.pl.x > 49.6);
    },
    // Left and right are swapped (the banner says so). Jump is normal.
    *remap(b) {
      const key = (d) => (b.game.remap.swap ? -d : d);
      yield* b.go(() => key(1), () => b.pl.x > 57.1, 4, 'to the edge');
      yield* b.jumpTo(62.5, 0.35, key);
      yield* b.go(() => key(1), () => b.pl.x > 62.2);
    },
    // Upside-down camera. Physics doesn't care: hop onto the brick, onto the ledge, then over two spikes.
    *camera(b) {
      yield* b.go(1, () => b.pl.x > 79.1);
      yield* b.jumpTo(83.5, 0.25);
      yield* b.jumpTo(87.5, 0.3);
      yield* b.go(1, () => b.pl.x > 86.9);
      yield* b.jumpTo(90.5, 0.3);
      yield* b.jumpTo(93.3, 0.3);
    },
    // A see-through fake pause. The steps hold until you've been on the bridge for 1 s, then they all
    // crumble, so just keep hopping.
    *pause(b) {
      yield* b.go(1, () => b.pl.x > 93.1);
      yield* b.jumpTo(96.25, 0.25);
      yield* b.jumpTo(99.75, 0.25);
      yield* b.jumpTo(103.25, 0.25);
      yield* b.jumpTo(107, 0.25);
      yield* b.go(1, () => b.pl.x > 106.2);
    },
    // A real spike under a low row of ceiling spikes: a small hop at full speed (hold jump ~0.05 s).
    *prop(b) {
      yield* b.go(1, () => b.pl.x > 112.8);          // takeoff window about 112.5-113.2
      yield* b.jump(1, 0.05);
      yield* b.go(1, () => b.pl.x > 118.3);
    },
    // Jump over EXIT (a loop). NOT THE EXIT then hops back over you: jump back over EXIT and walk into it.
    *exit(b) {
      const T = b.trap('exit');
      yield* b.go(1, () => b.pl.x > 119.9);             // takeoff window is about 119.9-120.7
      yield* b.jumpTo(125.8, 0.45);
      yield* b.go(1, () => b.pl.x > 124.3, 2, 'past EXIT');
      yield* b.wait(() => T.hop >= 1, 3, 'NOT THE EXIT to land');
      yield* b.go(-1, () => b.pl.x < 125.2, 2, 'back to EXIT');    // …and 125.4-124.7 going back
      yield* b.jumpTo(121.2, 0.45);
      yield* b.go(-1, () => b.game.won, 3, 'into NOT THE EXIT');
    },
  },

  '1-3': {
    // The platforms drift, and vanish while the lights flash (every 2.6 s; the lantern blinks first).
    // Rule: never be standing on a platform when the flash hits. Jump to the next one when it swings
    // close, or when the blink starts, so you're in the air through the flash.
    *flash(b) {
      const T = b.trap('flash'), R = T.R;
      const blink = () => T.ft >= 2.6 - 0.34;              // late enough in the blink to still be airborne through the flash
      const close = (i) => (i === 0 ? R[0].x < 15.7 : i === 3 ? R[2].x > 25.2 : R[i].x - (R[i - 1].x + R[i - 1].w) < 1.6);
      const target = [() => R[0].x + 0.75, () => R[1].x + 0.75, () => R[2].x + 0.75, () => 29.6];
      yield* b.go(1, () => b.pl.x > 13.1);
      yield* b.wait(() => T.ft >= 0, 3, 'first flash');
      for (let i = 0; i < 4; i++) {
        // From the ledge, only set off early enough in the cycle to land before the next flash.
        yield* b.wait(() => (i === 0 ? close(0) && T.ft > 0.3 && T.ft < 1.9 : close(i) || blink()), 6, `jump ${i + 1}`);
        yield* b.jumpTo(target[i], blink() ? 0.4 : 0.25);
      }
      yield* b.go(1, () => b.pl.x > 29);
    },
    // Two bats swinging in opposite directions over a hedgehog. The middle is clear when they're both
    // out at the ends: hop then.
    *eyes(b) {
      const bat = b.game.enemies.find((e) => e.bat);
      const goingLeft = () => Math.cos(b.game.time * bat.sway) * bat.amp < 0;
      yield* b.go(1, () => b.pl.x > 36.2);
      yield* b.wait(() => goingLeft() && bat.x < 35.5, 6, 'bats swinging out');
      yield* b.jumpTo(40.5, 0.1);         // a low hop: a full jump reaches the bats
      yield* b.go(1, () => b.pl.x > 47.1);
      yield* b.jumpTo(52.5, 0.35);        // over the pit after the zone
    },
    // Split tunnel. First half: a backwards wave; run the instant its first crusher starts to lift and
    // stop in the room in the middle. Second half: a fast forward wave; run the instant its first crusher slams.
    *lamp(b) {
      const T = b.trap('lamp'), s0 = T.segs[0], s3 = T.segs[3];
      yield* b.go(1, () => b.pl.x > 55.2);
      yield* b.wait(() => s0.y < 0.01, 6, 'first crusher down');
      yield* b.wait(() => s0.y > 0.05, 6, 'first crusher lifting');
      yield* b.go(1, () => b.pl.x > 63.6);
      yield* b.wait(() => Math.abs(b.pl.vx) < 0.1, 1, 'stopping in the middle room');
      yield* b.wait(() => s3.y > 1.9, 6, 'second half: first crusher up');
      yield* b.wait(() => s3.y < 0.5, 6, 'second half: first crusher slamming');
      yield* b.go(1, () => b.pl.x > 72.6);
    },
    // Bobbing, crumbling steps: land and jump straight away, steering for the next glow.
    *shrooms(b) {
      const R = b.trap('shrooms').R;
      yield* b.go(1, () => b.pl.x > 73.1);
      for (const r of R) yield* b.jumpTo(() => r.x + 0.6, 0.3);
      yield* b.jumpTo(97.5, 0.3);
      yield* b.go(1, () => b.pl.x > 96.2);
    },
    // Two 6-tile halves of light that take turns (0.8 s on, 1.2 s apart), with a pillar between. Jump
    // from the ledge ~0.4 s before the first half lights so you land as it comes on, run onto the pillar,
    // then do the same for the second half.
    *bridge(b) {
      const T = b.trap('bridge'), cyc = 2.0, pa = () => T.t % cyc, pb = () => (T.t + cyc / 2) % cyc;
      const soon = (p) => p >= cyc - 0.4 && p < cyc - 0.37;
      yield* b.go(1, () => b.pl.x > 110.8);
      yield* b.wait(() => T.t >= 0 && soon(pa()), 6, 'first half about to light');
      yield* b.jumpTo(118.5, 0.45);
      yield* b.wait(() => soon(pb()), 4, 'second half about to light');
      yield* b.jumpTo(126, 0.45);
      yield* b.go(1, () => b.pl.x > 125.2);
    },
    // Statues only move while they're behind the way you face, after a short delay (0.2 s in v3).
    // Tapping back for a single tick, even mid-jump, freezes them and restarts that delay.
    *statues(b) {
      const T = b.trap('statues'), pc = () => b.pl.x + 0.4;
      for (let n = 0; b.pl.x < 147.5; n++) {
        if (n > 20 * 120) throw new Error('statues: timed out');
        const live = T.S.filter((sp) => !sp.harmless);
        const ahead = Math.min(Infinity, ...live.map((sp) => sp.x + 0.5 - pc()).filter((d) => d > 0));
        const stirring = live.some((sp) => sp.x + 0.5 < pc() && pc() - (sp.x + 0.5) < 5 && sp.unseen > 0.1);
        if (stirring) yield { dir: -1 };                              // a one-tick glance back
        else if (ahead < 1.5 && b.pl.ground) yield { dir: 1, jump: true };
        else yield { dir: 1, jump: !b.pl.ground && b.pl.vy > 0 && b.game.keys.Space };
      }
    },
    // The floor only exists inside the beam. Wait at the edge for it, then keep Pip in the middle of it.
    *beam(b) {
      const T = b.trap('beam');
      yield* b.go(1, () => b.pl.x > 148.9);
      yield* b.wait(() => T.go && T.wait <= 0 && T.bx > 149.3 && T.bx < 150, 10, 'beam arriving');
      yield* b.go(() => { const d = T.bx + 0.3 - b.cx; return Math.abs(d) < 0.15 ? 0 : Math.sign(d); }, () => b.pl.x > 163.4, 8, 'riding the beam');
      yield* b.go(1, () => b.pl.x > 166.2);
    },
    // The chase. Hop the steps; wait on the step before each deleted block until it comes back. At the
    // end, don't stop when the Guide says it's stuck, and jump the painted door.
    // b.stats.guideMargin records how close the Guide got (tiles between Pip and the "caught" line).
    *guide(b) {
      const T = b.trap('guide');
      b.stats.guideMargin = Infinity;
      const watch = function* (g) { for (const inp of g) { if (T.state === 'chase' || T.state === 'charge') b.stats.guideMargin = Math.min(b.stats.guideMargin, b.pl.x - (T.gx + 1.3)); yield inp; } };
      yield* watch((function* () {
        yield* b.go(1, () => b.pl.x > 177.1);
        for (const x of [182, 186, 190.5, 195]) yield* b.jumpTo(x, 0.3);
        yield* b.wait(() => T.p5.solid, 3, 'deleted block 1 to come back');
        yield* b.jumpTo(199.5, 0.3);
        yield* b.jumpTo(204, 0.3);
        yield* b.wait(() => T.p7.solid, 3, 'deleted block 2 to come back');
        for (const x of [208.5, 213, 218]) yield* b.jumpTo(x, 0.3);
        yield* b.go(1, () => b.pl.x > 232.6, 4, 'to the painted door');   // takeoff window about 232.3-233.1
        yield* b.jump(1, 0.45);
        yield* b.go(1, () => b.game.won, 3, 'into the real exit');
      })());
    },
  },
};
