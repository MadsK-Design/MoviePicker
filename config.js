const firebaseConfig = {
    apiKey: "AIzaSyBpdcWklQqPjC8OUf-4WshzexyfHnrdY-Y",
    authDomain: "moviepicker-4c066.firebaseapp.com",
    projectId: "moviepicker-4c066",
    storageBucket: "moviepicker-4c066.firebasestorage.app",
    messagingSenderId: "413490129843",
    appId: "1:413490129843:web:01b073ffb5be4888a539c6"
};

// Usernames are turned into fake emails like "mads@moviepicker.app"
const EMAIL_DOMAIN = "moviepicker.app";

let GROUP_ID = "";

// The second app (the "MP Admin" icon) is the page at /admin/ (or the old
// "?admin" address). It runs as its own Firebase app, so it keeps its own
// login: you can be logged in to your list in the normal app and as admin in
// this one at the same time.
const IS_SECOND_APP = Boolean(document.querySelector('meta[name="app-variant"][content="admin"]')) ||
    new URLSearchParams(location.search).has("admin");

const mainApp = IS_SECOND_APP
    ? firebase.initializeApp(firebaseConfig, "secondApp")
    : firebase.initializeApp(firebaseConfig);

const auth = mainApp.auth();
const db = mainApp.firestore();

// Keep a copy of the data on the device, so the app opens instantly
// and still shows movies with bad reception
db.enablePersistence({ synchronizeTabs: true }).catch(error => {
    console.warn("Offline cache not available:", error.code);
});
