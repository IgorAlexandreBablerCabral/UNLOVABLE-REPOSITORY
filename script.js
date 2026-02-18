import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';

let scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

// ===== CAMERA =====
let camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

// ===== RENDER =====
let renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ===== LUZ =====
let light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
scene.add(light);

// ===== CHÃO =====
let floorGeo = new THREE.PlaneGeometry(50, 50);
let floorMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
let floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// ===== PLAYER =====
let playerGeo = new THREE.BoxGeometry(1, 2, 1);
let playerMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
let player = new THREE.Mesh(playerGeo, playerMat);
player.position.set(0, 1, 0);
player.visible = false;
scene.add(player);

// ================= VIDA =================

let life = 100;

let lifeBar = document.getElementById("lifeBar");

if (!lifeBar) {

    lifeBar = document.createElement("div");
    lifeBar.id = "lifeBar";

    lifeBar.style.position = "absolute";
    lifeBar.style.top = "20px";
    lifeBar.style.left = "20px";
    lifeBar.style.width = "200px";
    lifeBar.style.height = "20px";
    lifeBar.style.border = "2px solid white";
    lifeBar.style.background = "#222";

    document.body.appendChild(lifeBar);

    let lifeFill = document.createElement("div");
    lifeFill.id = "lifeFill";
    lifeFill.style.height = "100%";
    lifeFill.style.width = "100%";
    lifeFill.style.background = "red";

    lifeBar.appendChild(lifeFill);
}

let lifeFill = document.getElementById("lifeFill");

// ===== RESPAWN =====

function respawnPlayer() {

    life = 100;
    lifeFill.style.width = "100%";

    player.position.set(0, 1, 0);

    velocity.set(0, 0, 0);
    velocityY = 0;

    onGround = true;
    canJump = true;

    jumpCounter = 0;
    nextDamageJump = getRandomJumpLimit();
}

// ================= CONTROLES =================

let keys = {};
document.addEventListener("keydown", e => keys[e.code] = true);
document.addEventListener("keyup", e => keys[e.code] = false);

// ===== MOUSE FPS =====

let yaw = 0;
let pitch = 0;
let sensitivity = 0.002;

document.body.addEventListener("click", () => {
    document.body.requestPointerLock();
});

document.addEventListener("mousemove", (event) => {

    if (document.pointerLockElement === document.body) {

        yaw -= event.movementX * sensitivity;
        pitch -= event.movementY * sensitivity;

        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    }
});

// ================= PAREDES =================

let walls = [];

function createWall(x, z, w, h) {

    let geo = new THREE.BoxGeometry(w, 3, h);
    let mat = new THREE.MeshStandardMaterial({ color: 0x8888ff });
    let wall = new THREE.Mesh(geo, mat);

    wall.position.set(x, 1.5, z);
    scene.add(wall);

    wall.userData.box = new THREE.Box3().setFromObject(wall);
    walls.push(wall);
}

createWall(5, 0, 1, 10);
createWall(-5, 0, 1, 10);
createWall(0, 5, 10, 1);
createWall(0, -5, 10, 1);

// ================= MOVIMENTO =================

let velocity = new THREE.Vector3();
let acceleration = 0.004;
let friction = 0.85;
let maxSpeed = 0.045;

// ================= PULO =================

let velocityY = 0;

let gravityUp = -0.0022;
let gravityDown = -0.001;

let jumpForce = 0.095;

let onGround = true;
let canJump = true;

// ===== MECÂNICA DANO POR PULO =====

let jumpCounter = 0;

function getRandomJumpLimit() {
    return Math.floor(Math.random() * 5) + 1; // 1 a 5
}

let nextDamageJump = getRandomJumpLimit();

// ================= COLISÃO =================

function checkCollision(nextPosition) {

    let playerBox = new THREE.Box3().setFromCenterAndSize(
        nextPosition,
        new THREE.Vector3(1, 2, 1)
    );

    for (let wall of walls) {
        if (playerBox.intersectsBox(wall.userData.box)) {
            return true;
        }
    }

    return false;
}

// ================= LOOP =================

function animate() {

    requestAnimationFrame(animate);

    // ===== DIREÇÃO =====

    let forward = new THREE.Vector3(
        -Math.sin(yaw),
        0,
        -Math.cos(yaw)
    );

    let right = new THREE.Vector3(
        Math.cos(yaw),
        0,
        -Math.sin(yaw)
    );

    let moveDirection = new THREE.Vector3();

    if (keys["KeyW"]) moveDirection.add(forward);
    if (keys["KeyS"]) moveDirection.add(forward.clone().negate());
    if (keys["KeyA"]) moveDirection.add(right.clone().negate());
    if (keys["KeyD"]) moveDirection.add(right);

    if (moveDirection.length() > 0) {
        moveDirection.normalize();
        velocity.add(moveDirection.multiplyScalar(acceleration));
    }

    if (velocity.length() > maxSpeed) {
        velocity.normalize().multiplyScalar(maxSpeed);
    }

    velocity.multiplyScalar(friction);

    let nextPosition = player.position.clone().add(velocity);

    if (!checkCollision(new THREE.Vector3(
        nextPosition.x,
        player.position.y,
        player.position.z
    ))) {
        player.position.x = nextPosition.x;
    }

    if (!checkCollision(new THREE.Vector3(
        player.position.x,
        player.position.y,
        nextPosition.z
    ))) {
        player.position.z = nextPosition.z;
    }

    // ===== PULO =====

    if (keys["Space"] && onGround && canJump) {

        velocityY = jumpForce;
        onGround = false;
        canJump = false;

        // CONTADOR DE PULOS
        jumpCounter++;

        if (jumpCounter >= nextDamageJump) {

            life -= 10;
            if (life < 0) life = 0;

            lifeFill.style.width = life + "%";

            jumpCounter = 0;
            nextDamageJump = getRandomJumpLimit();
        }
    }

    if (!keys["Space"]) canJump = true;

    if (velocityY > 0) velocityY += gravityUp;
    else velocityY += gravityDown;

    player.position.y += velocityY;

    if (player.position.y <= 1) {
        player.position.y = 1;
        velocityY = 0;
        onGround = true;
    }

    // ===== MORTE =====

    if (life <= 0) {
        respawnPlayer();
    }

    // ===== CAMERA FPS =====

    camera.position.x = player.position.x;
    camera.position.y = player.position.y + 0.6;
    camera.position.z = player.position.z;

    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    renderer.render(scene, camera);
}

animate();
