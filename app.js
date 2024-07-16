const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const CHARACTERISTIC_UUID = "abcdef01-1234-5678-1234-56789abcdef0";

let scene, camera, renderer, building;
let greenCircles = [];
let redCircles = [];
let currentState = "";
let animationFrame;
let cameraAngle = 0;

init();
animate();

document
  .getElementById("connectButton")
  .addEventListener("click", connectToBluetooth);

function degreetoradian(degree) {
  return degree * (Math.PI / 180);
}

function init() {
  // Scene setup
  scene = new THREE.Scene();

  // Camera setup
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(-50, 20, -30);
  camera.rotation.set(
    degreetoradian(31),
    degreetoradian(-110),
    degreetoradian(30)
  );

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Add basic lighting
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(-3, 2, -5).normalize();
  scene.add(directionalLight);

  // Load the building model
  const mtlLoader = new THREE.MTLLoader();
  mtlLoader.load("./model.mtl", (materials) => {
    materials.preload();
    const objLoader = new THREE.OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load(
      "./model.obj",
      (object) => {
        building = object;
        scene.add(building);
        console.log("Model loaded successfully");
      },
      undefined,
      (error) => {
        console.error("An error happened", error);
      }
    );
  });

  // Add a skybox
  const loader = new THREE.CubeTextureLoader();
  const texture = loader.load([
    "./skybox/Daylight Box_Right.bmp",
    "./skybox/Daylight Box_Left.bmp",
    "./skybox/Daylight Box_Top.bmp",
    "./skybox/Daylight Box_Bottom.bmp",
    "./skybox/Daylight Box_Front.bmp",
    "./skybox/Daylight Box_Back.bmp",
  ]);
  scene.background = texture;
}

function createCircle(color, position) {
  const circleGeometry = new THREE.CircleGeometry(1, 32);
  const circleMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });

  const edges = new THREE.EdgesGeometry(circleGeometry);
  const line = new THREE.LineSegments(edges, circleMaterial);
  line.scale.set(4, 4, 4);
  line.material.opacity = 0.5;
  line.position.set(position.x, position.y, position.z);
  line.rotation.set(degreetoradian(90), 0, 0);

  if (color === 0x00ff00) {
    greenCircles.push(line);
  } else {
    redCircles.push(line);
  }

  scene.add(line);
}

function animate() {
  animationFrame = requestAnimationFrame(animate);
  renderer.render(scene, camera);

  // Animate green circles like sonar pulses
  greenCircles.forEach((circle, index) => {
    circle.scale.x += index * 0.02;
    circle.scale.y += index * 0.02;
    circle.material.opacity -= 0.004;

    if (circle.material.opacity <= 0) {
      circle.scale.set(2, 2, 2);
      circle.material.opacity = 0.5;
    }
  });

  // Animate red circles like sonar pulses
  redCircles.forEach((circle, index) => {
    circle.scale.x += index * 0.02;
    circle.scale.y += index * 0.02;
    circle.material.opacity -= 0.004;

    if (circle.material.opacity <= 0) {
      circle.scale.set(2, 2, 2);
      circle.material.opacity = 0.5;
    }
  });

  // Remove expired circles
  greenCircles = greenCircles.filter((circle) => circle.material.opacity > 0);
  redCircles = redCircles.filter((circle) => circle.material.opacity > 0);

  // Create new circles at intervals
  if (currentState.includes("Outside") && greenCircles.length < 5) {
    createCircle(0x00ff00, { x: -14, y: 0, z: -15 });
  }

  if (currentState.includes("Inside") && redCircles.length < 10) {
    let floor = currentState.split(" ")[3];
    createCircle(0xff0000, { x: -14, y: floor * 5, z: -15 });
  }

  // Slight camera movement
  cameraAngle += 0.002;
  camera.position.x = -50 + 5 * Math.sin(cameraAngle);
  camera.position.z = -30 + 10 * Math.cos(cameraAngle);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
}

function handleStateChange() {
  // Clear existing circles
  greenCircles.forEach((circle) => scene.remove(circle));
  redCircles.forEach((circle) => scene.remove(circle));
  greenCircles = [];
  redCircles = [];

  if (currentState.includes("Outside")) {
    // Start green circle animation
    createCircle(0x00ff00, { x: -14, y: 0, z: -15 });
  } else if (currentState.includes("Inside on Floor 0")) {
    // Start red circle animation for Floor 0
    createCircle(0xff0000, { x: -14, y: 1, z: -15 });
  } else if (currentState.includes("Inside on Floor 1")) {
    // Start red circle animation for Floor 1
    createCircle(0xff0000, { x: -14, y: 6, z: -15 });
  } else if (currentState.includes("Inside on Floor 2")) {
    // Start red circle animation for Floor 2
    createCircle(0xff0000, { x: -14, y: 10, z: -15 });
  } else if (currentState.includes("Inside on Floor 3")) {
    // Start red circle animation for Floor 3
    createCircle(0xff0000, { x: -14, y: 15, z: -15 });
  }
}

async function connectToBluetooth() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ name: "NiclaSenseME" }],
      optionalServices: [SERVICE_UUID],
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

    characteristic.startNotifications();

    characteristic.addEventListener("characteristicvaluechanged", (event) => {
      const value = new TextDecoder().decode(event.target.value);
      currentState = value;
      document.getElementById("data").innerText = currentState;
      handleStateChange();
    });

    document.getElementById("data").innerText = "Connected to NiclaSenseME!";
  } catch (error) {
    console.error("Error:", error);
    document.getElementById("data").innerText =
      "Failed to connect to NiclaSenseME!";
  }
}

// Simulation functions for testing
function simulateOutside() {
  currentState = "Outside";
  handleStateChange();
}

function simulateInside(floor) {
  currentState = `Inside on Floor ${floor}`;
  console.log(currentState);
  handleStateChange();
}
