const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;
const TILE_SIZE = 64;

// --- ESTADOS DO JOGO ("menu", "playing", "paused") ---
let gameState = "menu"; 

// --- SISTEMA DE ANIMAÇÃO ---
let animFrame = 1;
let animTimer = 0;
const ANIM_SPEED = 10;

// --- GERENCIAMENTO DA SEED E SAVE ---
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

// --- BOTÕES DAS INTERFACES ---
// Menu Principal
const btnNewGame = { x: canvas.width / 2 - 110, y: canvas.height / 2 - 20, width: 220, height: 50 };
const btnContinueGame = { x: canvas.width / 2 - 110, y: canvas.height / 2 + 50, width: 220, height: 50 };

// Tela de Pause
const btnResume = { x: canvas.width / 2 - 110, y: canvas.height / 2 - 30, width: 220, height: 50 };
const btnBackToMenu = { x: canvas.width / 2 - 110, y: canvas.height / 2 + 40, width: 220, height: 50 };

// --- CARREGAMENTO DAS IMAGENS ---
const images = {};

function loadImage(key, src) {
    images[key] = new Image();
    images[key].src = src;
}

loadImage("grass1", "assets/images/grass1.png");
loadImage("grass2", "assets/images/grass2.png");
loadImage("grass3", "assets/images/grass3.png");
loadImage("stone", "assets/images/stone.png");

loadImage("playerDown1", "assets/images/player_down_1.png");
loadImage("playerDown2", "assets/images/player_down_2.png");
loadImage("playerUp1", "assets/images/player_up_1.png");
loadImage("playerUp2", "assets/images/player_up_2.png");
loadImage("playerLeft1", "assets/images/player_left_1.png");
loadImage("playerLeft2", "assets/images/player_left_2.png");
loadImage("playerRight1", "assets/images/player_right_1.png");
loadImage("playerRight2", "assets/images/player_right_2.png");

loadImage("menuBg", "assets/images/menu_bg.png");

// --- GERAÇÃO DO MAPA ---
const mapGrid = [];
const cols = WORLD_WIDTH / TILE_SIZE;
const rows = WORLD_HEIGHT / TILE_SIZE;
let currentSeed = mapSeed;

const centerCol = Math.floor(cols / 2);
const centerRow = Math.floor(rows / 2);
const spawnRadius = 2;

for (let r = 0; r < rows; r++) {
    mapGrid[r] = [];
    for (let c = 0; c < cols; c++) {
        if (Math.abs(r - centerRow) <= spawnRadius && Math.abs(c - centerCol) <= spawnRadius) {
            mapGrid[r][c] = "stone";
        } else {
            const uniqueValue = currentSeed + (r * cols + c);
            const randomVal = pseudoRandom(uniqueValue);
            const randomGrass = Math.floor(randomVal * 3) + 1;
            mapGrid[r][c] = "grass" + randomGrass;
        }
    }
}

// --- JOGADOR E CÂMERA ---
const player = {
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

// Função para iniciar um Novo Jogo (reseta posição para o Spawn)
function startNewGame() {
    player.worldX = centerCol * TILE_SIZE;
    player.worldY = centerRow * TILE_SIZE;
    player.direction = "down";
    saveGame();
    gameState = "playing";
}

// Carregar Posição Salva
function loadSavedGame() {
    const savedX = localStorage.getItem("rpg_player_x");
    const savedY = localStorage.getItem("rpg_player_y");
    if (savedX !== null && savedY !== null) {
        player.worldX = parseFloat(savedX);
        player.worldY = parseFloat(savedY);
    }
    gameState = "playing";
}

// Salvar Posição do Jogador
function saveGame() {
    localStorage.setItem("rpg_player_x", player.worldX);
    localStorage.setItem("rpg_player_y", player.worldY);
}

// --- CONTROLES DE TECLADO ---
window.addEventListener("keydown", (e) => { 
    keys[e.key] = true; 
    
    // Pressionar P alterna entre jogando e pausado
    if (e.key === "p" || e.key === "P") {
        if (gameState === "playing") {
            gameState = "paused";
        } else if (gameState === "paused") {
            gameState = "playing";
        }
    }
});

window.addEventListener("keyup", (e) => { keys[e.key] = false; });

// --- CLIQUES DO MOUSE NAS TELAS ---
canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    function isInside(btn) {
        return mouseX >= btn.x && mouseX <= btn.x + btn.width &&
               mouseY >= btn.y && mouseY <= btn.y + btn.height;
    }

    // Clique no MENU PRINCIPAL
    if (gameState === "menu") {
        if (isInside(btnNewGame)) {
            startNewGame();
        } else if (isInside(btnContinueGame)) {
            loadSavedGame();
        }
    } 
    // Clique no PAUSE
    else if (gameState === "paused") {
        if (isInside(btnResume)) {
            gameState = "playing";
        } else if (isInside(btnBackToMenu)) {
            saveGame(); // Salva o progresso ao voltar pro menu
            gameState = "menu";
        }
    }
});

function update() {
    // Só atualiza o movimento do personagem se estiver JOGANDO
    if (gameState !== "playing") return;

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
        saveGame(); // Salva automaticamente conforme anda
    } else {
        animFrame = 1;
    }
}

// Função auxiliar para desenhar um botão na tela
function drawButton(btn, text, bgColor = "#2e7d32") {
    ctx.fillStyle = bgColor;
    ctx.fillRect(btn.x, btn.y, btn.width, btn.height);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, btn.x + btn.width / 2, btn.y + btn.height / 2);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Desenha o mapa (Sempre visível ao fundo)
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

    // 3. TELA DE MENU PRINCIPAL
    if (gameState === "menu") {
        // Se a imagem do menu já carregou, desenha ela preenchendo todo o Canvas
        if (images.menuBg && images.menuBg.complete) {
            ctx.drawImage(images.menuBg, 0, 0, canvas.width, canvas.height);
            
            // Camada escura transparente por cima da imagem (opcional, deixa o texto e botões bem visíveis)
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            // Fundo escuro padrão caso a imagem ainda esteja carregando
            ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Título do Jogo
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 42px Arial";
        ctx.textAlign = "center";
        ctx.fillText("endless—actually, no", canvas.width / 2, canvas.height / 2 - 100);

        // Botões
        drawButton(btnNewGame, "NOVO JOGO", "#2e7d32");
        drawButton(btnContinueGame, "CONTINUAR", "#1565c0");
    }

    // 4. TELA DE PAUSE
    if (gameState === "paused") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 36px Arial";
        ctx.textAlign = "center";
        ctx.fillText("JOGO PAUSADO", canvas.width / 2, canvas.height / 2 - 100);

        drawButton(btnResume, "CONTINUAR", "#2e7d32");
        drawButton(btnBackToMenu, "MENU PRINCIPAL", "#c62828");
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();