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