const adminSection = document.getElementById("admin");
const adminLogoutButton = document.getElementById("adminLogoutButton");

const newUserUsername = document.getElementById("newUserUsername");
const newUserPassword = document.getElementById("newUserPassword");
const newUserGroup = document.getElementById("newUserGroup");
const newGroupName = document.getElementById("newGroupName");
const createUserButton = document.getElementById("createUserButton");
const adminMessage = document.getElementById("adminMessage");
const adminUserList = document.getElementById("adminUserList");

const NEW_GROUP_VALUE = "__new__";

let adminUsers = [];
let adminGroups = [];
let adminNotes = {};

// Older cards were saved as "Password: 2507"; show just the password
function passwordFromNote(note) {
    return (note || "").replace(/^Password:\s*/i, "");
}

// A second Firebase app is used to create users, because creating a user
// signs that user in, and we don't want to log the admin out
const userCreatorApp = firebase.initializeApp(firebaseConfig, "userCreator");
const userCreatorAuth = userCreatorApp.auth();
userCreatorAuth.setPersistence(firebase.auth.Auth.Persistence.NONE);

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
}

function toGroupId(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/* //Hacker look: Matrix rain behind the admin page\\ */

const matrixCanvas = document.getElementById("matrixRain");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const MATRIX_CHARS = "アイウエオカキクケコサシスセソタチツテト0123456789ABCDEF$#@%&";
const MATRIX_FONT_SIZE = 14;

let matrixTimer = null;
let matrixDrops = [];

function resizeMatrixRain() {
    matrixCanvas.width = window.innerWidth;
    matrixCanvas.height = window.innerHeight;

    const columns = Math.ceil(matrixCanvas.width / MATRIX_FONT_SIZE);
    matrixDrops = Array.from({ length: columns }, () => Math.random() * -60);
}

function drawMatrixRain() {
    const context = matrixCanvas.getContext("2d");

    // A see-through black layer makes the old characters fade into trails
    context.fillStyle = "rgba(0, 0, 0, 0.08)";
    context.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);

    context.fillStyle = "#00ff41";
    context.font = `${MATRIX_FONT_SIZE}px monospace`;

    matrixDrops.forEach((row, column) => {
        const character = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];

        context.fillText(character, column * MATRIX_FONT_SIZE, row * MATRIX_FONT_SIZE);

        // Start the column again from the top at a random moment
        if (row * MATRIX_FONT_SIZE > matrixCanvas.height && Math.random() > 0.975) {
            matrixDrops[column] = 0;
        } else {
            matrixDrops[column] = row + 1;
        }
    });
}

function startMatrixRain() {
    themeColorMeta.setAttribute("content", "#000000");

    if (matrixTimer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    resizeMatrixRain();
    window.addEventListener("resize", resizeMatrixRain);
    matrixTimer = setInterval(drawMatrixRain, 50);
}

function stopMatrixRain() {
    themeColorMeta.setAttribute("content", "#ffffff");

    clearInterval(matrixTimer);
    matrixTimer = null;
    window.removeEventListener("resize", resizeMatrixRain);
}

/* //Hacking intro: plays while the admin data loads\\ */

const hackIntro = document.getElementById("hackIntro");
const hackIntroLog = document.getElementById("hackIntroLog");
const hackIntroProgress = document.getElementById("hackIntroProgress");
const hackIntroGranted = document.getElementById("hackIntroGranted");

const HACK_PROMPT = "root@hacker:~$ ";
const HACK_JUNK = "ABCDEF0123456789!@#$%&*?";

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function randomFrom(characters, length) {
    return Array.from(
        { length },
        () => characters[Math.floor(Math.random() * characters.length)]
    ).join("");
}

function hackPrint(text, className = "") {
    const line = document.createElement("span");

    line.className = className;
    line.textContent = `${text}\n`;

    hackIntroLog.appendChild(line);
    hackIntroLog.scrollTop = hackIntroLog.scrollHeight;

    return line;
}

// Types a command at the prompt like a person would, a bit unevenly
async function hackType(command) {
    const line = hackPrint(HACK_PROMPT, "hack-command");

    for (let i = 1; i <= command.length; i++) {
        line.textContent = `${HACK_PROMPT}${command.slice(0, i)}\n`;
        await sleep(5 + Math.random() * 12);
    }

    await sleep(60);
}

async function hackHexDump(rows) {
    for (let i = 0; i < rows; i++) {
        const address = `0x${randomFrom("0123456789abcdef", 4)}`;
        const bytes = Array.from({ length: 8 }, () => randomFrom("0123456789abcdef", 2)).join(" ");

        hackPrint(`${address}  ${bytes}`, "hack-dim");
        await sleep(25);
    }
}

// Characters spin until the "key" is found
async function hackCrack(label, length) {
    const line = hackPrint("");

    for (let round = 0; round < 10; round++) {
        line.textContent = `${label} ${randomFrom(HACK_JUNK, length)}\n`;
        await sleep(35);
    }

    line.textContent = `${label} ${"*".repeat(length)}  [FOUND]\n`;
    line.className = "hack-ok";
}

async function playHackScript() {
    await hackType("nmap -sS moviepicker.app");
    hackPrint("PORT     STATE  SERVICE", "hack-dim");
    hackPrint("22/tcp   open   ssh");
    hackPrint("443/tcp  open   https");
    await sleep(100);

    await hackType("./exploit --target moviepicker.app --user admin");

    for (const step of ["Bypassing firewall ..........", "Injecting payload ..........."]) {
        await sleep(80);
        hackPrint(`[*] ${step} OK`, "hack-ok");
    }

    await hackHexDump(3);
    await hackCrack("[*] Cracking admin key:", 12);
    await sleep(60);

    await hackType("decrypt --database users");
}

function drawHackProgress(percent) {
    const filled = Math.round(percent / 5);

    hackIntroProgress.textContent =
        `LOADING [${"█".repeat(filled)}${"░".repeat(20 - filled)}] ${Math.round(percent)}%`;
}

function startHackIntro() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return { finish: async () => {} };
    }

    hackIntroLog.textContent = "";
    hackIntroGranted.classList.add("hidden");
    hackIntro.classList.remove("hidden", "fade-out");

    const script = playHackScript();

    // The bar creeps towards 90% until the data has actually arrived
    let progress = 0;
    drawHackProgress(progress);

    const progressTimer = setInterval(() => {
        progress += (90 - progress) * 0.06;
        drawHackProgress(progress);
    }, 80);

    return {
        async finish() {
            await script;
            clearInterval(progressTimer);

            while (progress < 100) {
                progress = Math.min(100, progress + 4);
                drawHackProgress(progress);
                await sleep(20);
            }

            hackIntroGranted.classList.remove("hidden");
            await sleep(650);

            hackIntro.classList.add("fade-out");
            await sleep(450);
            hackIntro.classList.add("hidden");
        }
    };
}

async function showAdminPage() {
    adminSection.classList.remove("hidden");
    startMatrixRain();

    const intro = startHackIntro();

    await loadAdminData();
    await intro.finish();
}

async function loadAdminData() {
    try {
        const [usersSnapshot, groupsSnapshot, notesSnapshot] = await Promise.all([
            db.collection("users").get(),
            db.collection("groups").get(),
            db.collection("adminNotes").get()
        ]);

        adminUsers = usersSnapshot.docs
            .map(doc => ({ uid: doc.id, ...doc.data() }))
            .sort((a, b) => (a.username || "").localeCompare(b.username || ""));

        adminGroups = groupsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));

        adminNotes = {};
        notesSnapshot.docs.forEach(doc => {
            adminNotes[doc.id] = doc.data().notes || "";
        });
    } catch (error) {
        console.error("Error loading admin data:", error);
        adminMessage.textContent = "Could not load users. Are the Firestore rules published?";
        return;
    }

    renderGroupOptions();
    renderAdminUsers();
}

function groupOptionsHtml(selectedGroupId) {
    const groups = [...adminGroups];

    // Users can point to a group that has no groups/{id} document yet
    if (selectedGroupId && !groups.some(group => group.id === selectedGroupId)) {
        groups.push({ id: selectedGroupId, name: selectedGroupId });
    }

    return groups.map(group => `
        <option value="${escapeHtml(group.id)}" ${group.id === selectedGroupId ? "selected" : ""}>
            ${escapeHtml(group.name || group.id)}
        </option>
    `).join("");
}

function renderGroupOptions() {
    newUserGroup.innerHTML = `
        <option value="" disabled selected>Choose group…</option>
        ${groupOptionsHtml("")}
        <option value="${NEW_GROUP_VALUE}">+ New group…</option>
    `;

    newGroupName.classList.add("hidden");
}

function renderAdminUsers() {
    if (adminUsers.length === 0) {
        adminUserList.innerHTML = "<p>No users yet.</p>";
        return;
    }

    const normalUsers = adminUsers.filter(user => user.admin !== true);
    const blockedCount = normalUsers.filter(user => user.blocked).length;

    adminUserList.innerHTML = adminUsers.map(user => {
        if (user.admin === true) {
            return `
                <div class="admin-user-card admin-self-card">
                    <div class="admin-user-header">
                        <h3>${escapeHtml(user.username || "admin")}</h3>
                        <span class="admin-badge">Admin</span>
                    </div>

                    <div class="admin-stats">
                        <p><span>Role</span> root</p>
                        <p><span>Access</span> all groups</p>
                        <p><span>Users</span> ${normalUsers.length}</p>
                        <p><span>Groups</span> ${adminGroups.length}</p>
                        <p><span>Blocked</span> ${blockedCount}</p>
                        <p><span>Status</span> <b class="status-online">● Online</b></p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="admin-user-card ${user.blocked ? "blocked-user" : ""}" data-uid="${user.uid}">
                <div class="admin-user-header">
                    <h3>${escapeHtml(user.username || user.uid)}</h3>
                    ${user.blocked ? `<span class="admin-badge blocked">Blocked</span>` : ""}
                </div>

                <label class="admin-field">
                    Group
                    <select class="admin-group-select">
                        ${groupOptionsHtml(user.groupId)}
                    </select>
                </label>

                <label class="admin-field">
                    Password
                    <input type="text" class="admin-notes" autocomplete="off"
                           value="${escapeHtml(passwordFromNote(adminNotes[user.uid]))}">
                </label>

                <div class="admin-user-actions">
                    <button type="button" class="admin-save-notes-button">Save</button>
                    <button type="button" class="admin-block-button">
                        ${user.blocked ? "Unblock" : "Block"}
                    </button>
                    <button type="button" class="admin-remove-button">Remove</button>
                </div>
            </div>
        `;
    }).join("");
}

async function createGroupIfNeeded(groupName) {
    const groupId = toGroupId(groupName);

    if (!groupId) {
        return null;
    }

    if (!adminGroups.some(group => group.id === groupId)) {
        await db.collection("groups").doc(groupId).set({
            name: groupName.trim(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    return groupId;
}

async function createUser() {
    const username = newUserUsername.value.trim().toLowerCase();
    const password = newUserPassword.value;
    let groupId = newUserGroup.value;

    adminMessage.textContent = "";

    if (!/^[a-z0-9._-]+$/.test(username)) {
        adminMessage.textContent = "Username can only use a-z, 0-9, dot, dash and underscore.";
        return;
    }

    if (password === "") {
        adminMessage.textContent = "Please enter a password.";
        return;
    }

    if (!groupId) {
        adminMessage.textContent = "Please choose a group.";
        return;
    }

    if (groupId === NEW_GROUP_VALUE && newGroupName.value.trim() === "") {
        adminMessage.textContent = "Please enter a name for the new group.";
        return;
    }

    createUserButton.disabled = true;

    let uid;

    try {
        const credential = await userCreatorAuth.createUserWithEmailAndPassword(
            usernameToEmail(username),
            padPassword(password)
        );

        uid = credential.user.uid;
        await userCreatorAuth.signOut();
    } catch (error) {
        console.error("Error creating login:", error);

        adminMessage.textContent = error.code === "auth/email-already-in-use"
            ? `The username "${username}" is already taken.`
            : "Could not create the login.";

        createUserButton.disabled = false;
        return;
    }

    try {
        if (groupId === NEW_GROUP_VALUE) {
            groupId = await createGroupIfNeeded(newGroupName.value);
        }

        await db.collection("users").doc(uid).set({
            username: username,
            groupId: groupId,
            blocked: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Every new user gets their password saved on their card
        await db.collection("adminNotes").doc(uid).set({
            notes: password
        });
    } catch (error) {
        console.error("Error linking user to group:", error);
        adminMessage.textContent =
            `The login "${username}" was created, but could not be linked to a group. ` +
            "Delete it in the Firebase console and try again.";
        createUserButton.disabled = false;
        return;
    }

    newUserUsername.value = "";
    newUserPassword.value = "";
    newGroupName.value = "";
    createUserButton.disabled = false;

    adminMessage.textContent = `Created "${username}".`;

    await loadAdminData();
}

async function updateUser(uid, changes) {
    try {
        await db.collection("users").doc(uid).update(changes);
        return true;
    } catch (error) {
        console.error("Error updating user:", error);
        alert("Could not update the user.");
        return false;
    }
}

async function removeUser(uid) {
    const user = adminUsers.find(user => user.uid === uid);

    const confirmed = confirm(
        `Remove "${user.username}" from MoviePicker?\n\n` +
        "Their group's movies are kept. The login itself must also be " +
        "deleted in the Firebase console under Authentication → Users."
    );

    if (!confirmed) {
        return;
    }

    try {
        await db.collection("users").doc(uid).delete();
        await db.collection("adminNotes").doc(uid).delete();
    } catch (error) {
        console.error("Error removing user:", error);
        alert("Could not remove the user.");
        return;
    }

    await loadAdminData();
}

newUserGroup.addEventListener("change", () => {
    newGroupName.classList.toggle("hidden", newUserGroup.value !== NEW_GROUP_VALUE);
});

createUserButton.addEventListener("click", createUser);

adminUserList.addEventListener("change", async event => {
    if (!event.target.classList.contains("admin-group-select")) {
        return;
    }

    const uid = event.target.closest(".admin-user-card").dataset.uid;

    if (await updateUser(uid, { groupId: event.target.value })) {
        await loadAdminData();
    }
});

adminUserList.addEventListener("click", async event => {
    const card = event.target.closest(".admin-user-card");

    if (!card || !card.dataset.uid) {
        return;
    }

    const uid = card.dataset.uid;

    if (event.target.classList.contains("admin-save-notes-button")) {
        const notes = card.querySelector(".admin-notes").value;

        try {
            await db.collection("adminNotes").doc(uid).set({ notes: notes });
            event.target.textContent = "Saved ✓";
            setTimeout(() => event.target.textContent = "Save", 1500);
        } catch (error) {
            console.error("Error saving notes:", error);
            alert("Could not save notes.");
        }

        return;
    }

    if (event.target.classList.contains("admin-block-button")) {
        const user = adminUsers.find(user => user.uid === uid);

        if (await updateUser(uid, { blocked: !user.blocked })) {
            await loadAdminData();
        }

        return;
    }

    if (event.target.classList.contains("admin-remove-button")) {
        await removeUser(uid);
    }
});

adminLogoutButton.addEventListener("click", async () => {
    stopMatrixRain();
    await auth.signOut();

    adminUserList.innerHTML = "";
    adminMessage.textContent = "";
    usernameInput.value = "";
    passwordInput.value = "";
    loginError.textContent = "";
});
