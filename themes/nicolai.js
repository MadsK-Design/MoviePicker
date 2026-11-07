// Effects for the Nicolai list (HORROR): blood on every tap and a door
// intro into a haunted house. Loaded by theme.js only for this list.

(() => {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const MAX_SPLATS = 8;

    const themeColor = document.querySelector('meta[name="theme-color"]');
    const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const random = (min, max) => min + Math.random() * (max - min);
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    /* ---------- Blood splat on tap ---------- */

    // A lumpy blob: points around a circle, some pushed far out as spikes,
    // joined with soft curves
    function blobPath(baseRadius) {
        const count = 16;
        const points = [];

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const spike = Math.random() < .3 ? random(10, 22) : 0;
            const radius = baseRadius + random(-4, 5) + spike;

            points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
        }

        const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        let path = `M ${mid(points[count - 1], points[0]).join(" ")}`;

        points.forEach((point, i) => {
            const next = points[(i + 1) % count];
            path += ` Q ${point.join(" ")} ${mid(point, next).join(" ")}`;
        });

        return `${path} Z`;
    }

    function makeSplat(x, y) {
        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("viewBox", "-60 -60 120 120");
        svg.classList.add("horror-splat");
        svg.style.left = `${x}px`;
        svg.style.top = `${y}px`;
        svg.style.setProperty("--spin", `${Math.round(random(0, 360))}deg`);

        const shape = (tag, attributes) => {
            const element = document.createElementNS(SVG_NS, tag);
            Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
            svg.appendChild(element);
        };

        shape("path", { d: blobPath(random(16, 22)), fill: "#6e0202" });
        shape("path", { d: blobPath(random(10, 14)), fill: "#8f0404" });

        // Drops thrown away from the splat
        const drops = Math.round(random(6, 11));

        for (let i = 0; i < drops; i++) {
            const angle = random(0, Math.PI * 2);
            const distance = random(30, 56);

            shape("circle", {
                cx: Math.cos(angle) * distance,
                cy: Math.sin(angle) * distance,
                r: random(1.5, 5),
                fill: "#7a0303"
            });
        }

        // A wet shine
        shape("ellipse", { cx: -5, cy: -6, rx: 5, ry: 2.5, fill: "rgba(255,255,255,.18)" });

        document.body.appendChild(svg);
        setTimeout(() => svg.remove(), 1900);

        const splats = document.querySelectorAll(".horror-splat");

        if (splats.length > MAX_SPLATS) {
            splats[0].remove();
        }
    }

    function onTap(event) {
        makeSplat(event.clientX, event.clientY);
    }

    /* ---------- Door intro into the haunted house ---------- */

    const HOUSE_SVG = `
        <svg class="horror-house" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <defs>
                <radialGradient id="horrorMoonGlow">
                    <stop offset="0%" stop-color="rgba(232,220,200,.35)" />
                    <stop offset="100%" stop-color="rgba(232,220,200,0)" />
                </radialGradient>
            </defs>

            <circle cx="300" cy="62" r="70" fill="url(#horrorMoonGlow)" />
            <circle cx="300" cy="62" r="30" fill="#e8dcc8" />
            <circle cx="290" cy="55" r="5" fill="#cfc2ac" />
            <circle cx="308" cy="72" r="7" fill="#cfc2ac" />

            <g class="horror-bats" fill="#000">
                <path class="horror-bat" d="M0 0 q6 -6 10 0 q4 -6 10 0 q-5 1 -10 5 q-5 -4 -10 -5z" />
                <path class="horror-bat horror-bat-2" d="M0 0 q6 -6 10 0 q4 -6 10 0 q-5 1 -10 5 q-5 -4 -10 -5z" />
                <path class="horror-bat horror-bat-3" d="M0 0 q6 -6 10 0 q4 -6 10 0 q-5 1 -10 5 q-5 -4 -10 -5z" />
            </g>

            <path d="M50 300 L50 205 M50 230 L28 205 M50 220 L72 192 M50 212 L40 190 M72 192 L82 185"
                  stroke="#050303" stroke-width="5" stroke-linecap="round" fill="none" />

            <g fill="#050303">
                <polygon points="120,160 200,92 280,160" />
                <rect x="132" y="158" width="136" height="110" />
                <rect x="250" y="112" width="34" height="156" />
                <polygon points="245,114 267,58 289,114" />
                <rect x="190" y="74" width="8" height="26" />
            </g>

            <g class="horror-window">
                <rect x="148" y="176" width="22" height="26" fill="#ffae42" />
                <rect x="230" y="176" width="22" height="26" fill="#ff9a2e" />
                <rect x="259" y="130" width="16" height="20" fill="#ffae42" />
                <circle cx="200" cy="130" r="9" fill="#ff8c1a" />
            </g>
            <g stroke="#050303" stroke-width="2">
                <line x1="159" y1="176" x2="159" y2="202" />
                <line x1="148" y1="189" x2="170" y2="189" />
                <line x1="241" y1="176" x2="241" y2="202" />
                <line x1="230" y1="189" x2="252" y2="189" />
            </g>

            <path class="horror-house-door" d="M186 268 L186 226 Q200 210 214 226 L214 268 Z" fill="#ff7a00" />

            <path d="M0 268 Q100 258 200 266 T400 262 L400 300 L0 300 Z" fill="#030202" />
            <g fill="#030202">
                <rect x="20" y="248" width="4" height="24" />
                <rect x="34" y="250" width="4" height="22" />
                <rect x="320" y="246" width="4" height="26" />
                <rect x="334" y="248" width="4" height="24" />
                <rect x="348" y="250" width="4" height="22" />
                <rect x="16" y="256" width="40" height="3" />
                <rect x="316" y="254" width="40" height="3" />
            </g>
        </svg>
    `;

    let introElement = null;

    async function intro() {
        if (reduceMotion()) {
            return;
        }

        introElement = document.createElement("div");
        introElement.className = "horror-intro";
        introElement.innerHTML = `
            <div class="horror-scene">${HOUSE_SVG}</div>
            <div class="horror-door horror-door-left"><span class="horror-handle"></span></div>
            <div class="horror-door horror-door-right"><span class="horror-handle"></span></div>
            <p class="horror-dare">Enter… if you dare</p>
        `;

        document.body.appendChild(introElement);

        const element = introElement;

        // The doors rattle, then swing open
        await wait(1100);
        element.classList.add("is-open");

        // Move into the house through its glowing front door
        await wait(1700);
        const scene = element.querySelector(".horror-scene");
        const door = element.querySelector(".horror-house-door").getBoundingClientRect();
        scene.style.transformOrigin = `${door.left + door.width / 2}px ${door.top + door.height / 2}px`;
        element.classList.add("is-entering");

        await wait(1500);
        element.classList.add("is-done");

        await wait(600);
        element.remove();

        if (introElement === element) {
            introElement = null;
        }
    }

    registerGroupTheme("nicolai", {
        start() {
            themeColor.setAttribute("content", "#0b0606");
            document.addEventListener("pointerdown", onTap, { capture: true, passive: true });
        },

        stop() {
            themeColor.setAttribute("content", "#ffffff");
            document.removeEventListener("pointerdown", onTap, { capture: true });
            document.querySelectorAll(".horror-splat").forEach(splat => splat.remove());

            introElement?.remove();
            introElement = null;
        },

        intro
    });
})();
