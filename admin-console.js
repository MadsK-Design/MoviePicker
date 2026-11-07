// The admin console: a small terminal for managing lists (groups).
// Type to find a list, pick it with the arrow keys or a click, then
// choose Edit or Delete. "help" always shows what you can type right now.

const consoleOutput = document.getElementById("consoleOutput");
const consoleInput = document.getElementById("consoleInput");
const consolePrompt = document.getElementById("consolePrompt");
const consoleSuggestions = document.getElementById("consoleSuggestions");
const consoleLive = document.getElementById("consoleLive");
const consoleTyped = document.getElementById("consoleTyped");

const consoleState = {
    mode: "root",          // "root" | "group" | "edit"
    group: null,           // { id, name }
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
    const path = consoleState.mode === "root"
        ? "~"
        : consoleState.mode === "group"
            ? `~/${consoleState.group.id}`
            : `~/${consoleState.group.id}/edit`;

    consolePrompt.textContent = consoleState.ask ? ">" : `root@moviepicker:${path}$`;
    renderLive();
}

function ask(question, handler, className = "console-warn") {
    consolePrint(question, className);
    consoleState.ask = handler;
    setPrompt();
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
        "Type the name of a list to find it.",
        "  ↑ ↓ + Enter, or click   open the list",
        "  clear                   clear the screen"
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

/* ---------- Step 1: find a list ---------- */

function matchingGroups(text = consoleInput.value) {
    const query = text.trim().toLowerCase();

    return adminGroups.filter(group =>
        !query || group.id.includes(query) || (group.name || "").toLowerCase().includes(query)
    );
}

function renderSuggestions() {
    const showList = consoleState.mode === "root" && !consoleState.ask && !consoleState.busy;
    const typed = consoleInput.value.trim().toLowerCase();
    const groups = showList && !["help", "clear"].includes(typed) ? matchingGroups() : [];

    consoleState.highlighted = Math.min(consoleState.highlighted, Math.max(groups.length - 1, 0));
    consoleSuggestions.innerHTML = "";

    groups.forEach((group, index) => {
        const users = adminUsers.filter(user => user.groupId === group.id).length;
        const item = document.createElement("button");

        item.type = "button";
        item.className = `console-suggestion ${index === consoleState.highlighted ? "is-highlighted" : ""}`;
        item.textContent = `${group.name || group.id}   ${users} user${users === 1 ? "" : "s"}`;
        item.addEventListener("mousedown", event => event.preventDefault());
        item.addEventListener("click", () => openGroup(group));

        consoleSuggestions.appendChild(item);
    });

    if (showList && typed && groups.length === 0 && !["help", "clear"].includes(typed)) {
        consoleSuggestions.innerHTML = `<div class="console-suggestion-empty">no list matches "${escapeHtml(typed)}"</div>`;
    }
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
    consoleState.mode = "root";
    consoleState.group = null;
    consoleState.ask = null;
    setPrompt();
    renderSuggestions();
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
        backToRoot();
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
        consoleState.ask = null;
        consolePrint(`> ${trimmed}`, "console-echo");
        await handler(trimmed);
        setPrompt();
        return;
    }

    const [word = "", ...restParts] = trimmed.split(" ");
    const command = word.toLowerCase();
    const rest = restParts.join(" ");

    if (consoleState.mode === "root") {
        if (command === "help") {
            consolePrint("> help", "console-echo");
            return printHelp();
        }

        if (command === "clear") {
            clearConsole();
            return;
        }

        // Use what was typed (the input line is already cleared by now)
        const group = matchingGroups(trimmed)[consoleState.highlighted];

        if (group) {
            await openGroup(group);
        } else if (trimmed) {
            consolePrint(`> ${trimmed}`, "console-echo");
            consolePrint("No list found.", "console-error");
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
            backToRoot();
        }
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
        if (consoleState.mode !== "root" && !consoleState.ask) backToRoot();
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
    consolePrint("MoviePicker console. Type a list's name, or help.", "console-dim");
}
