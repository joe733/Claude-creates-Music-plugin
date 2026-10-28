---
name: orchestra
description: >
  This skill should be used when the user asks to "open the orchestra", "show me the orchestra", "build the page",
  "let me play with it", "show the stage", "make it interactive", or wants to see and hear a piece written with the
  Orchestra of Numbers in a browser: the twelve instruments seated on a stage that lights as they play, the score to
  edit, its engraving, every version of the piece, and what the ear heard.
metadata:
  version: "0.1.0"
---

# The orchestra page

One self-contained HTML file. It holds the composer, the reader and the engraver, and composes the sound in the browser as it plays: offline, with nothing fetched, on any device with a modern browser. Its sound is sample for sample what `render.js` makes.

## What the page offers

- **The stage**, drawn as a plan from above. Each chair lights while its instrument plays, and the organ's façade pipes light by pitch. Choosing a chair opens it:
  - how that instrument's sound is made, and what was measured;
  - a keyboard (or strokes, for percussion) to try its notes;
  - its level fader, which writes the score's `mix` line;
  - "Leave out" and "Hear alone".
- **The whole piece**: the ear's loudness and roughness above a roll of every note. Click anywhere to play from there.
- **The score**, editable, beside the engraving of the chosen voice. From here the person can copy the score, save it as a `.stave` file, open one, or put the version back. Drafts are kept in their browser.
- **How the piece grew**: every version, with its notes and its own ear reading.
- **Every mark Stave can write**, engraved and playable (folded away until opened).
- Light and dark themes follow the device. The volume starts at 50%. Nothing flashes.

## Steps

1. **Make sure the piece folder is ready.** It needs `v1.stave` (and any later versions), and ideally the `vN.md` notes and `vN.ear.json` files from the listen skill, so the page can show what the ear heard. A single `.stave` file also works, as a one-version piece.
2. **Build it:** `node <this skill's base directory>/scripts/orchestra.js <piece folder or score.stave> <out.html>`. It prints any reader warnings for each version. Fix them first, unless they are intended.
3. **Deliver the HTML as a file** the person can keep and open anywhere. If they want a link to share and the session can publish artifacts, offer to publish it. The page is self-contained, so it publishes as it is. Don't publish without their yes.
4. **Say in a sentence or two** what the page holds, for example "both versions, with what the ear heard in each". Mention that they can edit the score there, copy it, and send it back to grow the piece.

## When the person sends edits back

A score pasted from the page is their version. With the compose skill:

- save it as the next version;
- describe what they changed, by comparing it with the version before;
- listen to it;
- rebuild the page, so their version sits in the history with the rest.

## Checking a build

- **Look at the page** when it can be opened (a headless browser, if one is installed). It should load without errors, and play should start within a second or two.
- **On a phone-width screen** nothing should scroll sideways except the engraving and the wide marks, which scroll inside their own boxes.
- **The stage's chairs** should be dashed for instruments not in the piece, and solid for those in it.
