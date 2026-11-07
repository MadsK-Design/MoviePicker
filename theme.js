// Every list (group) can have its own design:
//   themes/<groupId>.css  - colours, fonts, layout (optional)
//   themes/<groupId>.js   - effects and animations (optional)
// They are loaded when someone from that group logs in, and removed
// again when they log out.
//
// A theme script registers itself like this:
//   registerGroupTheme("nicolai", {
//       start() { ... },    // turn effects on
//       stop() { ... },     // clean everything up again
//       intro() { ... }     // optional: returns a promise, plays while the list loads
//   });

const groupThemes = {};

let themeLink = null;
let activeTheme = null;

function registerGroupTheme(name, theme) {
    groupThemes[name] = theme;
}

function loadThemeStyles(groupId) {
    themeLink = document.createElement("link");
    themeLink.rel = "stylesheet";
    themeLink.href = `themes/${encodeURIComponent(groupId)}.css?v=${APP_VERSION}`;
    document.head.appendChild(themeLink);

    return waitForLoad(themeLink);
}

function loadThemeScript(groupId) {
    // Already loaded during an earlier login
    if (groupThemes[groupId]) {
        return Promise.resolve();
    }

    const script = document.createElement("script");
    script.src = `themes/${encodeURIComponent(groupId)}.js?v=${APP_VERSION}`;
    document.body.appendChild(script);

    return waitForLoad(script);
}

// A missing file just means the list has no design (or no effects)
function waitForLoad(element) {
    return new Promise(resolve => {
        element.addEventListener("load", resolve);
        element.addEventListener("error", resolve);
        setTimeout(resolve, 1500);
    });
}

async function applyGroupTheme(groupId) {
    removeGroupTheme();

    document.body.dataset.theme = groupId;

    // Wait for the design, so the page doesn't flash in the normal look first
    await Promise.all([
        loadThemeStyles(groupId),
        loadThemeScript(groupId)
    ]);

    activeTheme = groupThemes[groupId] || null;
    activeTheme?.start?.();
}

// Plays the list's intro animation, if it has one. Resolves when it is done.
function playGroupThemeIntro() {
    if (!activeTheme?.intro) {
        return Promise.resolve();
    }

    return activeTheme.intro();
}

function removeGroupTheme() {
    activeTheme?.stop?.();
    activeTheme = null;

    if (themeLink) {
        themeLink.remove();
        themeLink = null;
    }

    delete document.body.dataset.theme;
}
