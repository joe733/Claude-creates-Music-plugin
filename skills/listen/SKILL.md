---
name: listen
description: >
  This skill should be used when the user asks Claude to "listen to", "hear", "check the mix of", "what do you hear in",
  "is anything buried", "where is it loudest", or "is it too rough" for a piece written with the Orchestra of Numbers, or
  for a WAV file. It runs the piece through an ear made of plain arithmetic and reports loudness, roughness, the limiter,
  and how much each instrument carries of what is heard.
metadata:
  version: "0.1.0"
---

# Listen with the ear made of numbers

The ear is `ear.js` in the compose skill's `scripts/` folder (`../compose/scripts/` from this skill's base directory). Call that folder `S`. It models the outer and middle ear, a cochlea of gammatone filters, the hair cells, and above them loudness, roughness and pitch. It is a model: report what it measures as readings, and keep your inferences apart and labelled.

## Steps

1. **For a score**, run `node "$S/listen.js" piece/vN.stave --json piece/vN.ear.json`. It takes about a third of the music's length plus the render: some 25 seconds for a minute of music. The `--json` file is what the orchestra page draws above its roll, so write it whenever a page will be built.
2. **When balance is the question** ("can you hear the clarinet?", "is the tune coming through?"), add `--faders`. It renders each instrument separately, nudges it up 1 dB in the sum, and hears what changes. The result is each instrument's share of what is heard, bar by bar, with anyone under 3% flagged as buried. It costs one hearing per instrument, about four minutes for a minute of music with twelve players, so run it in the background and say it is running.
3. **For a WAV from anywhere**, run `node "$S/listen.js" file.wav` to get loudness and roughness second by second. With no score there are no bars, faders or instruments.
4. **Read the whole report before saying anything.** Then say it plainly, in a few sentences: what stands out, where (the time and the bar), and what it suggests. Don't recite the table.

## Reading the numbers

The ear assumes a full-scale sine plays at 90 dB SPL, which is a loud listening level. At a quieter volume the same music has fewer sones and less roughness, so compare passages with each other rather than with a fixed scale.

- **Sones (loudness).** Twice the sones sounds twice as loud. A soft solo is around 5 to 20, a moderate ensemble around 20 to 40, and a loud passage with everyone 50 to 90 or more. The quietest bar with music in it, against the loudest, tells you the piece's range.
- **Aspers (roughness),** the buzz of partials beating 15 to 300 times a second:
  - below 1 is smooth;
  - 1 to 2 is what rich low tones and close intervals bring;
  - above 2 is rough.

  Drums, snare, low cello notes and loud low chords are rough by nature. Roughness matters most on held, pitched chords meant to sound sweet. The report names the instrument that is roughest alone at the roughest moment. It counts only roughness lasting at least 160 ms: the ear's envelope model also answers the first 60 ms of every struck or plucked attack, and hearing does not take that as roughness.
- **The faders.** Each instrument's percentage is its share of the change in what is heard when every instrument is nudged up 1 dB. Where a voice has the tune, it usually needs the largest share; 35% or more is typical. A player under 3% is effectively buried there.
- **The limiter.** If its deepest limiting goes beyond −3 dB, a peak (usually a loud drum, snare or accented chord) is being squashed, and everything ducks with it for a moment. Lower that instrument's dynamic, or its level in the `mix` line.
- **Master gain** only reports how far the whole score was brought down because it is busy. It is not a problem.

## Saying what it means

- Separate the reading from the inference: "The ear measured the cello carrying 40 to 60% of what is heard in bars 1 to 4, against the flute's 10 to 17%; that means the tune is being covered."
- Name the limit that bears on the point. The ear knows loudness and roughness. It does not know which sound is the tune, whether a passage is beautiful, or what the person meant. Those judgements are yours, and should be said as yours.
- Turn findings into one or two concrete changes, such as a dynamic, a `mix` line, a register, or an instrument doubling the tune. Leave the person free to choose.
- After a change, listen again and report honestly whether it did what it was for.
