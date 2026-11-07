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

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// Keep a copy of the data on the device, so the app opens instantly
// and still shows movies with bad reception
db.enablePersistence({ synchronizeTabs: true }).catch(error => {
    console.warn("Offline cache not available:", error.code);
});
