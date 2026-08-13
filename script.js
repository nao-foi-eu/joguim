const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;
const TILE_SIZE = 64; // Tamanho de cada quadrado de grama

// --- CARREGAMENTO DAS IMAGENS ---
const images = {};

function loadImage(key, src) {
    images[key] = new Image();
    images[key].src = src;
}

// Carrega as 3 variações de grama
loadImage("grass1", "assets/images/grass1.png");
loadImage("grass2", "assets/images/grass2.png");
loadImage("grass3", "assets/images/grass3.png");

// Carrega o personagem
loadImage("playerDown", "assets/images/player_down.png");
loadImage("playerUp", "assets/images/player_up.png");
loadImage("playerLeft", "assets/images/player_left.png");
loadImage("playerRight", "assets/images/player_right.png");

// --- GERAÇÃO ALEATÓRIA DO MAPA ---
const mapGrid = [];
const cols = WORLD_WIDTH / TILE_SIZE;
const rows = WORLD_HEIGHT / TILE_SIZE;

// Preenche a matriz do mapa sorteando um número de 1 a 3 para cada posição
for (let r = 0; r < rows; r++) {
    mapGrid[r] = [];
    for (let c = 0; c < cols; c++) {
        // Gera um número aleatório entre 1 e 3
        const randomGrass = Math.floor(Math.random() * 3) + 1;
        mapGrid[r][c] = "grass" + randomGrass; // Salva ex: "grass1", "grass2" ou "grass3"
    }
}

// --- JOGADOR E CÂMERA ---
const player = {
    worldX: 1000,
    worldY: 1000,
    width: 64,
    height: 64,
    speed: 4.5,
    direction: "down"
};

const camera = { x: 0, y: 0 };
const keys = {};

window.addEventListener("keydown", (e) => { keys[e.key] = true; });
window.addEventListener("keyup", (e) => { keys[e.key] = false; });

function update() {
    let nextX = player.worldX;
    let nextY = player.worldY;

    if (keys["ArrowUp"] || keys["w"] || keys["W"]) {
        nextY -= player.speed;
        player.direction = "up";
    }
    if (keys["ArrowDown"] || keys["s"] || keys["S"]) {
        nextY += player.speed;
        player.direction = "down";
    }
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
        nextX -= player.speed;
        player.direction = "left";
    }
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
        nextX += player.speed;
        player.direction = "right";
    }

    if (nextX >= 0 && nextX + player.width <= WORLD_WIDTH) player.worldX = nextX;
    if (nextY >= 0 && nextY + player.height <= WORLD_HEIGHT) player.worldY = nextY;

    camera.x = player.worldX - canvas.width / 2 + player.width / 2;
    camera.y = player.worldY - canvas.height / 2 + player.height / 2;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Desenha o mapa com base no sorteio fixo guardado na matriz
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const tileX = c * TILE_SIZE;
            const tileY = r * TILE_SIZE;
            const grassType = mapGrid[r][c]; // Pega a variação sorteada ("grass1", "grass2", etc)
            const img = images[grassType];

            if (img && img.complete) {
                ctx.drawImage(img, tileX - camera.x, tileY - camera.y, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // 2. Define o sprite do personagem
    let currentSprite = images.playerDown;
    if (player.direction === "up") currentSprite = images.playerUp;
    if (player.direction === "down") currentSprite = images.playerDown;
    if (player.direction === "left") currentSprite = images.playerLeft;
    if (player.direction === "right") currentSprite = images.playerRight;

    // 3. Desenha o personagem
    if (currentSprite && currentSprite.complete) {
        ctx.drawImage(
            currentSprite,
            player.worldX - camera.x,
            player.worldY - camera.y,
            player.width,
            player.height
        );
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();