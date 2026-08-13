const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Configurações do Personagem (Quadrado Vermelho)
const player = {
    x: 375,       // Posição X inicial (centro)
    y: 275,       // Posição Y inicial (centro)
    width: 50,    // Largura
    height: 50,   // Altura
    color: "red",
    speed: 4      // Velocidade de movimento
};

// Objeto para monitorar as teclas pressionadas
const keys = {};

// Eventos de Teclado
window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
});

window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

// Atualiza a posição do jogador
function update() {
    if (keys["ArrowUp"] || keys["w"] || keys["W"]) {
        player.y -= player.speed;
    }
    if (keys["ArrowDown"] || keys["s"] || keys["S"]) {
        player.y += player.speed;
    }
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
        player.x -= player.speed;
    }
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
        player.x += player.speed;
    }

    // Limites da tela (Impedir o jogador de sair da área de jogo)
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
}

// Desenha os elementos na tela
function draw() {
    // Limpa a tela a cada quadro
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenha o jogador
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

// Loop Principal do Jogo
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Inicia o jogo
gameLoop();