const loginSection = document.getElementById("login");
const appSection = document.getElementById("app");

const usernameInput = document.getElementById("loginUsername");
const passwordInput = document.getElementById("loginPassword");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");
const logoutButton = document.getElementById("logoutButton");

async function loginUser() {
    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (username === "" || password === "") {
        loginError.textContent = "Please enter username and password.";
        return;
    }

    const email = `${username}@moviepicker.app`;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        console.error("Login error:", error);
        loginError.textContent = "Login failed. Check username or password.";
        return;
    }

    const tableName = await getUserTable(data.user.id);

    if (!tableName) {
        loginError.textContent = "No movie list found for this user.";
        return;
    }

    TABLE_NAME = tableName;

    loginSection.classList.add("hidden");
    appSection.classList.remove("hidden");

    await loadMovies();
}

async function logoutUser() {

    await supabaseClient.auth.signOut();

    TABLE_NAME = "";
    movies = [];

    movieList.innerHTML = "";
    randomMovieResult.innerHTML = "";

    usernameInput.value = "";
    passwordInput.value = "";
    loginError.textContent = "";

    appSection.classList.add("hidden");
    loginSection.classList.remove("hidden");

}

async function checkExistingSession() {
    const { data } = await supabaseClient.auth.getSession();

    if (!data.session) {
        loginSection.classList.remove("hidden");
        appSection.classList.add("hidden");
        return;
    }

    const user = data.session.user;

    const tableName = await getUserTable(user.id);

    if (!tableName) {
        await supabaseClient.auth.signOut();
        loginSection.classList.remove("hidden");
        appSection.classList.add("hidden");
        return;
    }

    TABLE_NAME = tableName;

    loginSection.classList.add("hidden");
    appSection.classList.remove("hidden");

    await loadMovies();
}

loginButton.addEventListener("click", loginUser);

passwordInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        loginUser();
    }
});

logoutButton.addEventListener("click", logoutUser);


checkExistingSession();