async function getMoviesFromDatabase() {
    const { data, error } = await supabaseClient
        .from(TABLE_NAME)
        .select("*")
        .order("Id", { ascending: true });

    if (error) {
        console.error("Fejl ved hentning af film:", error);
        alert("Kunne ikke hente film fra Supabase.");
        return [];
    }

    return data;
}

async function addMovieToDatabase(movie) {
    const { error } = await supabaseClient
        .from(TABLE_NAME)
        .insert([movie]);

    if (error) {
        console.error("Fejl ved tilføjelse af film:", error);
        alert("Kunne ikke tilføje filmen til Supabase.");
        return false;
    }

    return true;
}

async function deleteMovieFromDatabase(id) {
    const { error } = await supabaseClient
        .from(TABLE_NAME)
        .delete()
        .eq("Id", id);

    if (error) {
        console.error("Error deleting movie:", error);
        alert("Could not delete the movie.");
        return false;
    }

    return true;
}

async function markMovieAsWatched(id) {
    const { error } = await supabaseClient
        .from(TABLE_NAME)
        .update({ Watched: true })
        .eq("Id", Number(id));

    if (error) {
        console.error("Error marking movie as watched:", error);
        alert("Could not mark movie as watched.");
        return false;
    }

    return true;
}

async function unmarkMovieAsWatched(id) {
    const { error } = await supabaseClient
        .from(TABLE_NAME)
        .update({ Watched: false })
        .eq("Id", Number(id));

    if (error) {
        console.error("Error unmarking movie as watched:", error);
        alert("Could not remove watched status.");
        return false;
    }

    return true;
}

async function editMovieInDatabase(id, updatedMovie) {
    const { error } = await supabaseClient
        .from(TABLE_NAME)
        .update(updatedMovie)
        .eq("Id", Number(id));

    if (error) {
        console.error("Error editing movie:", error);
        alert("Could not edit the movie.");
        return false;
    }

    return true;
}

async function getUserTable(userId) {
    const { data, error } = await supabaseClient
        .from("1_Users")
        .select("table_name")
        .eq("user_id", userId)
        .single();

    console.log("DATA:", data);
    console.log("ERROR:", error);

    if (error) {
        return null;
    }

    return data.table_name;
}

async function getCustomGenresFromDatabase() {
    const genreTableName = TABLE_NAME + "_Genre";

    const { data, error } = await supabaseClient
        .from(genreTableName)
        .select("Id, Genre")
        .order("Genre", { ascending: true });

    if (error) {
        console.error("Error loading custom genres:", error);
        return [];
    }

    return data;
}

async function addCustomGenreToDatabase(genreName) {
    const genreTableName = TABLE_NAME + "_Genre";

    const { error } = await supabaseClient
        .from(genreTableName)
        .insert([{ Genre: genreName }]);

    if (error) {
        console.error("Error adding custom genre:", error);
        alert("Could not add genre.");
        return false;
    }

    return true;
}

async function deleteCustomGenreFromDatabase(id) {
    const genreTableName = TABLE_NAME + "_Genre";

    const { error } = await supabaseClient
        .from(genreTableName)
        .delete()
        .eq("Id", Number(id));

    if (error) {
        console.error("Error deleting custom genre:", error);
        alert("Could not delete genre.");
        return false;
    }

    return true;
}

async function getMovieListsFromDatabase() {
    if (!TABLE_NAME) {
        return [];
    }

    const listTableName = `${TABLE_NAME}_Lists`;

    const { data, error } = await supabaseClient
        .from(listTableName)
        .select("*")
        .order("Lists", { ascending: true });

    if (error) {
        console.error("Error loading movie lists:", error);
        return [];
    }

    return data || [];
}

async function addMovieListToDatabase(listName, tagName) {

    if (!TABLE_NAME) {
        console.error("No movie table selected.");
        return false;
    }

    const listTableName = `${TABLE_NAME}_Lists`;

    const { error } = await supabaseClient
        .from(listTableName)
        .insert({
            Lists: listName,
            Tag: tagName
        });

    if (error) {
        console.error("Error creating movie list:", error);
        return false;
    }

    return true;
}

async function deleteMovieListFromDatabase(id) {
    if (!TABLE_NAME) {
        return false;
    }

    const listTableName = `${TABLE_NAME}_Lists`;

    const { error } = await supabaseClient
        .from(listTableName)
        .delete()
        .eq("Id", Number(id));

    if (error) {
        console.error("Error deleting movie list:", error);
        alert("Could not delete the movie list.");
        return false;
    }

    return true;
}

async function removeListFromAllMovies(listName) {
    const { data, error } = await supabaseClient
        .from(TABLE_NAME)
        .select("Id, Lists");

    if (error) {
        console.error("Error loading movies for list cleanup:", error);
        return false;
    }

    const affectedMovies = (data || []).filter(movie =>
        Array.isArray(movie.Lists) &&
        movie.Lists.includes(listName)
    );

    for (const movie of affectedMovies) {
        const updatedLists = movie.Lists.filter(
            list => list !== listName
        );

        const { error: updateError } = await supabaseClient
            .from(TABLE_NAME)
            .update({ Lists: updatedLists })
            .eq("Id", movie.Id);

        if (updateError) {
            console.error(
                `Error removing list from movie ${movie.Id}:`,
                updateError
            );

            return false;
        }
    }

    return true;
}

async function updateMovieListsInDatabase(id, lists) {
    const { error } = await supabaseClient
        .from(TABLE_NAME)
        .update({
            Lists: lists
        })
        .eq("Id", Number(id));

    if (error) {
        console.error("Error updating movie lists:", error);
        alert("Could not update movie lists.");
        return false;
    }

    return true;
}