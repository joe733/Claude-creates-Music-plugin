# The engine, for code

Everything is plain JavaScript with no imports. Each file defines one object, and works in Node and in a browser alike. In Node, load a file with `eval(fs.readFileSync(path,'utf8')+';globalThis.X=X')`, as the scripts do.

## STAVE.read(text)

It returns:

- `notes`: what the composer plays, sorted by time;
- `voices`: per voice `{name, ins, ev, dynPts, pedal, bars, end}`, which the engraver draws;
- `warnings`, `title`, `tempo`, `time` ([n, d]), `key` (letter → ±1), `mix` (instrument → dB);
- `dur`: seconds to the end of the last note;
- `sec(beat)`: seconds at a beat, including tempo changes, rit, accel and fermatas;
- `barBeats`: crotchets in a bar.

It also exports `keySig`, `midiHz`, `INSTR` (names → instruments) and `RANGE` (MIDI ranges).

## COMPOSER

A note is:

```
{ins, t, dur, f (Hz) | track [[s, Hz], …], vel 0–1, amp, gain [[s, ×], …], pan −1…1, rv (send to the room),
 attack 'hard'|'soft'|'legato', tech {pizz, harm, mute, pont, tasto, vib, novib, flz, rim, choke, ring, stop}, seed}
```

- `COMPOSER.renderAll(notes, {sr, gain, tail, wet})` returns `{L, R, sr, dur, gain, gr}`. Here `gain` is the master gain it used and `gr` is the deepest limiter gain (1 means none).
- `COMPOSER.make(notes, opt)` returns `{render(L, R, n), dur, sr, gain, gr}`. Call `render` again and again, for the next `n` samples each time, to stream. Give it whole multiples of 128 samples, and the stream is sample for sample what `renderAll` makes.
- The master gain comes from how busy the score is: the 95th percentile of its summed squared amplitudes, half a second at a time. To hear a part of a piece at the same level as the whole, compute `make(allNotes).gain` once and pass it as `opt.gain` for the part. `listen.js` and the page both do this.
- The room is a feedback-delay network: 8 lines with Householder mixing and 4 input allpasses. A 22 Hz high-pass follows, then a 5 ms look-ahead limiter with its ceiling at 0.89, which is −1 dBFS.
- `COMPOSER.LEVEL` holds each instrument's level at mf. `COMPOSER.lcg(seed)` is the random-number generator. Every note's randomness comes from its seed, so a score always renders the same.

## ENGRAVE (canvas, in a browser)

- `ENGRAVE.draw(ctx, voice, o)` draws one staff. `ENGRAVE.grand(ctx, voice, o)` draws treble and bass together (used for harp, piano and organ when they need both).
- Options: `{x0, y0, sp (line spacing), ppb (pixels per beat), ink, faint, key, time, clef, barBeats, from, to, dpr, showDefault, gap, lead}`. Multiply every length by the device pixel ratio and pass it as `dpr`.
- Spacing follows time, plus a small gap at each bar line, so the staff lines up with the sound. Both functions return `{width, height, X(beat)}`.
- `ENGRAVE.lead(voice, o)` is where the music starts after the clef, key and time. It leaves room for an opening accidental, a grace note or an ornament.

The engraver draws:

- clefs, key and time signatures, notes and accidentals (only where needed against the key and the bar);
- ledger lines, stems, flags, dots, tuplets and rests;
- ties, slurs, articulations and ornaments (trill, mordents, turn, appoggiatura, spread chord, glissando, tremolo);
- dynamics and hairpins, pedal marks and playing techniques.

## In a page

The orchestra page shows the working pattern:

- Put the composer and reader sources in `<script>` tags. Make a Worker from a Blob of their text plus a few lines that answer `{type:'job'}` and `{type:'render', n}`.
- Ask for one second at a time, in whole engine blocks: `128·⌈sr/128⌉` samples.
- Queue the seconds as AudioBuffers and start playing once enough is ready. If the device composes slower than real time, hold back enough that playback never catches up.
- Route the output through a gain of (volume/100)², starting at 50%, then a DynamicsCompressor as a second guard.
- If a Worker can't be made, compose between frames with `setTimeout` instead.

## composertest.js: the expected results

Run `node composertest.js` (about 15 seconds). It should end with `40 right, 0 wrong`, and the measured lines should match these to within rounding:

```
violin    +0.1 +1.1 +1.7 -1.1        (MIDI 55 69 84 96)
cello     -0.4 -0.9 +0.2 -0.4        (36 50 64 77)
harp      +0.2 +0.2 +0.4 +4.8        (24 48 72 96)
guitar    +0.3 +0.4 +0.5 +0.7        (40 55 69 83)
bass      +0.0 +0.1 +0.2 +0.2        (28 40 55 64)
flute     +0.0 +0.1 +0.4 +2.1        (60 74 88 96)
clarinet  -0.1 +0.2 -0.0 +1.3        (50 62 76 91)
piano     +0.1 -0.5 +0.3 +2.3        (33 60 84 103)
organ     -0.4 -0.4 +0.4 +2.2        (36 60 84 96)
drum      1 1.594 2.136 2.296 2.653 2.918
snare     1 1.594 2.136 2.296
triangle  1 2.752 5.395 8.918 13.321
whole score: 10.50 s, peak -1.01 dBFS, rms -20.49 dBFS, master gain -8.13 dB, deepest limiting -0.78 dB
```

If a number differs by more than a rounding error, a file was copied wrong or changed.
