const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Tamanho do Mundo (O mapa pode ser gigante!)
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;

// Configurações do Jogador no Mundo
const player = {
    worldX: 1000, // Começa no meio do mundo
    worldY: 1000,
    width: 50,
    height: 50,
    color: "red",
    speed: 5
};

// Configurações da Câmera (O centro da tela)
const camera = {
    x: 0,
    y: 0
};

// Alguns obstáculos no mundo (X, Y, Largura, Altura)
const obstacles = [
    { x: 1200, y: 1000, width: 100, height: 100, color: "#555" },
    { x: 800, y: 800, width: 150, height: 80, color: "#555" },
    { x: 1000, y: 1300, width: 200, height: 50, color: "#555" }
];

// Mapeamento de teclas
const keys = {};

window.addEventListener("keydown", (e) => { keys[e.key] = true; });
window.addEventListener("keyup", (e) => { keys[e.key] = false; });

// Atualiza a lógica do jogo
function update() {
    let nextX = player.worldX;
    let nextY = player.worldY;

    // Movimentação do jogador no mundo
    if (keys["ArrowUp"] || keys["w"] || keys["W"]) nextY -= player.speed;
    if (keys["ArrowDown"] || keys["s"] || keys["S"]) nextY += player.speed;
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) nextX -= player.speed;
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) nextX += player.speed;

    // Barreiras nos limites do mundo total (0 até 2000)
    if (nextX >= 0 && nextX + player.width <= WORLD_WIDTH) {
        player.worldX = nextX;
    }
    if (nextY >= 0 && nextY + player.height <= WORLD_HEIGHT) {
        player.worldY = nextY;
    }

    // A CÂMERA segue o jogador, mantendo ele no centro do Canvas
    camera.x = player.worldX - canvas.width / 2 + player.width / 2;
    camera.y = player.worldY - canvas.height / 2 + player.height / 2;
}

// Desenha tudo na tela ajustado pela posição da câmera
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Desenha uma "Grade/Grid" para você ver o chão se movendo
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    const gridSize = 100;

    for (let x = 0; x < WORLD_WIDTH; x += gridSize) {
        for (let y = 0; y < WORLD_HEIGHT; y += gridSize) {
            // Subtrair a posição da câmera cria o efeito de rolagem!
            ctx.strokeRect(x - camera.x, y - camera.y, gridSize, gridSize);
        }
    }

    // 2. Desenha os Obstáculos/Paredes do mapa
    obstacles.forEach(obs => {
        ctx.fillStyle = obs.color;
        ctx.fillRect(obs.x - camera.x, obs.y - camera.y, obs.width, obs.height);
    });

    // 3. Desenha o Jogador SEMPRE no centro da tela
    ctx.fillStyle = player.color;
    ctx.fillRect(
        player.worldX - camera.x, 
        player.worldY - camera.y, 
        player.width, 
        player.height
    );
}

// Loop Principal
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();