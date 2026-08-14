const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;
const TILE_SIZE = 64;

// --- ESTADOS DO JOGO ("menu", "new_game_prompt", "load_menu", "playing", "paused") ---
let gameState = "menu"; 

// --- SISTEMA DE SAVES ---
let savesList = []; // Lista de todos os saves
let currentSaveId = null; // ID do save atualmente ativo
let newSaveInputName = "Meu Save"; // Nome padrão para novo save

// Carregar lista de saves do LocalStorage/Nuvem ao iniciar
function loadSavesList() {
    const stored = localStorage.getItem("rpg_saves_list");
    if (stored) {
        try {
            savesList = JSON.parse(stored);
        } catch(e) {
            savesList = [];
        }
    }
}

function saveSavesList() {
    localStorage.setItem("rpg_saves_list", JSON.stringify(savesList));
}

loadSavesList();

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
        try {
            await signOut(auth);
            currentUser = null;
        } catch (e) {
            console.error(e);
        }
    } else {
        try {
            const result = await signInWithPopup(auth, provider);
            currentUser = result.user;
            await loadCloudSave();
        } catch (e) {
            console.error(e);
        }
    }
}

async function saveGameToCloud() {
    saveGameLocal();
    if (!currentUser || !window.firebaseAuth) return;

    const { db, doc, setDoc } = window.firebaseAuth;
    try {
        await setDoc(doc(db, "saves_" + currentUser.uid, currentSaveId), {
            id: currentSaveId,
            name: currentSaveName,
            mapSeed: mapSeed,
            playerX: player.worldX,
            playerY: player.worldY,
            updatedAt: new Date().toISOString()
        });
    } catch (e) {
        console.error("Erro ao salvar na nuvem:", e);
    }
}

async function loadCloudSave() {
    if (!currentUser || !window.firebaseAuth) return;
    const { db, doc, getDoc } = window.firebaseAuth;
    // Opcional: Sincronizar saves da nuvem
}

// --- SISTEMA DE ANIMAÇÃO ---
let animFrame = 1;
let animTimer = 0;
const ANIM_SPEED = 10;

// --- GERENCIAMENTO DO MAPA E SEED ---
function pseudoRandom(seed) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

let mapSeed = Math.floor(Math.random() * 999999);
let currentSaveName = "Novo Mundo";

// --- BOTÕES DAS INTERFACES ---
const btnNewGame = { x: canvas.width / 2 - 110, y: canvas.height / 2 - 40, width: 220, height: 45 };
const btnContinueGame = { x: canvas.width / 2 - 110, y: canvas.height / 2 + 15, width: 220, height: 45 };
const btnAuth = { x: canvas.width / 2 - 110, y: canvas.height / 2 + 70, width: 220, height: 45 };

// Botões da Tela de Nome do Save
const btnConfirmNewSave = { x: canvas.width / 2 - 110, y: canvas.height / 2 + 30, width: 220, height: 45 };
const btnCancelNewSave = { x: canvas.width / 2 - 110, y: canvas.height / 2 + 85, width: 220, height: 45 };

// Botão Voltar da Tela de Carregar Save
const btnBackFromLoad = { x: canvas.width / 2 - 110, y: canvas.height / 2 + 180, width: 220, height: 45 };

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

const centerCol = Math.floor(cols / 2);
const centerRow = Math.floor(rows / 2);
const spawnRadius = 2;

function generateMap() {
    let currentSeed = mapSeed;
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
}

generateMap();

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

// Iniciar um Novo Save
function createAndStartNewGame(saveName) {
    currentSaveId = "save_" + Date.now();
    currentSaveName = saveName || "Mundo Sem Nome";
    mapSeed = Math.floor(Math.random() * 999999);
    
    player.worldX = centerCol * TILE_SIZE;
    player.worldY = centerRow * TILE_SIZE;
    player.direction = "down";

    generateMap();

    // Adiciona na lista de saves
    const newSaveObj = {
        id: currentSaveId,
        name: currentSaveName,
        seed: mapSeed,
        x: player.worldX,
        y: player.worldY,
        date: new Date().toLocaleDateString("pt-BR")
    };

    savesList.push(newSaveObj);
    saveSavesList();
    saveGameToCloud();

    gameState = "playing";
}

// Carregar Save Selecionado
function loadSelectedSave(saveObj) {
    currentSaveId = saveObj.id;
    currentSaveName = saveObj.name;
    mapSeed = saveObj.seed;
    player.worldX = saveObj.x;
    player.worldY = saveObj.y;

    generateMap();
    gameState = "playing";
}

// Salvar Posição do Jogo Atual Localmente
function saveGameLocal() {
    if (!currentSaveId) return;

    const saveIndex = savesList.findIndex(s => s.id === currentSaveId);
    if (saveIndex !== -1) {
        savesList[saveIndex].x = player.worldX;
        savesList[saveIndex].y = player.worldY;
        savesList[saveIndex].date = new Date().toLocaleDateString("pt-BR");
        saveSavesList();
    }
}

// --- CONTROLES DE TECLADO E DIGITAÇÃO ---
window.addEventListener("keydown", (e) => { 
    keys[e.key] = true; 

    // Digitação do nome do save na tela "new_game_prompt"
    if (gameState === "new_game_prompt") {
        if (e.key === "Backspace") {
            newSaveInputName = newSaveInputName.slice(0, -1);
        } else if (e.key.length === 1 && newSaveInputName.length < 15) {
            newSaveInputName += e.key;
        } else if (e.key === "Enter" && newSaveInputName.trim() !== "") {
            createAndStartNewGame(newSaveInputName);
            newSaveInputName = "Meu Save";
        }
        return;
    }
    
    // P para Pausar
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

    // 1. MENU PRINCIPAL
    if (gameState === "menu") {
        if (isInside(btnNewGame)) {
            newSaveInputName = "Mundo " + (savesList.length + 1);
            gameState = "new_game_prompt";
        } else if (isInside(btnContinueGame)) {
            gameState = "load_menu";
        } else if (isInside(btnAuth)) {
            toggleAuth();
        }
    } 
    // 2. TELA DE NOVO SAVE (NOME DO SAVE)
    else if (gameState === "new_game_prompt") {
        if (isInside(btnConfirmNewSave)) {
            if (newSaveInputName.trim() !== "") {
                createAndStartNewGame(newSaveInputName);
                newSaveInputName = "Meu Save";
            }
        } else if (isInside(btnCancelNewSave)) {
            gameState = "menu";
        }
    }
    // 3. TELA DE CARREGAR SAVES
    else if (gameState === "load_menu") {
        if (isInside(btnBackFromLoad)) {
            gameState = "menu";
            return;
        }

        // Verifica clique nos slots de save
        const slotWidth = 320;
        const slotHeight = 45;
        const startX = canvas.width / 2 - slotWidth / 2;
        let startY = 150;

        for (let i = 0; i < savesList.length && i < 5; i++) {
            const slotBtn = { x: startX, y: startY + (i * 55), width: slotWidth, height: slotHeight };
            if (isInside(slotBtn)) {
                loadSelectedSave(savesList[i]);
                break;
            }
        }
    }
    // 4. PAUSE
    else if (gameState === "paused") {
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

    // 2. Desenha o jogador (fora dos menus)
    if (gameState === "playing" || gameState === "paused") {
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

    // Fundo dos menus
    if (gameState !== "playing") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (images.menuBg && images.menuBg.complete && images.menuBg.naturalWidth !== 0) {
            ctx.drawImage(images.menuBg, 0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    // 3. TELA DE MENU PRINCIPAL
    if (gameState === "menu") {
        ctx.font = "bold 38px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = "#000000";
        ctx.fillText("endless—actually, no", canvas.width / 2 + 3, canvas.height / 2 - 107);
        ctx.fillStyle = "#ffffff";
        ctx.fillText("endless—actually, no", canvas.width / 2, canvas.height / 2 - 110);

        drawButton(btnNewGame, "NOVO JOGO", "#2e7d32");
        drawButton(btnContinueGame, "CARREGAR / CONTINUAR", "#1565c0");

        const authLabel = currentUser ? `SAIR (${currentUser.displayName.split(" ")[0]})` : "ENTRAR C/ GOOGLE";
        const authColor = currentUser ? "#c62828" : "#db4437";
        drawButton(btnAuth, authLabel, authColor);
    }

    // 4. TELA DE CRIAR NOVO SAVE (DIGITAR NOME)
    if (gameState === "new_game_prompt") {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 28px Arial";
        ctx.textAlign = "center";
        ctx.fillText("NOME DO NOVO MUNDO:", canvas.width / 2, canvas.height / 2 - 80);

        // Caixa de entrada de texto
        ctx.fillStyle = "#222222";
        ctx.fillRect(canvas.width / 2 - 150, canvas.height / 2 - 40, 300, 50);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width / 2 - 150, canvas.height / 2 - 40, 300, 50);

        // Nome sendo digitado
        ctx.fillStyle = "#00ffcc";
        ctx.font = "22px Arial";
        ctx.fillText(newSaveInputName + "|", canvas.width / 2, canvas.height / 2 - 10);

        drawButton(btnConfirmNewSave, "CRIAR MUNDO", "#2e7d32");
        drawButton(btnCancelNewSave, "VOLTAR", "#c62828");
    }

    // 5. TELA DE CARREGAR SAVES
    if (gameState === "load_menu") {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 28px Arial";
        ctx.textAlign = "center";
        ctx.fillText("SELECIONE O SAVE:", canvas.width / 2, 100);

        if (savesList.length === 0) {
            ctx.fillStyle = "#aaaaaa";
            ctx.font = "20px Arial";
            ctx.fillText("Nenhum save encontrado.", canvas.width / 2, 220);
        } else {
            const slotWidth = 320;
            const slotHeight = 45;
            const startX = canvas.width / 2 - slotWidth / 2;
            let startY = 150;

            for (let i = 0; i < savesList.length && i < 5; i++) {
                const saveItem = savesList[i];
                const btnSlot = { x: startX, y: startY + (i * 55), width: slotWidth, height: slotHeight };
                drawButton(btnSlot, `${saveItem.name} (${saveItem.date})`, "#1565c0");
            }
        }

        drawButton(btnBackFromLoad, "VOLTAR", "#c62828");
    }

    // 6. TELA DE PAUSE
    if (gameState === "paused") {
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