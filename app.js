const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const CHARACTERISTIC_UUID = "abcdef01-1234-5678-1234-56789abcdef0";

let scene, camera, renderer, building;
let outsideCircles = [];
let insideCircles = [];
let currentState = "";
let animationFrame;

init();
animate();

document
  .getElementById("connectButton")
  .addEventListener("click", connectToBluetooth);

function init() {
  // Add simulation buttons for testing
  const testButtons = document.createElement("div");
  testButtons.innerHTML = `
        <button onclick="simulateOutside()">Simulate Outside</button>
        <button onclick="simulateInside(1)">Simulate Inside Floor 1</button>
    `;
  document.body.appendChild(testButtons);

  // Scene setup
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
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
  function degreetoradian(degree) {
    return degree * (Math.PI / 180);
  }

  camera.position.z = -30;
  camera.position.y = 20;
  camera.position.x = -50;

  camera.rotation.y = degreetoradian(-110);
  camera.rotation.z = degreetoradian(30);
  camera.rotation.x = degreetoradian(31);

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

function animate() {
  animationFrame = requestAnimationFrame(animate);
  renderer.render(scene, camera);

  // Update animations
  //updateAnimations();
}

function updateAnimations() {
  // Update outside circles

  outsideCircles.forEach((circle) => {
    circle.scale.x += 0.01;

    circle.scale.y += 0.01;

    circle.material.opacity -= 0.005;

    if (circle.material.opacity <= 0) {
      scene.remove(circle);
    }
  });

  outsideCircles = outsideCircles.filter(
    (circle) => circle.material.opacity > 0
  );

  // Update inside circles

  insideCircles.forEach((circle) => {
    circle.scale.x += 0.01;

    circle.scale.y += 0.01;

    circle.material.opacity -= 0.005;

    if (circle.material.opacity <= 0) {
      scene.remove(circle);
    }
  });

  insideCircles = insideCircles.filter((circle) => circle.material.opacity > 0);
}

function handleStateChange() {
  currentState = "Outside"; // Default state
  if (currentState.includes("Outside")) {
    console.log("Outside");
    createOutsideAnimation();
  } else if (currentState.includes("Inside on Floor 1")) {
    createInsideAnimation(1);
  } else if (currentState.includes("Inside on Floor 2")) {
    createInsideAnimation(2);
  }
}

function createOutsideAnimation() {
  const circleGeometry = new THREE.CircleGeometry(1, 32);
  const circleMaterial = new THREE.MeshBasicMaterial({
    color: 0x0000ff,
    transparent: false,
    opacity: 1,
  });
  const circle = new THREE.Mesh(circleGeometry, circleMaterial);
  circle.position.set(-23, 4, -25); // Slightly in front of the building
  scene.add(circle);
  outsideCircles.push(circle);
}

function createInsideAnimation(floor) {
  const floorHeight = 3; // Assuming each floor is 3 units high

  const circleGeometry = new THREE.CircleGeometry(1, 32);

  const circleMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,

    transparent: true,

    opacity: 0.5,
  });

  const circle = new THREE.Mesh(circleGeometry, circleMaterial);

  circle.position.set(0, floor * floorHeight, 0.1); // Position at the given floor

  scene.add(circle);

  insideCircles.push(circle);
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

  handleStateChange();
}
