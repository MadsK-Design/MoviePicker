// Every group keeps its data in groups/{GROUP_ID}/movies, /genres and /lists
function groupCollection(name) {
    return db.collection("groups").doc(GROUP_ID).collection(name);
}

function snapshotToRows(snapshot) {
    return snapshot.docs.map(doc => ({ Id: doc.id, ...doc.data() }));
}

async function getMoviesFromDatabase() {
    try {
        const snapshot = await groupCollection("movies")
            .orderBy("createdAt", "asc")
            .get();

        return snapshotToRows(snapshot);
    } catch (error) {
        console.error("Error loading movies:", error);
        alert("Could not load movies.");
        return [];
    }
}

async function addMovieToDatabase(movie) {
    try {
        await groupCollection("movies").add({
            ...movie,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error("Error adding movie:", error);
        alert("Could not add the movie.");
        return false;
    }
}

async function deleteMovieFromDatabase(id) {
    try {
        await groupCollection("movies").doc(id).delete();
        return true;
    } catch (error) {
        console.error("Error deleting movie:", error);
        alert("Could not delete the movie.");
        return false;
    }
}

async function markMovieAsWatched(id) {
    try {
        await groupCollection("movies").doc(id).update({ Watched: true });
        return true;
    } catch (error) {
        console.error("Error marking movie as watched:", error);
        alert("Could not mark movie as watched.");
        return false;
    }
}

async function unmarkMovieAsWatched(id) {
    try {
        await groupCollection("movies").doc(id).update({ Watched: false });
        return true;
    } catch (error) {
        console.error("Error unmarking movie as watched:", error);
        alert("Could not remove watched status.");
        return false;
    }
}

async function editMovieInDatabase(id, updatedMovie) {
    try {
        await groupCollection("movies").doc(id).update(updatedMovie);
        return true;
    } catch (error) {
        console.error("Error editing movie:", error);
        alert("Could not edit the movie.");
        return false;
    }
}

// Returns { username, groupId, admin, blocked } or null
async function getUserProfile(userId) {
    try {
        const doc = await db.collection("users").doc(userId).get();
        return doc.exists ? doc.data() : null;
    } catch (error) {
        console.error("Error loading user profile:", error);
        return null;
    }
}

async function getCustomGenresFromDatabase() {
    try {
        const snapshot = await groupCollection("genres")
            .orderBy("Genre", "asc")
            .get();

        return snapshotToRows(snapshot);
    } catch (error) {
        console.error("Error loading custom genres:", error);
        return [];
    }
}

async function addCustomGenreToDatabase(genreName) {
    try {
        await groupCollection("genres").add({ Genre: genreName });
        return true;
    } catch (error) {
        console.error("Error adding custom genre:", error);
        alert("Could not add genre.");
        return false;
    }
}

async function deleteCustomGenreFromDatabase(id) {
    try {
        await groupCollection("genres").doc(id).delete();
        return true;
    } catch (error) {
        console.error("Error deleting custom genre:", error);
        alert("Could not delete genre.");
        return false;
    }
}

async function getMovieListsFromDatabase() {
    if (!GROUP_ID) {
        return [];
    }

    try {
        const snapshot = await groupCollection("lists")
            .orderBy("Lists", "asc")
            .get();

        return snapshotToRows(snapshot);
    } catch (error) {
        console.error("Error loading movie lists:", error);
        return [];
    }
}

async function addMovieListToDatabase(listName, tagName) {
    if (!GROUP_ID) {
        console.error("No group selected.");
        return false;
    }

    try {
        await groupCollection("lists").add({
            Lists: listName,
            Tag: tagName
        });

        return true;
    } catch (error) {
        console.error("Error creating movie list:", error);
        return false;
    }
}

async function deleteMovieListFromDatabase(id) {
    if (!GROUP_ID) {
        return false;
    }

    try {
        await groupCollection("lists").doc(id).delete();
        return true;
    } catch (error) {
        console.error("Error deleting movie list:", error);
        alert("Could not delete the movie list.");
        return false;
    }
}

async function removeListFromAllMovies(listName) {
    try {
        const snapshot = await groupCollection("movies")
            .where("Lists", "array-contains", listName)
            .get();

        const batch = db.batch();

        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, {
                Lists: firebase.firestore.FieldValue.arrayRemove(listName)
            });
        });

        await batch.commit();
        return true;
    } catch (error) {
        console.error("Error removing list from movies:", error);
        return false;
    }
}

async function updateMovieListsInDatabase(id, lists) {
    try {
        await groupCollection("movies").doc(id).update({ Lists: lists });
        return true;
    } catch (error) {
        console.error("Error updating movie lists:", error);
        alert("Could not update movie lists.");
        return false;
    }
}
