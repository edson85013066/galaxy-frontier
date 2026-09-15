"use strict";

/* =========================================================
   GALAXY FRONTIER
   ========================================================= */

const canvas = document.getElementById("gameCanvas");

if (!canvas) {
    console.error("Galaxy Frontier: canvas #gameCanvas não encontrado.");
} else {

const ctx = canvas.getContext("2d");

/* =========================================================
   CONFIGURAÇÕES
   ========================================================= */

const CONFIG = {
    canvasWidth: 1280,
    canvasHeight: 720,

    playerHealth: 175,
    playerMaxHealth: 175,

    playerShield: 102,
    playerMaxShield: 150,

    playerBaseSpeed: 5.8,
    playerMaxSpeed: 9,

    bulletBaseSpeed: 13,

    enemySpawnStart: 760,
    enemySpawnMinimum: 480,

    powerupInterval: 8500,

    levelEvery: 10,

    maxHistory: 20,

    maxParticles: 120,

    maxEnemies: 5,

    // ARMA FORTE: 8 SEGUNDOS
    weaponPowerDuration: 8000
};

/* =========================================================
   NAVES
   ========================================================= */

const SHIPS = [
    {
        name: "Falcon",
        color: "#00eaff",
        speed: 5.8,
        fireRate: 190
    },
    {
        name: "Vortex",
        color: "#39ff88",
        speed: 6.3,
        fireRate: 175
    },
    {
        name: "Nova",
        color: "#ffe45e",
        speed: 6.7,
        fireRate: 160
    },
    {
        name: "Titan",
        color: "#ff9d3d",
        speed: 5.5,
        fireRate: 145
    },
    {
        name: "Phoenix",
        color: "#ff4fd8",
        speed: 7,
        fireRate: 130
    }
];

/* =========================================================
   ARMAS NORMAIS
   ========================================================= */

const WEAPONS = [
    {
        name: "Simples",
        damage: 18
    },
    {
        name: "Dupla",
        damage: 20
    },
    {
        name: "Tripla",
        damage: 22
    },
    {
        name: "Quíntupla",
        damage: 25
    },
    {
        name: "Plasma",
        damage: 30
    }
];

/* =========================================================
   ARMAS FORTES TEMPORÁRIAS
   ========================================================= */

const TEMP_WEAPONS = {
    double: {
        name: "DUPLA FORTE",
        level: 2,
        damage: 34
    },

    triple: {
        name: "TRIPLA FORTE",
        level: 3,
        damage: 38
    },

    plasma: {
        name: "PLASMA FORTE",
        level: 5,
        damage: 48
    }
};

/* =========================================================
   INIMIGOS
   ========================================================= */

const ENEMY_TYPES = {
    small: {
        width: 34,
        height: 42,
        health: 34,
        speedMin: 1.9,
        speedMax: 2.8,
        points: 50,
        color: "#ff4d5a"
    },

    medium: {
        width: 58,
        height: 58,
        health: 90,
        speedMin: 1.25,
        speedMax: 1.8,
        points: 120,
        color: "#b36bff"
    },

    large: {
        width: 96,
        height: 96,
        health: 280,
        speedMin: 0.65,
        speedMax: 0.95,
        points: 400,
        color: "#ff9d3d"
    }
};

/* =========================================================
   ESTADO DO JOGO
   ========================================================= */

const game = {
    running: false,
    paused: false,
    gameOver: false,

    score: 0,

    lastScore:
        Number(localStorage.getItem("galaxyFrontierLastScore")) || 0,

    highScore:
        Number(localStorage.getItem("galaxyFrontierHighScore")) || 0,

    level: 1,

    kills: 0,

    health: CONFIG.playerHealth,
    maxHealth: CONFIG.playerMaxHealth,

    shield: CONFIG.playerShield,
    maxShield: CONFIG.playerMaxShield,

    elapsedTime: 0,

    enemyTimer: 0,
    powerupTimer: 0,

    nextMilestone: 5000,

    enemies: [],
    bullets: [],
    particles: [],
    powerups: [],
    stars: [],
    scorePopups: [],

    keys: {},

    screenShake: 0,

    centerMessageTimer: 0,

    lastFrame: 0
};

/* =========================================================
   JOGADOR
   ========================================================= */

const player = {
    x: CONFIG.canvasWidth / 2,

    y: CONFIG.canvasHeight - 100,

    width: 54,

    height: 70,

    speed: SHIPS[0].speed,

    shipIndex: 0,

    weaponLevel: 1,

    temporaryWeapon: null,

    temporaryWeaponTimer: 0,

    shootCooldown: 0,

    invulnerable: 0,

    shooting: false
};

/* =========================================================
   ELEMENTOS HTML
   Tudo protegido contra elementos ausentes
   ========================================================= */

const healthElement = document.getElementById("health");
const shieldElement = document.getElementById("shield");
const scoreElement = document.getElementById("score");
const levelElement = document.getElementById("level");
const weaponElement = document.getElementById("weapon");
const shipElement = document.getElementById("ship");

const startGameButton = document.getElementById("startGame");
const pauseGameButton = document.getElementById("pauseGame");
const upgradeGameButton = document.getElementById("upgradeGame");
const historyGameButton = document.getElementById("historyGame");

const startOverlay = document.getElementById("startOverlay");
const pauseOverlay = document.getElementById("pauseOverlay");
const upgradeOverlay = document.getElementById("upgradeOverlay");
const historyOverlay = document.getElementById("historyOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");

const centerMessage = document.getElementById("centerMessage");
const gameStatus = document.getElementById("gameStatus");

const resumeGameButton = document.getElementById("resumeGame");

const upgradeMessage = document.getElementById("upgradeMessage");
const closeUpgradeButton = document.getElementById("closeUpgrade");

const historyList = document.getElementById("historyList");
const pageHistoryList = document.getElementById("pageHistoryList");

const clearHistoryButton = document.getElementById("clearHistory");
const closeHistoryButton = document.getElementById("closeHistory");
const closeHistoryBottomButton =
    document.getElementById("closeHistoryBottom");

const finalScoreElement = document.getElementById("finalScore");
const lastScoreElement = document.getElementById("lastScore");
const highScoreElement = document.getElementById("highScore");

const restartGameButton = document.getElementById("restartGame");

/* =========================================================
   FUNÇÕES SEGURAS DE INTERFACE
   ========================================================= */

function setGameStatus(text) {
    if (gameStatus) {
        gameStatus.textContent = text;
    }
}

function showOverlay(element) {
    if (element) {
        element.classList.add("show");
    }
}

function hideOverlay(element) {
    if (element) {
        element.classList.remove("show");
    }
}

/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
    return Math.floor(random(min, max + 1));
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt(
        Math.pow(x2 - x1, 2) +
        Math.pow(y2 - y1, 2)
    );
}

/* =========================================================
   CANVAS
   ========================================================= */

function resizeCanvas() {
    canvas.width = CONFIG.canvasWidth;
    canvas.height = CONFIG.canvasHeight;

    player.x = clamp(
        player.x,
        player.width / 2,
        canvas.width - player.width / 2
    );

    player.y = clamp(
        player.y,
        canvas.height * 0.45,
        canvas.height - player.height / 2
    );

    createStars();
}

/* =========================================================
   ESTRELAS
   ========================================================= */

function createStars() {
    game.stars = [];

    for (let i = 0; i < 150; i++) {
        game.stars.push({
            x: random(0, canvas.width),
            y: random(0, canvas.height),
            size: random(0.5, 2.5),
            speed: random(0.2, 1.2),
            alpha: random(0.25, 1)
        });
    }
}

function updateStars(dt) {
    for (const star of game.stars) {
        star.y += star.speed * dt * 60;

        if (star.y > canvas.height) {
            star.y = -5;
            star.x = random(0, canvas.width);
        }
    }
}

function drawStars() {
    for (const star of game.stars) {
        ctx.save();

        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = "#ffffff";

        ctx.beginPath();

        ctx.arc(
            star.x,
            star.y,
            star.size,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    }
}

/* =========================================================
   HUD
   ========================================================= */

function getCurrentWeapon() {

    if (
        player.temporaryWeapon &&
        player.temporaryWeaponTimer > 0
    ) {
        return player.temporaryWeapon;
    }

    return WEAPONS[
        clamp(
            player.weaponLevel - 1,
            0,
            WEAPONS.length - 1
        )
    ];
}

function getWeaponSeconds() {

    if (!player.temporaryWeapon) {
        return 0;
    }

    return Math.max(
        0,
        Math.ceil(
            player.temporaryWeaponTimer / 1000
        )
    );
}

function updateHUD() {

    if (healthElement) {
        healthElement.textContent =
            Math.max(
                0,
                Math.round(game.health)
            );
    }

    if (shieldElement) {
        shieldElement.textContent =
            Math.max(
                0,
                Math.round(game.shield)
            );
    }

    if (scoreElement) {
        scoreElement.textContent =
            game.score.toLocaleString("pt-BR");
    }

    if (levelElement) {
        levelElement.textContent =
            game.level;
    }

    if (shipElement) {
        shipElement.textContent =
            SHIPS[player.shipIndex].name;
    }

    if (weaponElement) {

        if (
            player.temporaryWeapon &&
            player.temporaryWeaponTimer > 0
        ) {

            weaponElement.textContent =
                `${player.temporaryWeapon.name} (${getWeaponSeconds()}s)`;

            weaponElement.classList.add(
                "temporary-weapon"
            );

        } else {

            weaponElement.textContent =
                getCurrentWeapon().name;

            weaponElement.classList.remove(
                "temporary-weapon"
            );
        }
    }
}

/* =========================================================
   MENSAGEM
   ========================================================= */

function showCenterMessage(
    message,
    duration = 1500
) {
    if (!centerMessage) {
        return;
    }

    centerMessage.textContent =
        message;

    centerMessage.classList.add("show");

    game.centerMessageTimer =
        duration;
}

/* =========================================================
   INICIAR JOGO
   ========================================================= */

function startGame() {

    console.log("Galaxy Frontier: iniciando jogo...");

    resetGame();

    game.running = true;
    game.paused = false;
    game.gameOver = false;

    hideOverlay(startOverlay);
    hideOverlay(gameOverOverlay);
    hideOverlay(pauseOverlay);
    hideOverlay(upgradeOverlay);
    hideOverlay(historyOverlay);

    setGameStatus("JOGANDO");

    showCenterMessage(
        "🚀 BOA SORTE, PILOTO!",
        1600
    );

    game.lastFrame =
        performance.now();

    updateHUD();

    requestAnimationFrame(gameLoop);
}

/* =========================================================
   RESET DO JOGO
   ========================================================= */

function resetGame() {

    game.running = false;
    game.paused = false;
    game.gameOver = false;

    game.score = 0;
    game.level = 1;
    game.kills = 0;

    game.health =
        CONFIG.playerHealth;

    game.maxHealth =
        CONFIG.playerMaxHealth;

    game.shield =
        CONFIG.playerShield;

    game.maxShield =
        CONFIG.playerMaxShield;

    game.elapsedTime = 0;

    game.enemyTimer = 0;
    game.powerupTimer = 0;

    game.nextMilestone = 5000;

    game.enemies = [];
    game.bullets = [];
    game.particles = [];
    game.powerups = [];
    game.scorePopups = [];

    game.screenShake = 0;
    game.centerMessageTimer = 0;

    player.x =
        canvas.width / 2;

    player.y =
        canvas.height - 100;

    player.shipIndex = 0;

    player.weaponLevel = 1;

    player.speed =
        SHIPS[0].speed;

    player.shootCooldown = 0;

    player.invulnerable = 0;

    player.shooting = false;

    // LIMPA A ARMA TEMPORÁRIA
    player.temporaryWeapon = null;

    player.temporaryWeaponTimer = 0;

    updateHUD();
}

/* =========================================================
   PLAYER
   ========================================================= */

function updatePlayer(dt) {

    let dx = 0;
    let dy = 0;

    if (
        game.keys["ArrowLeft"] ||
        game.keys["a"] ||
        game.keys["A"]
    ) {
        dx -= 1;
    }

    if (
        game.keys["ArrowRight"] ||
        game.keys["d"] ||
        game.keys["D"]
    ) {
        dx += 1;
    }

    if (
        game.keys["ArrowUp"] ||
        game.keys["w"] ||
        game.keys["W"]
    ) {
        dy -= 1;
    }

    if (
        game.keys["ArrowDown"] ||
        game.keys["s"] ||
        game.keys["S"]
    ) {
        dy += 1;
    }

    if (dx !== 0 || dy !== 0) {

        const length =
            Math.sqrt(
                dx * dx +
                dy * dy
            );

        dx /= length;
        dy /= length;
    }

    player.x +=
        dx *
        player.speed *
        dt *
        60;

    player.y +=
        dy *
        player.speed *
        dt *
        60;

    player.x = clamp(
        player.x,
        player.width / 2,
        canvas.width -
            player.width / 2
    );

    player.y = clamp(
        player.y,
        canvas.height * 0.45,
        canvas.height -
            player.height / 2
    );

    if (player.shootCooldown > 0) {
        player.shootCooldown -=
            dt * 1000;
    }

    if (
        game.keys[" "] ||
        game.keys["Spacebar"] ||
        game.keys["Space"]
    ) {
        shoot();
    }

    if (player.invulnerable > 0) {
        player.invulnerable -=
            dt * 1000;
    }
}

/* =========================================================
   TIRO
   ========================================================= */

function shoot() {

    if (
        !game.running ||
        game.paused ||
        game.gameOver
    ) {
        return;
    }

    if (player.shootCooldown > 0) {
        return;
    }

    const weapon =
        getCurrentWeapon();

    player.shootCooldown =
        SHIPS[player.shipIndex].fireRate;

    const bulletSpeed =
        CONFIG.bulletBaseSpeed;

    let patterns = [];

    if (
        weapon.name === "Dupla" ||
        weapon.name === "DUPLA FORTE"
    ) {
        patterns = [
            -0.24,
            0.24
        ];
    }

    else if (
        weapon.name === "Tripla" ||
        weapon.name === "TRIPLA FORTE"
    ) {
        patterns = [
            -0.35,
            0,
            0.35
        ];
    }

    else if (
        weapon.name === "Quíntupla"
    ) {
        patterns = [
            -0.55,
            -0.27,
            0,
            0.27,
            0.55
        ];
    }

    else if (
        weapon.name === "Plasma" ||
        weapon.name === "PLASMA FORTE"
    ) {
        patterns = [
            -0.48,
            -0.24,
            0,
            0.24,
            0.48
        ];
    }

    else {
        patterns = [0];
    }

    patterns.forEach(
        (angle, index) => {

            let damage =
                weapon.damage;

            if (
                weapon.name ===
                    "PLASMA FORTE" &&
                index === 2
            ) {
                damage += 15;
            }

            game.bullets.push({

                x: player.x,

                y:
                    player.y -
                    player.height / 2,

                vx:
                    Math.sin(angle) *
                    bulletSpeed,

                vy:
                    -Math.cos(angle) *
                    bulletSpeed,

                radius:
                    weapon.name.includes(
                        "PLASMA"
                    )
                        ? 5
                        : 3,

                damage: damage,

                life: 1800,

                plasma:
                    weapon.name.includes(
                        "PLASMA"
                    )
            });
        }
    );
}

/* =========================================================
   BALAS
   ========================================================= */

function updateBullets(dt) {

    for (
        let i =
            game.bullets.length - 1;
        i >= 0;
        i--
    ) {

        const bullet =
            game.bullets[i];

        bullet.x +=
            bullet.vx *
            dt *
            60;

        bullet.y +=
            bullet.vy *
            dt *
            60;

        bullet.life -=
            dt * 1000;

        if (
            bullet.life <= 0 ||
            bullet.y < -30 ||
            bullet.x < -50 ||
            bullet.x >
                canvas.width + 50
        ) {
            game.bullets.splice(
                i,
                1
            );
        }
    }
}

function drawBullets() {

    for (
        const bullet
        of game.bullets
    ) {

        ctx.save();

        if (bullet.plasma) {

            ctx.shadowBlur = 20;
            ctx.shadowColor =
                "#ff5cff";

            ctx.fillStyle =
                "#ffb5ff";

        } else {

            ctx.shadowBlur = 12;
            ctx.shadowColor =
                "#00eaff";

            ctx.fillStyle =
                "#8fffff";
        }

        ctx.beginPath();

        ctx.arc(
            bullet.x,
            bullet.y,
            bullet.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    }
}

/* =========================================================
   INIMIGOS
   ========================================================= */

function spawnEnemy() {

    const types = [
        "small",
        "small",
        "small",
        "medium"
    ];

    if (game.level >= 3) {
        types.push("medium");
    }

    if (game.level >= 5) {
        types.push("large");
    }

    const typeName =
        types[
            randomInt(
                0,
                types.length - 1
            )
        ];

    const type =
        ENEMY_TYPES[typeName];

    game.enemies.push({

        type: typeName,

        x: random(
            type.width / 2,
            canvas.width -
                type.width / 2
        ),

        y: -type.height,

        width: type.width,

        height: type.height,

        health: type.health,

        maxHealth: type.health,

        speed:
            random(
                type.speedMin,
                type.speedMax
            ) +
            game.level * 0.035,

        points: type.points,

        color: type.color,

        rotation:
            random(
                0,
                Math.PI * 2
            ),

        rotationSpeed:
            random(
                -0.02,
                0.02
            )
    });
}

function updateEnemies(dt) {

    for (
        let i =
            game.enemies.length - 1;
        i >= 0;
        i--
    ) {

        const enemy =
            game.enemies[i];

        enemy.y +=
            enemy.speed *
            dt *
            60;

        enemy.rotation +=
            enemy.rotationSpeed *
            dt *
            60;

        if (
            enemy.y >
            canvas.height +
                enemy.height
        ) {

            game.enemies.splice(
                i,
                1
            );

            damagePlayer(
                enemy.type === "large"
                    ? 28
                    : enemy.type ===
                        "medium"
                        ? 16
                        : 9
            );

            continue;
        }

        if (
            checkPlayerCollision(
                enemy
            )
        ) {

            game.enemies.splice(
                i,
                1
            );

            damagePlayer(
                enemy.type === "large"
                    ? 45
                    : enemy.type ===
                        "medium"
                        ? 28
                        : 18
            );

            createExplosion(
                enemy.x,
                enemy.y,
                enemy.color,
                15
            );
        }
    }
}

function checkPlayerCollision(enemy) {

    return (
        Math.abs(
            enemy.x -
                player.x
        ) <
            (enemy.width +
                player.width) *
                0.35 &&

        Math.abs(
            enemy.y -
                player.y
        ) <
            (enemy.height +
                player.height) *
                0.35
    );
}

/* =========================================================
   COLISÃO DAS BALAS
   ========================================================= */

function checkBulletCollisions() {

    for (
        let i =
            game.bullets.length - 1;
        i >= 0;
        i--
    ) {

        const bullet =
            game.bullets[i];

        for (
            let j =
                game.enemies.length - 1;
            j >= 0;
            j--
        ) {

            const enemy =
                game.enemies[j];

            const hitDistance =
                Math.max(
                    enemy.width,
                    enemy.height
                ) * 0.45;

            if (
                distance(
                    bullet.x,
                    bullet.y,
                    enemy.x,
                    enemy.y
                ) <
                hitDistance
            ) {

                enemy.health -=
                    bullet.damage;

                createParticles(
                    bullet.x,
                    bullet.y,
                    enemy.color,
                    4
                );

                game.bullets.splice(
                    i,
                    1
                );

                if (
                    enemy.health <= 0
                ) {
                    destroyEnemy(
                        enemy,
                        j
                    );
                }

                break;
            }
        }
    }
}

/* =========================================================
   DESTRUIR INIMIGO
   ========================================================= */

function destroyEnemy(
    enemy,
    index
) {

    game.score +=
        enemy.points;

    game.kills++;

    game.scorePopups.push({

        x: enemy.x,

        y: enemy.y,

        text:
            `+${enemy.points}`,

        life: 900,

        maxLife: 900
    });

    createExplosion(
        enemy.x,
        enemy.y,
        enemy.color,
        enemy.type === "large"
            ? 28
            : enemy.type ===
                "medium"
                ? 18
                : 10
    );

    if (Math.random() < 0.08) {
        createPowerup(
            enemy.x,
            enemy.y
        );
    }

    if (index >= 0) {
        game.enemies.splice(
            index,
            1
        );
    }

    checkScoreMilestone();

    updateHUD();
}

/* =========================================================
   DANO
   ========================================================= */

function damagePlayer(amount) {

    if (player.invulnerable > 0) {
        return;
    }

    player.invulnerable = 700;

    let remainingDamage =
        amount;

    if (game.shield > 0) {

        const shieldDamage =
            Math.min(
                game.shield,
                remainingDamage
            );

        game.shield -=
            shieldDamage;

        remainingDamage -=
            shieldDamage;
    }

    if (remainingDamage > 0) {
        game.health -=
            remainingDamage;
    }

    game.screenShake = 12;

    createParticles(
        player.x,
        player.y,
        "#ff3b55",
        12
    );

    if (game.health <= 0) {

        game.health = 0;

        endGame();
    }

    updateHUD();
}

/* =========================================================
   POWER-UPS
   ========================================================= */

function createPowerup(
    x,
    y
) {

    const types = [
        "shield",
        "weapon",
        "repair",
        "ship"
    ];

    const type =
        types[
            randomInt(
                0,
                types.length - 1
            )
        ];

    game.powerups.push({

        x,

        y,

        size: 22,

        type,

        speed: 1.5,

        rotation: 0,

        life: 10000
    });
}

function updatePowerups(dt) {

    for (
        let i =
            game.powerups.length - 1;
        i >= 0;
        i--
    ) {

        const powerup =
            game.powerups[i];

        powerup.y +=
            powerup.speed *
            dt *
            60;

        powerup.rotation +=
            0.03 *
            dt *
            60;

        powerup.life -=
            dt *
            1000;

        if (
            powerup.life <= 0 ||
            powerup.y >
                canvas.height + 50
        ) {

            game.powerups.splice(
                i,
                1
            );

            continue;
        }

        if (
            distance(
                powerup.x,
                powerup.y,
                player.x,
                player.y
            ) < 45
        ) {

            collectPowerup(
                powerup
            );

            game.powerups.splice(
                i,
                1
            );
        }
    }
}

/* =========================================================
   COLETAR POWER-UP
   ========================================================= */

function collectPowerup(
    powerup
) {

    if (
        powerup.type ===
        "shield"
    ) {

        game.shield =
            clamp(
                game.shield + 35,
                0,
                game.maxShield
            );

        showCenterMessage(
            "🛡️ ESCUDO +35",
            1200
        );
    }

    else if (
        powerup.type ===
        "repair"
    ) {

        game.health =
            clamp(
                game.health + 30,
                0,
                game.maxHealth
            );

        showCenterMessage(
            "❤️ VIDA +30",
            1200
        );
    }

    else if (
        powerup.type ===
        "weapon"
    ) {

        activateRandomTemporaryWeapon();
    }

    else if (
        powerup.type ===
        "ship"
    ) {

        if (
            player.shipIndex <
            SHIPS.length - 1
        ) {

            player.shipIndex++;

            player.speed =
                SHIPS[
                    player.shipIndex
                ].speed;
        }

        if (
            player.weaponLevel <
            WEAPONS.length
        ) {
            player.weaponLevel++;
        }

        showCenterMessage(
            `🚀 ${SHIPS[player.shipIndex].name} EVOLUÍDA!`,
            1500
        );
    }

    createParticles(
        powerup.x,
        powerup.y,
        "#ffffff",
        15
    );

    updateHUD();
}

/* =========================================================
   ARMA FORTE TEMPORÁRIA
   8 SEGUNDOS
   ========================================================= */

function activateTemporaryWeapon(
    weaponType
) {

    const weapon =
        TEMP_WEAPONS[
            weaponType
        ];

    if (!weapon) {
        return;
    }

    player.temporaryWeapon = {
        name: weapon.name,
        level: weapon.level,
        damage: weapon.damage
    };

    // 8000 = 8 SEGUNDOS
    player.temporaryWeaponTimer =
        8000;

    showCenterMessage(
        `⚡ ${weapon.name} — 8 SEGUNDOS!`,
        1800
    );

    updateHUD();
}

function activateRandomTemporaryWeapon() {

    const weapons = [
        "double",
        "triple",
        "plasma"
    ];

    const selected =
        weapons[
            randomInt(
                0,
                weapons.length - 1
            )
        ];

    activateTemporaryWeapon(
        selected
    );
}

/* =========================================================
   CONTADOR DA ARMA FORTE
   ========================================================= */

function updateTemporaryWeapon(
    dt
) {

    if (
        !player.temporaryWeapon
    ) {
        return;
    }

    player.temporaryWeaponTimer -=
        dt * 1000;

    if (
        player.temporaryWeaponTimer <=
        0
    ) {

        const expiredWeapon =
            player.temporaryWeapon.name;

        player.temporaryWeaponTimer =
            0;

        player.temporaryWeapon =
            null;

        showCenterMessage(
            `🔫 ${expiredWeapon} terminou!`,
            1400
        );

        updateHUD();

        return;
    }

    updateHUD();
}

/* =========================================================
   EVOLUÇÃO
   ========================================================= */

function checkScoreMilestone() {

    if (
        game.score >=
        game.nextMilestone
    ) {

        game.nextMilestone +=
            5000;

        evolveShip();
    }
}

function evolveShip() {

    if (
        player.shipIndex <
        SHIPS.length - 1
    ) {

        player.shipIndex++;

        player.speed =
            SHIPS[
                player.shipIndex
            ].speed;
    }

    if (
        player.weaponLevel <
        WEAPONS.length
    ) {
        player.weaponLevel++;
    }

    game.level++;

    showCenterMessage(
        `🚀 EVOLUÇÃO! ${SHIPS[player.shipIndex].name}`,
        1800
    );

    updateHUD();
}

/* =========================================================
   PARTÍCULAS
   ========================================================= */

function createParticles(
    x,
    y,
    color,
    amount = 8
) {

    for (let i = 0; i < amount; i++) {

        if (
            game.particles.length >=
            CONFIG.maxParticles
        ) {
            break;
        }

        game.particles.push({

            x,

            y,

            vx: random(-3, 3),

            vy: random(-3, 3),

            size: random(1, 4),

            life: random(300, 800),

            maxLife: 800,

            color
        });
    }
}

function createExplosion(
    x,
    y,
    color,
    amount = 15
) {

    createParticles(
        x,
        y,
        color,
        amount
    );
}

function updateParticles(dt) {

    for (
        let i =
            game.particles.length - 1;
        i >= 0;
        i--
    ) {

        const particle =
            game.particles[i];

        particle.x +=
            particle.vx *
            dt *
            60;

        particle.y +=
            particle.vy *
            dt *
            60;

        particle.life -=
            dt *
            1000;

        particle.size *=
            0.995;

        if (
            particle.life <= 0
        ) {
            game.particles.splice(
                i,
                1
            );
        }
    }
}

function drawParticles() {

    for (
        const particle
        of game.particles
    ) {

        ctx.save();

        ctx.globalAlpha =
            Math.max(
                0,
                particle.life /
                    particle.maxLife
            );

        ctx.fillStyle =
            particle.color;

        ctx.beginPath();

        ctx.arc(
            particle.x,
            particle.y,
            particle.size,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    }
}

/* =========================================================
   DESENHAR NAVE
   ========================================================= */

function drawPlayer() {

    if (
        player.invulnerable > 0 &&
        Math.floor(
            player.invulnerable /
                80
        ) %
            2 ===
            0
    ) {
        return;
    }

    const ship =
        SHIPS[player.shipIndex];

    ctx.save();

    ctx.translate(
        player.x,
        player.y
    );

    ctx.shadowBlur = 25;

    ctx.shadowColor =
        ship.color;

    ctx.fillStyle =
        ship.color;

    ctx.beginPath();

    ctx.moveTo(
        0,
        -player.height / 2
    );

    ctx.lineTo(
        player.width / 2,
        player.height / 2
    );

    ctx.lineTo(
        0,
        player.height / 4
    );

    ctx.lineTo(
        -player.width / 2,
        player.height / 2
    );

    ctx.closePath();

    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle =
        "#07152b";

    ctx.beginPath();

    ctx.arc(
        0,
        -8,
        10,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle =
        "#ffffff";

    ctx.beginPath();

    ctx.moveTo(
        -8,
        25
    );

    ctx.lineTo(
        0,
        43
    );

    ctx.lineTo(
        8,
        25
    );

    ctx.closePath();

    ctx.fill();

    // AURA DA ARMA FORTE
    if (
        player.temporaryWeapon &&
        player.temporaryWeaponTimer > 0
    ) {

        ctx.strokeStyle =
            "#ff5cff";

        ctx.lineWidth = 3;

        ctx.shadowBlur = 25;

        ctx.shadowColor =
            "#ff5cff";

        ctx.beginPath();

        ctx.arc(
            0,
            0,
            42 +
                Math.sin(
                    performance.now() /
                        100
                ) *
                    4,
            0,
            Math.PI * 2
        );

        ctx.stroke();
    }

    ctx.restore();
}

/* =========================================================
   DESENHAR INIMIGOS
   ========================================================= */

function drawEnemies() {

    for (
        const enemy
        of game.enemies
    ) {

        ctx.save();

        ctx.translate(
            enemy.x,
            enemy.y
        );

        ctx.rotate(
            enemy.rotation
        );

        ctx.shadowBlur = 18;

        ctx.shadowColor =
            enemy.color;

        ctx.fillStyle =
            enemy.color;

        ctx.beginPath();

        if (
            enemy.type ===
            "small"
        ) {

            ctx.moveTo(
                0,
                -enemy.height / 2
            );

            ctx.lineTo(
                enemy.width / 2,
                enemy.height / 2
            );

            ctx.lineTo(
                0,
                enemy.height / 4
            );

            ctx.lineTo(
                -enemy.width / 2,
                enemy.height / 2
            );

        }

        else if (
            enemy.type ===
            "medium"
        ) {

            ctx.rect(
                -enemy.width / 2,
                -enemy.height / 2,
                enemy.width,
                enemy.height
            );

        }

        else {

            ctx.arc(
                0,
                0,
                enemy.width / 2,
                0,
                Math.PI * 2
            );
        }

        ctx.closePath();

        ctx.fill();

        ctx.shadowBlur = 0;

        ctx.fillStyle =
            "#151525";

        ctx.beginPath();

        ctx.arc(
            0,
            0,
            Math.max(
                5,
                enemy.width * 0.12
            ),
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();

        if (
            enemy.health <
            enemy.maxHealth
        ) {

            const barWidth =
                enemy.width;

            const healthWidth =
                barWidth *
                (
                    enemy.health /
                    enemy.maxHealth
                );

            ctx.fillStyle =
                "rgba(0,0,0,.5)";

            ctx.fillRect(
                enemy.x -
                    barWidth / 2,
                enemy.y -
                    enemy.height / 2 -
                    10,
                barWidth,
                5
            );

            ctx.fillStyle =
                "#39ff88";

            ctx.fillRect(
                enemy.x -
                    barWidth / 2,
                enemy.y -
                    enemy.height / 2 -
                    10,
                healthWidth,
                5
            );
        }
    }
}

/* =========================================================
   POWER-UPS VISUAIS
   ========================================================= */

function drawPowerups() {

    for (
        const powerup
        of game.powerups
    ) {

        ctx.save();

        ctx.translate(
            powerup.x,
            powerup.y
        );

        ctx.rotate(
            powerup.rotation
        );

        let color = "#ffffff";
        let symbol = "?";

        if (
            powerup.type ===
            "shield"
        ) {
            color = "#3d8bff";
            symbol = "S";
        }

        else if (
            powerup.type ===
            "weapon"
        ) {
            color = "#ff5cff";
            symbol = "W";
        }

        else if (
            powerup.type ===
            "repair"
        ) {
            color = "#39ff88";
            symbol = "+";
        }

        else if (
            powerup.type ===
            "ship"
        ) {
            color = "#ffe45e";
            symbol = "N";
        }

        ctx.shadowBlur = 25;

        ctx.shadowColor =
            color;

        ctx.fillStyle =
            color;

        ctx.beginPath();

        ctx.arc(
            0,
            0,
            powerup.size,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.shadowBlur = 0;

        ctx.fillStyle =
            "#081225";

        ctx.font =
            "bold 18px Arial";

        ctx.textAlign =
            "center";

        ctx.textBaseline =
            "middle";

        ctx.fillText(
            symbol,
            0,
            1
        );

        ctx.restore();
    }
}

/* =========================================================
   SCORE POPUPS
   ========================================================= */

function updateScorePopups(dt) {

    for (
        let i =
            game.scorePopups.length - 1;
        i >= 0;
        i--
    ) {

        const popup =
            game.scorePopups[i];

        popup.y -=
            dt * 35;

        popup.life -=
            dt *
            1000;

        if (
            popup.life <= 0
        ) {

            game.scorePopups.splice(
                i,
                1
            );
        }
    }
}

function drawScorePopups() {

    for (
        const popup
        of game.scorePopups
    ) {

        ctx.save();

        ctx.globalAlpha =
            popup.life /
            popup.maxLife;

        ctx.fillStyle =
            "#ffffff";

        ctx.font =
            "bold 18px Arial";

        ctx.textAlign =
            "center";

        ctx.fillText(
            popup.text,
            popup.x,
            popup.y
        );

        ctx.restore();
    }
}

/* =========================================================
   FUNDO
   ========================================================= */

function drawBackground() {

    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            0,
            canvas.height
        );

    gradient.addColorStop(
        0,
        "#020617"
    );

    gradient.addColorStop(
        1,
        "#071b35"
    );

    ctx.fillStyle =
        gradient;

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );
}

/* =========================================================
   POWER-UP AUTOMÁTICO
   ========================================================= */

function updateAutomaticPowerups(dt) {

    game.powerupTimer +=
        dt * 1000;

    if (
        game.powerupTimer >=
        CONFIG.powerupInterval
    ) {

        game.powerupTimer = 0;

        createPowerup(
            random(
                50,
                canvas.width - 50
            ),
            -30
        );
    }
}

/* =========================================================
   NASCIMENTO DOS INIMIGOS
   ========================================================= */

function updateEnemySpawner(dt) {

    game.enemyTimer +=
        dt * 1000;

    const spawnInterval =
        Math.max(
            CONFIG.enemySpawnMinimum,
            CONFIG.enemySpawnStart -
                game.level * 35
        );

    if (
        game.enemyTimer >=
        spawnInterval
    ) {

        game.enemyTimer = 0;

        const maxEnemies =
            Math.min(
                CONFIG.maxEnemies,
                2 +
                    Math.floor(
                        game.level / 2
                    )
            );

        if (
            game.enemies.length <
            maxEnemies
        ) {
            spawnEnemy();
        }
    }
}

/* =========================================================
   NÍVEL
   ========================================================= */

function updateLevel() {

    const newLevel =
        1 +
        Math.floor(
            game.kills /
                CONFIG.levelEvery
        );

    if (
        newLevel >
        game.level
    ) {

        game.level =
            newLevel;

        showCenterMessage(
            `🌌 FASE ${game.level}`,
            1400
        );

        updateHUD();
    }
}

/* =========================================================
   PAUSA
   ========================================================= */

function togglePause() {

    if (
        !game.running ||
        game.gameOver
    ) {
        return;
    }

    if (game.paused) {
        resumeGame();
    } else {
        pauseGame();
    }
}

function pauseGame() {

    game.paused = true;

    setGameStatus("PAUSADO");

    showOverlay(
        pauseOverlay
    );
}

function resumeGame() {

    if (!game.running) {
        return;
    }

    game.paused = false;

    hideOverlay(
        pauseOverlay
    );

    setGameStatus("JOGANDO");

    game.lastFrame =
        performance.now();
}

/* =========================================================
   MELHORIAS
   ========================================================= */

function openUpgrade() {

    if (
        !game.running ||
        game.gameOver
    ) {
        return;
    }

    game.paused = true;

    showOverlay(
        upgradeOverlay
    );

    if (upgradeMessage) {
        upgradeMessage.textContent =
            `Pontos disponíveis: ${game.score.toLocaleString("pt-BR")}`;
    }
}

function closeUpgrade() {

    hideOverlay(
        upgradeOverlay
    );

    if (
        game.running &&
        !game.gameOver
    ) {

        game.paused = false;

        game.lastFrame =
            performance.now();

        setGameStatus("JOGANDO");
    }
}

function buyUpgrade(type) {

    const cost = 1000;

    if (
        game.score <
        cost
    ) {

        if (upgradeMessage) {
            upgradeMessage.textContent =
                "Você precisa de 1.000 pontos.";
        }

        return;
    }

    game.score -=
        cost;

    if (type === "health") {

        game.maxHealth +=
            25;

        game.health =
            Math.min(
                game.health + 25,
                game.maxHealth
            );

        showCenterMessage(
            "❤️ VIDA MELHORADA!",
            1200
        );
    }

    else if (
        type === "shield"
    ) {

        game.maxShield +=
            25;

        game.shield =
            Math.min(
                game.shield + 25,
                game.maxShield
            );

        showCenterMessage(
            "🛡️ ESCUDO MELHORADO!",
            1200
        );
    }

    else if (
        type === "speed"
    ) {

        player.speed =
            Math.min(
                player.speed + 0.6,
                CONFIG.playerMaxSpeed
            );

        showCenterMessage(
            "⚡ VELOCIDADE MELHORADA!",
            1200
        );
    }

    else if (
        type === "weapon"
    ) {

        if (
            player.weaponLevel <
            WEAPONS.length
        ) {

            player.weaponLevel++;

            showCenterMessage(
                `🔫 ${WEAPONS[player.weaponLevel - 1].name}!`,
                1200
            );

        } else {

            game.score +=
                cost;
        }
    }

    updateHUD();

    if (upgradeMessage) {
        upgradeMessage.textContent =
            `Pontos disponíveis: ${game.score.toLocaleString("pt-BR")}`;
    }
}

/* =========================================================
   FIM DE JOGO
   ========================================================= */

function endGame() {

    game.running = false;

    game.gameOver = true;

    game.paused = false;

    game.lastScore =
        game.score;

    if (
        game.score >
        game.highScore
    ) {

        game.highScore =
            game.score;
    }

    localStorage.setItem(
        "galaxyFrontierLastScore",
        String(game.score)
    );

    localStorage.setItem(
        "galaxyFrontierHighScore",
        String(game.highScore)
    );

    saveHistory();

    if (finalScoreElement) {
        finalScoreElement.textContent =
            game.score.toLocaleString("pt-BR");
    }

    if (lastScoreElement) {
        lastScoreElement.textContent =
            game.lastScore.toLocaleString("pt-BR");
    }

    if (highScoreElement) {
        highScoreElement.textContent =
            game.highScore.toLocaleString("pt-BR");
    }

    setGameStatus("FIM DE JOGO");

    showOverlay(
        gameOverOverlay
    );

    updateHUD();
}

/* =========================================================
   HISTÓRICO
   ========================================================= */

function getHistory() {

    try {

        return JSON.parse(
            localStorage.getItem(
                "galaxyFrontierHistory"
            )
        ) || [];

    } catch (error) {

        return [];
    }
}

function saveHistory() {

    const history =
        getHistory();

    history.unshift({

        score:
            game.score,

        level:
            game.level,

        kills:
            game.kills,

        ship:
            SHIPS[
                player.shipIndex
            ].name,

        weapon:
            getCurrentWeapon().name,

        date:
            new Date().toLocaleString(
                "pt-BR"
            )
    });

    const limited =
        history.slice(
            0,
            CONFIG.maxHistory
        );

    localStorage.setItem(
        "galaxyFrontierHistory",
        JSON.stringify(
            limited
        )
    );

    renderHistory();
}

function renderHistory() {

    const history =
        getHistory();

    function render(
        container
    ) {

        if (!container) {
            return;
        }

        container.innerHTML = "";

        if (
            history.length === 0
        ) {

            container.innerHTML =
                "<p>Nenhuma partida registrada ainda.</p>";

            return;
        }

        history.forEach(
            (item, index) => {

                const element =
                    document.createElement(
                        "div"
                    );

                element.className =
                    "history-item";

                element.innerHTML = `
                    <strong>#${index + 1}</strong>
                    <span>⭐ ${Number(item.score).toLocaleString("pt-BR")}</span>
                    <span>🌌 Fase ${item.level}</span>
                    <span>💥 ${item.kills} eliminações</span>
                    <span>🛸 ${item.ship}</span>
                    <span>🔫 ${item.weapon}</span>
                    <small>${item.date}</small>
                `;

                container.appendChild(
                    element
                );
            }
        );
    }

    render(historyList);
    render(pageHistoryList);
}

function clearHistory() {

    localStorage.removeItem(
        "galaxyFrontierHistory"
    );

    renderHistory();
}

/* =========================================================
   GAME LOOP
   ========================================================= */

function gameLoop(timestamp) {

    if (!game.running) {

        draw();

        return;
    }

    const rawDelta =
        (
            timestamp -
            game.lastFrame
        ) / 1000;

    const dt =
        Math.min(
            rawDelta,
            0.033
        );

    game.lastFrame =
        timestamp;

    if (!game.paused) {

        game.elapsedTime +=
            dt;

        updateStars(dt);

        updatePlayer(dt);

        updateBullets(dt);

        updateEnemies(dt);

        updateEnemySpawner(dt);

        updateAutomaticPowerups(dt);

        updatePowerups(dt);

        // CONTADOR DA ARMA FORTE
        updateTemporaryWeapon(dt);

        updateParticles(dt);

        updateScorePopups(dt);

        checkBulletCollisions();

        updateLevel();

        if (
            game.screenShake > 0
        ) {

            game.screenShake -=
                dt * 40;
        }

        if (
            game.centerMessageTimer >
            0
        ) {

            game.centerMessageTimer -=
                dt * 1000;

            if (
                game.centerMessageTimer <=
                    0 &&
                centerMessage
            ) {

                centerMessage.classList.remove(
                    "show"
                );
            }
        }
    }

    draw();

    requestAnimationFrame(
        gameLoop
    );
}

/* =========================================================
   DESENHAR
   ========================================================= */

function draw() {

    ctx.save();

    if (
        game.screenShake > 0
    ) {

        ctx.translate(
            random(
                -game.screenShake,
                game.screenShake
            ),
            random(
                -game.screenShake,
                game.screenShake
            )
        );
    }

    drawBackground();

    drawStars();

    drawPowerups();

    drawEnemies();

    drawBullets();

    drawPlayer();

    drawParticles();

    drawScorePopups();

    ctx.restore();
}

/* =========================================================
   TECLADO
   ========================================================= */

document.addEventListener(
    "keydown",
    function(event) {

        game.keys[event.key] =
            true;

        /* ENTER = PAUSAR */
        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

            togglePause();

            return;
        }

        /* ESC = PAUSAR / FECHAR */
        if (
            event.key === "Escape"
        ) {

            event.preventDefault();

            if (
                upgradeOverlay &&
                upgradeOverlay.classList.contains(
                    "show"
                )
            ) {

                closeUpgrade();

                return;
            }

            if (
                historyOverlay &&
                historyOverlay.classList.contains(
                    "show"
                )
            ) {

                hideOverlay(
                    historyOverlay
                );

                return;
            }

            if (
                game.running &&
                !game.gameOver
            ) {

                togglePause();
            }

            return;
        }

        /* ESPAÇO = TIRO */
        if (
            event.code === "Space"
        ) {

            event.preventDefault();

            game.keys[" "] =
                true;
        }
    }
);

document.addEventListener(
    "keyup",
    function(event) {

        game.keys[event.key] =
            false;

        if (
            event.code === "Space"
        ) {

            game.keys[" "] =
                false;
        }
    }
);

/* =========================================================
   BOTÃO INICIAR
   ========================================================= */

if (startGameButton) {

    startGameButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            startGame();
        }
    );

} else {

    console.warn(
        "Galaxy Frontier: botão #startGame não encontrado."
    );
}

/* =========================================================
   BOTÃO PAUSAR
   ========================================================= */

if (pauseGameButton) {

    pauseGameButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            togglePause();
        }
    );
}

/* =========================================================
   CONTINUAR
   ========================================================= */

if (resumeGameButton) {

    resumeGameButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            resumeGame();
        }
    );
}

/* =========================================================
   MELHORIAS
   ========================================================= */

if (upgradeGameButton) {

    upgradeGameButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            openUpgrade();
        }
    );
}

if (closeUpgradeButton) {

    closeUpgradeButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            closeUpgrade();
        }
    );
}

/* =========================================================
   HISTÓRICO
   ========================================================= */

if (historyGameButton) {

    historyGameButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            renderHistory();

            showOverlay(
                historyOverlay
            );
        }
    );
}

if (closeHistoryButton) {

    closeHistoryButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            hideOverlay(
                historyOverlay
            );
        }
    );
}

if (closeHistoryBottomButton) {

    closeHistoryBottomButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            hideOverlay(
                historyOverlay
            );
        }
    );
}

if (clearHistoryButton) {

    clearHistoryButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            clearHistory();
        }
    );
}

/* =========================================================
   REINICIAR
   ========================================================= */

if (restartGameButton) {

    restartGameButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            startGame();
        }
    );
}

/* =========================================================
   BOTÕES DE UPGRADE
   ========================================================= */

document
    .querySelectorAll(
        ".upgrade-option"
    )
    .forEach(
        function(button) {

            button.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    const type =
                        button.dataset.upgrade;

                    if (type) {
                        buyUpgrade(type);
                    }
                }
            );
        }
    );

/* =========================================================
   PAUSAR QUANDO SAI DA ABA
   ========================================================= */

document.addEventListener(
    "visibilitychange",
    function() {

        if (
            document.hidden &&
            game.running &&
            !game.paused
        ) {

            pauseGame();
        }
    }
);

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

resizeCanvas();

createStars();

renderHistory();

updateHUD();

draw();

console.log(
    "Galaxy Frontier carregado com sucesso."
);

}