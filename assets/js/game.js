"use strict";

(() => {
    const canvas = document.getElementById("gameCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    const W = 1280;
    const H = 720;
    const STORAGE = "galaxyFrontierHistory";
    const LAST = "galaxyFrontierLastScore";
    const HIGH = "galaxyFrontierHighScore";
    const TEMP_DURATION = 8000;

    const $ = (id) => document.getElementById(id);
    const ui = {
        health: $("health"), shield: $("shield"), score: $("score"), level: $("level"),
        weapon: $("weapon"), ship: $("ship"), status: $("gameStatus"), message: $("centerMessage"),
        start: $("startGame"), pause: $("pauseGame"), upgrade: $("upgradeGame"), history: $("historyGame"),
        startOverlay: $("startOverlay"), pauseOverlay: $("pauseOverlay"), upgradeOverlay: $("upgradeOverlay"),
        historyOverlay: $("historyOverlay"), overOverlay: $("gameOverOverlay"), resume: $("resumeGame"),
        closeUpgrade: $("closeUpgrade"), closeHistory: $("closeHistory"), closeHistoryBottom: $("closeHistoryBottom"),
        clearHistory: $("clearHistory"), restart: $("restartGame"), historyList: $("historyList"),
        pageHistory: $("pageHistoryList"), finalScore: $("finalScore"), lastScore: $("lastScore"),
        highScore: $("highScore"), upgradeMessage: $("upgradeMessage")
    };

    const ships = [
        { name: "Falcon", color: "#00eaff", speed: 5.8, fire: 190 },
        { name: "Vortex", color: "#39ff88", speed: 6.3, fire: 175 },
        { name: "Nova", color: "#ffe45e", speed: 6.7, fire: 160 },
        { name: "Titan", color: "#ff9d3d", speed: 5.5, fire: 145 },
        { name: "Phoenix", color: "#ff4fd8", speed: 7, fire: 130 }
    ];
    const weapons = [
        { name: "Simples", damage: 18, shots: 1 },
        { name: "Dupla", damage: 20, shots: 2 },
        { name: "Tripla", damage: 22, shots: 3 },
        { name: "Quíntupla", damage: 25, shots: 5 },
        { name: "Plasma", damage: 30, shots: 5 }
    ];
    const tempWeapons = {
        double: { name: "DUPLA FORTE", damage: 34, shots: 2 },
        triple: { name: "TRIPLA FORTE", damage: 38, shots: 3 },
        plasma: { name: "PLASMA FORTE", damage: 48, shots: 5 }
    };
    const enemyTypes = {
        small: { w: 34, h: 42, hp: 34, speed: 2.4, points: 50, color: "#ff4d5a" },
        medium: { w: 58, h: 58, hp: 90, speed: 1.55, points: 120, color: "#b36bff" },
        large: { w: 96, h: 96, hp: 280, speed: 0.8, points: 400, color: "#ff9d3d" }
    };

    const state = {
        running: false, paused: false, over: false, score: 0, level: 1, kills: 0,
        health: 175, maxHealth: 175, shield: 102, maxShield: 150, elapsed: 0,
        spawn: 0, powerup: 0, shake: 0, lastFrame: 0, messageTimer: 0,
        keys: Object.create(null), enemies: [], bullets: [], particles: [], powerups: [], stars: [], popups: []
    };
    const player = {
        x: W / 2, y: H - 100, w: 54, h: 70, ship: 0, weapon: 1, speed: ships[0].speed,
        cooldown: 0, invulnerable: 0, temp: null, tempTimer: 0, shooting: false, pointer: false
    };

    function safeStorageGet(key, fallback) {
        try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
    }
    function safeStorageSet(key, value) {
        try { localStorage.setItem(key, value); } catch { /* storage may be disabled */ }
    }
    function historyData() {
        try { const v = JSON.parse(safeStorageGet(STORAGE, "[]")); return Array.isArray(v) ? v : []; } catch { return []; }
    }
    function setText(el, value) { if (el) el.textContent = value; }
    function show(el) { if (el) { el.classList.remove("hidden"); el.classList.add("show"); } }
    function hide(el) { if (el) { el.classList.remove("show"); el.classList.add("hidden"); } }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function rand(a, b) { return Math.random() * (b - a) + a; }
    function dist(a, b, c, d) { return Math.hypot(a - c, b - d); }

    let audioCtx = null;
    function audioReady() {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === "suspended") audioCtx.resume();
        } catch { audioCtx = null; }
    }
    function beep(freq, duration = 0.06, type = "sine", volume = 0.025) {
        if (!audioCtx) return;
        try {
            const o = audioCtx.createOscillator(), g = audioCtx.createGain();
            o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(volume, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
            o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + duration);
        } catch { /* audio is optional */ }
    }

    function resize() {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(W * ratio);
        canvas.height = Math.round(H * ratio);
        canvas.style.aspectRatio = `${W} / ${H}`;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        createStars();
        player.x = clamp(player.x, player.w / 2, W - player.w / 2);
        player.y = clamp(player.y, H * 0.45, H - player.h / 2);
    }
    function createStars() {
        state.stars = Array.from({ length: 150 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(.5, 2.2), speed: rand(.15, 1.1), alpha: rand(.2, .9) }));
    }
    function updateStars(dt) {
        for (const s of state.stars) { s.y += s.speed * dt * 60; if (s.y > H) { s.y = -4; s.x = rand(0, W); } }
    }

    function currentWeapon() { return player.temp && player.tempTimer > 0 ? player.temp : weapons[clamp(player.weapon - 1, 0, weapons.length - 1)]; }
    function updateHUD() {
        setText(ui.health, Math.max(0, Math.round(state.health)));
        setText(ui.shield, Math.max(0, Math.round(state.shield)));
        setText(ui.score, state.score.toLocaleString("pt-BR"));
        setText(ui.level, state.level);
        setText(ui.ship, ships[player.ship].name);
        const w = currentWeapon();
        setText(ui.weapon, player.temp && player.tempTimer > 0 ? `${w.name} (${Math.ceil(player.tempTimer / 1000)}s)` : w.name);
        if (ui.weapon) ui.weapon.classList.toggle("temporary-weapon", Boolean(player.temp && player.tempTimer > 0));
    }
    function message(text, ms = 1400) {
        setText(ui.message, text);
        if (ui.message) ui.message.classList.add("show");
        state.messageTimer = ms;
    }

    function reset() {
        state.running = false; state.paused = false; state.over = false; state.score = 0; state.level = 1; state.kills = 0;
        state.health = 175; state.maxHealth = 175; state.shield = 102; state.maxShield = 150; state.elapsed = 0;
        state.spawn = 0; state.powerup = 0; state.shake = 0; state.messageTimer = 0;
        state.enemies.length = state.bullets.length = state.particles.length = state.powerups.length = state.popups.length = 0;
        player.x = W / 2; player.y = H - 100; player.ship = 0; player.weapon = 1; player.speed = ships[0].speed;
        player.cooldown = 0; player.invulnerable = 0; player.temp = null; player.tempTimer = 0; player.shooting = false;
        updateHUD();
    }
    function start() {
        audioReady(); beep(440, .08, "square", .03); reset(); state.running = true; state.lastFrame = performance.now();
        hide(ui.startOverlay); hide(ui.overOverlay); hide(ui.pauseOverlay); hide(ui.upgradeOverlay); hide(ui.historyOverlay);
        setText(ui.status, "JOGANDO"); message("🚀 BOA SORTE, PILOTO!", 1600); requestAnimationFrame(loop);
    }
    function pause() {
        if (!state.running || state.over) return;
        state.paused = true; show(ui.pauseOverlay); setText(ui.status, "PAUSADO");
    }
    function resume() {
        if (!state.running || state.over) return;
        state.paused = false; hide(ui.pauseOverlay); setText(ui.status, "JOGANDO"); state.lastFrame = performance.now(); requestAnimationFrame(loop);
    }
    function togglePause() { state.paused ? resume() : pause(); }

    function spawnEnemy() {
        if (state.enemies.length >= 7) return;
        const roll = Math.random();
        const type = state.level >= 5 && roll < .12 ? "large" : state.level >= 3 && roll < .32 ? "medium" : "small";
        const e = enemyTypes[type];
        state.enemies.push({ type, x: rand(e.w / 2, W - e.w / 2), y: -e.h, w: e.w, h: e.h, hp: e.hp + Math.max(0, state.level - 1) * (type === "large" ? 18 : 5), speed: e.speed * rand(.8, 1.2), phase: rand(0, Math.PI * 2) });
    }
    function shoot() {
        if (player.cooldown > 0 || !state.running || state.paused) return;
        const w = currentWeapon(), count = w.shots, gap = count === 1 ? 0 : 11;
        for (let i = 0; i < count; i++) {
            const offset = (i - (count - 1) / 2) * gap;
            state.bullets.push({ x: player.x + offset, y: player.y - 35, vx: offset * .035, vy: -13, damage: w.damage });
        }
        player.cooldown = ships[player.ship].fire;
        beep(player.temp ? 720 : 520, .035, "square", .018);
    }
    function collectPowerup(p) {
        if (p.type === "shield") state.shield = clamp(state.shield + 55, 0, state.maxShield);
        if (p.type === "health") state.health = clamp(state.health + 35, 0, state.maxHealth);
        if (p.type === "double") player.temp = tempWeapons.double;
        if (p.type === "triple") player.temp = tempWeapons.triple;
        if (p.type === "plasma") player.temp = tempWeapons.plasma;
        if (p.type === "double" || p.type === "triple" || p.type === "plasma") player.tempTimer = TEMP_DURATION;
        message(p.type === "shield" ? "🛡️ ESCUDO +55" : p.type === "health" ? "❤️ VIDA +35" : `${player.temp.name} — 8 SEGUNDOS!`, 1500);
        beep(880, .12, "sine", .035); updateHUD();
    }
    function updatePlayer(dt) {
        let dx = 0, dy = 0;
        if (state.keys.ArrowLeft || state.keys.a || state.keys.A) dx--;
        if (state.keys.ArrowRight || state.keys.d || state.keys.D) dx++;
        if (state.keys.ArrowUp || state.keys.w || state.keys.W) dy--;
        if (state.keys.ArrowDown || state.keys.s || state.keys.S) dy++;
        if (dx || dy) { const n = Math.hypot(dx, dy); dx /= n; dy /= n; player.x += dx * player.speed * dt * 60; player.y += dy * player.speed * dt * 60; }
        if (player.pointer) player.x += (player.pointerX - player.x) * Math.min(1, dt * 10);
        player.x = clamp(player.x, player.w / 2, W - player.w / 2);
        player.y = clamp(player.y, H * .45, H - player.h / 2);
        if (player.shooting) shoot();
        player.cooldown = Math.max(0, player.cooldown - dt * 1000);
        player.invulnerable = Math.max(0, player.invulnerable - dt * 1000);
        if (player.tempTimer > 0) { player.tempTimer -= dt * 1000; if (player.tempTimer <= 0) { player.tempTimer = 0; player.temp = null; message("Arma temporária encerrada", 900); } }
    }
    function hit(a, b) { return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2; }
    function damagePlayer(amount) {
        if (player.invulnerable > 0) return;
        let left = amount;
        if (state.shield > 0) { const absorbed = Math.min(state.shield, left); state.shield -= absorbed; left -= absorbed; }
        if (left > 0) state.health -= left;
        player.invulnerable = 550; state.shake = 8; beep(120, .1, "sawtooth", .025);
        if (state.health <= 0) endGame();
    }
    function destroyEnemy(index) {
        const e = state.enemies[index], def = enemyTypes[e.type];
        state.score += def.points; state.kills++;
        state.popups.push({ x: e.x, y: e.y, text: `+${def.points}`, life: 900 });
        explode(e.x, e.y, def.color, e.type === "large" ? 28 : 14);
        if (Math.random() < .13) state.powerups.push({ x: e.x, y: e.y, r: 13, vy: 1.5, type: ["shield", "health", "double", "triple", "plasma"][Math.floor(Math.random() * 5)] });
        state.enemies.splice(index, 1); beep(e.type === "large" ? 100 : 170, .08, "sawtooth", .02);
        const newLevel = Math.floor(state.kills / 10) + 1;
        if (newLevel > state.level) { state.level = newLevel; message(`🌌 FASE ${state.level}!`, 1300); player.ship = Math.min(ships.length - 1, Math.floor((state.level - 1) / 2)); player.speed = ships[player.ship].speed; }
    }
    function updateObjects(dt) {
        state.elapsed += dt * 1000;
        state.spawn += dt * 1000; state.powerup += dt * 1000;
        const spawnEvery = Math.max(360, 820 - state.level * 35);
        if (state.spawn >= spawnEvery) { state.spawn = 0; spawnEnemy(); }
        if (state.powerup >= 9000) { state.powerup = 0; state.powerups.push({ x: rand(30, W - 30), y: -20, r: 13, vy: 1.2, type: ["shield", "health", "double", "triple", "plasma"][Math.floor(Math.random() * 5)] }); }

        for (const b of state.bullets) { b.x += b.vx * dt * 60; b.y += b.vy * dt * 60; }
        state.bullets = state.bullets.filter(b => b.y > -30 && b.x > -40 && b.x < W + 40);
        for (let i = state.enemies.length - 1; i >= 0; i--) {
            const e = state.enemies[i]; e.y += e.speed * dt * 60; e.x += Math.sin(state.elapsed / 700 + e.phase) * .35;
            if (e.y > H + e.h) { state.enemies.splice(i, 1); damagePlayer(8); continue; }
            if (hit({ x: player.x, y: player.y, w: player.w * .7, h: player.h * .7 }, e)) { state.enemies.splice(i, 1); damagePlayer(e.type === "large" ? 35 : 20); continue; }
            for (let j = state.bullets.length - 1; j >= 0; j--) {
                const b = state.bullets[j]; if (Math.abs(b.x - e.x) < e.w / 2 && Math.abs(b.y - e.y) < e.h / 2) { e.hp -= b.damage; state.bullets.splice(j, 1); explode(b.x, b.y, "#ffffff", 3); if (e.hp <= 0) { destroyEnemy(i); break; } }
            }
        }
        for (let i = state.powerups.length - 1; i >= 0; i--) { const p = state.powerups[i]; p.y += p.vy * dt * 60; if (dist(p.x, p.y, player.x, player.y) < 45) { collectPowerup(p); state.powerups.splice(i, 1); } else if (p.y > H + 30) state.powerups.splice(i, 1); }
        for (let i = state.particles.length - 1; i >= 0; i--) { const p = state.particles[i]; p.x += p.vx * dt * 60; p.y += p.vy * dt * 60; p.life -= dt * 1000; p.vx *= .985; p.vy *= .985; if (p.life <= 0) state.particles.splice(i, 1); }
        for (let i = state.popups.length - 1; i >= 0; i--) { state.popups[i].y -= dt * 25; state.popups[i].life -= dt * 1000; if (state.popups[i].life <= 0) state.popups.splice(i, 1); }
        updateStars(dt);
        state.shake = Math.max(0, state.shake - dt * 25);
        updateHUD();
    }
    function explode(x, y, color, count) { for (let i = 0; i < count && state.particles.length < 180; i++) { const a = rand(0, Math.PI * 2), s = rand(1, 5); state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rand(1, 4), life: rand(250, 800), color }); } }

    function buyUpgrade(type) {
        const costs = { shield: 500, weapon: 1000, speed: 750 }, cost = costs[type];
        if (state.score < cost) { setText(ui.upgradeMessage, `Você precisa de ${cost.toLocaleString("pt-BR")} pontos.`); beep(100, .08, "square", .02); return; }
        state.score -= cost;
        if (type === "shield") state.shield = clamp(state.shield + 25, 0, state.maxShield);
        if (type === "weapon") player.weapon = Math.min(weapons.length, player.weapon + 1);
        if (type === "speed") { player.speed = clamp(player.speed + .5, ships[0].speed, 9); }
        setText(ui.upgradeMessage, "Melhoria aplicada com sucesso!"); message("🔧 MELHORIA APLICADA", 900); updateHUD(); beep(660, .1, "triangle", .03);
    }
    function openUpgrade() { if (!state.running || state.over) return; pause(); hide(ui.pauseOverlay); show(ui.upgradeOverlay); setText(ui.status, "MELHORIAS"); }
    function closeUpgrade() { hide(ui.upgradeOverlay); if (state.running && !state.over) resume(); }
    function renderHistory() {
        const data = historyData();
        const html = data.length ? data.map((x, i) => `<div class="history-row"><strong>#${i + 1}</strong><span>${Number(x.score).toLocaleString("pt-BR")} pontos</span><small>${new Date(x.date).toLocaleString("pt-BR")}</small></div>`).join("") : '<p class="empty-history">Nenhuma partida registrada ainda.</p>';
        if (ui.historyList) ui.historyList.innerHTML = html;
        if (ui.pageHistory) ui.pageHistory.innerHTML = html;
    }
    function saveScore() {
        const data = historyData(); data.unshift({ score: state.score, date: new Date().toISOString() });
        data.sort((a, b) => Number(b.score) - Number(a.score)); safeStorageSet(STORAGE, JSON.stringify(data.slice(0, 20)));
        safeStorageSet(LAST, String(state.score));
        const high = Math.max(Number(safeStorageGet(HIGH, "0")) || 0, state.score); safeStorageSet(HIGH, String(high));
        return high;
    }
    function endGame() {
        if (state.over) return;
        state.running = false; state.over = true; player.shooting = false; const high = saveScore();
        setText(ui.finalScore, state.score.toLocaleString("pt-BR")); setText(ui.lastScore, state.score.toLocaleString("pt-BR")); setText(ui.highScore, high.toLocaleString("pt-BR"));
        setText(ui.status, "FIM DE JOGO"); show(ui.overOverlay); renderHistory(); beep(90, .35, "sawtooth", .035);
    }

    function drawShip() {
        const c = ships[player.ship].color; ctx.save(); ctx.translate(player.x, player.y);
        if (player.tempTimer > 0) { ctx.shadowBlur = 24; ctx.shadowColor = c; }
        ctx.fillStyle = c; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(24, 28); ctx.lineTo(0, 18); ctx.lineTo(-24, 28); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#061326"; ctx.beginPath(); ctx.ellipse(0, -7, 8, 13, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ff9d3d"; ctx.beginPath(); ctx.moveTo(-8, 26); ctx.lineTo(0, 43 + Math.random() * 7); ctx.lineTo(8, 26); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    function draw() {
        ctx.save();
        ctx.fillStyle = "#030711"; ctx.fillRect(0, 0, W, H);
        for (const s of state.stars) { ctx.globalAlpha = s.alpha; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
        if (state.shake) ctx.translate(rand(-state.shake, state.shake), rand(-state.shake, state.shake));
        for (const b of state.bullets) { ctx.fillStyle = player.temp ? "#ffe45e" : "#65e7ff"; ctx.shadowBlur = 10; ctx.shadowColor = ctx.fillStyle; ctx.fillRect(b.x - 2, b.y - 10, 4, 16); }
        ctx.shadowBlur = 0;
        for (const e of state.enemies) { const d = enemyTypes[e.type]; ctx.save(); ctx.translate(e.x, e.y); ctx.fillStyle = d.color; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, d.h / 2); ctx.lineTo(d.w / 2, -d.h / 3); ctx.lineTo(0, -d.h / 2); ctx.lineTo(-d.w / 2, -d.h / 3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
        for (const p of state.powerups) { ctx.save(); ctx.translate(p.x, p.y); ctx.fillStyle = p.type === "shield" ? "#45aaff" : p.type === "health" ? "#55ff88" : "#ffe45e"; ctx.shadowBlur = 16; ctx.shadowColor = ctx.fillStyle; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#061326"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(p.type === "shield" ? "S" : p.type === "health" ? "+" : "W", 0, 0); ctx.restore(); }
        for (const p of state.particles) { ctx.globalAlpha = Math.max(0, p.life / 800); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1; drawShip();
        for (const p of state.popups) { ctx.globalAlpha = Math.max(0, p.life / 900); ctx.fillStyle = "#fff"; ctx.font = "bold 15px sans-serif"; ctx.textAlign = "center"; ctx.fillText(p.text, p.x, p.y); }
        ctx.restore();
    }
    function loop(now) {
        if (!state.running || state.paused) { draw(); return; }
        const dt = Math.min((now - state.lastFrame) / 1000, .035); state.lastFrame = now;
        updatePlayer(dt); updateObjects(dt); draw();
        if (state.messageTimer > 0) { state.messageTimer -= dt * 1000; if (state.messageTimer <= 0 && ui.message) ui.message.classList.remove("show"); }
        requestAnimationFrame(loop);
    }

    document.addEventListener("keydown", (e) => {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
        state.keys[e.key] = true; state.keys[e.code] = true;
        if (e.key === "Enter") { if (!state.running && !state.over) start(); else if (state.over) start(); else togglePause(); }
        if (e.key === "Escape") { if (ui.upgradeOverlay?.classList.contains("show")) closeUpgrade(); else if (ui.historyOverlay?.classList.contains("show")) hide(ui.historyOverlay); else if (state.running) pause(); }
        if (e.code === "Space") player.shooting = true;
    });
    document.addEventListener("keyup", (e) => { state.keys[e.key] = false; state.keys[e.code] = false; if (e.code === "Space") player.shooting = false; });
    canvas.addEventListener("pointermove", (e) => { const r = canvas.getBoundingClientRect(); player.pointerX = (e.clientX - r.left) / r.width * W; player.pointer = true; });
    canvas.addEventListener("pointerdown", (e) => { e.preventDefault(); audioReady(); player.shooting = true; player.pointer = true; });
    window.addEventListener("pointerup", () => { player.shooting = false; });
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", () => { if (document.hidden && state.running && !state.paused) pause(); });

    ui.start?.addEventListener("click", start);
    ui.restart?.addEventListener("click", start);
    ui.pause?.addEventListener("click", togglePause);
    ui.resume?.addEventListener("click", resume);
    ui.upgrade?.addEventListener("click", openUpgrade);
    ui.closeUpgrade?.addEventListener("click", closeUpgrade);
    ui.history?.addEventListener("click", () => { renderHistory(); show(ui.historyOverlay); if (state.running) pause(); setText(ui.status, "HISTÓRICO"); });
    ui.closeHistory?.addEventListener("click", () => { hide(ui.historyOverlay); if (state.running && !state.over) resume(); });
    ui.closeHistoryBottom?.addEventListener("click", () => { hide(ui.historyOverlay); if (state.running && !state.over) resume(); });
    ui.clearHistory?.addEventListener("click", () => { safeStorageSet(STORAGE, "[]"); renderHistory(); });
    document.querySelectorAll(".upgrade-option").forEach(btn => btn.addEventListener("click", () => buyUpgrade(btn.dataset.upgrade)));

    resize(); reset(); renderHistory(); draw();
    setText(ui.status, "PRONTO");
    console.info("Galaxy Frontier: jogo carregado e pronto.");
})();
