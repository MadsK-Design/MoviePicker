// Every list (group) can have its own design in themes/<groupId>.css,
// e.g. themes/silke-mads.css. It is loaded on top of style.css when someone
// from that group logs in, and removed again when they log out.

let themeLink = null;

function applyGroupTheme(groupId) {
    removeGroupTheme();

    document.body.dataset.theme = groupId;

    themeLink = document.createElement("link");
    themeLink.rel = "stylesheet";
    themeLink.href = `themes/${encodeURIComponent(groupId)}.css?v=${APP_VERSION}`;
    document.head.appendChild(themeLink);

    // Wait for the design, so the page doesn't flash in the normal look first.
    // A list without a design file just keeps the normal look.
    return new Promise(resolve => {
        themeLink.addEventListener("load", resolve);
        themeLink.addEventListener("error", resolve);
        setTimeout(resolve, 1500);
    });
}

function removeGroupTheme() {
    if (themeLink) {
        themeLink.remove();
        themeLink = null;
    }

    delete document.body.dataset.theme;
}
