---
name: compose
description: >
  This skill should be used when the user asks to "compose", "write a piece", "write music for orchestra", "make a melody",
  "score this for strings", "evolve this piece", "make the next version", "write it in Stave", or wants music generated
  mathematically for violin, cello, harp, guitar, bass guitar, flute, clarinet, piano, organ, drum, snare or triangle.
  It writes the music in Stave notation, renders it with physically modelled instruments, and keeps every version so
  a piece can grow with the person.
metadata:
  version: "0.1.0"
---

# Compose with the Orchestra of Numbers

Write music as text in Stave, and hear it played by twelve instruments worked out from the physics of how each makes its sound. Then let the piece grow, one kept version at a time. Every number comes from plain arithmetic in the scripts beside this file, with no imports, no network and no samples, so it works offline on any machine with Node.

## Be honest about what this is

- The instruments are models, not recordings. Call them "the violin model", or just "the violin" once that is understood. Never imply a real player or a sampled instrument.
- The ear in `listen.js` is a model of hearing. Its numbers are readings (sones for loudness, aspers for roughness) and should be reported as readings. Keep apart what it measured and what you infer from it.
- Write original music. Do not transcribe copyrighted songs or melodies, even in part. Offer something original in the same spirit instead. Music published before 1929 (Bach, Mozart, folk tunes of that age) is fine. There are no voices, so there are no lyrics to set.
- Missing: voices and choirs, brass, saxophone, synthesizers, and more than one tuning system (everything is equal temperament at A = 440 Hz).

## Where things are

The scripts are in this skill's `scripts/` folder (use the base directory shown when the skill loads). Call it `S` below:

- `composer.js`: the instruments and the room.
- `stave.js`: the notation reader.
- `engrave.js`: draws staves, for the page.
- `ear.js`: the ear.
- `render.js`: a score to a WAV file.
- `listen.js`: what the ear hears.
- `composertest.js`: the checks.

The orchestra page builder is in the sibling skill, at `../orchestra/scripts/orchestra.js`. An example piece with two versions is in `examples/a-small-morning/`. `examples/tour.stave` plays every instrument in turn, and `examples/every-mark.stave` uses every mark.

Read `references/stave.md` before writing a score; it is the whole notation. Read `references/instruments.md` for ranges and how to write for each instrument, and `references/engine.md` for the code's interfaces and the test's expected numbers.

## Steps

1. **Check the engine once a session.** Run `node "$S/composertest.js"`, which takes about 15 seconds. It must end `40 right, 0 wrong`, and its measured lines must match `references/engine.md`. If they don't, stop and say so: a file has been damaged.
2. **Agree the piece in a sentence or two:** its mood, length, instruments, key and tempo. If the person gave enough, start. Otherwise make a reasonable choice and say which.
3. **Make a piece folder** in the working directory (or wherever the person keeps their work): `pieces/<slug>/`. It holds:
   - `piece.json`, for example `{"title": "…", "by": "Written by <them> and Claude"}`. Ask how they want to be credited, or write "Written with Claude".
   - `v1.stave`, the score.
   - `v1.md`, starting `# <a name for this version>`, then a short paragraph on what it is.
4. **Write `v1.stave`.** Put the header first (title, tempo, time, key), then one line per voice, with every bar adding up. Keep each instrument in its range. Give the tune the strongest dynamic in the texture. Start shorter (8 to 16 bars) and let the piece grow.
5. **Render:** `node "$S/render.js" pieces/<slug>/v1.stave pieces/<slug>/v1.wav`. It prints the reader's warnings. Fix every one and render again. It also prints the master gain and the deepest limiting: anything beyond −3 dB of limiting means a peak is being squashed, so lower that instrument or its dynamic. If `ffmpeg` exists, make an MP3 to share: `ffmpeg -y -loglevel error -i v1.wav -codec:a libmp3lame -q:a 2 v1.mp3`.
6. **Listen** with the listen skill's steps: `node "$S/listen.js" pieces/<slug>/v1.stave --json pieces/<slug>/v1.ear.json`. Add `--faders` when balance matters; it takes about four minutes for a minute of music with twelve players, so run it in the background. Read what it says before describing the piece.
7. **Build the orchestra page** with the orchestra skill's steps: `node <orchestra skill>/scripts/orchestra.js pieces/<slug> pieces/<slug>/<slug>.html`.
8. **Deliver.** Send the page and the MP3 as files. Say in a few sentences:
   - what was written;
   - what the ear found, as readings;
   - one thing worth trying next.

   Don't paste the score into the reply; it is in the page and the folder.

## Growing a piece (evolve)

A piece grows by kept versions. Never edit a version that has been heard; write the next one.

1. Start from the newest version, or from a score the person pasted back from the page (their edits). In that case, save their text as the next version first, and write in its notes what they changed, comparing it with the version before.
2. Decide the change from what the person asked and from what the ear found. "The flute carries only 12% of what is heard while it has the tune" is a reason. "It could be more interesting" is not, until it is made concrete.
3. Write `vN+1.stave` and `vN+1.md`. Start the notes with `# <name>`, then say what changed and why, in plain words with the ear's numbers where they decided it.
4. Render and listen again. Add one closing line to the notes saying what the ear now finds: did the change do what it was for? If it didn't, say so and try again rather than claiming it did.
5. Rebuild the page. Every version stays in it, and the person can hear each one.

Changes that usually help:

- **Balance.** Move dynamics first, then the `mix` line (`mix flute +3 cello -4`).
- **Clarity.** Move an accompaniment out of the tune's register, or thin it.
- **Shape.** Add hairpins toward the arrival, a fermata at the end, and contrast between sections.
- **Colour.** Double the tune at the third or sixth below (clarinet under flute, cello under violin), add a harp `{arp}` on arrivals, or one soft triangle stroke.
- **Roughness.** If it isn't wanted, open up close low intervals, or move them an octave up.

## Writing well

- Phrase in slurs. Breathe with rests. End phrases on long notes.
- Keep the bass moving less than the tune, and the inner voices quieter than both.
- Percussion marks arrivals; it rarely needs to play throughout.
- Keep the texture in proportion: the piece should sound like an ensemble listening to itself, not every player at full stretch.
- Dense passages (snare rolls, many voices of fast notes) render more slowly. A minute of full orchestra renders in 10 to 30 seconds in Node.

## Hearing safety

The composer's limiter holds every sample at or under −1 dBFS, and the page starts its volume at half, with a gain of (volume/100)² and a second guard. Keep both. Never raise the ceiling or bypass the limiter. If a person asks for something very loud, make it feel loud with orchestration and contrast, not level.
