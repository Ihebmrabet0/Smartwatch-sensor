const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const CHARACTERISTIC_UUID = "abcdef01-1234-5678-1234-56789abcdef0";

let scene, camera, renderer, building;
let greenCircles = [];
let redCircles = [];
let currentState = "";
let animationFrame;
let cameraAngle = 0;
let co2Limit = 600;
let vocLimit = 0.5;
let baroFloor0 = 1013.25;

init();
animate();

document
  .getElementById("connectButton")
  .addEventListener("click", connectToBluetooth);
document
  .getElementById("settingsButton")
  .addEventListener("click", toggleSettings);
document.getElementById("saveSettings").addEventListener("click", saveSettings);

function degreetoradian(degree) {
  return degree * (Math.PI / 180);
}

function init() {
  scene = new THREE.Scene();
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

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(-3, 2, -5).normalize();
  scene.add(directionalLight);

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

  greenCircles.forEach((circle, index) => {
    circle.scale.x += index * 0.02;
    circle.scale.y += index * 0.02;
    circle.material.opacity -= 0.004;

    if (circle.material.opacity <= 0) {
      circle.scale.set(2, 2, 2);
      circle.material.opacity = 0.5;
    }
  });

  redCircles.forEach((circle, index) => {
    circle.scale.x += index * 0.02;
    circle.scale.y += index * 0.02;
    circle.material.opacity -= 0.004;

    if (circle.material.opacity <= 0) {
      circle.scale.set(2, 2, 2);
      circle.material.opacity = 0.5;
    }
  });

  greenCircles = greenCircles.filter((circle) => circle.material.opacity > 0);
  redCircles = redCircles.filter((circle) => circle.material.opacity > 0);

  if (currentState.includes("Outside") && greenCircles.length < 5) {
    createCircle(0x00ff00, { x: -14, y: 0, z: -15 });
  }

  if (currentState.includes("Inside") && redCircles.length < 10) {
    let floor = currentState.split(" ")[3];
    createCircle(0xff0000, { x: -14, y: floor * 5, z: -15 });
  }

  cameraAngle += 0.002;
  camera.position.x = -50 + 5 * Math.sin(cameraAngle);
  camera.position.z = -30 + 10 * Math.cos(cameraAngle);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
}

function handleStateChange(data) {
  const temp = data.match(/temp:([0-9.]+)/)[1];
  const baro = parseFloat(data.match(/baro:([0-9.]+)/)[1]);
  const co2 = parseFloat(data.match(/co2:([0-9.]+)/)[1]);
  const voc = parseFloat(data.match(/voc:([0-9.]+)/)[1]);
  const accuracy = parseInt(data.match(/accuracy:(\d+)/)[1]);
  const movement = data.match(/movement:([a-zA-Z\s]+);/)[1];

  document.getElementById("temp").innerText = temp;
  document.getElementById("state").innerText = movement;

  document.getElementById("baro").innerText = baro;
  document.getElementById("co2").innerText = co2;
  document.getElementById("voc").innerText = voc;
  document.getElementById("accuracy").innerText = accuracy;

  if (accuracy === 0) {
    document.getElementById("location").innerText = "Calibrating";
    currentState = "Calibrating";
  } else if (co2 > co2Limit || voc > vocLimit) {
    document.getElementById("location").innerText = "Inside";
    currentState = "Inside";
    const altitude = 44330 * (1.0 - Math.pow(baro / baroFloor0, 0.1903));
    const floor = Math.round(altitude / 3);
    document.getElementById("location").innerText += ` on Floor ${floor}`;
  } else {
    document.getElementById("location").innerText = "Outside";
    currentState = "Outside";
  }

  greenCircles.forEach((circle) => scene.remove(circle));
  redCircles.forEach((circle) => scene.remove(circle));
  greenCircles = [];
  redCircles = [];

  if (currentState.includes("Outside")) {
    createCircle(0x00ff00, { x: -14, y: 0, z: -15 });
  } else if (currentState.includes("Inside")) {
    const floor = parseInt(currentState.split(" ")[3]);
    if (!isNaN(floor)) {
      createCircle(0xff0000, { x: -14, y: floor * 5, z: -15 });
    }
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
      handleStateChange(value);
    });

    document.getElementById("connectButton").remove();
    console.log("Connected to NiclaSenseME!");
  } catch (error) {
    console.error("Error:", error);
  }
}

function toggleSettings() {
  const settings = document.getElementById("settings");
  settings.style.display = settings.style.display === "none" ? "block" : "none";
}

function saveSettings() {
  co2Limit = parseFloat(document.getElementById("co2Limit").value);
  vocLimit = parseFloat(document.getElementById("vocLimit").value);
  baroFloor0 = parseFloat(document.getElementById("baroFloor0").value);
  toggleSettings();
}

// Simulation functions for testing
function simulateOutside() {
  handleStateChange(
    "temp:25;baro:1010;co2:400;voc:0.1;accuracy:3;movement:not moving;"
  );
}

function simulateInside(floor) {
  handleStateChange(
    `temp:25;baro:1013.25;co2:800;voc:1;accuracy:3;movement:not moving;`
  );
}
