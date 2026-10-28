# Orchestra of Numbers

Compose, hear and grow music with Claude. Twelve instruments are worked out from the physics of how each makes its sound: violin, cello, harp, guitar, bass guitar, flute, clarinet, piano, organ, drum, snare and triangle. Music is written in Stave, a plain-text notation with a sound for every mark. An ear made of arithmetic listens to what was written. An orchestra page lets anyone play, edit and hear it in a browser, offline.

Nothing is recorded or sampled, and nothing is fetched. Everything is plain JavaScript with no imports, so it runs anywhere Node runs, and the page runs in any modern browser with no connection.

## What it does

| Skill | Ask for it like this | What happens |
|---|---|---|
| **compose** | "Compose a short piece for flute and harp", "make the next version", "evolve this" | Claude writes the score in Stave and renders it to audio. Every version is kept, each with notes on what changed and why. |
| **listen** | "Listen to it", "is the clarinet buried?", "where is it roughest?" | The ear reports loudness (sones) and roughness (aspers) bar by bar, and, with faders, how much of what is heard each instrument carries. |
| **orchestra** | "Open the orchestra", "let me play with it" | Builds one HTML page with all of this, seen from above. |

The orchestra page shows:

- the stage, where each chair lights while its instrument plays;
- level faders that write the score's mix;
- a roll of every note under the ear's reading;
- the score, editable, beside its engraving;
- every version of the piece;
- every notation mark, engraved and playable.

## How a piece grows

1. Ask Claude for a piece. It writes version 1, listens to it, and gives you the page and an MP3.
2. Play with it on the page: move the faders, leave instruments out, edit notes.
3. Copy the score from the page and tell Claude what you'd like different.
4. Claude writes the next version from what you asked and what the ear found, listens again, and rebuilds the page with every version kept.

`skills/compose/examples/a-small-morning` is a piece that grew this way. In the first sketch the ear found the cello carrying more of what was heard than the flute's tune: 41 to 62% against 12 to 30% in the opening bars. The second version turned that round. The ear's numbers are in its notes.

## Requirements

- Node 18 or later, for rendering, listening and building the page.
- Optionally, ffmpeg, to make MP3s from the WAV files.
- A modern browser for the page. It plays offline. In a browser that can't run a background worker, it composes on the page itself.

## Hearing safety

The composer's limiter holds every sample at or under −1 dBFS. The page starts at half volume, with a gain of (volume/100)², and puts a second limiter after it. The stage light rises and falls smoothly and never flashes.

## Honesty

The instruments are models and the ear is a model, and the skills tell Claude to say so. Pitch was measured across every range: the instruments sit within a few cents of true, and `composertest.js` checks it. The drum and triangle ring at their mathematical mode ratios. Claude writes original music with this plugin and won't transcribe copyrighted melodies.

## Credits

An idea of Joe's, made by Claude (not Anthropic, just Claude).

The models come from published work:

- the plucked string: Karplus and Strong, with Jaffe and Smith's tuning;
- the bowed string: McIntyre, Schumacher and Woodhouse, in Smith and Cook's form;
- the clarinet: Smith and Cook's model;
- the piano: the stiff string's partials;
- the skins: the zeros of Bessel's functions;
- the triangle: Euler and Bernoulli's free bar;
- pitch measurement: YIN, by de Cheveigné and Kawahara.

MIT licensed.
