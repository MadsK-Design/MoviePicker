// The admin console: a small terminal for managing lists (groups) and users.
// First type "list" or "user" to choose what to work in. There you can search
// (arrow keys or a click to pick) or type "create" to make a new one.
// "help" always shows what you can type right now.

const consoleOutput = document.getElementById("consoleOutput");
const consoleInput = document.getElementById("consoleInput");
const consolePrompt = document.getElementById("consolePrompt");
const consoleSuggestions = document.getElementById("consoleSuggestions");
const consoleLive = document.getElementById("consoleLive");
const consoleTyped = document.getElementById("consoleTyped");

const consoleState = {
    mode: "root",          // "root" | "lists" | "users" | "user" | "group" | "edit"
    group: null,           // { id, name }
    user: null,            // the user that is open
    movies: [],
    categories: [],
    customGenres: [],
    ask: null,             // a question waiting for an answer: (answer) => {}
    highlighted: 0,
    busy: false
};

/* ---------- Writing to the screen ---------- */

// Printed lines go in above the line you are typing on, like in a terminal
function consolePrint(text = "", className = "") {
    const line = document.createElement("div");
    line.className = `console-line ${className}`;
    line.textContent = text;
    consoleOutput.insertBefore(line, consoleLive);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
    return line;
}

function clearConsole() {
    consoleOutput.querySelectorAll(".console-line").forEach(line => line.remove());
}

// Draws what has been typed after the prompt, with a block cursor where the
// caret is. The real (invisible) input keeps the text and the caret.
function renderLive() {
    const text = consoleInput.value;
    const caret = consoleInput.selectionStart ?? text.length;

    consoleTyped.textContent = "";
    consoleTyped.append(text.slice(0, caret));

    const cursor = document.createElement("span");
    cursor.className = "console-cursor";
    cursor.textContent = text[caret] || " ";
    consoleTyped.append(cursor, text.slice(caret + 1));

    // While a command is running, the prompt line waits (like a real terminal)
    consoleLive.classList.toggle("hidden", consoleState.busy);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

async function consoleType(text, className = "", speed = 12) {
    const line = consolePrint("", className);
    await typeInto(line, text, speed);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
    return line;
}

const consolePause = ms => adminReduceMotion() ? Promise.resolve() : sleep(ms);

// A text progress bar that fills up on one line
async function consoleProgress(label, steps = 10) {
    const line = consolePrint("", "console-dim");

    for (let i = 0; i <= steps; i++) {
        line.textContent = `${label} [${"█".repeat(i)}${"░".repeat(steps - i)}]`;
        await consolePause(45);
    }

    return line;
}

function setPrompt() {
    const paths = {
        root: "~",
        lists: "~/lists",
        users: "~/users",
        user: `~/users/${consoleState.user?.username}`,
        group: `~/lists/${consoleState.group?.id}`,
        edit: `~/lists/${consoleState.group?.id}/edit`
    };
    const path = paths[consoleState.mode];

    consolePrompt.textContent = consoleState.ask ? ">" : `root@moviepicker:${path}$`;
    renderLive();
}

// suggest (optional): (typed text) => [{ label, value }] shown while answering
function ask(question, handler, className = "console-warn", suggest = null) {
    consolePrint(question, className);
    consoleState.ask = handler;
    consoleState.askSuggest = suggest;
    setPrompt();
}

// Suggestions for the question being answered; picking one answers it
function askSuggestions(text = consoleInput.value) {
    if (!consoleState.askSuggest || !text.trim()) {
        return [];
    }

    return consoleState.askSuggest(text).map(item => ({
        label: item.label,
        value: item.value,
        pick: () => answerWith(item.value)
    }));
}

async function answerWith(value) {
    if (consoleState.busy) return;

    consoleState.busy = true;
    renderLive();

    try {
        await runConsole(value);
    } finally {
        consoleState.busy = false;
        renderSuggestions();
        renderLive();
    }
}

/* ---------- Small helpers ---------- */

const groupRef = id => db.collection("groups").doc(id);

function minutesFromText(text) {
    const value = text.trim().toLowerCase().replace(/\s+/g, "");
    let match;

    if ((match = value.match(/^(\d+)h(?:(\d+)(?:m|min)?)?$/))) {
        return Number(match[1]) * 60 + Number(match[2] || 0);
    }

    if ((match = value.match(/^(\d+):(\d{1,2})$/))) {
        return Number(match[1]) * 60 + Number(match[2]);
    }

    if ((match = value.match(/^(\d+)(?:m|min)?$/))) {
        return Number(match[1]);
    }

    return null;
}

// Matches typed genres to the list's genres; returns { genres, unknown }
function genresFromText(text) {
    const known = [...defaultGenres, ...consoleState.customGenres.map(genre => genre.Genre)];
    const genres = [];
    const unknown = [];

    text.split(",").map(part => part.trim()).filter(Boolean).forEach(part => {
        const match = known.find(genre => genre.toLowerCase() === part.toLowerCase());
        match ? genres.push(match) : unknown.push(part);
    });

    return { genres: [...new Set(genres)], unknown };
}

function movieLine(movie, number) {
    const genres = movie.Genre ? movie.Genre.split(",").join(", ") : "no genre";
    const lists = movie.Lists?.length ? `  #${movie.Lists.join(" #")}` : "";
    const watched = movie.Watched ? "  [watched]" : "";

    return `${String(number).padStart(3)}. ${movie.Name}  ·  ${formatTime(movie.Time || 0)}  ·  ${genres}${watched}${lists}`;
}

function printMovies(movies = consoleState.movies) {
    if (movies.length === 0) {
        consolePrint("  (no movies)", "console-dim");
        return;
    }

    movies.forEach(movie => {
        consolePrint(movieLine(movie, consoleState.movies.indexOf(movie) + 1));
    });
}

// "3" -> the third movie in the list, or an error message
function movieFromNumber(text) {
    const number = Number(text);
    const movie = consoleState.movies[number - 1];

    if (!Number.isInteger(number) || !movie) {
        consolePrint(`No movie number "${text}". Type "list" to see the numbers.`, "console-error");
        return null;
    }

    return movie;
}

// A category by its name or its number in "cats"
function categoryFrom(text) {
    const number = Number(text);
    const category = Number.isInteger(number) && number > 0
        ? consoleState.categories[number - 1]
        : consoleState.categories.find(cat => cat.Lists.toLowerCase() === text.trim().toLowerCase());

    if (!category) {
        consolePrint(`No category "${text}". Type "cats" to see them.`, "console-error");
    }

    return category || null;
}

async function loadGroupContents() {
    const ref = groupRef(consoleState.group.id);
    const [movies, categories, genres] = await Promise.all([
        ref.collection("movies").orderBy("createdAt", "asc").get(),
        ref.collection("lists").get(),
        ref.collection("genres").get()
    ]);

    const rows = snapshot => snapshot.docs.map(doc => ({ Id: doc.id, ...doc.data() }));

    consoleState.movies = rows(movies);
    consoleState.categories = rows(categories).sort((a, b) =>
        (a.order ?? Infinity) - (b.order ?? Infinity) || a.Lists.localeCompare(b.Lists)
    );
    consoleState.customGenres = rows(genres).sort((a, b) => a.Genre.localeCompare(b.Genre));
}

/* ---------- Help: only what you can do right now ---------- */

const HELP = {
    root: [
        "What do you want to work in?",
        "  list    (l)             the lists",
        "  user    (u)             the users",
        "  clear                   clear the screen"
    ],
    lists: [
        "Type the name of a list to find it.",
        "  ↑ ↓ + Enter, or click   open the list",
        "  create                  make a new list",
        "  back                    choose list or user again",
        "  clear                   clear the screen"
    ],
    users: [
        "Type a username to find a user.",
        "  ↑ ↓ + Enter, or click   open the user",
        "  create                  make a new user",
        "  back                    choose list or user again",
        "  clear                   clear the screen"
    ],
    user: [
        "  info            show the user again",
        "  block           block the user",
        "  unblock         unblock the user",
        "  delete  (d)     delete the user",
        "  back            pick another user"
    ],
    group: [
        "  edit    (e)     see and change the movies",
        "  delete  (d)     delete the whole list",
        "  back            pick another list"
    ],
    edit: [
        "Movies (use the number from the list):",
        "  list                     show all movies",
        "  find <text>              search the movies",
        "  add                      add a movie, step by step",
        "  rename <#> <new name>    rename a movie",
        "  time <#> <time>          runtime, e.g. 1h50, 110 or 1:50",
        "  genre <#> <A, B>         set genres, e.g. genre 3 Horror, Mystery",
        "  watched <#>              mark as watched",
        "  unwatched <#>            mark as not watched",
        "  delete <#>               delete a movie",
        "  tag <#> <category>       put a movie in a category",
        "  untag <#> <category>     take it out again",
        "  random                   pick a random unwatched movie",
        "Categories:",
        "  cats                     show the categories",
        "  addcat <name>            new category (max 12 characters)",
        "  renamecat <cat> <name>   rename a category",
        "  delcat <cat>             delete a category",
        "Genres:",
        "  genres                   show the genres you can use",
        "  addgenre <name>          add a custom genre",
        "  delgenre <name>          delete a custom genre",
        "  back  exit  clear"
    ]
};

function printHelp() {
    consolePrint("Commands here:", "console-heading");
    HELP[consoleState.mode].forEach(line => consolePrint(line, "console-dim"));
}

/* ---------- Step 1: choose list or user, then search ---------- */

// Words that are commands, so typing them doesn't search
const COMMAND_WORDS = ["help", "clear", "back", "exit", "create"];

const ROOT_CHOICES = [
    { mode: "lists", words: ["list", "lists", "l"], label: "list     work with the lists" },
    { mode: "users", words: ["user", "users", "u"], label: "user     work with the users" }
];

function matchingRootChoices(text = consoleInput.value) {
    const query = text.trim().toLowerCase();
    return ROOT_CHOICES.filter(choice => !query || choice.words.some(word => word.startsWith(query)));
}

function matchingGroups(text = consoleInput.value) {
    const query = text.trim().toLowerCase();

    return adminGroups.filter(group =>
        !query || group.id.includes(query) || (group.name || "").toLowerCase().includes(query)
    );
}

// Users (not the admin) whose name or list matches
function matchingUsers(text = consoleInput.value) {
    const query = text.trim().toLowerCase();

    return adminUsers.filter(user => {
        if (user.admin === true) return false;
        const group = adminGroups.find(group => group.id === user.groupId);
        return !query || `${user.username || ""} ${group?.name || user.groupId || ""}`.toLowerCase().includes(query);
    });
}

const plural = (number, word) => `${number} ${word}${number === 1 ? "" : "s"}`;

// What can be picked right now: [{ label, pick }]
function currentSuggestions(text = consoleInput.value) {
    const typed = text.trim().toLowerCase();

    if (COMMAND_WORDS.includes(typed)) {
        return [];
    }

    if (consoleState.mode === "root") {
        return matchingRootChoices(text).map(choice => ({
            label: choice.label,
            pick: () => enterMode(choice.mode, true)
        }));
    }

    // Lists and users only show up once something is typed
    if (!typed && ["lists", "users"].includes(consoleState.mode)) {
        return [];
    }

    if (consoleState.mode === "lists") {
        return matchingGroups(text).map(group => {
            const users = adminUsers.filter(user => user.groupId === group.id).length;
            return { label: `${group.name || group.id}   ${plural(users, "user")}`, pick: () => openGroup(group) };
        });
    }

    if (consoleState.mode === "users") {
        return matchingUsers(text).map(user => {
            const group = adminGroups.find(group => group.id === user.groupId);
            return { label: `${user.username}   ${group?.name || user.groupId || "no list"}`, pick: () => openUser(user) };
        });
    }

    return [];
}

function renderSuggestions() {
    const typed = consoleInput.value.trim().toLowerCase();
    const suggestions = consoleState.busy
        ? []
        : consoleState.ask
            ? askSuggestions()
            : currentSuggestions();
    const searching = ["root", "lists", "users"].includes(consoleState.mode) &&
        !consoleState.ask && !consoleState.busy && typed && !COMMAND_WORDS.includes(typed);

    consoleState.highlighted = Math.min(consoleState.highlighted, Math.max(suggestions.length - 1, 0));
    consoleSuggestions.innerHTML = "";

    suggestions.forEach((suggestion, index) => {
        const item = document.createElement("button");

        item.type = "button";
        item.className = `console-suggestion ${index === consoleState.highlighted ? "is-highlighted" : ""}`;
        item.textContent = suggestion.label;
        item.addEventListener("mousedown", event => event.preventDefault());
        item.addEventListener("click", () => {
            consoleInput.value = "";
            lastConsoleValue = "";
            suggestion.pick();
        });

        consoleSuggestions.appendChild(item);
    });

    if (searching && suggestions.length === 0) {
        const what = { root: 'Type "list" or "user"', lists: "no list matches", users: "no user matches" }[consoleState.mode];
        consoleSuggestions.innerHTML = consoleState.mode === "root"
            ? `<div class="console-suggestion-empty">${what}</div>`
            : `<div class="console-suggestion-empty">${what} "${escapeHtml(typed)}"</div>`;
    }
}

// Goes into "lists" or "users" (or back to the start)
async function enterMode(mode, announce = false) {
    consoleState.mode = mode;
    consoleState.group = null;
    consoleState.user = null;
    consoleState.ask = null;
    consoleState.highlighted = 0;

    if (announce) {
        consolePrint(`> ${mode === "lists" ? "list" : "user"}`, "console-echo");
        await consoleType(mode === "lists"
            ? `${plural(adminGroups.length, "list")}. Type a name to search, or "create".`
            : `${plural(matchingUsers("").length, "user")}. Type a name to search, or "create".`, "console-dim");
    }

    setPrompt();
    renderSuggestions();

    if (announce) {
        consoleInput.focus({ preventScroll: true });
    }
}

function printUser(user) {
    const group = adminGroups.find(group => group.id === user.groupId);

    consolePrint(`User      ${user.username}`, "console-heading");
    consolePrint(`Password  ${passwordFromNote(adminNotes[user.uid]) || "–"}`);
    consolePrint(`List      ${group?.name || user.groupId || "no list"}`);
    consolePrint(`Status    ${user.blocked ? "blocked" : "active"}`, user.blocked ? "console-error" : "");
}

// Opens a user: shows their info, then waits for block / unblock / delete
async function openUser(user) {
    consoleState.mode = "user";
    consoleState.user = user;
    consoleState.highlighted = 0;
    renderSuggestions();

    consolePrint(`> open ${user.username}`, "console-echo");
    await consoleType(`Accessing ${user.username}...`, "console-dim");
    printUser(user);
    consolePrint(`Block, unblock or delete?  (or "help")`, "console-dim");
    setPrompt();
    consoleInput.focus({ preventScroll: true });
}

// Picks up the latest version of the open user after a change
function refreshOpenUser() {
    consoleState.user = adminUsers.find(user => user.uid === consoleState.user.uid) || null;
}

async function setUserBlocked(blocked) {
    const user = consoleState.user;

    if (Boolean(user.blocked) === blocked) {
        consolePrint(`${user.username} is already ${blocked ? "blocked" : "active"}.`, "console-dim");
        return;
    }

    consoleState.busy = true;

    try {
        const line = await consoleType(blocked ? `Revoking access for ${user.username} ... ` : `Restoring access for ${user.username} ... `, "console-dim");
        await db.collection("users").doc(user.uid).update({ blocked });
        await consoleProgress(blocked ? "  locking" : "  unlocking", 8);
        line.textContent += "OK";

        await loadAdminData();
        refreshOpenUser();
        await consoleType(blocked ? `${user.username} is LOCKED.` : `${user.username} is UNLOCKED.`, blocked ? "console-error" : "console-ok");
    } catch (error) {
        console.error("Console block failed:", error);
        consolePrint("FAILED: the change was not saved.", "console-error");
    }

    consoleState.busy = false;
}

function deleteUserFlow() {
    const user = consoleState.user;

    ask(`Type OK to delete ${user.username}. Anything else cancels.`, async answer => {
        if (answer.trim().toUpperCase() !== "OK") {
            consolePrint("Cancelled. Nothing was deleted.", "console-dim");
            return;
        }

        consoleState.busy = true;
        let wipe = Promise.resolve();

        try {
            // The login goes first, while the saved password is still there
            const loginLine = await consoleType(`revoke login ${user.username} ... `, "console-dim");
            const loginDeleted = await deleteLogin(user.username, passwordFromNote(adminNotes[user.uid]));
            loginLine.textContent += loginDeleted ? "OK" : "FAILED";

            // The user's card melts away, like with the Remove button
            const card = adminUserList.querySelector(`.admin-user-card[data-uid="${user.uid}"]`);
            wipe = card ? playWipe(card) : Promise.resolve();

            await consoleType(`rm users/${user.uid} ... `, "console-dim");
            await db.collection("users").doc(user.uid).delete();
            await consoleType(`rm adminNotes/${user.uid} ... `, "console-dim");
            await db.collection("adminNotes").doc(user.uid).delete();
            await consoleProgress("  wiping traces", 12);

            await consoleType(`${user.username} is deleted.`, "console-ok");
            consolePrint("Their list's movies are kept.", "console-dim");

            if (!loginDeleted) {
                consolePrint(
                    "The login could not be deleted (wrong or missing saved password). " +
                    "Delete it in the Firebase console under Authentication → Users.",
                    "console-warn"
                );
            }
        } catch (error) {
            console.error("Console delete user failed:", error);
            consolePrint("FAILED: the user could not be deleted.", "console-error");
        }

        // Let the melt finish before the cards are redrawn
        await wipe;
        consoleState.busy = false;
        await loadAdminData();
        enterMode("users");
    });
}

/* ---------- Create: asks one thing at a time, then Create or Back ---------- */

// Asks a question; answering "back" at any step stops without saving
function askStep(question, handler, suggest = null) {
    ask(question, answer => {
        if (answer.trim().toLowerCase() === "back") {
            consolePrint("Not saved.", "console-dim");
            return;
        }

        return handler(answer);
    }, "console-ask", suggest);
}

// Shows everything that was typed, then waits for "create" or "back"
function confirmCreate(title, rows, save) {
    consolePrint(title, "console-heading");
    rows.forEach(([label, value]) => consolePrint(`  ${label.padEnd(10)}${value}`));

    const askConfirm = () => ask('Type "create" to save, or "back" to not save.', async answer => {
        const word = answer.trim().toLowerCase();

        if (word === "back") {
            consolePrint("Not saved.", "console-dim");
        } else if (word === "create") {
            await save();
        } else {
            askConfirm();
        }
    }, "console-warn");

    askConfirm();
}

function createListFlow() {
    const askName = () => askStep("Name of the list?", name => {
        const id = toGroupId(name);

        if (!id) {
            consolePrint("The name needs at least one letter or number.", "console-error");
            return askName();
        }

        if (adminGroups.some(group => group.id === id)) {
            consolePrint(`A list called "${name.trim()}" already exists.`, "console-error");
            return askName();
        }

        confirmCreate("New list:", [["Name", name.trim()], ["Id", id]], async () => {
            consoleState.busy = true;

            try {
                await consoleType(`mkdir groups/${id} ... `, "console-dim");
                await createGroupIfNeeded(name);
                await consoleProgress("  allocating", 10);
                await loadAdminData();
                await consoleType(`${name.trim()} is created.`, "console-ok");
            } catch (error) {
                console.error("Console create list failed:", error);
                consolePrint("FAILED: the list was not created.", "console-error");
            }

            consoleState.busy = false;
        });
    });

    askName();
}

function createUserFlow() {
    const draft = {};

    const askUsername = () => askStep("Username?", text => {
        const username = text.trim().toLowerCase();

        if (!/^[a-z0-9._-]+$/.test(username)) {
            consolePrint("Username can only use a-z, 0-9, dot, dash and underscore.", "console-error");
            return askUsername();
        }

        if (adminUsers.some(user => (user.username || "").toLowerCase() === username)) {
            consolePrint(`The username "${username}" is already taken.`, "console-error");
            return askUsername();
        }

        draft.username = username;
        askPassword();
    });

    const askPassword = () => askStep("Password?", text => {
        if (!text) {
            consolePrint("Please enter a password.", "console-error");
            return askPassword();
        }

        draft.password = text;
        askList();
    });

    const askList = () => {
        consolePrint("Lists:", "console-dim");
        adminGroups.forEach((group, i) => consolePrint(`${String(i + 1).padStart(3)}. ${group.name || group.id}`, "console-dim"));

        askStep("Which list? (number or name)", text => {
            const number = Number(text);
            const group = Number.isInteger(number) && number > 0
                ? adminGroups[number - 1]
                : adminGroups.find(g => g.id === toGroupId(text) || (g.name || "").toLowerCase() === text.trim().toLowerCase());

            if (!group) {
                consolePrint(`No list "${text}". Make it first under "list" → "create".`, "console-error");
                return askList();
            }

            draft.group = group;

            confirmCreate("New user:", [
                ["Username", draft.username],
                ["Password", draft.password],
                ["List", draft.group.name || draft.group.id]
            ], saveUser);
        }, typed => {
            // A number picks from the list above, so only suggest for names
            if (/^\d+$/.test(typed.trim()) || typed.trim().toLowerCase() === "back") return [];

            return matchingGroups(typed).map(group => {
                const users = adminUsers.filter(user => user.groupId === group.id).length;
                return { label: `${group.name || group.id}   ${plural(users, "user")}`, value: group.id };
            });
        });
    };

    async function saveUser() {
        consoleState.busy = true;
        const loginLine = await consoleType("Generating credentials ... ", "console-dim");

        let uid;

        try {
            uid = await createLogin(draft.username, draft.password);
            loginLine.textContent += "OK";
        } catch (error) {
            console.error("Console create login failed:", error);
            loginLine.textContent += "FAILED";
            consolePrint(error.code === "auth/email-already-in-use"
                ? `The username "${draft.username}" is already taken.`
                : "Could not create the login.", "console-error");
            consoleState.busy = false;
            return;
        }

        const linkLine = await consoleType(`Injecting into list ${draft.group.id} ... `, "console-dim");

        try {
            await linkUserToGroup(uid, draft.username, draft.password, draft.group.id);
            linkLine.textContent += "OK";
            await loadAdminData();
            await consoleType(`ACCESS GRANTED: ${draft.username}`, "console-ok");
        } catch (error) {
            console.error("Console link user failed:", error);
            linkLine.textContent += "FAILED";
            consolePrint(
                `The login "${draft.username}" was created, but could not be linked to a list. ` +
                "Delete it in the Firebase console and try again.",
                "console-error"
            );
        }

        consoleState.busy = false;
    }

    askUsername();
}

async function openGroup(group) {
    consoleInput.value = "";
    lastConsoleValue = "";
    consoleState.group = { id: group.id, name: group.name || group.id };
    consoleState.mode = "group";
    consoleState.highlighted = 0;
    renderSuggestions();

    consolePrint(`> open ${group.id}`, "console-echo");
    await consoleType(`List: ${consoleState.group.name}`, "console-heading");
    consolePrint("Edit or Delete?  (type edit or delete, or help)", "console-dim");
    setPrompt();
    consoleInput.focus();
}

function backToRoot() {
    enterMode("root");
}

/* ---------- Step 2a: delete a whole list ---------- */

async function deleteGroupFlow() {
    const group = consoleState.group;
    consoleState.busy = true;

    await consoleType(`Locating list ${group.id}...`, "console-dim");
    await consoleProgress("  scanning", 12);

    const ref = groupRef(group.id);
    const [movies, categories, genres] = await Promise.all([
        ref.collection("movies").get(),
        ref.collection("lists").get(),
        ref.collection("genres").get()
    ]);
    const users = adminUsers.filter(user => user.groupId === group.id);

    const count = (number, one, many) => `${number} ${number === 1 ? one : many}`;

    await consoleType(
        `Found: ${count(movies.size, "movie", "movies")}, ${count(categories.size, "category", "categories")}, ` +
        `${count(genres.size, "custom genre", "custom genres")}, ${count(users.length, "user", "users")}.`
    );

    if (users.length) {
        consolePrint(
            `Warning: still linked: ${users.map(user => user.username).join(", ")}. ` +
            "They keep their login but have no list until you move them.",
            "console-warn"
        );
    }

    consoleState.busy = false;

    ask(`Type OK to delete ${group.name}. Anything else cancels.`, async answer => {
        if (answer.trim().toUpperCase() !== "OK") {
            consolePrint("Cancelled. Nothing was deleted.", "console-dim");
            setPrompt();
            return;
        }

        consoleState.busy = true;

        try {
            // Firestore can only delete up to 500 things in one go
            for (const [label, snapshot] of [["movies", movies], ["categories", categories], ["genres", genres]]) {
                const line = await consoleType(`rm -rf groups/${group.id}/${label} ... `, "console-dim");

                for (let i = 0; i < snapshot.docs.length; i += 450) {
                    const batch = db.batch();
                    snapshot.docs.slice(i, i + 450).forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                }

                await consolePause(250);
                line.textContent += `${snapshot.size} removed`;
            }

            await consoleType(`rm groups/${group.id} ... `, "console-dim");
            await ref.delete();
            await consoleProgress("  wiping traces", 12);

            await consoleType(`${group.name} is deleted.`, "console-ok");
        } catch (error) {
            console.error("Error deleting list:", error);
            consolePrint("FAILED: the list could not be fully deleted.", "console-error");
        }

        consoleState.busy = false;
        await loadAdminData();
        enterMode("lists");
    });
}

/* ---------- Step 2b: edit a list ---------- */

async function editGroupFlow() {
    consoleState.busy = true;
    await consoleType(`Opening ${consoleState.group.name}...`, "console-dim");

    try {
        await loadGroupContents();
    } catch (error) {
        console.error("Error loading list:", error);
        consolePrint("FAILED: could not load the list.", "console-error");
        consoleState.busy = false;
        return;
    }

    consoleState.mode = "edit";
    consoleState.busy = false;
    setPrompt();

    consolePrint(`${consoleState.movies.length} movies:`, "console-heading");
    printMovies();
    consolePrint('Type a command, or "help".', "console-dim");
}

// Runs a change, then reloads the list and prints the changed movie
async function changeMovie(movie, changes, message) {
    try {
        await groupRef(consoleState.group.id).collection("movies").doc(movie.Id).update(changes);
        await loadGroupContents();

        const updated = consoleState.movies.find(m => m.Id === movie.Id);
        consolePrint(message, "console-ok");

        if (updated) {
            consolePrint(movieLine(updated, consoleState.movies.indexOf(updated) + 1));
        }
    } catch (error) {
        console.error("Console change failed:", error);
        consolePrint("FAILED: the change was not saved.", "console-error");
    }
}

function addMovieFlow() {
    const draft = {};

    ask("Name of the movie?", name => {
        if (!name.trim()) {
            consolePrint("Cancelled: no name.", "console-dim");
            setPrompt();
            return;
        }

        draft.Name = name.trim();

        const askTime = () => ask("Runtime? (e.g. 1h50, 110 or 1:50)", text => {
            const minutes = minutesFromText(text);

            if (!minutes) {
                consolePrint("That runtime wasn't understood.", "console-error");
                askTime();
                return;
            }

            draft.Time = minutes;

            const askGenres = () => ask('Genres? (comma separated, "genres" shows the options)', async text => {
                if (text.trim().toLowerCase() === "genres") {
                    consolePrint([...defaultGenres, ...consoleState.customGenres.map(g => g.Genre)].join(", "), "console-dim");
                    askGenres();
                    return;
                }

                const { genres, unknown } = genresFromText(text);

                if (unknown.length || genres.length === 0) {
                    consolePrint(unknown.length ? `Unknown genre: ${unknown.join(", ")}` : "Please give at least one genre.", "console-error");
                    askGenres();
                    return;
                }

                try {
                    await groupRef(consoleState.group.id).collection("movies").add({
                        Name: draft.Name,
                        Time: draft.Time,
                        Genre: genres.join(","),
                        Watched: false,
                        Lists: [],
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    await loadGroupContents();
                    consolePrint(`Added "${draft.Name}".`, "console-ok");
                    const added = consoleState.movies.find(movie => movie.Name === draft.Name);
                    if (added) consolePrint(movieLine(added, consoleState.movies.indexOf(added) + 1));
                } catch (error) {
                    console.error("Console add failed:", error);
                    consolePrint("FAILED: the movie was not added.", "console-error");
                }

                setPrompt();
            }, "console-ask");

            askGenres();
        }, "console-ask");

        askTime();
    }, "console-ask");
}

async function renameCategoryInGroup(category, newName) {
    const ref = groupRef(consoleState.group.id);
    const affected = await ref.collection("movies").where("Lists", "array-contains", category.Lists).get();
    const batch = db.batch();

    batch.update(ref.collection("lists").doc(category.Id), { Lists: newName, Tag: newName });
    affected.docs.forEach(doc => {
        batch.update(doc.ref, { Lists: doc.data().Lists.map(name => name === category.Lists ? newName : name) });
    });

    await batch.commit();
}

function validCategoryName(name, ignoreId = null) {
    if (!name || name.length > 12) {
        consolePrint("A category name must be 1 to 12 characters.", "console-error");
        return false;
    }

    if (name.toLowerCase() === "all") {
        consolePrint('"All" is reserved.', "console-error");
        return false;
    }

    if (consoleState.categories.some(cat => cat.Id !== ignoreId && cat.Lists.toLowerCase() === name.toLowerCase())) {
        consolePrint("That category already exists.", "console-error");
        return false;
    }

    return true;
}

async function runEditCommand(command, rest) {
    const ref = groupRef(consoleState.group.id);
    const [first, ...others] = rest.split(" ");
    const remainder = others.join(" ").trim();

    switch (command) {
        case "list":
        case "ls":
            await loadGroupContents();
            consolePrint(`${consoleState.movies.length} movies:`, "console-heading");
            printMovies();
            return;

        case "find": {
            const query = rest.trim().toLowerCase();
            const found = consoleState.movies.filter(movie => movie.Name.toLowerCase().includes(query));
            consolePrint(`${found.length} found:`, "console-heading");
            printMovies(found);
            return;
        }

        case "add":
            addMovieFlow();
            return;

        case "rename": {
            const movie = movieFromNumber(first);
            if (!movie) return;
            if (!remainder) return consolePrint("Usage: rename <#> <new name>", "console-error");
            await changeMovie(movie, { Name: remainder }, `Renamed to "${remainder}".`);
            return;
        }

        case "time": {
            const movie = movieFromNumber(first);
            if (!movie) return;
            const minutes = minutesFromText(remainder);
            if (!minutes) return consolePrint("Usage: time <#> <time>, e.g. time 3 1h50", "console-error");
            await changeMovie(movie, { Time: minutes }, `Runtime set to ${formatTime(minutes)}.`);
            return;
        }

        case "genre": {
            const movie = movieFromNumber(first);
            if (!movie) return;
            const { genres, unknown } = genresFromText(remainder);
            if (unknown.length) return consolePrint(`Unknown genre: ${unknown.join(", ")}. Type "genres" to see them.`, "console-error");
            if (!genres.length) return consolePrint("Usage: genre <#> <Genre, Genre>", "console-error");
            await changeMovie(movie, { Genre: genres.join(",") }, `Genres set to ${genres.join(", ")}.`);
            return;
        }

        case "watched":
        case "unwatched": {
            const movie = movieFromNumber(first);
            if (!movie) return;
            const watched = command === "watched";
            await changeMovie(movie, { Watched: watched }, watched ? "Marked as watched." : "Marked as not watched.");
            return;
        }

        case "delete":
        case "rm": {
            const movie = movieFromNumber(first);
            if (!movie) return;

            ask(`Type OK to delete "${movie.Name}".`, async answer => {
                if (answer.trim().toUpperCase() !== "OK") {
                    consolePrint("Cancelled.", "console-dim");
                } else {
                    try {
                        await ref.collection("movies").doc(movie.Id).delete();
                        await loadGroupContents();
                        consolePrint(`"${movie.Name}" is deleted.`, "console-ok");
                    } catch (error) {
                        console.error("Console delete failed:", error);
                        consolePrint("FAILED: the movie was not deleted.", "console-error");
                    }
                }

                setPrompt();
            });
            return;
        }

        case "tag":
        case "untag": {
            const movie = movieFromNumber(first);
            if (!movie) return;
            if (!remainder) return consolePrint(`Usage: ${command} <#> <category>`, "console-error");
            const category = categoryFrom(remainder);
            if (!category) return;

            const lists = new Set(movie.Lists || []);
            command === "tag" ? lists.add(category.Lists) : lists.delete(category.Lists);

            await changeMovie(movie, { Lists: [...lists] },
                command === "tag" ? `Added to ${category.Lists}.` : `Removed from ${category.Lists}.`);
            return;
        }

        case "random": {
            const unwatched = consoleState.movies.filter(movie => !movie.Watched);
            if (!unwatched.length) return consolePrint("No unwatched movies.", "console-dim");

            await consoleProgress("  rolling", 8);
            const pick = unwatched[Math.floor(Math.random() * unwatched.length)];
            consolePrint(`Tonight: ${pick.Name}  ·  ${formatTime(pick.Time || 0)}`, "console-ok");
            return;
        }

        case "cats":
            if (!consoleState.categories.length) return consolePrint("  (no categories)", "console-dim");
            consoleState.categories.forEach((cat, i) => {
                consolePrint(`${String(i + 1).padStart(3)}. ${cat.Lists}${cat.Description ? `  ·  ${cat.Description}` : ""}`);
            });
            return;

        case "addcat": {
            const name = rest.trim();
            if (!validCategoryName(name)) return;

            ask("Description? (Enter to skip)", async description => {
                try {
                    await ref.collection("lists").add({
                        Lists: name,
                        Tag: name,
                        Description: description.trim(),
                        order: Date.now()
                    });
                    await loadGroupContents();
                    consolePrint(`Category "${name}" created.`, "console-ok");
                } catch (error) {
                    console.error("Console addcat failed:", error);
                    consolePrint("FAILED: the category was not created.", "console-error");
                }

                setPrompt();
            }, "console-ask");
            return;
        }

        case "renamecat": {
            const category = categoryFrom(first);
            if (!category) return;
            if (!validCategoryName(remainder, category.Id)) return;

            try {
                await renameCategoryInGroup(category, remainder);
                await loadGroupContents();
                consolePrint(`Category renamed to "${remainder}".`, "console-ok");
            } catch (error) {
                console.error("Console renamecat failed:", error);
                consolePrint("FAILED: the category was not renamed.", "console-error");
            }
            return;
        }

        case "delcat": {
            const category = categoryFrom(rest);
            if (!category) return;

            ask(`Type OK to delete the category "${category.Lists}". Movies stay, they just leave it.`, async answer => {
                if (answer.trim().toUpperCase() !== "OK") {
                    consolePrint("Cancelled.", "console-dim");
                } else {
                    try {
                        const affected = await ref.collection("movies").where("Lists", "array-contains", category.Lists).get();
                        const batch = db.batch();

                        affected.docs.forEach(doc => batch.update(doc.ref, {
                            Lists: firebase.firestore.FieldValue.arrayRemove(category.Lists)
                        }));
                        batch.delete(ref.collection("lists").doc(category.Id));
                        await batch.commit();

                        await loadGroupContents();
                        consolePrint(`Category "${category.Lists}" is deleted.`, "console-ok");
                    } catch (error) {
                        console.error("Console delcat failed:", error);
                        consolePrint("FAILED: the category was not deleted.", "console-error");
                    }
                }

                setPrompt();
            });
            return;
        }

        case "genres":
            consolePrint(`Built in: ${defaultGenres.join(", ")}`, "console-dim");
            consolePrint(`Custom:   ${consoleState.customGenres.map(g => g.Genre).join(", ") || "(none)"}`, "console-dim");
            return;

        case "addgenre": {
            const name = rest.trim();
            if (!name) return consolePrint("Usage: addgenre <name>", "console-error");
            const exists = [...defaultGenres, ...consoleState.customGenres.map(g => g.Genre)]
                .some(genre => genre.toLowerCase() === name.toLowerCase());
            if (exists) return consolePrint("That genre already exists.", "console-error");

            try {
                await ref.collection("genres").add({ Genre: name });
                await loadGroupContents();
                consolePrint(`Genre "${name}" added.`, "console-ok");
            } catch (error) {
                console.error("Console addgenre failed:", error);
                consolePrint("FAILED: the genre was not added.", "console-error");
            }
            return;
        }

        case "delgenre": {
            const genre = consoleState.customGenres.find(g => g.Genre.toLowerCase() === rest.trim().toLowerCase());
            if (!genre) return consolePrint(`No custom genre "${rest.trim()}". Built-in genres can't be deleted.`, "console-error");

            try {
                await ref.collection("genres").doc(genre.Id).delete();
                await loadGroupContents();
                consolePrint(`Genre "${genre.Genre}" deleted.`, "console-ok");
            } catch (error) {
                console.error("Console delgenre failed:", error);
                consolePrint("FAILED: the genre was not deleted.", "console-error");
            }
            return;
        }

        default:
            consolePrint(`Unknown command "${command}". Type "help".`, "console-error");
    }
}

/* ---------- Reading what was typed ---------- */

async function runConsole(text) {
    const trimmed = text.trim();

    // Answering a question (OK, a name, a runtime...)
    if (consoleState.ask) {
        const handler = consoleState.ask;
        // Enter takes the highlighted suggestion, if the question has any
        const suggestion = askSuggestions(trimmed)[consoleState.highlighted];
        const answer = suggestion ? suggestion.value : trimmed;

        consoleState.ask = null;
        consoleState.askSuggest = null;
        consolePrint(`> ${answer}`, "console-echo");
        await handler(answer);
        setPrompt();
        return;
    }

    const [word = "", ...restParts] = trimmed.split(" ");
    const command = word.toLowerCase();
    const rest = restParts.join(" ");

    // The start, the list search and the user search: commands, or pick a match
    if (["root", "lists", "users"].includes(consoleState.mode)) {
        if (command === "help") {
            consolePrint("> help", "console-echo");
            return printHelp();
        }

        if (command === "clear") {
            clearConsole();
            return;
        }

        if (consoleState.mode !== "root" && (command === "back" || command === "exit")) {
            consolePrint(`> ${command}`, "console-echo");
            return enterMode("root");
        }

        if (consoleState.mode !== "root" && command === "create") {
            consolePrint("> create", "console-echo");
            return consoleState.mode === "lists" ? createListFlow() : createUserFlow();
        }

        // Use what was typed (the input line is already cleared by now)
        const match = currentSuggestions(trimmed)[consoleState.highlighted];

        if (match && trimmed) {
            await match.pick();
        } else if (trimmed) {
            consolePrint(`> ${trimmed}`, "console-echo");
            consolePrint({
                root: 'Type "list" or "user" (or "help").',
                lists: "No list found.",
                users: "No user found."
            }[consoleState.mode], "console-error");
        }

        return;
    }

    consolePrint(`> ${trimmed}`, "console-echo");

    if (command === "help") return printHelp();
    if (command === "clear") { clearConsole(); return; }
    if (command === "exit") return backToRoot();

    if (command === "back") {
        if (consoleState.mode === "edit") {
            consoleState.mode = "group";
            setPrompt();
            consolePrint("Edit or Delete?", "console-dim");
        } else {
            enterMode(consoleState.mode === "user" ? "users" : "lists");
        }
        return;
    }

    if (consoleState.mode === "user") {
        if (!consoleState.user) return enterMode("users");
        if (command === "info") return printUser(consoleState.user);
        if (command === "block") return setUserBlocked(true);
        if (command === "unblock") return setUserBlocked(false);
        if (command === "delete" || command === "d" || command === "rm") return deleteUserFlow();
        consolePrint('Type block, unblock or delete (or "help").', "console-error");
        return;
    }

    if (consoleState.mode === "group") {
        if (command === "edit" || command === "e") return editGroupFlow();
        if (command === "delete" || command === "d" || command === "rm") return deleteGroupFlow();
        consolePrint('Type edit or delete (or "help").', "console-error");
        return;
    }

    await runEditCommand(command, rest);
}

// Text added in one go (paste, autocomplete, dictation) can leave the caret
// at the start; when the text simply grew at the end, keep the caret there
let lastConsoleValue = "";

consoleInput.addEventListener("input", () => {
    const value = consoleInput.value;

    if (consoleInput.selectionStart === 0 && value.length > lastConsoleValue.length && value.startsWith(lastConsoleValue)) {
        consoleInput.setSelectionRange(value.length, value.length);
    }

    lastConsoleValue = value;
    consoleState.highlighted = 0;
    renderSuggestions();
    renderLive();
});

// Moving the caret with ← → (or tapping) moves the block cursor too
["keyup", "click", "select"].forEach(type => {
    consoleInput.addEventListener(type, renderLive);
});

// The cursor only blinks while the terminal has focus
consoleInput.addEventListener("focus", () => consoleOutput.classList.add("is-focused"));
consoleInput.addEventListener("blur", () => consoleOutput.classList.remove("is-focused"));

consoleInput.addEventListener("keydown", async event => {
    const showing = consoleSuggestions.querySelectorAll(".console-suggestion");

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (!showing.length) return;
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        consoleState.highlighted = (consoleState.highlighted + step + showing.length) % showing.length;
        renderSuggestions();
        return;
    }

    if (event.key === "Escape") {
        consoleInput.value = "";
        lastConsoleValue = "";
        if (["group", "edit"].includes(consoleState.mode) && !consoleState.ask) enterMode("lists");
        if (consoleState.mode === "user" && !consoleState.ask) enterMode("users");
        renderSuggestions();
        return;
    }

    if (event.key === "Enter" && !consoleState.busy) {
        event.preventDefault();
        const text = consoleInput.value;
        consoleInput.value = "";
        lastConsoleValue = "";
        consoleState.busy = true;
        renderLive();

        try {
            await runConsole(text);
        } finally {
            consoleState.busy = false;
            renderSuggestions();
            renderLive();
        }
    }
});

// Clicking anywhere on the terminal lets you type in it (without jumping the page)
consoleOutput.addEventListener("click", event => {
    if (!event.target.closest(".console-suggestion")) {
        consoleInput.focus({ preventScroll: true });
    }
});

// Called when the admin page opens
function startConsole() {
    clearConsole();
    consoleInput.value = "";
    lastConsoleValue = "";
    consoleState.ask = null;
    consoleState.busy = false;
    backToRoot();
    consolePrint('MoviePicker console. Type "list" or "user", or help.', "console-dim");
}
