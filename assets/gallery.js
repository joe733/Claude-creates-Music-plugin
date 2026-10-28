// Every mark, each written as its own small score: [group, title, Stave, what it does]. Header lines other than tempo 96 and
// 4/4 time are written in the snippet itself, so what is shown is all that is played.
const GALLERY=[
['Pitch and length','Notes and octaves',`piano: mf C4q E4q G4q C5q`,'A letter, an octave and a length. C4 is middle C; each octave starts again at C.'],
['Pitch and length','Accidentals last the bar',`flute: mf F#5q G5q F5q rq | F5h rh`,'# sharp, b flat, n natural. As on paper, a sharp lasts to the bar line: the third note is still F♯, and after the bar line F is F again.'],
['Pitch and length','A key signature',`key Eb major
clarinet: mf E4q F4q G4q A4q | B4q Bn4q C5h`,'In E♭ major, E, A and B are flattened without being written. n cancels the key for the rest of the bar.'],
['Pitch and length','Lengths, and lengths carried',`piano: mf C5h C5q C5e C5s C5 | C5e C5 C5 C5 C5h`,'w h q e s t: whole, half, quarter, eighth, sixteenth, thirty-second (ww is a breve). Leave the length off and the last one carries on.'],
['Pitch and length','Dots',`cello: mf G3q. A3e B3h | D4h.. C4e`,'A dot adds half the length again; a second dot adds a quarter more.'],
['Pitch and length','Triplets and quintuplets',`flute: mf C5e3 D5 E5 F5q3 G5 A5 B5q | C6e5 B5 A5 G5 F5 E5q D5q`,'3 after a length fits three in the time of two; 5, 6 and 7 work the same way. The tuplet carries until the length changes.'],
['Pitch and length','Rests',`clarinet: mf G4q rq G4e re G4q | R | C5w`,'r takes any length, like a note. R rests for a whole bar, whatever the time signature.'],
['Pitch and length','A tie',`flute: mf A5h. C6q~ | C6h B5h`,'~ joins a note to the next of the same pitch: one sound, held over the bar line.'],
['Pitch and length','Chords',`piano: mf [C4 E4 G4]q [C4 F4 A4]q [B3 D4 G4]q [C4 E4 G4 C5]q`,'Square brackets play their notes together; the length goes after the bracket.'],

['Dynamics','From ppp to fff',`violin: ppp G4q pp G4 p G4 mp G4 | mf G4 f G4 ff G4 fff G4`,'Eight levels. The bow presses harder as well as moving faster, so loud notes are brighter as well as louder.'],
['Dynamics','Crescendo and diminuendo',`cello: p < D3h E3h | f > F3h E3h | p D3w`,'< and > standing alone swell or fade to the next written dynamic, even across bar lines.'],
['Dynamics','A swell on one note',`violin: p < D5w~ | f > D5w | pp R`,'A hairpin can shape a single held note: the bow keeps moving and only the pressure and speed change.'],
['Dynamics','sfz and fp',`clarinet: mf G4h sfz G4h | fp G4w`,'sfz, a sudden strong accent; fp, loud and at once soft.'],

['Articulation','Accent',`violin: mf D5q D5q> D5q D5q>`,'> a stronger, harder start.'],
['Articulation','Marcato',`cello: mf G2q^ G2q^ D3q^ G2q^`,'^ stronger still, and shorter.'],
['Articulation','Staccato',`flute: mf C5q' D5' E5' F5' | G5h rh`,"' the note is cut to about half its length."],
['Articulation','Staccatissimo',`clarinet: mf G4q! A4! B4! C5! | D5h rh`,'! very short and pointed.'],
['Articulation','Tenuto',`violin: mf G4q_ A4_ B4_ C5_ | D5h rh`,'_ held for its full length, leaning a little.'],
['Articulation','Portato',`cello: mf C3q_' D3_' E3_' F3_' | G3h rh`,"_' held but separated, each with a soft start: between tenuto and staccato."],
['Articulation','Slur',`violin: mf (G4e A4 B4 C5 D5 E5 F#5 G5) | (G5q F#5 E5 D5)`,'( … ) the notes join without a new start. On the violin, one bow; the pitch moves under it.'],
['Articulation','Fermata',`piano: mf C4q E4 G4 C5@ | G4w`,'@ a pause: the note is held about twice as long, and everyone waits.'],
['Articulation','Grace notes',`flute: mf gD5 C5q gF5 E5q gA5 G5h`,'g and a pitch before a note crushes it in just before the beat.'],

['Ornaments','Trill',`flute: mf E5h{tr} D5h`,'{tr} alternates quickly with the note above in the key.'],
['Ornaments','Mordent',`violin: mf G4q{mord} A4q B4q{mord} G4q`,'{mord} the note, the one above, the note: a quick flick upward.'],
['Ornaments','Lower mordent',`clarinet: mf G4q{lmord} A4q B4q{lmord} G4q`,'{lmord} the same flick, downward.'],
['Ornaments','Turn',`flute: mf E5h{turn} D5h`,'{turn} above, the note, below, the note.'],
['Ornaments','Appoggiatura',`violin: mf C5h{app:D5} B4h`,'{app:D5} leans on D5 for half the length, then resolves to the written note.'],
['Ornaments','Spread chord',`harp: mf [C3 G3 C4 E4 G4 C5]w{arp}`,'{arp} plays the chord from the bottom up, a few hundredths of a second apart.'],
['Ornaments','Glissando on the harp',`harp: mf C4h{gliss} C5h`,'{gliss} on the harp sweeps the strings of the scale between the two notes.'],
['Ornaments','Glissando on the violin',`violin: mf G4h{gliss} D5h`,'On a bowed string the finger slides: the pitch glides without steps.'],
['Ornaments','Tremolo',`violin: mf D5w{trem}`,'{trem} as fast as the bow can repeat the note.'],

['Strings','Pizzicato and arco',`violin: {pizz} mf D4q A4q D5q A4q | {arco} D5w`,'{pizz} plucks the string with a finger; {arco} takes up the bow again.'],
['Strings','Mute',`violin: mf (G4h A4h) | {mute} (G4h A4h)`,'{mute} clamps the bridge: darker and veiled. {open} takes it off.'],
['Strings','Sul ponticello',`cello: mf {pont} C3w | {ord} C3w`,'{pont} bows near the bridge: glassy, the high harmonics forward. {ord} back to normal.'],
['Strings','Sul tasto',`violin: mf {tasto} E5w | {ord} E5w`,'{tasto} bows over the fingerboard: soft and flute-like.'],
['Strings','Harmonics',`violin: mf E6h{harm} A6h{harm}`,'{harm} a finger touches the string lightly, so it rings in halves or thirds: pure and high.'],
['Strings','Vibrato on and off',`violin: mf {novib} A4w | {vib} A4w`,'{novib} a still, straight tone; {vib} brings back the wavering of the left hand.'],
['Strings','Harp harmonics',`harp: mf C5h{harm} G5h{harm}`,'On the harp the hand stops the string at its middle, an octave up, and the tone is bell-like.'],

['Winds','Flutter-tongue',`flute: mf A5w{flz}`,'{flz} the tongue rolls an r into the air stream.'],
['Winds','A clarinet’s registers',`clarinet: mf (E3q G3 C4 E4 | G4 C5 E5 G5 | C6w)`,'The low chalumeau, the throat, and the clarion a twelfth up: the odd harmonics make each register its own colour.'],

['Keyboards','Sustain pedal',`piano: mf C4e E4 G4 C5 E5 G5 C6 re | ped C4e E4 G4 C5 E5 G5 C6 re *`,'ped presses the pedal and * lifts it; with the dampers off, the notes ring together.'],
['Keyboards','Let ring',`piano: mf C4q C4q{ring} rh`,'{ring} lifts the damper for one note, so it rings past its length.'],
['Keyboards','Organ stops',`organ: {stop:flute} mf [C4 E4 G4]w | {stop:principal} [C4 E4 G4]w | {stop:full} [C4 E4 G4]w`,'{stop:flute}, {stop:principal}, {stop:full}: which ranks of pipes speak.'],
['Keyboards','The swell box',`organ: {stop:principal} pp < [D3 F#3 A3 D4]w | ff [D3 F#3 A3 D4]w`,'An organ key has no touch, so dynamics open and close shutters in front of the pipes.'],

['Percussion','Drum',`drum: mf G1q D2q G2q D2q | G1h rh`,'A drum with a pitch. Its overtones sit at Bessel ratios, not whole numbers.'],
['Percussion','Drum roll',`drum: p < A1w{roll} | f A1q> rq rh`,'{roll} alternating sticks, as fast as they will go.'],
['Percussion','Snare, plain and accented',`snare: mf xq xq xq> xq`,'x is a hit: on percussion there is no pitch to write.'],
['Percussion','Rim shot',`snare: mf xq xq{rim} xq xq{rim}`,'{rim} the stick strikes skin and rim at once: a crack.'],
['Percussion','Flam',`snare: mf xq{flam} xq xq{flam} xq`,'{flam} two sticks a few hundredths of a second apart: a thicker hit.'],
['Percussion','Snare roll',`snare: p < xw{roll} | f xq> rq rh`,'A roll swelling to an accent.'],
['Percussion','Triangle, ringing and choked',`triangle: mf xh x'h | xw`,"A staccato triangle is choked by the hand; otherwise the steel rings on."],
['Percussion','Triangle roll',`triangle: p < xw{roll} | mf xw`,'{roll} the beater runs round inside a corner.'],

['Time','A change of tempo',`flute: mf C5q D5 E5 F5 | tempo=144 G5q A5 B5 C6 | C6w`,'tempo=144 changes speed from that point, for every voice.'],
['Time','Ritardando',`piano: mf C5q B4 A4 G4 | rit F4q E4 D4 C4 | C4w`,'rit slows by a fifth over four beats (or to the next tempo= if one is written).'],
['Time','Accelerando',`snare: mf xq x x x | accel x x x x | x x x x`,'accel speeds up the same way.'],
['Time','The mix',`mix violin -6 cello +3\nviolin: mf G4h A4h | B4w\ncello: mf G2h D3h | G2w`,'mix sets each instrument’s level in decibels for the whole piece. The level fader on each chair writes this line.'],
['Time','Placing a voice',`flute: pan=-0.9 mf C5q D5 E5 F5 | pan=0.9 G5q F5 E5 D5`,'pan= from −1, left, to 1, right.'],
];

