document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const startButton = document.getElementById('startButton');
    const restartButton = document.getElementById('restartButton');
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const scoreEl = document.getElementById('scoreEl');
    const highScoreEl = document.getElementById('highScoreEl');
    const finalScore = document.getElementById('finalScore');
    const livesEl = document.getElementById('livesEl');

    // Canvas Setup
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 600;
    canvas.height = 800;

    // Game State
    let score = 0;
    let lives = 3;
    let highScore = localStorage.getItem('neonGridHighScore') || 0;
    let animationId;
    let isGameOver = false;
    let gameFrame = 0;

    highScoreEl.innerText = highScore;

    // Game Objects
    let player;
    let projectiles = [];
    let enemyProjectiles = [];
    let enemies = [];
    let particles = [];
    const keys = {
        a: { pressed: false },
        d: { pressed: false },
        space: { pressed: false }
    };

    // --- CLASSES ---
    class Player {
        constructor() {
            this.width = 40;
            this.height = 20;
            this.position = { x: canvas.width / 2 - this.width / 2, y: canvas.height - this.height - 20 };
            this.velocity = { x: 0, y: 0 };
            this.speed = 7;
            this.shootCooldown = 15; // frames
            this.lastShotFrame = 0;
        }

        draw() {
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.moveTo(this.position.x + this.width / 2, this.position.y);
            ctx.lineTo(this.position.x, this.position.y + this.height);
            ctx.lineTo(this.position.x + this.width, this.position.y + this.height);
            ctx.closePath();
            ctx.fill();
        }

        update() {
            this.position.x += this.velocity.x;

            if (this.position.x <= 0) this.position.x = 0;
            if (this.position.x + this.width >= canvas.width) this.position.x = canvas.width - this.width;

            this.velocity.x = 0;
            if (keys.a.pressed) this.velocity.x = -this.speed;
            if (keys.d.pressed) this.velocity.x = this.speed;

            if (keys.space.pressed && gameFrame - this.lastShotFrame >= this.shootCooldown) {
                this.shoot();
                this.lastShotFrame = gameFrame;
            }
            this.draw();
        }

        shoot() {
            projectiles.push(new Projectile({ x: this.position.x + this.width / 2, y: this.position.y }, { x: 0, y: -10 }, '#00ffff'));
        }
    }

    class Projectile {
        constructor(position, velocity, color) {
            this.position = position;
            this.velocity = velocity;
            this.radius = 4;
            this.color = color;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.closePath();
        }

        update() {
            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;
            this.draw();
        }
    }
    
    class Particle {
        constructor(position, velocity, radius, color) {
            this.position = position;
            this.velocity = velocity;
            this.radius = radius;
            this.color = color;
            this.opacity = 1;
            this.friction = 0.98;
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.closePath();
            ctx.restore();
        }
        
        update() {
            this.velocity.x *= this.friction;
            this.velocity.y *= this.friction;
            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;
            this.opacity -= 0.02;
            this.draw();
        }
    }

    class Enemy {
        constructor(position, width, height, color) {
            this.position = position;
            this.width = width;
            this.height = height;
            this.color = color;
        }

        update() {
            this.draw();
        }
    }

    class Grunt extends Enemy {
        constructor(position) {
            super(position, 30, 30, '#ff0000');
            this.velocity = { x: 0, y: 2 };
        }
        
        draw() {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        }

        update() {
            this.position.y += this.velocity.y;
            this.draw();
        }
    }
    
    class Striker extends Enemy {
        constructor(position) {
            super(position, 40, 20, '#ff00ff');
            this.velocity = { x: 0, y: 1.5 };
            this.shootCooldown = 120; // frames
            this.lastShotFrame = gameFrame;
        }
        
        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.position.x, this.position.y);
            ctx.lineTo(this.position.x + this.width / 2, this.position.y + this.height);
            ctx.lineTo(this.position.x + this.width, this.position.y);
            ctx.closePath();
            ctx.fill();
        }

        shoot() {
             const angle = Math.atan2(player.position.y - this.position.y, player.position.x - this.position.x);
             const velocity = { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5 };
             enemyProjectiles.push(new Projectile({x: this.position.x + this.width / 2, y: this.position.y + this.height}, velocity, this.color));
        }

        update() {
            this.position.y += this.velocity.y;
            if(gameFrame - this.lastShotFrame >= this.shootCooldown) {
                this.shoot();
                this.lastShotFrame = gameFrame;
            }
            this.draw();
        }
    }
    
    class Hunter extends Enemy {
        constructor(position) {
            super(position, 50, 50, '#ffa500');
            this.health = 3;
            this.velocity = {x: 2, y: 1};
            this.shootCooldown = 90;
            this.lastShotFrame = gameFrame;
            this.strafeDirection = 1;
        }

        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.position.x + this.width * 0.5, this.position.y);
            ctx.lineTo(this.position.x + this.width, this.position.y + this.height * 0.25);
            ctx.lineTo(this.position.x + this.width, this.position.y + this.height * 0.75);
            ctx.lineTo(this.position.x + this.width * 0.5, this.position.y + this.height);
            ctx.lineTo(this.position.x, this.position.y + this.height * 0.75);
            ctx.lineTo(this.position.x, this.position.y + this.height * 0.25);
            ctx.closePath();
            ctx.fill();
        }

        // AI BEHAVIOR
        shoot() {
            // Predictive Targeting AI
            const projectileSpeed = 7;
            const distance = Math.hypot(player.position.x - this.position.x, player.position.y - this.position.y);
            const timeToTarget = distance / projectileSpeed;
            const predictedPlayerX = player.position.x + player.velocity.x * timeToTarget;

            const angle = Math.atan2(player.position.y - this.position.y, predictedPlayerX - (this.position.x + this.width/2));
            const velocity = { x: Math.cos(angle) * projectileSpeed, y: Math.sin(angle) * projectileSpeed };
            enemyProjectiles.push(new Projectile({x: this.position.x + this.width / 2, y: this.position.y + this.height}, velocity, this.color));
        }

        update() {
            // Basic movement
            this.position.y += this.velocity.y;
            this.position.x += this.velocity.x * this.strafeDirection;

            if (this.position.x <= 0 || this.position.x + this.width >= canvas.width) {
                this.strafeDirection *= -1;
            }

            // Evasive Maneuver AI
            projectiles.forEach(p => {
                if(p.position.y > this.position.y && p.position.y < this.position.y + 200 && Math.abs(p.position.x - (this.position.x + this.width / 2)) < 50) {
                     this.position.x += p.position.x > this.position.x ? -2 : 2;
                }
            });

            if(gameFrame - this.lastShotFrame >= this.shootCooldown) {
                this.shoot();
                this.lastShotFrame = gameFrame;
            }
            this.draw();
        }
    }

    // --- HELPER FUNCTIONS ---
    function spawnEnemies() {
        if (gameFrame % 100 === 0) {
            enemies.push(new Grunt({ x: Math.random() * (canvas.width - 30), y: -30 }));
        }
        if (gameFrame % 250 === 0) {
            enemies.push(new Striker({ x: Math.random() * (canvas.width - 40), y: -20 }));
        }
        if (gameFrame > 0 && gameFrame % 900 === 0) { // Spawn a hunter every 15 seconds (60fps * 15)
             enemies.push(new Hunter({ x: Math.random() * (canvas.width - 50), y: -50 }));
        }
    }
    
    function createExplosion(object, color) {
        for(let i=0; i<15; i++) {
            particles.push(new Particle(
                {x: object.position.x + object.width / 2, y: object.position.y + object.height / 2},
                {x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6},
                Math.random() * 3,
                color
            ));
        }
    }
    
    function updateLivesDisplay() {
        livesEl.innerHTML = '';
        for (let i = 0; i < lives; i++) {
            const lifeIcon = document.createElement('div');
            lifeIcon.className = 'life-icon';
            livesEl.appendChild(lifeIcon);
        }
    }

    function init() {
        player = new Player();
        projectiles = [];
        enemyProjectiles = [];
        enemies = [];
        particles = [];
        score = 0;
        lives = 3;
        gameFrame = 0;
        isGameOver = false;
        scoreEl.innerText = score;
        updateLivesDisplay();
    }

    function endGame() {
        isGameOver = true;
        setTimeout(() => {
            cancelAnimationFrame(animationId);
            gameOverScreen.classList.remove('hide');
            finalScore.innerText = score;
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('neonGridHighScore', highScore);
                highScoreEl.innerText = highScore;
            }
        }, 1000); // Small delay to show final explosion
    }
    
    function drawGrid() {
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 20) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 20) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }
    }

    // --- MAIN GAME LOOP ---
    function animate() {
        if (isGameOver) return;

        animationId = requestAnimationFrame(animate);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Fading trail effect
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        drawGrid();

        player.update();
        
        // Update particles
        particles.forEach((particle, index) => {
            if (particle.opacity <= 0) {
                particles.splice(index, 1);
            } else {
                particle.update();
            }
        });

        // Update projectiles
        projectiles.forEach((p, index) => {
            if (p.position.y + p.radius < 0) {
                projectiles.splice(index, 1);
            } else {
                p.update();
            }
        });

        enemyProjectiles.forEach((p, index) => {
            if (p.position.y - p.radius > canvas.height) {
                enemyProjectiles.splice(index, 1);
            } else {
                p.update();
            }
        });

        // Update enemies
        enemies.forEach((enemy, eIndex) => {
            enemy.update();

            // Collision: Enemy with Player
            if (
                player.position.x < enemy.position.x + enemy.width &&
                player.position.x + player.width > enemy.position.x &&
                player.position.y < enemy.position.y + enemy.height &&
                player.position.y + player.height > enemy.position.y
            ) {
                 createExplosion(player, '#ffffff');
                 lives--;
                 updateLivesDisplay();
                 enemies.splice(eIndex, 1);
                 if(lives <= 0) endGame();
                 else player.position.x = canvas.width / 2 - player.width / 2; // Reset position
            }

            // Collision: Player Projectile with Enemy
            projectiles.forEach((proj, pIndex) => {
                if (
                    proj.position.x > enemy.position.x &&
                    proj.position.x < enemy.position.x + enemy.width &&
                    proj.position.y > enemy.position.y &&
                    proj.position.y < enemy.position.y + enemy.height
                ) {
                    if(enemy instanceof Hunter) {
                        enemy.health--;
                        enemy.color = 'white'; // Flash on hit
                        setTimeout(() => enemy.color = '#ffa500', 50);
                        if(enemy.health <= 0) {
                            score += 250;
                            createExplosion(enemy, enemy.color);
                            enemies.splice(eIndex, 1);
                        }
                    } else {
                        score += (enemy instanceof Striker) ? 50 : 10;
                        createExplosion(enemy, enemy.color);
                        enemies.splice(eIndex, 1);
                    }
                    projectiles.splice(pIndex, 1);
                    scoreEl.innerText = score;
                }
            });
        });

        // Collision: Enemy Projectile with Player
        enemyProjectiles.forEach((proj, pIndex) => {
             if (
                proj.position.x > player.position.x &&
                proj.position.x < player.position.x + player.width &&
                proj.position.y > player.position.y &&
                proj.position.y < player.position.y + player.height
            ) {
                enemyProjectiles.splice(pIndex, 1);
                createExplosion(player, '#ffffff');
                lives--;
                updateLivesDisplay();
                if(lives <= 0) endGame();
                else player.position.x = canvas.width / 2 - player.width / 2; // Reset position
            }
        });

        spawnEnemies();
        gameFrame++;
    }

    // --- EVENT LISTENERS ---
    startButton.addEventListener('click', () => {
        startScreen.classList.add('hide');
        init();
        animate();
    });

    restartButton.addEventListener('click', () => {
        gameOverScreen.classList.add('hide');
        init();
        animate();
    });

    window.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'a':
            case 'ArrowLeft':
                keys.a.pressed = true;
                break;
            case 'd':
            case 'ArrowRight':
                keys.d.pressed = true;
                break;
            case ' ': // Spacebar
                keys.space.pressed = true;
                break;
        }
    });

    window.addEventListener('keyup', (e) => {
        switch (e.key) {
            case 'a':
            case 'ArrowLeft':
                keys.a.pressed = false;
                break;
            case 'd':
            case 'ArrowRight':
                keys.d.pressed = false;
                break;
            case ' ': // Spacebar
                keys.space.pressed = false;
                break;
        }
    });
});