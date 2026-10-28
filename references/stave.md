# Stave: music written as text

Stave is this plugin's own notation. `stave.js` reads it. The page draws it, and `render.js` plays it, from the same reading. A score has header lines, then one line or more per voice. Anything after `//` is a comment.

```
title A Small Morning
tempo 76
time 4/4
key F major
mix flute +3 cello -4

flute:  mp rh (A4q C5q) | F5h. (E5e D5e) | C5h (A4q B4q) | C5w |
cello:  p F2w | F2w | D3w | C3w |
```

## Header lines (any order, before or between voices)

| Line | Meaning |
|---|---|
| `title A Small Morning` | the piece's name |
| `tempo 76` | crotchets (quarter notes) a minute; 96 if left out |
| `time 3/4` | the time signature; 4/4 if left out. Every bar must add up to it, except a first-bar pickup |
| `key D major`, `key B minor`, `key Eb major` | the key signature: those notes are sharp or flat without being written |
| `mix violin -3 drum +2` | each instrument's level in dB, −60 to +12, for the whole piece. The page's level faders write this line |
| `bar 9` | the voice lines after it begin at bar 9; any voice not yet there is filled with rests |

## Voices

`instrument: what it plays`. The instruments are `violin`, `cello`, `harp`, `guitar`, `bass` (or `bass guitar`), `flute`, `clarinet`, `piano`, `organ`, `drum`, `snare` and `triangle`. Lines with the same name continue the same voice. `violin 2:` and `piano left:` are voices of their own on the same instrument. A voice can start under a `bar N` line. The other voices don't have to be written out to that point.

## Notes

`C4q`: a letter, accidentals, an octave, a length, then marks, in that order (the reader forgives other orders in the tail).

- **Pitch.** `C D E F G A B`. `#` sharp, `b` flat, `##` and `bb` double, `n` natural. C4 is middle C, and each octave starts again at C. An accidental lasts to the bar line, as on paper (`F#5q G5q F5q` plays F♯ twice). The key signature applies until an accidental says otherwise.
- **Carrying.** If the octave or length is left off, the last one carries on. So `C5e D5 E5 F5` is four quavers. The tuplet carries too. Each voice's first note, if written without an octave, takes a home octave: violin 4, cello 3, harp 4, guitar 3, bass 2, flute 5, clarinet 4, piano 4, organ 4, drum 2.
- **Lengths.** `ww` breve, `w` whole, `h` half, `q` quarter, `e` eighth, `s` sixteenth, `t` thirty-second. `.` dots the length and `..` double-dots it.
- **Tuplets.** `3`, `5`, `6` or `7` after the length: `C5e3 D5 E5` is three quavers in the time of two. `e5` puts five in the time of four.
- **Chords.** `[C4 E4 G4]h`, with the length and marks after the bracket.
- **Rests.** `r` with a length (`rq`, `rh.`). `R` rests for a whole bar, whatever the time signature.
- **Hits.** The snare and triangle play `x` (`xq`, `x'e`), because they have no pitch to write. The drum takes a pitch (`G1q`) for a tuned drum.
- **Ties.** `~` ties to the next note of the same pitch: `C6q~ | C6h` is one sound held over the bar line.

A plain note sounds for 0.9 of its written length.

## Marks after a note

| Mark | Effect |
|---|---|
| `>` accent | +4 dB, harder start |
| `^` marcato | +6 dB, harder still |
| `'` staccato | half length |
| `!` staccatissimo | a quarter of its length, pointed |
| `_` tenuto | full length |
| `_'` portato | 0.7 of its length, soft start |
| `@` fermata | held about twice as long; **all voices** wait (a fermata stretches time for everyone, once) |
| `~` tie | joins to the next note |

## Ornaments and techniques in braces, after a note

| Brace | Effect |
|---|---|
| `{tr}` | trill with the note above in the key, about 13 changes a second |
| `{mord}` / `{lmord}` | the note, the one above (or below), the note |
| `{turn}` | above, the note, below, the note |
| `{app:D5}` | appoggiatura: leans on D5 for half the length, then resolves |
| `{arp}` | spread chord, bottom up, 35 ms apart |
| `{gliss}` | glide to the next note. On the harp it sweeps the strings of the key's scale and on the piano the white keys; on everything else the pitch slides |
| `{trem}` | tremolo, fast repeated notes |
| `{roll}` | drum, snare or triangle roll (about 22 strokes a second; 16 on the triangle) |
| `{flam}` / `{rim}` | snare flam, rim shot |
| `{harm}` | harmonic: string touched lightly, pure and high |
| `{flz}` | flutter-tongue on the flute |
| `{choke}` | choke a triangle (a staccato triangle chokes too) |
| `{ring}` | piano: lift the damper for this note, so it rings past its length |

A grace note goes before the note: `gD5 C5q` crushes D5 in 65 ms before the beat.

## Phrasing, dynamics and playing

- **Slurs.** `( … )` joins notes without new attacks. On violin, cello, flute and clarinet a slur is one bow or one breath: the notes become one sound whose pitch moves. On the plucked and struck instruments each note still sounds, but each one rings into the next.
- **Dynamics.** `ppp pp p mp mf f ff fff`, written before the note they apply from. `sfz` is a sudden strong accent; `fp` is loud and at once soft. A voice starts at mf. The steps are 3 to 6 dB apart (from ppp to fff spans about 30 dB), and louder playing is brighter as well as louder.
- **Hairpins.** `<` and `>`, standing alone, swell or fade to the next written dynamic, even over a bar line or across one held note. With no dynamic after them, they move 5 dB.
- **Techniques that last until changed.** `{pizz}` and `{arco}`, `{mute}` and `{open}`, `{pont}` (near the bridge), `{tasto}` (over the fingerboard), `{ord}` (back to normal), `{vib}` and `{novib}`. The organ's stops are `{stop:principal}`, `{stop:flute}` and `{stop:full}`.
- **Pedal.** `ped` presses the piano's sustain pedal; `*` lifts it.
- **Place.** `pan=-0.5` moves the voice left (−1) or right (1) from that point. Each instrument has a sensible default seat.

## Time

- `tempo=120` inside a voice line changes the speed from that point, for every voice.
- `rit` slows to the next `tempo=`, or by a fifth (×0.8) over four beats if none follows. `accel` speeds up the same way (×1.25).

## What the reader checks

`STAVE.read(text).warnings` lists:

- bars that don't add up (with where);
- unknown instruments or braces;
- lines it could not read;
- a voice already past the bar its `bar N` line asks for;
- mix entries it could not read.

`render.js` and `orchestra.js` print the warnings. Fix every one before rendering for someone.

## Patterns that work

- **Melody with accompaniment.** Slur the tune in phrases, and let the harp or guitar arpeggiate in quavers under it (`F3e C4 F4 A4 C5 A4 F4 C4`).
- **A swell to a climax.** Write `mp <` a bar or two early, `f` on arrival, then a marcato or accented chord.
- **An ending.** Put `@` on the last note of every voice. A `pp` or `ppp` triangle on the final chord adds air.
- **Many voices of one instrument.** Use `violin 1:` and `violin 2:` (or `piano right:` and `piano left:`).
- **Voices that come in late.** Write `bar 9`, then only the voices that play from there.
