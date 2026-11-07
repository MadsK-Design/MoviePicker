const loginSection = document.getElementById("login");
const appSection = document.getElementById("app");

const usernameInput = document.getElementById("loginUsername");
const passwordInput = document.getElementById("loginPassword");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");
const logoutButton = document.getElementById("logoutButton");

function usernameToEmail(username) {
    return `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
}

// Firebase needs at least 6 characters, so "2507" is stored as "250700".
// Used both when creating users and when logging in, so it always matches.
function padPassword(password) {
    return password.padEnd(6, "0");
}

async function loginUser() {
    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (username === "" || password === "") {
        loginError.textContent = "Please enter username and password.";
        return;
    }

    loginError.textContent = "";

    try {
        // onAuthStateChanged below takes over once the login succeeds
        await auth.signInWithEmailAndPassword(
            usernameToEmail(username),
            padPassword(password)
        );
    } catch (error) {
        console.error("Login error:", error);
        loginError.textContent = "Login failed. Check username or password.";
    }
}

async function logoutUser() {
    await auth.signOut();

    GROUP_ID = "";
    movies = [];

    movieList.innerHTML = "";
    randomMovieResult.innerHTML = "";

    usernameInput.value = "";
    passwordInput.value = "";
    loginError.textContent = "";
}

function showLogin() {
    removeGroupTheme();

    loginSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    adminSection.classList.add("hidden");
}

async function refuseLogin(message) {
    loginError.textContent = message;
    await auth.signOut();
}

auth.onAuthStateChanged(async user => {
    if (!user) {
        showLogin();
        return;
    }

    const profile = await getUserProfile(user.uid);

    if (!profile) {
        await refuseLogin("No movie list found for this user.");
        return;
    }

    if (profile.admin === true) {
        removeGroupTheme();

        loginSection.classList.add("hidden");
        appSection.classList.add("hidden");
        await showAdminPage();
        return;
    }

    if (profile.blocked === true) {
        await refuseLogin("This user has been blocked.");
        return;
    }

    if (!profile.groupId) {
        await refuseLogin("No movie list found for this user.");
        return;
    }

    GROUP_ID = profile.groupId;

    // The list's own design, if it has one (themes/<groupId>.css and .js)
    await applyGroupTheme(GROUP_ID);

    // Always start on the movie list (home)
    showSection("moviesSection");

    // The list's intro (if any) covers the screen while the movies load
    const themeIntro = playGroupThemeIntro();

    loginSection.classList.add("hidden");
    adminSection.classList.add("hidden");
    appSection.classList.remove("hidden");

    await loadGroupData();
    await themeIntro;
});

async function loadGroupData() {
    // Show the copy saved on this phone right away, if there is one...
    const cachedMovies = await getMoviesFromDatabase("cache");

    if (cachedMovies.length > 0) {
        await Promise.all([
            loadAllGenres("cache"),
            loadMovieLists("cache"),
            loadMovies("cache")
        ]);
    }

    // ...then fetch the latest from Firebase, all three at once
    await Promise.all([
        loadAllGenres(),
        loadMovieLists(),
        loadMovies()
    ]);

    // The movie list depends on the selected list, so draw it once more
    renderMovies();
}

loginButton.addEventListener("click", loginUser);

passwordInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        loginUser();
    }
});

logoutButton.addEventListener("click", logoutUser);
