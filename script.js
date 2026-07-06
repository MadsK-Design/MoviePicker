const genres = [
    "Action",
    "Adventure",
    "Animation",
    "Comedy",
    "Crime",
    "Drama",
    "Fantasy",
    "Horror",
    "Mystery",
    "Musical",
    "Romance",
    "Sci-Fi",
    "Thriller"
];

let movies = [];

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
        genreButton.textContent = `${selectedGenres.length} genres selected ▼`;
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
        Watched: false
    };

    const success = await addMovieToDatabase(movie);

    if (success) {
        clearForm();
        await loadMovies();
    }
}

function renderMovies() {
    movieList.innerHTML = "";

    movies.forEach(movie => {
        const card = document.createElement("div");
        card.classList.add("movie-card");

        const genreText = movie.Genre
            ? movie.Genre.split(",").join(" • ")
            : "No genre";

        card.innerHTML = `
            <div class="movie-card-header">
                <h3>${movie.Name}</h3>

                <div class="movie-menu">
                    <button class="movie-menu-button">⋮</button>

                    <div class="movie-menu-content">
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
    }
});

function pickRandomMovie() {
    const selectedFilterGenres = getSelectedFilterGenres();

    const filterHours = parseInt(filterHoursInput.value) || 0;
    const filterMinutes = parseInt(filterMinutesInput.value) || 0;
    const maxRuntime = filterHours * 60 + filterMinutes;

    let availableMovies = movies.filter(movie => movie.Watched === false);

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
        filterGenreButton.textContent = "Filter Genres ▼";
    } else if (selectedGenres.length <= 2) {
        filterGenreButton.textContent = selectedGenres.join(", ") + " ▼";
    } else {
        filterGenreButton.textContent = `${selectedGenres.length} genres selected ▼`;
    }
}

genreContainer.addEventListener("change", updateGenreButtonText);

addMovieButton.addEventListener("click", addMovie);

randomMovieButton.addEventListener("click", pickRandomMovie);

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

    if (event.target.classList.contains("mark-watched-button")) {
        const id = event.target.dataset.id;

        const success = await markMovieAsWatched(id);

        if (success) {
            await loadMovies();
        }
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



loadGenres();
updateGenreButtonText();
loadMovies();
loadFilterGenres();
updateFilterGenreButtonText();