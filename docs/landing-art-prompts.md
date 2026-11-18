# Landing page art: image slots and prompts

The landing page uses two kinds of images:

- **Real Noyta designs** (`apps/web/public/showcase/*.jpg`) for every product shot: the card fan, the privacy cross-fade, the occasions band, the CTA stack and the login panel. Nothing to do here.
- **Atmospheric art slots** that set the mood, like the whale, tree and bridge art in the original studio template. Until a file exists, each slot shows a soft rose/violet glow, so the page never looks broken.

To fill a slot, generate the image, export it as **JPG**, and save it at the path below. No code changes are needed; the page picks it up on reload.

## Shared style (add to every prompt)

> Cinematic dark-studio artwork on a pure black background (#000), bioluminescent glow, soft rim light in rose pink (#eca8d6) and warm amber, a little violet, fine organic detail (moss, petals, tiny flowers, threads of light), shallow depth of field, lots of empty black space, no text, no logos, no people's faces, photoreal 3D render, 8k.

Keep the backgrounds truly black: the art sits on the dark theme and fades into it at the edges. In the light theme these slots sit on panels that stay readable, but black-background art reads best.

## Slots

| File (in `apps/web/public/landing/`) | Where it shows | Size / framing | Prompt (+ shared style) |
|---|---|---|---|
| `process-tree.jpg` | "Choose. Personalise. Share." band, right side | 1200×1280, subject anchored to the bottom, fades out to the left | A small flowering tree whose branches are strung with glowing marigold garlands and tiny brass bells, petals drifting down, mossy roots |
| `languages-sphere.jpg` | "Every language. Every tradition." beside the headline | 1024×1024 square, centred object | A floating sphere woven from threads of light, with faint Devanagari, Tamil and Bengali letterforms etched into its surface like filigree, tiny marigolds on the threads |
| `share-arcs.jpg` | "Share it everywhere." full-width strip under the title | 2400×900 panorama, centre empty for the title above | Two glowing diyas far apart on a dark ground, joined by many soft arcs of light, like messages travelling between two homes, with petals floating along the arcs |
| `voice-garden.jpg` | "Say it. Or type it." bottom-right, behind the text | 1600×1200, subject in the right half, fades to black at the top and left | A vintage brass gramophone horn overgrown with moss and jasmine, sound waves made of glowing petals flowing out of it |
| `pricing-elephant.jpg` | "Free to make. Pay for HD." beside the headline | 1200×1000, centred object, contained | A small ceremonial elephant made of moss, marigolds and tiny pink flowers, decorated with a glowing caparison and bells, in three-quarter view |
| `footer-panorama.jpg` | Footer banner on the home page | 2400×840 panorama, horizon in the lower third | A night landscape of a wedding mandap in a meadow, strings of fairy lights and marigold garlands glowing, fireflies, hills fading into black |

## Tips

- If the generator adds a dark-grey background, push the levels so the background is pure black (no visible box edge).
- Compress to roughly 200–400 KB each (for example with Squoosh, MozJPEG quality 70–75).
- Keep the subject away from the edges that fade out (noted in the framing column).
