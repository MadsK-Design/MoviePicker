# Removing the jumpscares

The "Watch me" jumpscares on the Nicolai list were made for fun.
When you're done, just ask Claude: **"remove the jumpscares"**.

## What has to be removed

1. **`themes/nicolai.js`**
   - Everything between `JUMPSCARES START` and `JUMPSCARES END`
     (the pictures, escalation, blood text and the generated sounds).
   - In `onTap()`: the lines `unlockAudio();`, the `if (scareElement) { return; }`
     block and `maybeScare(event);`. Keep `makeSplat(...)`.
   - In `start()`: `startedAt = Date.now();`, `recentTaps = [];` and `preloadScares();`.
   - In `stop()`: `scareElement?.remove();` and `scareElement = null;`.

2. **`themes/nicolai.css`**
   - Everything between `JUMPSCARES START` and `JUMPSCARES END`.
   - In the `@import` at the top: `family=Permanent+Marker&` (only used for the blood writing).

3. **This folder** `themes/nicolai-scares/` with the pictures and this note.

The rest of the horror theme (door intro, hallway, demon, blood splats on tap,
fonts and colours) stays.

## Reset on the phone (optional)

The phone remembers how far the jumpscares have escalated, in local storage
under `nicolaiScareLevel` and `nicolaiScareLast`. They're harmless once the code
is gone, but they disappear if the site's data is cleared.
