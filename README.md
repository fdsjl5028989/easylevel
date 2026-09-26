# Easy Level

A deceptively simple three.js troll platformer with a narrator who lies to you. Every trap
**patches itself** each time it kills you (v1.0 → v2.0 → v3.0, complete with patch notes), so the
level fights back until your knowledge finally sticks.

**Play:** https://claude.ai/artifact/XdVqQWiDV8QPSZrqUEL9s7, or just open `easy-level.html` in a browser.

## World 1
- **1-1 Easy Level**: gaps, spikes, blobs, a door that runs away.
- **1-2 Loading…**: the game's own loading screens, settings and pause menu turn against you.
- **1-3 Lights Out**: a night level lit only by your lantern, ending in a chase.

## Controls
←/→ or A/D to move, Space / ↑ / W to jump (hold for higher), R to retry, P to pause, M to mute, N to toggle music.
Touch controls on mobile.

## Tech
A single HTML file with no build step. It loads three.js from a CDN, and all music and sound
effects are made in code with WebAudio.
Design and dev notes are in [CONTINUE.md](CONTINUE.md).

## Dev tools
- Double-click `dev.html` (or open `easy-level.html?dev`) for the dev panel: jump to any trap at any version, god mode, hitboxes, frame-step, slow-mo.
- `npm install`, then `npm test`: a headless bot checks that every trap's final version (and every level) can be beaten, plus data checks and a crash fuzzer.
