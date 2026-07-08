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