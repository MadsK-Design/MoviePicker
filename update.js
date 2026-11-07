// Phones (especially iPhones) keep old copies of the site for a while.
// The deploy workflow writes the current version into index.html and
// version.json. If version.json says there is a newer version than the one
// running, the page reloads itself with the new version.

const APP_VERSION = document
    .querySelector('meta[name="app-version"]')
    .getAttribute("content");

async function checkForUpdate() {
    // Not stamped when running locally, so there is nothing to compare
    if (APP_VERSION === "__VERSION__") {
        return;
    }

    try {
        const response = await fetch(`version.json?t=${Date.now()}`, {
            cache: "no-store"
        });

        const { version } = await response.json();

        if (!version || version === APP_VERSION) {
            return;
        }

        // Only try once per version, so a slow server can't cause a reload loop
        if (sessionStorage.getItem("triedVersion") === version) {
            return;
        }

        sessionStorage.setItem("triedVersion", version);

        // A new address makes the phone fetch a fresh page instead of its old copy
        // (the second app keeps its "?admin", so it keeps its own login)
        const secondApp = new URLSearchParams(location.search).has("admin") ? "admin&" : "";
        location.replace(`${location.pathname}?${secondApp}v=${version}`);
    } catch (error) {
        console.error("Could not check for updates:", error);
    }
}

checkForUpdate();

// iPhones often resume the page from the background instead of reloading it
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        checkForUpdate();
    }
});
