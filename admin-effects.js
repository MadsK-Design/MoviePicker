// Hacker effects for the admin page. admin.js calls these at the right moments.
// Every effect is skipped when the device has "Reduce Motion" turned on.

const ADMIN_GLYPHS = "ABCDEF0123456789#$%&@!?<>*";

const adminReduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 1. Values "decrypt" into place ---------- */

// Random characters that settle into the real text one letter at a time
function decryptText(element, duration = 700) {
    const target = element.dataset.text ?? element.textContent;
    element.dataset.text = target;

    if (adminReduceMotion() || !target) {
        element.textContent = target;
        return;
    }

    const start = performance.now();

    function frame(now) {
        const progress = Math.min(1, (now - start) / duration);
        const revealed = Math.floor(progress * target.length);
        const scrambled = [...target.slice(revealed)]
            .map(character => character === " " ? " " : randomFrom(ADMIN_GLYPHS, 1))
            .join("");

        element.textContent = target.slice(0, revealed) + scrambled;

        if (progress < 1) {
            requestAnimationFrame(frame);
        }
    }

    requestAnimationFrame(frame);
}

function decryptUserCards() {
    adminUserList.querySelectorAll(".admin-info-value").forEach((element, i) => {
        setTimeout(() => decryptText(element, 450 + Math.random() * 450), i * 40);
    });
}

/* ---------- 2. Messages type themselves out ---------- */

let messageTyping = 0;

async function typeInto(element, text, speed = 16) {
    if (adminReduceMotion()) {
        element.textContent = text;
        return;
    }

    for (let i = 1; i <= text.length; i++) {
        element.textContent = text.slice(0, i);
        await sleep(speed);
    }
}

async function typeAdminMessage(text, isError = false) {
    const id = ++messageTyping;

    adminMessage.className = isError ? "is-error is-typing" : "is-typing";
    adminMessage.textContent = "";

    if (adminReduceMotion()) {
        adminMessage.textContent = text;
    } else {
        for (let i = 1; i <= text.length; i++) {
            if (id !== messageTyping) {
                return;
            }

            adminMessage.textContent = text.slice(0, i);
            await sleep(16);
        }
    }

    if (id === messageTyping) {
        adminMessage.classList.remove("is-typing");
    }
}

function clearAdminMessage() {
    messageTyping++;
    adminMessage.className = "";
    adminMessage.textContent = "";
}

/* ---------- 5. Create User runs as a "process" ---------- */

// The message area becomes a small log; each step types itself out
function startProcessLog() {
    messageTyping++;
    adminMessage.className = "is-log";
    adminMessage.textContent = "";
}

async function logStep(text, className = "") {
    const line = document.createElement("div");
    line.className = `process-line ${className}`;
    adminMessage.appendChild(line);

    await typeInto(line, text, 14);
    return line;
}

function logResult(line, ok) {
    const result = document.createElement("b");
    result.className = ok ? "process-ok" : "process-fail";
    result.textContent = ok ? " OK" : " FAILED";
    line.appendChild(result);
}

/* ---------- 6. Block: lockdown stamp ---------- */

async function playLockdown(card, locking) {
    if (adminReduceMotion()) {
        return;
    }

    const stamp = document.createElement("div");
    stamp.className = `card-stamp ${locking ? "is-locked" : "is-unlocked"}`;
    stamp.textContent = locking ? "LOCKED" : "UNLOCKED";

    card.classList.add(locking ? "is-locking" : "is-unlocking");
    card.appendChild(stamp);

    await sleep(900);
}

/* ---------- 7. Remove: the card melts into falling characters ---------- */

async function playWipe(card) {
    if (adminReduceMotion()) {
        return;
    }

    const rain = document.createElement("div");
    rain.className = "card-wipe";

    for (let i = 0; i < 14; i++) {
        const column = document.createElement("span");
        column.textContent = randomFrom(ADMIN_GLYPHS, 14).split("").join("\n");
        column.style.left = `${(i / 14) * 100}%`;
        column.style.animationDelay = `${(Math.random() * .3).toFixed(2)}s`;
        rain.appendChild(column);
    }

    card.classList.add("is-wiping");
    card.appendChild(rain);

    await sleep(1100);
}

/* ---------- 8. Group change: transfer progress bar ---------- */

async function playTransfer(card) {
    if (adminReduceMotion()) {
        return;
    }

    const overlay = document.createElement("div");
    overlay.className = "card-transfer";
    overlay.innerHTML = `<span>TRANSFERRING USER...</span><span class="card-transfer-bar"></span>`;
    card.appendChild(overlay);

    const bar = overlay.querySelector(".card-transfer-bar");

    for (let percent = 0; percent <= 100; percent += 5) {
        const filled = Math.round(percent / 10);
        bar.textContent = `[${"█".repeat(filled)}${"░".repeat(10 - filled)}] ${percent}%`;
        await sleep(40);
    }

    await sleep(150);
}

/* ---------- 9. System log ---------- */

const adminSystemLog = document.getElementById("adminSystemLog");
const LOG_LINES = 7;

let systemLogTimer = null;

const randomNumber = (min, max) => Math.floor(min + Math.random() * (max - min + 1));
const randomIp = () => `${randomNumber(11, 223)}.${randomNumber(0, 255)}.${randomNumber(0, 255)}.${randomNumber(1, 254)}`;

const LOG_MESSAGES = [
    () => "heartbeat ok",
    () => `scanning port ${randomNumber(20, 9000)}... closed`,
    () => `firewall: blocked ${randomIp()}`,
    () => "sync users -> firestore ... ok",
    () => "rotating session keys ... done",
    () => "intrusion check ... clean",
    () => `cache flushed (${randomNumber(12, 980)} KB)`,
    () => `trace ${randomIp()} -> 10.0.0.${randomNumber(2, 254)}`,
    () => "watchdog: all systems nominal",
    () => `packets in/out ${randomNumber(100, 999)}/${randomNumber(100, 999)}`,
    () => `checksum 0x${randomFrom("0123456789abcdef", 8)} ... valid`
];

function timeStamp() {
    return new Date().toTimeString().slice(0, 8);
}

function addSystemLogLine() {
    const message = LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)]();
    const line = document.createElement("div");
    line.textContent = `[${timeStamp()}] ${message}`;

    adminSystemLog.appendChild(line);

    while (adminSystemLog.children.length > LOG_LINES) {
        adminSystemLog.firstChild.remove();
    }
}

function startSystemLog() {
    stopSystemLog();
    adminSystemLog.textContent = "";

    for (let i = 0; i < 4; i++) {
        addSystemLogLine();
    }

    const next = () => {
        systemLogTimer = setTimeout(() => {
            addSystemLogLine();
            next();
        }, 1200 + Math.random() * 1800);
    };

    next();
}

function stopSystemLog() {
    clearTimeout(systemLogTimer);
    systemLogTimer = null;
}

/* ---------- 10. Uptime and clock in the top bar ---------- */

const adminUptime = document.getElementById("adminUptime");
let uptimeTimer = null;

function startUptime() {
    stopUptime();

    const startedAt = Date.now();

    const draw = () => {
        const seconds = Math.floor((Date.now() - startedAt) / 1000);
        const parts = [seconds / 3600, (seconds / 60) % 60, seconds % 60]
            .map(n => String(Math.floor(n)).padStart(2, "0"));

        adminUptime.textContent = `UPTIME ${parts.join(":")} · ${timeStamp()}`;
    };

    draw();
    uptimeTimer = setInterval(draw, 1000);
}

function stopUptime() {
    clearInterval(uptimeTimer);
    uptimeTimer = null;
    adminUptime.textContent = "";
}

/* ---------- 11. CRT "power on" after the intro ---------- */

async function playPowerOn() {
    if (adminReduceMotion()) {
        return;
    }

    const screen = document.createElement("div");
    screen.className = "crt-power";
    screen.innerHTML = `<div class="crt-half crt-top"></div><div class="crt-line"></div><div class="crt-half crt-bottom"></div>`;
    adminSection.appendChild(screen);

    await sleep(750);
    screen.remove();
}

/* ---------- 15. Random glitch: text flickers, jumps, snaps back ---------- */

// Headings, the user cards' username/password and the phone menu labels
const GLITCH_TARGETS = [
    "#admin .top-bar h1",
    "#admin .admin-card h2",
    "#admin .admin-user-card .admin-info-value",
    "#admin .admin-nav-button span"
].join(", ");

let glitchTimer = null;

function isOnScreen(element) {
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.bottom > 0 && box.top < window.innerHeight;
}

async function glitchElement(element) {
    // The real text (decryptText keeps it in data-text while it scrambles)
    const target = element.dataset.text ?? element.textContent;

    if (!target.trim() || element.classList.contains("is-glitching")) {
        return;
    }

    element.classList.add("is-glitching");

    // A few quick frames of random characters, then back to normal
    for (let frame = 0; frame < 4; frame++) {
        element.textContent = [...target]
            .map(character => character !== " " && Math.random() < .35 ? randomFrom(ADMIN_GLYPHS, 1) : character)
            .join("");
        await sleep(55);
    }

    element.textContent = target;
    element.classList.remove("is-glitching");
}

function startRandomGlitch() {
    stopRandomGlitch();

    if (adminReduceMotion()) {
        return;
    }

    const next = () => {
        glitchTimer = setTimeout(() => {
            // Only text you can see, and only plain text (no icons inside)
            const candidates = [...document.querySelectorAll(GLITCH_TARGETS)]
                .filter(element => element.children.length === 0 && isOnScreen(element));

            if (candidates.length) {
                glitchElement(candidates[Math.floor(Math.random() * candidates.length)]);
            }

            next();
        }, 3000 + Math.random() * 3000);
    };

    next();
}

function stopRandomGlitch() {
    clearTimeout(glitchTimer);
    glitchTimer = null;
}

/* ---------- 14. Search: scan line and highlights ---------- */

function playSearchScan() {
    if (adminReduceMotion()) {
        return;
    }

    const usersCard = document.querySelector(".admin-users-card");

    // Restart the sweep each time something is typed
    usersCard.classList.remove("is-scanning");
    void usersCard.offsetWidth;
    usersCard.classList.add("is-scanning");
}

// Fades a card out before hiding it, or brings it back with a short flash
function showCardInSearch(card, visible, flash) {
    clearTimeout(card.hideTimer);

    if (visible) {
        card.classList.remove("hidden", "scan-miss");

        if (flash && !adminReduceMotion()) {
            card.classList.remove("scan-hit");
            void card.offsetWidth;
            card.classList.add("scan-hit");
        }
    } else if (!card.classList.contains("hidden")) {
        if (adminReduceMotion()) {
            card.classList.add("hidden");
            return;
        }

        card.classList.add("scan-miss");
        card.hideTimer = setTimeout(() => card.classList.add("hidden"), 220);
    }
}
