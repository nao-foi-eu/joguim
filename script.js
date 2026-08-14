const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;
const TILE_SIZE = 64;

// --- GERADOR DE NÚMEROS PSEUDO-ALEATÓRIOS (PRNG com Seed) ---
// Função de Hash simples para gerar números previsíveis baseados na Seed
function pseudoRandom(seed) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// --- GERENCIAMENTO DA SEED DO MAPA ---
// Procura uma Seed salva no navegador; se não existir, cria uma nova
let mapSeed = localStorage.getItem("rpg_map_seed");

if (!mapSeed) {
    mapSeed = Math.floor(Math.random() * 999999); // Gera uma seed nova
    localStorage.setItem("rpg_map_seed", mapSeed); // Salva no navegador
} else {
    mapSeed = parseInt(mapSeed); // Converte de Texto para Número
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

loadImage("grass1", "assets/images/grass1.png");
loadImage("grass2", "assets/images/grass2.png");
loadImage("grass3", "assets/images/grass3.png");
loadImage("playerDown", "assets/images/player_down.png");
loadImage("playerUp", "assets/images/player_up.png");
loadImage("playerLeft", "assets/images/player_left.png");
loadImage("playerRight", "assets/images/player_right.png");

// --- GERAÇÃO DO MAPA BASEADO NA SEED ---
const mapGrid = [];
const cols = WORLD_WIDTH / TILE_SIZE;
const rows = WORLD_HEIGHT / TILE_SIZE;

let currentSeed = mapSeed;

for (let r = 0; r < rows; r++) {
    mapGrid[r] = [];
    for (let c = 0; c < cols; c++) {
        // Usa a posição (r, c) e a Seed para calcular a variação exata da grama
        const uniqueValue = currentSeed + (r * cols + c);
        const randomVal = pseudoRandom(uniqueValue);
        
        // Sorteia entre 1, 2 e 3 de forma 100% determinística
        const randomGrass = Math.floor(randomVal * 3) + 1;
        mapGrid[r][c] = "grass" + randomGrass;
    }
}

// --- JOGADOR E CÂMERA ---
const player = {
    worldX: 1000,
    worldY: 1000,
    width: 64,
    height: 64,
    speed: 5,
    direction: "down"
};

const camera = { x: 0, y: 0 };
const keys = {};

// --- EVENTOS ---
window.addEventListener("keydown", (e) => { 
    keys[e.key] = true; 
    if (e.key === "p" || e.key === "P") {
        isPaused = !isPaused;
    }
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

    // 1. Desenha o mapa gerado pela Seed
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const tileX = c * TILE_SIZE;
            const tileY = r * TILE_SIZE;
            const grassType = mapGrid[r][c];
            const img = images[grassType];

            if (img && img.complete) {
                ctx.drawImage(img, tileX - camera.x, tileY - camera.y, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // 2. Desenha o jogador
    let currentSprite = images.playerDown;
    if (player.direction === "up") currentSprite = images.playerUp;
    if (player.direction === "down") currentSprite = images.playerDown;
    if (player.direction === "left") currentSprite = images.playerLeft;
    if (player.direction === "right") currentSprite = images.playerRight;

    if (currentSprite && currentSprite.complete) {
        ctx.drawImage(
            currentSprite,
            player.worldX - camera.x,
            player.worldY - camera.y,
            player.width,
            player.height
        );
    }

    // 3. Desenha a tela de Pause
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
        ctx.fillText(
            "CONTINUAR", 
            resumeButton.x + resumeButton.width / 2, 
            resumeButton.y + resumeButton.height / 2
        );

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