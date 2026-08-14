const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;
const TILE_SIZE = 64;

// --- ESTADOS DO JOGO ("menu", "playing", "paused") ---
let gameState = "menu"; 

// --- SISTEMA DE AUTENTICAÇÃO E NUVEM ---
let currentUser = null;

window.addEventListener("load", () => {
    if (window.firebaseAuth) {
        const { auth, onAuthStateChanged } = window.firebaseAuth;
        
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUser = user;
                console.log("Logado como:", user.displayName);
                await loadCloudSave();
            } else {
                currentUser = null;
                console.log("Usuário não logado.");
            }
        });
    }
});

async function toggleAuth() {
    if (!window.firebaseAuth) return;
    const { auth, provider, signInWithPopup, signOut } = window.firebaseAuth;

    if (currentUser) {
        // Se estiver logado, faz Logout
        try {
            await signOut(auth);
            currentUser = null;
            console.log("Deslogado com sucesso!");
        } catch (e) {
            console.error("Erro ao deslogar:", e);
        }
    } else {
        // Se estiver deslogado, faz Login
        try {
            const result = await signInWithPopup(auth, provider);
            currentUser = result.user;
            await loadCloudSave();
        } catch (e) {
            console.error("Erro no login:", e);
        }
    }
}

async function saveGameToCloud() {
    if (!currentUser || !window.firebaseAuth) {
        saveGame(); // Salva localmente caso não esteja logado
        return;
    }

    const { db, doc, setDoc } = window.firebaseAuth;
    try {
        await setDoc(doc(db, "saves", currentUser.uid), {
            mapSeed: mapSeed,
            playerX: player.worldX,
            playerY: player.worldY,
            updatedAt: new Date()
        });
    } catch (e) {
        console.error("Erro ao salvar na nuvem:", e);
    }
}

async function loadCloudSave() {
    if (!currentUser || !window.firebaseAuth) return;
    const { db, doc, getDoc } = window.firebaseAuth;

    try {
        const docRef = doc(db, "saves", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.mapSeed) mapSeed = data.mapSeed;
            if (data.playerX !== undefined) player.worldX = data.playerX;
            if (data.playerY !== undefined) player.worldY = data.playerY;
            console.log("Progresso recarregado da nuvem!");
        }
    } catch (e) {
        console.error("Erro ao carregar da nuvem:", e);
    }
}

// --- SISTEMA DE ANIMAÇÃO ---
let animFrame = 1;
let animTimer = 0;
const ANIM_SPEED = 10;

// --- GERENCIAMENTO DA SEED E SAVE LOCAL ---
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
const btnNewGame = { x: canvas.width / 2 - 110, y: canvas.height / 2 - 40, width: 220, height: 45 };
const btnContinueGame = { x: canvas.width / 2 - 110, y: canvas.height / 2 + 15, width: 220, height: 45 };
const btnAuth = { x: canvas.width / 2 - 110, y: canvas.height / 2 + 70, width: 220, height: 45 };

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
loadImage("menuBg", "assets/images/menu_bg.png");

loadImage("stoneEarthTransition", "assets/images/stone_earth_transition.png");
loadImage("earth1", "assets/images/earth1.png");
loadImage("earth2", "assets/images/earth2.png");
loadImage("grassEarthBottom1", "assets/images/grass_earth_bottom1.png");
loadImage("grassEarthBottom2", "assets/images/grass_earth_bottom2.png");
loadImage("grassEarthTop1", "assets/images/grass_earth_top1.png");
loadImage("grassEarthTop2", "assets/images/grass_earth_top2.png");

loadImage("playerDown1", "assets/images/player_down_1.png");
loadImage("playerDown2", "assets/images/player_down_2.png");
loadImage("playerUp1", "assets/images/player_up_1.png");
loadImage("playerUp2", "assets/images/player_up_2.png");
loadImage("playerLeft1", "assets/images/player_left_1.png");
loadImage("playerLeft2", "assets/images/player_left_2.png");
loadImage("playerRight1", "assets/images/player_right_1.png");
loadImage("playerRight2", "assets/images/player_right_2.png");

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
        const isCenterSpawn = Math.abs(r - centerRow) <= spawnRadius && Math.abs(c - centerCol) <= spawnRadius;
        const transitionCol = centerCol - spawnRadius - 1;

        if (isCenterSpawn) {
            mapGrid[r][c] = "stone";
        } 
        else if (c === transitionCol && Math.abs(r - centerRow) <= 1) {
            mapGrid[r][c] = "stoneEarthTransition";
        } 
        else if (c < transitionCol) {
            const uniqueValue = currentSeed + (r * cols + c);
            const randomVal = pseudoRandom(uniqueValue);

            if (r === centerRow - 1) {
                const variant = randomVal > 0.5 ? "1" : "2";
                mapGrid[r][c] = "grassEarthTop" + variant;
            } 
            else if (r === centerRow) {
                const variant = randomVal > 0.5 ? "1" : "2";
                mapGrid[r][c] = "earth" + variant;
            } 
            else if (r === centerRow + 1) {
                const variant = randomVal > 0.5 ? "1" : "2";
                mapGrid[r][c] = "grassEarthBottom" + variant;
            } 
            else {
                const randomGrass = Math.floor(randomVal * 3) + 1;
                mapGrid[r][c] = "grass" + randomGrass;
            }
        } 
        else {
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

function startNewGame() {
    player.worldX = centerCol * TILE_SIZE;
    player.worldY = centerRow * TILE_SIZE;
    player.direction = "down";
    saveGameToCloud();
    gameState = "playing";
}

function loadSavedGame() {
    const savedX = localStorage.getItem("rpg_player_x");
    const savedY = localStorage.getItem("rpg_player_y");
    if (savedX !== null && savedY !== null && !currentUser) {
        player.worldX = parseFloat(savedX);
        player.worldY = parseFloat(savedY);
    }
    gameState = "playing";
}

function saveGame() {
    localStorage.setItem("rpg_player_x", player.worldX);
    localStorage.setItem("rpg_player_y", player.worldY);
}

// --- CONTROLES DE TECLADO ---
window.addEventListener("keydown", (e) => { 
    keys[e.key] = true; 
    
    if (e.key === "p" || e.key === "P") {
        if (gameState === "playing") {
            gameState = "paused";
        } else if (gameState === "paused") {
            gameState = "playing";
        }
    }
});

window.addEventListener("keyup", (e) => { keys[e.key] = false; });

// --- CLIQUES DO MOUSE ---
canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    function isInside(btn) {
        return mouseX >= btn.x && mouseX <= btn.x + btn.width &&
               mouseY >= btn.y && mouseY <= btn.y + btn.height;
    }

    if (gameState === "menu") {
        if (isInside(btnNewGame)) {
            startNewGame();
        } else if (isInside(btnContinueGame)) {
            loadSavedGame();
        } else if (isInside(btnAuth)) {
            toggleAuth();
        }
    } else if (gameState === "paused") {
        if (isInside(btnResume)) {
            gameState = "playing";
        } else if (isInside(btnBackToMenu)) {
            saveGameToCloud();
            gameState = "menu";
        }
    }
});

function update() {
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
        saveGameToCloud();
    } else {
        animFrame = 1;
    }
}

function drawButton(btn, text, bgColor = "#2e7d32") {
    ctx.fillStyle = bgColor;
    ctx.fillRect(btn.x, btn.y, btn.width, btn.height);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, btn.x + btn.width / 2, btn.y + btn.height / 2);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Desenha o mapa
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
    if (gameState !== "menu") {
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
    }

    // 3. TELA DE MENU PRINCIPAL
    if (gameState === "menu") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (images.menuBg && images.menuBg.complete && images.menuBg.naturalWidth !== 0) {
            ctx.drawImage(images.menuBg, 0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.font = "bold 38px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = "#000000";
        ctx.fillText("endless—actually, no", canvas.width / 2 + 3, canvas.height / 2 - 107);
        ctx.fillStyle = "#ffffff";
        ctx.fillText("endless—actually, no", canvas.width / 2, canvas.height / 2 - 110);

        drawButton(btnNewGame, "NOVO JOGO", "#2e7d32");
        drawButton(btnContinueGame, "CONTINUAR", "#1565c0");

        // Botão Dinâmico de Login/Logout
        const authLabel = currentUser ? `SAIR (${currentUser.displayName.split(" ")[0]})` : "ENTRAR C/ GOOGLE";
        const authColor = currentUser ? "#c62828" : "#db4437";
        drawButton(btnAuth, authLabel, authColor);
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