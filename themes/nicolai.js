// Effects for the Nicolai list (HORROR): blood on every tap and a door
// intro into a haunted hallway. Loaded by theme.js only for this list.

(() => {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const MAX_SPLATS = 8;

    const themeColor = document.querySelector('meta[name="theme-color"]');
    const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const random = (min, max) => min + Math.random() * (max - min);
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    let splatCount = 0;

    /* ---------- Realistic blood splat on tap ---------- */

    // A lumpy blob: points around a circle, some pushed out as short
    // tendrils, joined with soft curves. The filter roughens the edge.
    function blobPath(baseRadius) {
        const count = 22;
        const points = [];

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const tendril = Math.random() < .25 ? random(6, 16) : 0;
            const radius = baseRadius + random(-3, 4) + tendril;

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
        const id = `horrorBlood${splatCount++}`;
        const seed = Math.round(random(1, 999));

        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("viewBox", "-60 -60 120 120");
        svg.classList.add("horror-splat");
        svg.style.left = `${x}px`;
        svg.style.top = `${y}px`;

        // Rough edge, a soft wet sheen from a light up to the left, and a
        // deep red that gets darker towards the edge
        const defs = `
            <defs>
                <radialGradient id="${id}-fill" cx="45%" cy="40%" r="65%">
                    <stop offset="0%" stop-color="#8e0f0f" />
                    <stop offset="55%" stop-color="#650606" />
                    <stop offset="100%" stop-color="#330000" />
                </radialGradient>

                <filter id="${id}-filter" x="-40%" y="-40%" width="180%" height="180%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="3" seed="${seed}" result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G" result="rough" />
                    <feGaussianBlur in="rough" stdDeviation="1.1" result="soft" />
                    <feSpecularLighting in="soft" surfaceScale="2.5" specularConstant=".6" specularExponent="22" lighting-color="#ffcccc" result="shine">
                        <fePointLight x="-50" y="-70" z="90" />
                    </feSpecularLighting>
                    <feComposite in="shine" in2="rough" operator="in" result="shineInside" />
                    <feComposite in="rough" in2="shineInside" operator="arithmetic" k1="0" k2="1" k3=".28" k4="0" />
                </filter>
            </defs>
        `;

        const parts = [];
        const spin = random(0, 360);

        parts.push(`<path d="${blobPath(random(13, 17))}" fill="url(#${id}-fill)" />`);

        // Teardrop drops thrown away from the hit, pointing outwards
        const drops = Math.round(random(5, 9));

        for (let i = 0; i < drops; i++) {
            const angle = random(0, 360);
            const distance = random(24, 48);
            const size = random(1.2, 3) * (1.3 - distance / 60);

            parts.push(`
                <ellipse cx="0" cy="${-distance}" rx="${size}" ry="${size * random(1.8, 3)}"
                         transform="rotate(${angle})" fill="#5c0606" />
            `);
        }

        // A fine mist of tiny drops
        const mist = Math.round(random(14, 24));

        for (let i = 0; i < mist; i++) {
            const angle = random(0, Math.PI * 2);
            const distance = random(20, 58);

            parts.push(`
                <circle cx="${Math.cos(angle) * distance}" cy="${Math.sin(angle) * distance}"
                        r="${random(.4, 1.1)}" fill="#4a0303" />
            `);
        }

        // Drops running slowly down the screen (not rotated with the splat)
        const drips = [];
        const dripCount = Math.round(random(1, 3));

        for (let i = 0; i < dripCount; i++) {
            const startX = random(-10, 10);
            const length = random(22, 48);

            drips.push(`
                <path class="horror-drip" d="M ${startX} 8 L ${startX + random(-1.5, 1.5)} ${8 + length}"
                      stroke="#5a0505" stroke-width="${random(2.2, 3.6)}" stroke-linecap="round"
                      pathLength="1" style="animation-delay: ${random(.15, .5).toFixed(2)}s" />
            `);
        }

        svg.innerHTML = `
            ${defs}
            <g filter="url(#${id}-filter)">
                <g transform="rotate(${spin})">${parts.join("")}</g>
                ${drips.join("")}
            </g>
        `;

        document.body.appendChild(svg);
        setTimeout(() => svg.remove(), 2800);

        const splats = document.querySelectorAll(".horror-splat");

        if (splats.length > MAX_SPLATS) {
            splats[0].remove();
        }
    }

    function onTap(event) {
        unlockAudio();

        // While a jumpscare is on screen, taps don't splat or count
        if (scareElement) {
            return;
        }

        makeSplat(event.clientX, event.clientY);
        maybeScare(event);
    }

    /* ========== JUMPSCARES START (remove from here to JUMPSCARES END) ==========
       See themes/nicolai-scares/REMOVE-JUMPSCARES.md */

    /* ---------- Jumpscares: "Watch me" ---------- */

    // Pictures live in themes/nicolai-scares/. Each jumpscare is one step
    // worse than the last; after the last step it keeps alternating
    // between the two hardest ones. It never stops.
    const SCARE_FOLDER = "themes/nicolai-scares/";

    const SCARES = [
        { image: "Movie poster.jpg", text: "Watch me", mood: "calm", sound: "whisper", duration: 4600 },
        { image: "Movie poster.jpg", text: "WATCH ME", sub: "why won't you watch me?", mood: "angry", sound: "heartbeat", duration: 4800 },
        { image: "images.jpg", text: "I'm waiting…", mood: "creep", sound: "drone", duration: 5200 },
        { image: "images (1).jpg", text: "WATCH ME NOW", mood: "lunge", sound: "scream", duration: 2800, vibrate: [300, 80, 500] },
        { image: "Sinister-2-Mr.-Boogie-aka-Bagul.avif", text: "WATCH ME", sub: "you can't hide from me", mood: "frenzy", sound: "scream", duration: 5600, vibrate: [200, 60, 200, 60, 700] }
    ];

    const ACTIVE_TAPS = 5;            // this many taps...
    const ACTIVE_WINDOW = 10000;      // ...within 10 seconds = he's paying attention
    const COOLDOWN = 150000;          // at most one jumpscare every 2.5 minutes
    const FIRST_DELAY = 60000;        // none in the first minute after opening
    const CHANCE = .2;                // chance per tap once everything above is true

    const LEVEL_KEY = "nicolaiScareLevel";
    const LAST_KEY = "nicolaiScareLast";

    let recentTaps = [];
    let startedAt = 0;
    let scareElement = null;

    const imageUrl = name => `${SCARE_FOLDER}${encodeURIComponent(name)}?v=${APP_VERSION}`;

    function readNumber(key) {
        try {
            return Number(localStorage.getItem(key)) || 0;
        } catch {
            return 0;
        }
    }

    function writeNumber(key, value) {
        try {
            localStorage.setItem(key, String(value));
        } catch {
            // Private browsing: just don't remember
        }
    }

    // Load the pictures early, so a jumpscare appears instantly
    function preloadScares() {
        new Set(SCARES.map(scare => scare.image)).forEach(name => {
            new Image().src = imageUrl(name);
        });
    }

    function maybeScare(event) {
        // Never while typing, during the door intro or while a pop-up is open
        if (event.target.closest("input, textarea, select, .modal:not(.hidden)") || introElement) {
            return;
        }

        const now = Date.now();

        recentTaps = recentTaps.filter(time => now - time < ACTIVE_WINDOW);
        recentTaps.push(now);

        const isActive = recentTaps.length >= ACTIVE_TAPS;
        const cooledDown = now - readNumber(LAST_KEY) > COOLDOWN && now - startedAt > FIRST_DELAY;

        if (isActive && cooledDown && Math.random() < CHANCE) {
            runScare();
        }
    }

    function nextLevel(level) {
        const last = SCARES.length - 1;
        return level < last ? level + 1 : (level === last ? last - 1 : last);
    }

    // Blood written on the screen, with drops running down from the letters
    function bloodTextSvg(text, id) {
        // Long texts get smaller, so they always fit across the screen
        const fontSize = Math.min(70, Math.round(330 / (text.length * .66)));
        const width = Math.min(380, text.length * fontSize * .55);

        const drips = Array.from({ length: Math.round(random(6, 10)) }, () => {
            const x = 200 + random(-width / 2, width / 2);
            const length = random(30, 95);

            return `
                <path class="scare-drip" d="M ${x} ${100 + random(-6, 4)} L ${x + random(-1, 1)} ${100 + length}"
                      stroke="#4f0303" stroke-width="${random(2.5, 6)}" stroke-linecap="round"
                      pathLength="1" style="animation-delay: ${random(.9, 1.8).toFixed(2)}s" />
            `;
        }).join("");

        return `
            <svg class="scare-blood-text" viewBox="0 0 400 220" aria-hidden="true">
                <defs>
                    <linearGradient id="${id}-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#9b1010" />
                        <stop offset="100%" stop-color="#4a0202" />
                    </linearGradient>
                    <filter id="${id}-wet" x="-10%" y="-20%" width="120%" height="160%">
                        <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="${Math.round(random(1, 999))}" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" result="rough" />
                        <feGaussianBlur in="rough" stdDeviation=".8" result="soft" />
                        <feSpecularLighting in="soft" surfaceScale="2" specularConstant=".5" specularExponent="20" lighting-color="#ffcccc" result="shine">
                            <fePointLight x="120" y="-60" z="120" />
                        </feSpecularLighting>
                        <feComposite in="shine" in2="rough" operator="in" result="shineInside" />
                        <feComposite in="rough" in2="shineInside" operator="arithmetic" k1="0" k2="1" k3=".3" k4="0" />
                    </filter>
                </defs>
                <g filter="url(#${id}-wet)">
                    <text class="scare-letters" x="200" y="100" text-anchor="middle"
                          font-size="${fontSize}" fill="url(#${id}-fill)">${text}</text>
                    ${drips}
                </g>
            </svg>
        `;
    }

    function runScare(forcedLevel) {
        if (scareElement) {
            return;
        }

        const level = forcedLevel ?? Math.min(readNumber(LEVEL_KEY), SCARES.length - 1);
        const scare = SCARES[level];

        scareElement = document.createElement("div");
        scareElement.className = `scare scare--${scare.mood}`;
        scareElement.innerHTML = `
            <div class="scare-image" style="background-image: url('${imageUrl(scare.image)}')"></div>
            <div class="scare-flash"></div>
            ${bloodTextSvg(scare.text, `scare${Date.now()}`)}
            ${scare.sub ? `<p class="scare-sub">${scare.sub}</p>` : ""}
        `;

        document.body.appendChild(scareElement);

        playScareSound(scare.sound);

        if (scare.vibrate && navigator.vibrate) {
            navigator.vibrate(scare.vibrate);
        }

        if (forcedLevel === undefined) {
            writeNumber(LEVEL_KEY, nextLevel(level));
            writeNumber(LAST_KEY, Date.now());
        }

        const element = scareElement;

        setTimeout(() => element.classList.add("is-leaving"), scare.duration);
        setTimeout(() => {
            element.remove();

            if (scareElement === element) {
                scareElement = null;
            }
        }, scare.duration + 600);
    }

    // For testing from the browser console: nicolaiScare(0) … nicolaiScare(4)
    window.nicolaiScare = level => runScare(level);

    /* ---------- Generated sounds (no files needed) ---------- */

    let audio = null;

    // Phones only allow sound after a tap, so the sound engine is
    // switched on by the first tap
    function unlockAudio() {
        if (!audio) {
            const AudioEngine = window.AudioContext || window.webkitAudioContext;

            if (!AudioEngine) {
                return;
            }

            audio = new AudioEngine();

            // On iPhone: play even when the silent switch is on
            if (navigator.audioSession) {
                navigator.audioSession.type = "playback";
            }
        }

        if (audio.state === "suspended") {
            audio.resume();
        }
    }

    function noiseBuffer(seconds) {
        const buffer = audio.createBuffer(1, audio.sampleRate * seconds, audio.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        return buffer;
    }

    // A volume curve: quick fade in, hold, fade out
    function envelope(gain, start, attack, hold, release, peak) {
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(peak, start + attack);
        gain.gain.setValueAtTime(peak, start + attack + hold);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + hold + release);
    }

    function playNoise(start, length, filterType, frequency, peak, attack = .3) {
        const source = audio.createBufferSource();
        source.buffer = noiseBuffer(length + .5);

        const filter = audio.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.value = frequency;

        const gain = audio.createGain();
        envelope(gain, start, attack, length - attack - .4, .4, peak);

        source.connect(filter).connect(gain).connect(audio.destination);
        source.start(start);
        source.stop(start + length + .5);
    }

    function playTone(start, length, type, from, to, peak) {
        const oscillator = audio.createOscillator();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(from, start);
        oscillator.frequency.exponentialRampToValueAtTime(to, start + length);

        const gain = audio.createGain();
        envelope(gain, start, .05, length - .35, .3, peak);

        oscillator.connect(gain).connect(audio.destination);
        oscillator.start(start);
        oscillator.stop(start + length + .1);
    }

    function playHeartbeat(start, beats, peak) {
        for (let i = 0; i < beats; i++) {
            [0, .28].forEach(offset => {
                const time = start + i * .85 + offset;
                const oscillator = audio.createOscillator();
                oscillator.frequency.setValueAtTime(70, time);
                oscillator.frequency.exponentialRampToValueAtTime(40, time + .18);

                const gain = audio.createGain();
                envelope(gain, time, .01, .05, .2, offset ? peak * .7 : peak);

                oscillator.connect(gain).connect(audio.destination);
                oscillator.start(time);
                oscillator.stop(time + .35);
            });
        }
    }

    // Several harsh voices sliding up and down, wobbling fast and
    // pushed through distortion, with a burst of noise on top
    function playScream(start, length, peak) {
        const distortion = audio.createWaveShaper();
        const curve = new Float32Array(1024);

        for (let i = 0; i < curve.length; i++) {
            const x = (i / curve.length) * 2 - 1;
            curve[i] = Math.tanh(x * 6);
        }

        distortion.curve = curve;

        const output = audio.createGain();
        envelope(output, start, .02, length - .6, .55, peak);
        distortion.connect(output).connect(audio.destination);

        [620, 830, 1170, 1480].forEach(base => {
            const voice = audio.createOscillator();
            voice.type = "sawtooth";
            voice.frequency.setValueAtTime(base * .7, start);
            voice.frequency.exponentialRampToValueAtTime(base * 1.35, start + .25);
            voice.frequency.exponentialRampToValueAtTime(base * .6, start + length);

            const wobble = audio.createOscillator();
            wobble.frequency.value = random(22, 34);

            const wobbleDepth = audio.createGain();
            wobbleDepth.gain.value = base * .06;
            wobble.connect(wobbleDepth).connect(voice.frequency);

            const voiceGain = audio.createGain();
            voiceGain.gain.value = .18;

            voice.connect(voiceGain).connect(distortion);
            [voice, wobble].forEach(node => {
                node.start(start);
                node.stop(start + length + .1);
            });
        });

        playNoise(start, Math.min(length, 1.2), "highpass", 1800, peak * .5, .01);
    }

    function playScareSound(name) {
        if (!audio || audio.state !== "running") {
            return;
        }

        const now = audio.currentTime + .02;

        if (name === "whisper") {
            playNoise(now, 3.8, "bandpass", 1100, .12, 1.2);
            playTone(now, 4, "sine", 55, 48, .25);
        } else if (name === "heartbeat") {
            playHeartbeat(now, 5, .9);
            playTone(now, 4.2, "sine", 50, 44, .3);
            playNoise(now + 1, 3, "bandpass", 900, .1, 1);
        } else if (name === "drone") {
            playTone(now, 5, "sawtooth", 60, 240, .08);
            playTone(now, 5, "sine", 120, 480, .12);
            playHeartbeat(now + 2, 3, .8);
        } else if (name === "scream") {
            playScream(now, 1.9, .55);
            playTone(now, 2.4, "sine", 45, 30, .5);
        }
    }

    /* ========== JUMPSCARES END ========== */

    /* ---------- Door intro into the haunted hallway ---------- */

    // One-point perspective: everything runs towards the doorway at the end
    const BACK = { left: 168, right: 232, top: 290, bottom: 380 };

    // Where the left wall's top and bottom edges are at a given x
    const leftWallTop = x => x * BACK.top / BACK.left;
    const leftWallBottom = x => 700 - x * (700 - BACK.bottom) / BACK.left;
    const atDepth = depth => BACK.left * (1 - 1 / depth);

    function wallQuad(x1, x2, from, to, mirror) {
        const point = (x, share) => {
            const y = leftWallTop(x) + (leftWallBottom(x) - leftWallTop(x)) * share;
            return `${mirror ? 400 - x : x},${y.toFixed(1)}`;
        };

        return [point(x1, from), point(x2, from), point(x2, to), point(x1, to)].join(" ");
    }

    function hallwaySvg() {
        const lines = [];

        // Floorboards running to the back
        for (let x = -400; x <= 800; x += 46) {
            const endX = 200 + (x - 200) * (BACK.bottom - 330) / (700 - 330);
            lines.push(`<line x1="${x}" y1="700" x2="${endX.toFixed(1)}" y2="${BACK.bottom}" />`);
        }

        // Wallpaper stripes on both walls, closer together further away
        const stripes = [];

        for (let depth = 1.15; depth < 12; depth *= 1.22) {
            const x = atDepth(depth);
            const top = leftWallTop(x).toFixed(1);
            const bottom = leftWallBottom(x).toFixed(1);

            stripes.push(`<line x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" />`);
            stripes.push(`<line x1="${400 - x}" y1="${top}" x2="${400 - x}" y2="${bottom}" />`);
        }

        // Crooked portraits
        const portraits = [
            wallQuad(atDepth(1.35), atDepth(1.85), .28, .52, false),
            wallQuad(atDepth(2.4), atDepth(2.9), .3, .5, true)
        ].map((points, i) => `
            <polygon points="${points}" class="horror-portrait"
                     transform="rotate(${i ? 2 : -3} 200 350)" />
        `).join("");

        // Candles in wall sconces, glowing
        const candles = [
            { depth: 2.3, mirror: false },
            { depth: 1.4, mirror: true },
            { depth: 3.6, mirror: true }
        ].map(({ depth, mirror }, i) => {
            const x0 = atDepth(depth);
            const y = leftWallTop(x0) + (leftWallBottom(x0) - leftWallTop(x0)) * .62;
            const x = mirror ? 400 - x0 : x0;
            const scale = 1 / depth;

            return `
                <circle cx="${x}" cy="${y}" r="${90 * scale}" fill="url(#hallGlow)"
                        class="horror-candle-glow" style="animation-delay: -${i * .7}s" />
                <rect x="${x - 4 * scale}" y="${y}" width="${8 * scale}" height="${22 * scale}" fill="#d8ccb4" />
                <ellipse cx="${x}" cy="${y - 5 * scale}" rx="${3.5 * scale}" ry="${8 * scale}" fill="#ffcf6b"
                         class="horror-flame" style="animation-delay: -${i * .4}s" />
            `;
        }).join("");

        return `
            <svg class="horror-hallway" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <defs>
                    <linearGradient id="hallFloor" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stop-color="#2e1a10" />
                        <stop offset="100%" stop-color="#070403" />
                    </linearGradient>
                    <linearGradient id="hallWallLeft" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stop-color="#2a161a" />
                        <stop offset="100%" stop-color="#090506" />
                    </linearGradient>
                    <linearGradient id="hallWallRight" x1="1" y1="0" x2="0" y2="0">
                        <stop offset="0%" stop-color="#2a161a" />
                        <stop offset="100%" stop-color="#090506" />
                    </linearGradient>
                    <linearGradient id="hallCeiling" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#140c0c" />
                        <stop offset="100%" stop-color="#050303" />
                    </linearGradient>
                    <linearGradient id="hallEnd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#3d2a22" />
                        <stop offset="100%" stop-color="#0d0705" />
                    </linearGradient>
                    <radialGradient id="hallGlow">
                        <stop offset="0%" stop-color="rgba(255, 170, 70, .45)" />
                        <stop offset="100%" stop-color="rgba(255, 120, 30, 0)" />
                    </radialGradient>
                    <radialGradient id="hallDark" cx="50%" cy="48%" r="70%">
                        <stop offset="35%" stop-color="rgba(0, 0, 0, 0)" />
                        <stop offset="100%" stop-color="rgba(0, 0, 0, .92)" />
                    </radialGradient>
                </defs>

                <polygon points="0,0 400,0 ${BACK.right},${BACK.top} ${BACK.left},${BACK.top}" fill="url(#hallCeiling)" />
                <polygon points="0,700 400,700 ${BACK.right},${BACK.bottom} ${BACK.left},${BACK.bottom}" fill="url(#hallFloor)" />
                <polygon points="0,0 ${BACK.left},${BACK.top} ${BACK.left},${BACK.bottom} 0,700" fill="url(#hallWallLeft)" />
                <polygon points="400,0 ${BACK.right},${BACK.top} ${BACK.right},${BACK.bottom} 400,700" fill="url(#hallWallRight)" />
                <rect x="${BACK.left}" y="${BACK.top}" width="${BACK.right - BACK.left}" height="${BACK.bottom - BACK.top}" fill="#0a0606" />

                <g stroke="rgba(0, 0, 0, .55)" stroke-width="1.2">${lines.join("")}</g>
                <g stroke="rgba(120, 70, 70, .14)" stroke-width="3">${stripes.join("")}</g>

                ${portraits}

                <!-- The doorway at the end, where we walk to -->
                <rect class="horror-hall-end" x="186" y="312" width="28" height="68" fill="url(#hallEnd)" />
                <!-- A tall, gaunt demon in the doorway: horns, long clawed arms,
                     a ragged cloak and glowing red eyes -->
                <g class="horror-demon">
                    <g fill="#000">
                        <path d="M197.6 318.5 Q195.5 314 196.6 311 Q197.2 314.5 198.8 316.8 Z" />
                        <path d="M202.4 318.5 Q204.5 314 203.4 311 Q202.8 314.5 201.2 316.8 Z" />
                        <ellipse cx="200" cy="322" rx="3.2" ry="5" />
                        <path d="M197.5 326 Q193 328 193.2 332 L192.4 360 L191.2 378 L193.6 374.5 L195 379 L197 375 L199 380 L201 375 L203 379.5 L205 375
                                 L206.8 378.8 L208.8 378 L207.6 360 L206.8 332 Q207 328 202.5 326 Z" />
                    </g>
                    <g stroke="#000" stroke-linecap="round" fill="none">
                        <path d="M193.6 331 Q190.6 346 190.4 368" stroke-width="1.6" />
                        <path d="M206.4 331 Q209.4 346 209.6 368" stroke-width="1.6" />
                        <path d="M190.4 368 L188.8 373.5 M190.4 368 L190.1 374.5 M190.4 368 L191.6 373.8" stroke-width=".7" />
                        <path d="M209.6 368 L211.2 373.5 M209.6 368 L209.9 374.5 M209.6 368 L208.4 373.8" stroke-width=".7" />
                    </g>
                </g>
                <g class="horror-demon-eyes">
                    <circle cx="198.6" cy="321.4" r="2.2" fill="rgba(255, 0, 0, .35)" />
                    <circle cx="201.4" cy="321.4" r="2.2" fill="rgba(255, 0, 0, .35)" />
                    <circle cx="198.6" cy="321.4" r=".75" fill="#ff2a1a" />
                    <circle cx="201.4" cy="321.4" r=".75" fill="#ff2a1a" />
                </g>

                ${candles}

                <!-- Chandelier hanging from the ceiling -->
                <g stroke="#050303" stroke-width="2" fill="none">
                    <line x1="200" y1="0" x2="200" y2="120" />
                    <path d="M170 128 Q200 150 230 128 M178 128 L178 120 M200 132 L200 122 M222 128 L222 120" />
                </g>
                <g class="horror-flame" fill="#ffcf6b">
                    <ellipse cx="178" cy="116" rx="2.2" ry="4.5" />
                    <ellipse cx="200" cy="118" rx="2.2" ry="4.5" />
                    <ellipse cx="222" cy="116" rx="2.2" ry="4.5" />
                </g>
                <circle cx="200" cy="122" r="55" fill="url(#hallGlow)" class="horror-candle-glow" />

                <!-- Cobwebs in the top corners -->
                <g stroke="rgba(210, 210, 210, .22)" stroke-width=".8" fill="none">
                    <path d="M0 0 L90 30 M0 0 L70 70 M0 0 L30 90 M0 40 Q30 40 40 28 M0 70 Q50 65 62 50 M50 0 Q48 20 30 30" />
                    <path d="M400 0 L310 30 M400 0 L330 70 M400 0 L370 90 M400 40 Q370 40 360 28 M400 70 Q350 65 338 50 M350 0 Q352 20 370 30" />
                </g>

                <rect width="400" height="700" fill="url(#hallDark)" />
            </svg>
        `;
    }

    let introElement = null;

    async function intro() {
        if (reduceMotion()) {
            return;
        }

        introElement = document.createElement("div");
        introElement.className = "horror-intro";
        introElement.innerHTML = `
            <div class="horror-scene">${hallwaySvg()}</div>
            <div class="horror-door horror-door-left"><span class="horror-handle"></span></div>
            <div class="horror-door horror-door-right"><span class="horror-handle"></span></div>
            <p class="horror-dare">Enter… if you dare</p>
        `;

        document.body.appendChild(introElement);

        const element = introElement;

        // The doors rattle, then swing open
        await wait(1100);
        element.classList.add("is-open");

        // Walk down the hallway towards the doorway at the end
        await wait(1800);
        const scene = element.querySelector(".horror-scene");
        const end = element.querySelector(".horror-hall-end").getBoundingClientRect();
        scene.style.transformOrigin = `${end.left + end.width / 2}px ${end.top + end.height / 2}px`;
        element.classList.add("is-entering");

        await wait(1600);
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

            startedAt = Date.now();
            recentTaps = [];
            preloadScares();
        },

        stop() {
            themeColor.setAttribute("content", "#ffffff");
            document.removeEventListener("pointerdown", onTap, { capture: true });
            document.querySelectorAll(".horror-splat").forEach(splat => splat.remove());

            introElement?.remove();
            introElement = null;

            scareElement?.remove();
            scareElement = null;
        },

        intro
    });
})();
