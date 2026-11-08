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
        makeSplat(event.clientX, event.clientY);
    }

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

    /* ---------- Sounds for the door intro ---------- */

    // Generated in the app (no files). They follow the intro's timeline:
    // wind and a drone, thuds while the doors rattle, creaking hinges as
    // they open, footsteps down the hallway, and a boom when it goes black.
    // Only plays if a tap has switched the sound engine on (the Login tap).
    let introOutput = null;

    function introSounds() {
        const sound = getThemeAudio();

        if (!sound) {
            return;
        }

        introOutput = sound.createGain();
        introOutput.connect(sound.destination);

        const output = introOutput;
        const t = sound.currentTime + .05;

        const noise = seconds => {
            const buffer = sound.createBuffer(1, sound.sampleRate * seconds, sound.sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < data.length; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            return buffer;
        };

        const fade = (gain, start, attack, hold, release, peak) => {
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(peak, start + attack);
            gain.gain.setValueAtTime(peak, start + attack + hold);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + hold + release);
        };

        function noiseSound(start, length, type, frequency, peak, attack = .01, quality = 1) {
            const source = sound.createBufferSource();
            source.buffer = noise(length + .3);

            const filter = sound.createBiquadFilter();
            filter.type = type;
            filter.frequency.value = frequency;
            filter.Q.value = quality;

            const gain = sound.createGain();
            fade(gain, start, attack, Math.max(length - attack - .2, 0), .2, peak);

            source.connect(filter).connect(gain).connect(output);
            source.start(start);
            source.stop(start + length + .3);

            return filter;
        }

        function tone(start, length, type, from, to, peak, attack = .05) {
            const oscillator = sound.createOscillator();
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(from, start);
            oscillator.frequency.exponentialRampToValueAtTime(to, start + length);

            const gain = sound.createGain();
            fade(gain, start, attack, Math.max(length - attack - .3, 0), .3, peak);

            oscillator.connect(gain).connect(output);
            oscillator.start(start);
            oscillator.stop(start + length + .1);
        }

        // Howling wind: noise through a filter that slowly sweeps up and down
        function wind(start, length) {
            const filter = noiseSound(start, length, "bandpass", 500, .28, 1.2, 4);
            filter.frequency.setValueAtTime(450, start);
            filter.frequency.linearRampToValueAtTime(950, start + length * .4);
            filter.frequency.linearRampToValueAtTime(600, start + length * .7);
            filter.frequency.linearRampToValueAtTime(1100, start + length);
        }

        // A creaking hinge: a buzzing tone that stutters in pitch and volume
        function creak(start, length, pitch, peak) {
            const oscillator = sound.createOscillator();
            oscillator.type = "sawtooth";

            const filter = sound.createBiquadFilter();
            filter.type = "bandpass";
            filter.frequency.value = 1300;
            filter.Q.value = 5;

            const gain = sound.createGain();
            gain.gain.setValueAtTime(0.0001, start);

            for (let time = 0; time < length; time += .03) {
                const progress = time / length;
                oscillator.frequency.setValueAtTime(pitch * (.8 + Math.random() * .45) * (1 + progress * .5), start + time);
                gain.gain.setValueAtTime(peak * (.25 + Math.random() * .75) * Math.sin(Math.PI * Math.min(progress * 1.4, 1)), start + time);
            }

            gain.gain.setValueAtTime(0.0001, start + length);

            oscillator.connect(filter).connect(gain).connect(output);
            oscillator.start(start);
            oscillator.stop(start + length + .05);
        }

        // A heavy thud on wood: a low knock plus a short burst of noise
        function thud(start, peak) {
            tone(start, .25, "triangle", 160, 70, peak, .005);
            noiseSound(start, .2, "lowpass", 700, peak * .6);
        }

        // From the start: wind and a low drone
        wind(t, 5.3);
        tone(t, 4.6, "sawtooth", 110, 98, .035, 1.2);

        // The doors rattle (0.35–1.05 s)
        for (let i = 0; i < 6; i++) {
            thud(t + .35 + i * .12, i % 2 ? .45 : .6);
        }

        // The doors swing open (from 1.1 s), one hinge each
        creak(t + 1.1, 1.5, 150, .5);
        creak(t + 1.28, 1.35, 110, .4);

        // Walking down the hallway (from 2.95 s), with a whisper rising
        for (let i = 0; i < 4; i++) {
            const step = t + 2.95 + i * .38;
            thud(step, .3 + i * .08);
            noiseSound(step + .04, .12, "bandpass", 1900, .06, .01, 3);
        }

        noiseSound(t + 3, 1.3, "bandpass", 2600, .25, .9, 2.5);

        // Everything goes black (around 4.35 s)
        tone(t + 4.35, 1.6, "triangle", 140, 55, .7, .01);
        noiseSound(t + 4.35, 1.2, "lowpass", 500, .5, .01);
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
        introSounds();

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
        },

        stop() {
            themeColor.setAttribute("content", "#ffffff");
            document.removeEventListener("pointerdown", onTap, { capture: true });
            document.querySelectorAll(".horror-splat").forEach(splat => splat.remove());

            introElement?.remove();
            introElement = null;

            introOutput?.disconnect();
            introOutput = null;
        },

        intro
    });
})();
