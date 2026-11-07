const adminSection = document.getElementById("admin");
const adminLogoutButton = document.getElementById("adminLogoutButton");

const newUserUsername = document.getElementById("newUserUsername");
const newUserPassword = document.getElementById("newUserPassword");
const newUserGroup = document.getElementById("newUserGroup");
const newGroupName = document.getElementById("newGroupName");
const savePasswordInNotes = document.getElementById("savePasswordInNotes");
const createUserButton = document.getElementById("createUserButton");
const adminMessage = document.getElementById("adminMessage");
const adminUserList = document.getElementById("adminUserList");

const NEW_GROUP_VALUE = "__new__";

let adminUsers = [];
let adminGroups = [];
let adminNotes = {};

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

async function showAdminPage() {
    adminSection.classList.remove("hidden");
    await loadAdminData();
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

    adminUserList.innerHTML = adminUsers.map(user => {
        if (user.admin === true) {
            return `
                <div class="admin-user-card">
                    <div class="admin-user-header">
                        <h3>${escapeHtml(user.username || "admin")}</h3>
                        <span class="admin-badge">Admin</span>
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
                    Notes
                    <textarea class="admin-notes" rows="2">${escapeHtml(adminNotes[user.uid] || "")}</textarea>
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

        if (savePasswordInNotes.checked) {
            await db.collection("adminNotes").doc(uid).set({
                notes: `Password: ${password}`
            });
        }
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
    await auth.signOut();

    adminUserList.innerHTML = "";
    adminMessage.textContent = "";
    usernameInput.value = "";
    passwordInput.value = "";
    loginError.textContent = "";
});
