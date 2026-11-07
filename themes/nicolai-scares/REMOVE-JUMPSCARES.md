# Removing the jumpscares

The "Watch me" jumpscares on the Nicolai list were made for fun.
When you're done, just ask Claude: **"remove the jumpscares"**.

## What has to be removed

1. **`themes/nicolai.js`**
   - Everything between `JUMPSCARES START` and `JUMPSCARES END`
     (the pictures, escalation, blood text and the generated sounds).
   - In `onTap()`: the `if (scareElement) { return; }` block and
     `maybeScare(event);`. Keep `makeSplat(...)`.
   - Keep the door intro sounds (`introSounds`) and the shared sound engine
     in `theme.js`; they aren't part of the jumpscares.
   - In `start()`: `startedAt = Date.now();`, `recentTaps = [];` and `preloadScares();`.
   - In `stop()`: `scareElement?.remove();` and `scareElement = null;`.

2. **`themes/nicolai.css`**
   - Everything between `JUMPSCARES START` and `JUMPSCARES END`.
   - In the `@import` at the top: `family=Permanent+Marker&` (only used for the blood writing).

3. **This folder** `themes/nicolai-scares/` with the pictures and this note.

The rest of the horror theme (door intro, hallway, demon, blood splats on tap,
fonts and colours) stays.

## The pictures in Git history

Deleting the folder removes the pictures from the current version and the
website, but the repository is public, so they stay findable in older commits.
Removing them **completely** means rewriting the history (e.g. `git filter-repo`
on `themes/nicolai-scares/`) and force-pushing `main`. Only do that if asked.

## Reset on the phone (optional)

The phone remembers how far the jumpscares have escalated, in local storage
under `nicolaiScareLevel` and `nicolaiScareLast`. They're harmless once the code
is gone, but they disappear if the site's data is cleared.
