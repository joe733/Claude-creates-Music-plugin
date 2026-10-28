# The twelve instruments

Each one is worked out from how the real instrument makes its sound. None of them is a recording, and none is a sample. Describe them as models: "a bowed-string model", never "a real violin".

| Instrument | Written range | How the sound is made | Measured |
|---|---|---|---|
| violin | G3 to E7 | Bowed string: two travelling waves meet at a bow that sticks and slips on a friction curve (McIntyre, Schumacher and Woodhouse; Smith and Cook's form). The body has air near 275 Hz, wood at 450 to 550 Hz and a bridge hill near 2.5 kHz. | Within 2 cents up to C7, 4 cents flat at E7 (vibrato off) |
| cello | C2 to A5 | The same bowed string in a body about an octave lower (air near 105 Hz, wood near 190 and 228 Hz). | Within 1.5 cents |
| harp | B0 to G♯7 | Plucked string: a wave running round a loop (Karplus and Strong), tuned to a fraction of a sample with an allpass (Jaffe and Smith). Plucked at its middle, with two planes of vibration 0.6 cents apart. | Within 0.5 cents up to C6, +5 at the top |
| guitar | E2 to D6 | The same loop plucked 13% from the bridge. Body resonances near 98 and 204 Hz; rings up to 7 s. | Within 1 cent |
| bass guitar | E1 to G4 | A heavy wound string plucked 18% along; rings up to 9 s. | Within 1 cent |
| flute | C4 to D7 | An open pipe's harmonics falling with height, breath noise, a chiff, a scoop up into pitch, and vibrato after 0.2 s. | Within 0.5 cents up to E6, +2 at the top |
| clarinet | D3 to A♯6 | A closed cylinder with a reed that opens and shuts with the pressure across it (after Smith and Cook). The odd harmonics come out by themselves. | Within 1.3 cents |
| piano | A0 to C8 | A stiff string's partials at n·f·√(1+Bn²), felt striking 1/8 along, two or three strings slightly apart (beats, two-stage decay), dampers, pedal. | Within 3 cents (lowest A off further) |
| organ | C1 to C7 | Ranks of pipes (stops principal, flute, full), each with chiff and wind. Keys have no touch, so dynamics move a swell box. | Within 2.2 cents |
| drum | any pitch, best G1 to A3 | A circular skin at the zeros of Bessel's functions: 1, 1.594, 2.136, 2.296, 2.653, 2.918. The pitch sags as the skin relaxes. | Modes at exactly those ratios |
| snare | x | The same skin with snare wires buzzing on the lower head; rim shots and flams. | Its lowest four modes at those ratios |
| triangle | x | A free-free steel bar at the Euler–Bernoulli ratios 2.756, 5.404, 8.933 and 13.344, each mode split ±0.15%. | Within 0.4% of each ratio |

The reader warns when a note falls outside these ranges. Such notes still sound, but less like the instrument, so keep within them.

## Writing for each

- **Violin and cello.** These are the voices for long, singing lines; slur them. `{pizz}` plucks, which suits a walking bass or a light accompaniment. Vibrato arrives on any note longer than about a quarter of a second. Use `{novib}` for a still, plain tone and `{pont}` for a glassy one. The cello's lowest notes are rich, and the ear finds them a little rough: that is the instrument, not a fault.
- **Harp.** Arpeggios and spread chords (`{arp}`). It rings, so leave space. `{gliss}` sweeps the scale, and `{harm}` gives bell-like harmonics.
- **Guitar.** Strummed or spread chords (`{arp}`) and arpeggios. Its notes ring long; a staccato `'` damps them.
- **Bass guitar.** Roots and walking lines, E1 to G4. Staccato for a tight, punchy feel.
- **Flute.** Bright above C5 and breathy below. It carries a tune well, but it is gentle; give it mp or more when it leads.
- **Clarinet.** Dark below A4 and clear above C5. It is lovely a third or sixth below a flute tune, and good for inner voices.
- **Piano.** Chords, arpeggios and melody alike. Use `ped … *` to let harmony ring, and change the pedal when the harmony changes. Its loud attack makes it sound louder than its level suggests, so mp often sits well.
- **Organ.** Held chords; there is no decay. `{stop:flute}` is soft and hollow, `{stop:principal}` the classic organ sound, `{stop:full}` big. Use hairpins to open and close the swell.
- **Drum.** Write pitches (`G1q`, `D2q`). Low drums are felt more than heard: the ear finds them quiet, and they use a lot of headroom when loud. `{roll}` with a hairpin gives a timpani-like swell.
- **Snare.** `xq`, `xq>`, `{rim}`, `{flam}`, `{roll}`. It is the loudest thing per note in the room, so mp or p is often enough. Long rolls are many notes, which makes them slow to render.
- **Triangle.** One stroke on an arrival or the final chord, at p or pp, is usually best. `x'` chokes it; `{roll}` shimmers.

## Levels

At mf each instrument was balanced by ear (the ear's loudest 100 ms, in sones). After balancing, the piano and snare still come out a little louder than the rest, because of their attacks, and the low drum quieter. A master gain also brings a busy score down so that twelve players are louder than one, but not twelve times louder. A limiter holds every sample at or under −1 dBFS. Set balance with dynamics first, and use the `mix` line to correct a whole instrument.
