const defaultGenres = [
    "Action",
    "Adventure",
    "Animation",
    "Comedy",
    "Crime",
    "Drama",
    "Documentary",
    "Fantasy",
    "Horror",
    "Mystery",
    "Musical",
    "Romance",
    "Sci-Fi",
    "Thriller"
];
let genres = [];
let customGenres = [];
let movieBeingEditedId = null;
let movies = [];
let movieLists = [];
let selectedMovieList = "All";
let movieBeingAddedToListsId = null;
let selectedListsForNewMovie = [];
let addToListMode = "existing";





const genreContainer = document.getElementById("genreContainer");
const movieList = document.getElementById("movieList");
const addMovieButton = document.getElementById("addMovie");
const genreButton = document.getElementById("genreButton");
const randomMovieButton = document.getElementById("randomMovieButton");
const randomMovieResult = document.getElementById("randomMovieResult");
const filterGenreButton = document.getElementById("filterGenreButton");
const filterGenreContainer = document.getElementById("filterGenreContainer");
const filterHoursInput = document.getElementById("filterHours");
const filterMinutesInput = document.getElementById("filterMinutes");
const listFilterGenreButton = document.getElementById("listFilterGenreButton");
const listFilterGenreContainer = document.getElementById("listFilterGenreContainer");
const listFilterHoursInput = document.getElementById("listFilterHours");
const listFilterMinutesInput = document.getElementById("listFilterMinutes");
const showWatchedCheckbox = document.getElementById("showWatched");
const includeWatchedRandomCheckbox = document.getElementById("includeWatchedRandom");
const editModal = document.getElementById("editModal");
const editMovieName = document.getElementById("editMovieName");
const editMovieHours = document.getElementById("editMovieHours");
const editMovieMinutes = document.getElementById("editMovieMinutes");
const editGenreContainer = document.getElementById("editGenreContainer");
const saveEditButton = document.getElementById("saveEditButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const addGenreButton = document.getElementById("addGenreButton");
const genreModal = document.getElementById("genreModal");
const newGenreName = document.getElementById("newGenreName");
const confirmGenreButton = document.getElementById("confirmGenreButton");
const cancelGenreButton = document.getElementById("cancelGenreButton");
const movieSearch = document.getElementById("movieSearch");
const showAddSectionButton = document.getElementById("showAddSection");
const showPickSectionButton = document.getElementById("showPickSection");
const addSection = document.getElementById("addSection");
const pickSection = document.getElementById("pickSection");
const toggleFiltersButton = document.getElementById("toggleFiltersButton");
const filterSection = document.getElementById("filterSection");
const showWatchedText = document.getElementById("showWatchedText");
const addMovieListButton = document.getElementById("addMovieListButton");
const movieListButtons = document.getElementById("movieListButtons");
const movieListModal = document.getElementById("movieListModal");
const newMovieListName = document.getElementById("newMovieListName");
const newMovieListTag = document.getElementById("newMovieListTag");
const confirmMovieListButton = document.getElementById("confirmMovieListButton");
const cancelMovieListButton = document.getElementById("cancelMovieListButton");
const currentMovieList = document.getElementById("currentMovieList");
const addToListModal = document.getElementById("addToListModal");
const addToListOptions = document.getElementById("addToListOptions");
const saveMovieListsButton = document.getElementById("saveMovieListsButton");
const cancelAddToListButton = document.getElementById("cancelAddToListButton");
const selectListsForNewMovieButton = document.getElementById("selectListsForNewMovieButton");




/* //Functions\\ */

function loadGenres() {
    genres.forEach(genre => {
        const label = document.createElement("label");

        label.innerHTML = `
            <input type="checkbox" value="${genre}">
            ${genre}
        `;

        genreContainer.appendChild(label);
    });
}

function updateGenreButtonText() {
    const selectedGenres = getSelectedGenres();

    if (selectedGenres.length === 0) {
        genreButton.textContent = "Select genres ▼";
    } else if (selectedGenres.length <= 2) {
        genreButton.textContent = selectedGenres.join(", ") + " ▼";
    } else {
        genreButton.textContent = `${selectedGenres.length} genres selected`;
    }
}

function getSelectedGenres() {
    return [...document.querySelectorAll("#genreContainer input:checked")]
        .map(box => box.value);
}

async function loadMovies() {
    movies = await getMoviesFromDatabase();
    renderMovies();
}

async function addMovie() {
    const name = document.getElementById("movieName").value.trim();
    const hours = parseInt(document.getElementById("movieHours").value) || 0;
    const minutes = parseInt(document.getElementById("movieMinutes").value) || 0;

    const time = hours * 60 + minutes;

    const selectedGenres = getSelectedGenres();

    if (name === "") {
        alert("Please enter a movie name.");
        return;
    }

    if (minutes > 59) {
        alert("Minutes cannot be more than 59.");
        return;
    }

    if (time <= 0) {
        alert("Please enter a runtime.");
        return;
    }

    if (selectedGenres.length === 0) {
        alert("Please select at least one genre.");
        return;
    }

    const movie = {
        Name: name,
        Time: time,
        Genre: selectedGenres.join(","),
        Watched: false,
        Lists: selectedListsForNewMovie
    };

    const success = await addMovieToDatabase(movie);

    if (success) {
        clearForm();
        await loadMovies();
    }
}

function renderMovies() {
    movieList.innerHTML = "";

    const filteredMovies = getFilteredMoviesForList();


    filteredMovies.forEach(movie => {
        const card = document.createElement("div");
        card.classList.add("movie-card");

        const genreText = movie.Genre
            ? movie.Genre.split(",").join(" • ")
            : "No genre";

        card.innerHTML = `
            <div class="movie-card-header">
                <div>
                    <h3>${movie.Name}</h3>

                    ${movie.Watched ? `
                        <span class="watched-tag">
                            Watched
                            <button
                                class="remove-watched-button"
                                data-id="${movie.Id}"
                                title="Remove watched status">
                                ×
                            </button>
                        </span>
                    ` : ""}
                </div>
                
                <div class="movie-menu">
                    <button class="movie-menu-button">⋮</button>

                    <div class="movie-menu-content">

                        <button class="edit-movie-button" data-id="${movie.Id}">
                            Edit
                        </button>

                        <button class="add-to-list-button" data-id="${movie.Id}">
                            Add to List
                        </button>

                        <button class="mark-watched-button" data-id="${movie.Id}">
                            Mark as Watched
                        </button>

                        <button class="delete-movie-button" data-id="${movie.Id}" data-name="${movie.Name}">
                            Delete
                        </button>

                    </div>
                    
                </div>
            </div>

            <div class="movie-card-body">
                <p><strong>Genre:</strong> ${genreText}</p>
                <p><strong>Runtime:</strong> ${formatTime(movie.Time)}</p>
            </div>
        `;

        movieList.appendChild(card);
    });
}

function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) {
        return `${mins} min`;
    }

    if (mins === 0) {
        return `${hours}h`;
    }

    return `${hours}h ${mins}min`;
}

function clearForm() {
    document.getElementById("movieName").value = "";
    document.getElementById("movieHours").value = "";
    document.getElementById("movieMinutes").value = "";

    document.querySelectorAll("#genreContainer input")
        .forEach(box => box.checked = false);

    updateGenreButtonText();
}

genreButton.addEventListener("click", () => {
    genreContainer.style.display =
        genreContainer.style.display === "block" ? "none" : "block";
});

document.addEventListener("click", event => {
    if (!event.target.closest(".dropdown")) {
        genreContainer.style.display = "none";
        filterGenreContainer.style.display = "none";
        listFilterGenreContainer.style.display = "none";
    }
});

function pickRandomMovie() {
    const selectedFilterGenres = getSelectedFilterGenres();

    const filterHours = parseInt(filterHoursInput.value) || 0;
    const filterMinutes = parseInt(filterMinutesInput.value) || 0;
    const maxRuntime = filterHours * 60 + filterMinutes;

    let availableMovies;

    if (includeWatchedRandomCheckbox.checked) {
        availableMovies = [...movies];
    } else {
        availableMovies = movies.filter(movie => movie.Watched === false);
    }

    if (selectedMovieList !== "All") {
        availableMovies = availableMovies.filter(movie => {
            const assignedLists = Array.isArray(movie.Lists)
                ? movie.Lists
                : [];

        return assignedLists.includes(selectedMovieList);
    });
    }

    if (selectedFilterGenres.length > 0) {
        availableMovies = availableMovies.filter(movie => {
            const movieGenres = movie.Genre
                ? movie.Genre.split(",")
                : [];

            return selectedFilterGenres.some(genre => movieGenres.includes(genre));
        });
    }

    if (maxRuntime > 0) {
        availableMovies = availableMovies.filter(movie => movie.Time <= maxRuntime);
    }

        if (availableMovies.length === 0) {
            randomMovieResult.innerHTML = `
                <div class="random-result">
                    <h3>No movies available</h3>
                    <p>All movies are marked as watched.</p>
                </div>
            `;
            return;
    }

    const randomIndex = Math.floor(Math.random() * availableMovies.length);
    const selectedMovie = availableMovies[randomIndex];

    const genreText = selectedMovie.Genre
        ? selectedMovie.Genre.split(",").join(" • ")
        : "No genre";

   randomMovieResult.innerHTML = `
    <div class="random-result">

        <div class="random-info">
            <h3>Tonight's Movie</h3>

            <h2>${selectedMovie.Name}</h2>

            <p><strong>Genre:</strong> ${genreText}</p>

            <p><strong>Runtime:</strong> ${formatTime(selectedMovie.Time)}</p>
        </div>

        <div class="random-actions">
            <button
                class="random-watch-button"
                data-id="${selectedMovie.Id}">
                ✅ Mark as Watched
            </button>
        </div>

    </div>
`;
}

function loadFilterGenres() {
    genres.forEach(genre => {
        const label = document.createElement("label");

        label.innerHTML = `
            <input type="checkbox" value="${genre}">
            ${genre}
        `;

        filterGenreContainer.appendChild(label);
    });
}

function getSelectedFilterGenres() {
    return [...document.querySelectorAll("#filterGenreContainer input:checked")]
        .map(box => box.value);
}

function updateFilterGenreButtonText() {
    const selectedGenres = getSelectedFilterGenres();

    if (selectedGenres.length === 0) {
        filterGenreButton.textContent = "Select Genres ▼";
    } else if (selectedGenres.length <= 2) {
        filterGenreButton.textContent = selectedGenres.join(", ") + " ▼";
    } else {
        filterGenreButton.textContent = `${selectedGenres.length} genres selected ▼`;
    }
}

function loadListFilterGenres() {
    genres.forEach(genre => {
        const label = document.createElement("label");

        label.innerHTML = `
            <input type="checkbox" value="${genre}">
            ${genre}
        `;

        listFilterGenreContainer.appendChild(label);
    });
}

function getSelectedListFilterGenres() {
    return [...document.querySelectorAll("#listFilterGenreContainer input:checked")]
        .map(box => box.value);
}

function updateListFilterGenreButtonText() {
    const selectedGenres = getSelectedListFilterGenres();

    if (selectedGenres.length === 0) {
        listFilterGenreButton.textContent = "Filter Genres ▼";
    } else if (selectedGenres.length <= 2) {
        listFilterGenreButton.textContent = selectedGenres.join(", ") + " ▼";
    } else {
        listFilterGenreButton.textContent = `${selectedGenres.length} genres selected ▼`;
    }
}

function getFilteredMoviesForList() {

    const selectedGenres = getSelectedListFilterGenres();

    const searchText = movieSearch.value.trim().toLowerCase();

    const filterHours = parseInt(listFilterHoursInput.value) || 0;
    const filterMinutes = parseInt(listFilterMinutesInput.value) || 0;
    const maxRuntime = filterHours * 60 + filterMinutes;

    let filteredMovies;

    if (showWatchedCheckbox.checked) {
        filteredMovies = movies.filter(movie => movie.Watched === true);
    } else {
        filteredMovies = movies.filter(movie => movie.Watched === false);
    }

    // 🔍 Search filter
    if (searchText !== "") {
        filteredMovies = filteredMovies.filter(movie =>
            movie.Name.toLowerCase().includes(searchText)
        );
    }

    // 🎭 Genre filter
    if (selectedGenres.length > 0) {
        filteredMovies = filteredMovies.filter(movie => {
            const movieGenres = movie.Genre
                ? movie.Genre.split(",")
                : [];

            return selectedGenres.some(genre => movieGenres.includes(genre));
        });
    }

    // ⏱ Runtime filter
    if (maxRuntime > 0) {
        filteredMovies = filteredMovies.filter(movie => movie.Time <= maxRuntime);
    }

    if (selectedMovieList !== "All") {
        filteredMovies = filteredMovies.filter(movie => {
            const assignedLists = Array.isArray(movie.Lists)
                ? movie.Lists
                : [];

            return assignedLists.includes(selectedMovieList);
        });
    }

    return filteredMovies;
}

function loadEditGenres() {
    editGenreContainer.innerHTML = "";

    genres.forEach(genre => {
        const label = document.createElement("label");

        label.innerHTML = `
            <input type="checkbox" value="${genre}">
            ${genre}
        `;

        editGenreContainer.appendChild(label);
    });
}

function openEditModal(movie) {
    movieBeingEditedId = movie.Id;

    editMovieName.value = movie.Name;

    editMovieHours.value = Math.floor(movie.Time / 60);
    editMovieMinutes.value = movie.Time % 60;

    const movieGenres = movie.Genre
        ? movie.Genre.split(",")
        : [];

    document.querySelectorAll("#editGenreContainer input")
        .forEach(box => {
            box.checked = movieGenres.includes(box.value);
        });

    editModal.classList.remove("hidden");
}

function closeEditModal() {
    editModal.classList.add("hidden");
    movieBeingEditedId = null;
}

async function saveEditedMovie() {
    const name = editMovieName.value.trim();

    const hours = parseInt(editMovieHours.value) || 0;
    const minutes = parseInt(editMovieMinutes.value) || 0;
    const time = hours * 60 + minutes;

    const selectedGenres = [...document.querySelectorAll("#editGenreContainer input:checked")]
        .map(box => box.value);

    if (name === "") {
        alert("Please enter a movie name.");
        return;
    }

    if (minutes > 59) {
        alert("Minutes cannot be more than 59.");
        return;
    }

    if (time <= 0) {
        alert("Please enter a runtime.");
        return;
    }

    if (selectedGenres.length === 0) {
        alert("Please select at least one genre.");
        return;
    }

    const updatedMovie = {
        Name: name,
        Time: time,
        Genre: selectedGenres.join(",")
    };

    const success = await editMovieInDatabase(movieBeingEditedId, updatedMovie);

    if (success) {
        closeEditModal();
        await loadMovies();
    }
}

async function loadAllGenres() {
    customGenres = await getCustomGenresFromDatabase();

    const customGenreNames = customGenres.map(item => item.Genre);

    genres = [...defaultGenres, ...customGenreNames];

    genreContainer.innerHTML = "";
    filterGenreContainer.innerHTML = "";
    listFilterGenreContainer.innerHTML = "";
    editGenreContainer.innerHTML = "";

    loadGenres();
    loadFilterGenres();
    loadListFilterGenres();
    loadEditGenres();

    updateGenreButtonText();
    updateFilterGenreButtonText();
    updateListFilterGenreButtonText();

    renderCustomGenresInModal();
}

function renderCustomGenresInModal() {
    const customGenreList = document.getElementById("customGenreList");

    customGenreList.innerHTML = "";

    if (customGenres.length === 0) {
        customGenreList.innerHTML = "<p>No custom genres added.</p>";
        return;
    }

    customGenres.forEach(genre => {
        const row = document.createElement("div");
        row.classList.add("custom-genre-row");

        row.innerHTML = `
            <span class="genre-name">${genre.Genre}</span>

            <button
                class="delete-custom-genre-button"
                data-id="${genre.Id}">
                ✕
            </button>
`;

        customGenreList.appendChild(row);
    });
}

function openGenreModal() {
    newGenreName.value = "";
    genreModal.classList.remove("hidden");
}

function closeGenreModal() {
    genreModal.classList.add("hidden");
}

async function saveNewGenre() {
    const genreName = newGenreName.value.trim();

    if (genreName === "") {
        alert("Please enter a genre name.");
        return;
    }

    const genreExists = genres.some(
        genre => genre.toLowerCase() === genreName.toLowerCase()
    );

    if (genreExists) {
        alert("This genre already exists.");
        return;
    }

    const success = await addCustomGenreToDatabase(genreName);

    if (success) {
        closeGenreModal();
        await loadAllGenres();
    }
}

async function loadMovieLists() {
    movieLists = await getMovieListsFromDatabase();

    const selectedStillExists =
        selectedMovieList === "All" ||
        movieLists.some(list => list.Lists === selectedMovieList);

    if (!selectedStillExists) {
        selectedMovieList = "All";
    }

    renderMovieListButtons();
}

function renderMovieListButtons() {
    movieListButtons.innerHTML = "";

    const allButton = document.createElement("button");

    allButton.type = "button";
    allButton.classList.add("movie-list-button");
    allButton.dataset.list = "All";
    allButton.textContent = "All";

    if (selectedMovieList === "All") {
        allButton.classList.add("active-movie-list");
    }

    movieListButtons.appendChild(allButton);

    movieLists.forEach(list => {
        const wrapper = document.createElement("div");
        wrapper.classList.add("movie-list-button-wrapper");

        const button = document.createElement("button");

        button.type = "button";
        button.classList.add("movie-list-button");
        button.dataset.list = list.Lists;
        button.textContent = list.Tag;

        if (selectedMovieList === list.Lists) {
            button.classList.add("active-movie-list");
        }

        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.classList.add("delete-movie-list-button");
        deleteButton.dataset.id = list.Id;
        deleteButton.dataset.name = list.Lists;
        deleteButton.textContent = "×";
        deleteButton.setAttribute(
            "aria-label",
            `Delete ${list.Lists}`
        );

        wrapper.appendChild(button);
        wrapper.appendChild(deleteButton);

        movieListButtons.appendChild(wrapper);
    });
}

function openMovieListModal() {

    newMovieListName.value = "";
    newMovieListTag.value = "";

    movieListModal.classList.remove("hidden");
}

function closeMovieListModal() {
    movieListModal.classList.add("hidden");
}

async function saveNewMovieList() {

    const listName = newMovieListName.value.trim();
    let tagName = newMovieListTag.value.trim();

    if (listName === "") {
        alert("Please enter a list name.");
        return;
    }

    if (tagName === "") {
        tagName = listName.substring(0, 12);
    }

    if (tagName.length > 12) {
        alert("Button tag can only contain 12 characters.");
        return;
    }

    if (listName.toLowerCase() === "all") {
        alert('"All" is reserved.');
        return;
    }

    const exists = movieLists.some(list =>
        list.Lists.toLowerCase() === listName.toLowerCase()
    );

    if (exists) {
        alert("List already exists.");
        return;
    }

    const success =
        await addMovieListToDatabase(listName, tagName);

    if (!success) {
        alert("Could not create list.");
        return;
    }

    closeMovieListModal();

    await loadMovieLists();
}

function openAddToListModal(movie) {
    movieBeingAddedToListsId = movie.Id;

    const assignedLists = Array.isArray(movie.Lists)
        ? movie.Lists
        : [];

    addToListOptions.innerHTML = "";

    if (movieLists.length === 0) {
        addToListOptions.innerHTML =
            "<p>No movie lists have been created.</p>";
    } else {
        movieLists.forEach(list => {
            const label = document.createElement("label");

            const isChecked = assignedLists.includes(list.Lists);

            label.innerHTML = `
                <input
                    type="checkbox"
                    value="${list.Lists}"
                    ${isChecked ? "checked" : ""}>

                ${list.Lists}
            `;

            addToListOptions.appendChild(label);
        });
    }

    addToListModal.classList.remove("hidden");
}

function closeAddToListModal() {
    addToListModal.classList.add("hidden");
    movieBeingAddedToListsId = null;
}

async function saveMovieLists() {
    const selectedLists = [
        ...document.querySelectorAll(
            "#addToListOptions input:checked"
        )
    ].map(input => input.value);

    if (addToListMode === "new") {
        selectedListsForNewMovie = selectedLists;

        closeAddToListModal();
        return;
    }

    if (movieBeingAddedToListsId === null) {
        return;
    }

    const success = await updateMovieListsInDatabase(
        movieBeingAddedToListsId,
        selectedLists
    );

    if (!success) {
        return;
    }

    closeAddToListModal();
    await loadMovies();
}

function renderListOptions(selectedLists = []) {

    addToListOptions.innerHTML = "";

    if (movieLists.length === 0) {
        addToListOptions.innerHTML =
            "<p>No movie lists have been created.</p>";
    } else {

        movieLists.forEach(list => {

            const label = document.createElement("label");

            const checked =
                selectedLists.includes(list.Lists);

            label.innerHTML = `
                <input
                    type="checkbox"
                    value="${list.Lists}"
                    ${checked ? "checked" : ""}>

                ${list.Tag}
            `;

            addToListOptions.appendChild(label);

        });

    }

    const createButton = document.createElement("button");

    createButton.id = "createListFromAddMovieButton";
    createButton.type = "button";
    createButton.textContent = "Create New List";

    addToListOptions.appendChild(createButton);

}

function openListsForNewMovieModal() {
    addToListMode = "new";
    movieBeingAddedToListsId = null;

    renderListOptions(selectedListsForNewMovie);

    addToListModal.classList.remove("hidden");
}








genreContainer.addEventListener("change", updateGenreButtonText);

addMovieButton.addEventListener("click", addMovie);

randomMovieButton.addEventListener("click", pickRandomMovie);

saveEditButton.addEventListener("click", saveEditedMovie);

cancelEditButton.addEventListener("click", closeEditModal);

addGenreButton.addEventListener("click", openGenreModal);
confirmGenreButton.addEventListener("click", saveNewGenre);
cancelGenreButton.addEventListener("click", closeGenreModal);

movieSearch.addEventListener("input", renderMovies);



addToListOptions.addEventListener("click", event => {
    if (event.target.id !== "createListFromAddMovieButton") {
        return;
    }

    closeAddToListModal();
    openMovieListModal();
});


showWatchedCheckbox.addEventListener("change", () => {

    showWatchedText.textContent = showWatchedCheckbox.checked
        ? "Hide Watched"
        : "Show Watched";

    renderMovies();

});

genreModal.addEventListener("click", async event => {
    if (event.target.classList.contains("delete-custom-genre-button")) {
        const id = event.target.dataset.id;

        const success = await deleteCustomGenreFromDatabase(id);

        if (success) {
            await loadAllGenres();
        }
    }
});

newGenreName.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        saveNewGenre();
    }
});

movieList.addEventListener("click", async event => {

    if (event.target.classList.contains("movie-menu-button")) {
        const menu = event.target.nextElementSibling;
        const isOpen = menu.classList.contains("show");

        document.querySelectorAll(".movie-menu-content")
            .forEach(openMenu => openMenu.classList.remove("show"));

        if (!isOpen) {
            menu.classList.add("show");
        }

        return;
    }

    if (event.target.classList.contains("edit-movie-button")) {
        const id = Number(event.target.dataset.id);
        const movie = movies.find(movie => movie.Id === id);

        if (!movie) {
            alert("Movie not found.");
            return;
        }

        openEditModal(movie);
        return;
    }

    if (event.target.classList.contains("add-to-list-button")) {
        const id = Number(event.target.dataset.id);
        const movie = movies.find(movie => movie.Id === id);

        if (!movie) {
            alert("Movie not found.");
            return;
        }

        openAddToListModal(movie);
        return;
    }

    if (event.target.classList.contains("mark-watched-button")) {
        const id = event.target.dataset.id;

        const success = await markMovieAsWatched(id);

        if (success) {
            await loadMovies();
        }

        return;
    }

    if (event.target.classList.contains("remove-watched-button")) {
        const id = event.target.dataset.id;

        const success = await unmarkMovieAsWatched(id);

        if (success) {
            await loadMovies();
        }

        return;
    }

    if (event.target.classList.contains("delete-movie-button")) {
        const id = event.target.dataset.id;
        const name = event.target.dataset.name;

        if (!confirm(`Delete "${name}"?`)) {
            return;
        }

        const success = await deleteMovieFromDatabase(id);

        if (success) {
            await loadMovies();
        }

        return;
    }

});

document.addEventListener("click", event => {
    if (!event.target.closest(".movie-menu")) {
        document.querySelectorAll(".movie-menu-content")
            .forEach(menu => menu.classList.remove("show"));
    }
});

randomMovieResult.addEventListener("click", async event => {

    if (event.target.classList.contains("random-watch-button")) {

        const id = event.target.dataset.id;

        const success = await markMovieAsWatched(id);

        if (success) {

            randomMovieResult.innerHTML = `
                <div class="random-result">
                    <h3>🎉 Movie marked as watched!</h3>
                </div>
            `;

            await loadMovies();
        }
    }

});

filterGenreButton.addEventListener("click", () => {
    filterGenreContainer.style.display =
        filterGenreContainer.style.display === "block" ? "none" : "block";
});

filterGenreContainer.addEventListener("change", updateFilterGenreButtonText);


listFilterGenreButton.addEventListener("click", () => {
    listFilterGenreContainer.style.display =
        listFilterGenreContainer.style.display === "block" ? "none" : "block";
});

listFilterGenreContainer.addEventListener("change", () => {
    updateListFilterGenreButtonText();
    renderMovies();
});

listFilterHoursInput.addEventListener("input", renderMovies);
listFilterMinutesInput.addEventListener("input", renderMovies);

includeWatchedRandomCheckbox.addEventListener("change", () => {
    randomMovieResult.innerHTML = "";
});


editModal.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        saveEditedMovie();
    }
});

showAddSectionButton.addEventListener("click", () => {
    const isActive = showAddSectionButton.classList.contains("active-tab");

    addSection.classList.toggle("show-section", !isActive);
    pickSection.classList.remove("show-section");

    showAddSectionButton.classList.toggle("active-tab", !isActive);
    showPickSectionButton.classList.remove("active-tab");
});

showPickSectionButton.addEventListener("click", () => {
    const isActive = showPickSectionButton.classList.contains("active-tab");

    pickSection.classList.toggle("show-section", !isActive);
    addSection.classList.remove("show-section");

    showPickSectionButton.classList.toggle("active-tab", !isActive);
    showAddSectionButton.classList.remove("active-tab");
});


toggleFiltersButton.addEventListener("click", () => {

    filterSection.classList.toggle("show-filter-section");

    toggleFiltersButton.classList.toggle("active-filter");

    if (filterSection.classList.contains("show-filter-section")) {
        toggleFiltersButton.textContent = "Hide Filter";
    } else {
        toggleFiltersButton.textContent = "Finde Movies";
    }

});

addMovieListButton.addEventListener(
    "click",
    openMovieListModal
);

cancelMovieListButton.addEventListener(
    "click",
    closeMovieListModal
);

confirmMovieListButton.addEventListener(
    "click",
    saveNewMovieList
);

newMovieListName.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        saveNewMovieList();
    }
});

movieListButtons.addEventListener("click", async event => {
    const deleteButton = event.target.closest(
        ".delete-movie-list-button"
    );

    if (deleteButton) {
        const id = Number(deleteButton.dataset.id);
        const listName = deleteButton.dataset.name;

        const confirmed = confirm(
            `Delete the list "${listName}"?\n\n` +
            "The list will also be removed from all movies."
        );

        if (!confirmed) {
            return;
        }

        const removedFromMovies =
            await removeListFromAllMovies(listName);

        if (!removedFromMovies) {
            alert("The list could not be removed from the movies.");
            return;
        }

        const deleted =
            await deleteMovieListFromDatabase(id);

        if (!deleted) {
            return;
        }

        if (selectedMovieList === listName) {
            selectedMovieList = "All";
        }

        await loadMovieLists();
        await loadMovies();

        return;
    }

    const listButton = event.target.closest(".movie-list-button");

    if (!listButton) {
        return;
    }

    selectedMovieList = listButton.dataset.list;

    currentMovieList.innerHTML =
        `Current List: <em>${selectedMovieList}</em>`;

    renderMovieListButtons();
    renderMovies();
});

saveMovieListsButton.addEventListener(
    "click",
    saveMovieLists
);

cancelAddToListButton.addEventListener(
    "click",
    closeAddToListModal
);

selectListsForNewMovieButton.addEventListener(
    "click",
    openListsForNewMovieModal
);


//loadMovies();

//loadAllGenres();

/*
updateGenreButtonText();
loadFilterGenres();
updateFilterGenreButtonText();
loadListFilterGenres();
updateListFilterGenreButtonText();
loadEditGenres();
*/