#!/usr/bin/env bash
# Makes admin/index.html: the second app ("MP Admin"), with its own login,
# name and icon. It's a copy of index.html with the icon tags swapped, so
# iPhones see the admin icon right in the page when you add it to the
# Home Screen. The deploy workflow runs this; there's no need to commit admin/.
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p admin

sed \
    -e 's#<head>#<head>\n    <base href="../">\n    <meta name="app-variant" content="admin">#' \
    -e 's#<title>Movie Picker</title>#<title>MP Admin</title>#' \
    -e 's#href="manifest.json"#href="manifest-admin.json"#' \
    -e 's#href="icons/icon-192.png"#href="icons/admin-icon-192.png"#' \
    -e 's#href="icons/apple-touch-icon.png"#href="icons/admin-apple-touch-icon.png"#' \
    -e 's#name="apple-mobile-web-app-title" content="Movie Picker"#name="apple-mobile-web-app-title" content="MP Admin"#' \
    index.html > admin/index.html

echo "made admin/index.html"
