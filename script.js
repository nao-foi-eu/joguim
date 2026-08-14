const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;
const TILE_SIZE = 64;

// --- SISTEMA DE ANIMAÇÃO ---
let animFrame = 1;
let animTimer = 0;
const ANIM_SPEED = 10;

// --- GERENCIAMENTO DA SEED ---
function pseudoRandom(seed) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

let mapSeed = localStorage.getItem("rpg_map_seed");
if (!mapSeed) {
    mapSeed = Math.floor(Math.random() * 999999);
    localStorage.setItem("rpg_map_seed", mapSeed);
} else {
    mapSeed = parseInt(mapSeed);
}

// --- ESTADO DO JOGO ---
let isPaused = false;
const resumeButton = {
    x: canvas.width / 2 - 100,
    y: canvas.height / 2 - 25,
    width: 200,
    height: 50
};

// --- CARREGAMENTO DAS IMAGENS ---
const images = {};

function loadImage(key, src) {
    images[key] = new Image();
    images[key].src = src;
}

// Chão
loadImage("grass1", "assets/images/grass1.png");
loadImage("grass2", "assets/images/grass2.png");
loadImage("grass3", "assets/images/grass3.png");
loadImage("stone", "assets/images/stone.png"); // Nova textura de pedra!

// Personagem
loadImage("playerDown1", "assets/images/player_down_1.png");
loadImage("playerDown2", "assets/images/player_down_2.png");
loadImage("playerUp1", "assets/images/player_up_1.png");
loadImage("playerUp2", "assets/images/player_up_2.png");
loadImage("playerLeft1", "assets/images/player_left_1.png");
loadImage("playerLeft2", "assets/images/player_left_2.png");
loadImage("playerRight1", "assets/images/player_right_1.png");
loadImage("playerRight2", "assets/images/player_right_2.png");

// --- GERAÇÃO DO MAPA COM PONTO DE NASCIMENTO ---
const mapGrid = [];
const cols = WORLD_WIDTH / TILE_SIZE;
const rows = WORLD_HEIGHT / TILE_SIZE;
let currentSeed = mapSeed;

// Ponto Central do Mapa (Spawn)
const centerCol = Math.floor(cols / 2);
const centerRow = Math.floor(rows / 2);
const spawnRadius = 2; // Tamanho da área de pedra (5x5 blocos)

for (let r = 0; r < rows; r++) {
    mapGrid[r] = [];
    for (let c = 0; c < cols; c++) {
        // Checa se esta posição está dentro da área de Spawn
        if (Math.abs(r - centerRow) <= spawnRadius && Math.abs(c - centerCol) <= spawnRadius) {
            mapGrid[r][c] = "stone"; // Coloca pedra no Spawn!
        } else {
            // Sorteia a grama para o resto do mapa
            const uniqueValue = currentSeed + (r * cols + c);
            const randomVal = pseudoRandom(uniqueValue);
            const randomGrass = Math.floor(randomVal * 3) + 1;
            mapGrid[r][c] = "grass" + randomGrass;
        }
    }
}

// --- JOGADOR E CÂMERA ---
const player = {
    // Nasce exatamente no centro do mapa (sobre a pedra)
    worldX: centerCol * TILE_SIZE,
    worldY: centerRow * TILE_SIZE,
    width: 64,
    height: 64,
    speed: 5,
    direction: "down",
    isMoving: false
};

const camera = { x: 0, y: 0 };
const keys = {};

window.addEventListener("keydown", (e) => { 
    keys[e.key] = true; 
    if (e.key === "p" || e.key === "P") isPaused = !isPaused;
});
window.addEventListener("keyup", (e) => { keys[e.key] = false; });

canvas.addEventListener("click", (e) => {
    if (!isPaused) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (
        mouseX >= resumeButton.x &&
        mouseX <= resumeButton.x + resumeButton.width &&
        mouseY >= resumeButton.y &&
        mouseY <= resumeButton.y + resumeButton.height
    ) {
        isPaused = false;
    }
});

function update() {
    if (isPaused) return;

    let nextX = player.worldX;
    let nextY = player.worldY;
    player.isMoving = false;

    if (keys["ArrowUp"] || keys["w"] || keys["W"]) {
        nextY -= player.speed;
        player.direction = "up";
        player.isMoving = true;
    }
    if (keys["ArrowDown"] || keys["s"] || keys["S"]) {
        nextY += player.speed;
        player.direction = "down";
        player.isMoving = true;
    }
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
        nextX -= player.speed;
        player.direction = "left";
        player.isMoving = true;
    }
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
        nextX += player.speed;
        player.direction = "right";
        player.isMoving = true;
    }

    if (nextX >= 0 && nextX + player.width <= WORLD_WIDTH) player.worldX = nextX;
    if (nextY >= 0 && nextY + player.height <= WORLD_HEIGHT) player.worldY = nextY;

    camera.x = player.worldX - canvas.width / 2 + player.width / 2;
    camera.y = player.worldY - canvas.height / 2 + player.height / 2;

    if (player.isMoving) {
        animTimer++;
        if (animTimer >= ANIM_SPEED) {
            animFrame = animFrame === 1 ? 2 : 1;
            animTimer = 0;
        }
    } else {
        animFrame = 1;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Desenha o mapa (Grama e a plataforma de Pedra no meio)
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const tileX = c * TILE_SIZE;
            const tileY = r * TILE_SIZE;
            const tileType = mapGrid[r][c];
            const img = images[tileType];

            if (img && img.complete) {
                ctx.drawImage(img, tileX - camera.x, tileY - camera.y, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // 2. Desenha o jogador
    let keyName = "playerDown1";
    if (player.direction === "up") keyName = "playerUp" + animFrame;
    if (player.direction === "down") keyName = "playerDown" + animFrame;
    if (player.direction === "left") keyName = "playerLeft" + animFrame;
    if (player.direction === "right") keyName = "playerRight" + animFrame;

    const currentSprite = images[keyName];

    if (currentSprite && currentSprite.complete) {
        ctx.drawImage(
            currentSprite,
            player.worldX - camera.x,
            player.worldY - camera.y,
            player.width,
            player.height
        );
    }

    // 3. Pause
    if (isPaused) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#2e7d32";
        ctx.fillRect(resumeButton.x, resumeButton.y, resumeButton.width, resumeButton.height);

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.strokeRect(resumeButton.x, resumeButton.y, resumeButton.width, resumeButton.height);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("CONTINUAR", resumeButton.x + resumeButton.width / 2, resumeButton.y + resumeButton.height / 2);

        ctx.font = "bold 36px Arial";
        ctx.fillText("JOGO PAUSADO", canvas.width / 2, canvas.height / 2 - 80);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();