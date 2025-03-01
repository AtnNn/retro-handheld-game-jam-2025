const { Line, Vector3d, Point3d, Transform } = "Open3d" in globalThis ? Open3d : module.exports;

const canva = document.getElementById('game-canvas');
let cx = canva.getContext('2d');

const { width, height } = canva;
let lastTime;

let audioContext;

const cam = {
    pos: { x: 1, y: 1, z: 1 },
    angle: -Math.PI/5,
    lower: Math.PI/8
};

let speed = 0;

const maps = [
    // {
//     heights: [[0,0,0,0], [1,1,1,1], [2,2,2,2], [3,3,3,3]],
//         type: ["abc", "def"]
// },

    { heights: [
        [0,1,1,1,1,0,1,5,5,5,5,4,5,6,7,8,9],
        [0,1,1,1,1,0,1,5,5,5,5,4,5,6,7,8,9],
        [0,1,1,1,1,0,1,5,5,5,5,4,5,6,7,8,9],
        [0,1,1,1,1,0,1,5,5,5,5,4,5,6,7,8,9],
        [0,1,1,1,1,0,1,5,5,5,5,4,5,6,7,8,9],
        [0,1,1,1,1,0,1,5,5,5,5,4,5,6,7,8,9],
        [0,1,1,1,1,0,1,5,5,5,5,4,5,6,7,8,9],
        [0,1,1,1,1,0,1,5,5,5,5,4,5,6,7,8,9],
    [0,1,1,1,1,0,1,5,5,5,5,4,5,6,7,8,9],
    [5,6,5,2,2,1,2,5,5,5,5,5,5,5,6,7,8],
    [5,5,5,5,2,5,5,5,5,5,5,5,5,5,5,6,7],
    [5,5,5,5,1,5,5,5,5,5,5,5,5,5,5,5,6],
    [5,5,5,5,5,5,5,5,5,5,5,5,4,5,5,5,5],
    [5,5,5,6,5,5,5,5,5,5,5,5,4,5,5,5,5],
    [5,5,5,5,5,5,5,5,5,5,5,5,4,5,5,5,5],
    [5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    [5,5,5,5,5,6,6,6,6,5,5,5,5,5,5,5,5],
    [5,5,5,5,5,5,7,7,5,5,5,5,5,5,5,5,5],
    [5,5,5,5,5,5,5,5,5,5,5,5,5,4,4,5,5],
    [5,5,5,5,5,5,5,5,5,5,5,5,5,4,4,5,5],
    [5,5,5,5,5,5,5,5,5,5,5,5,5,4,4,5,5],
],
    type: [
        "                ",
        " xxxxxxxxxxxxxx ",
        " xrrrrrr      x ",
        " x      r     x ",
        " x   x  r x   x ",
        " x      r     x ",
        " x      r     x ",
        " x      r    rx ",
        " x   x  r x r x ",
        " x       rrrr x ",
        " xxxxxxxxxxxxx  ",
        "                "
        ]
}
];
let map = maps[0];
// Fixing map dimensions to match the actual data
let mh = map.type.length;
let mw = map.type[0].length;

console.log({mh, mw})

async function loadSound(url) {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  const soundBuffer = await fetch(url).then((res) => res.arrayBuffer());

  const audioBuffer = await audioContext.decodeAudioData(soundBuffer);
  return audioBuffer;
}

function playSound(audioBuffer, loop = false) {
  if (!audioBuffer) {
    return;
  }
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  const bufferSource = audioContext.createBufferSource();
  bufferSource.buffer = audioBuffer;

  bufferSource.connect(audioContext.destination);
  if (loop) {
    bufferSource.loop = true;
  }
  bufferSource.start();
  bufferSource.onended = () => {
    bufferSource.disconnect();
  };
  return bufferSource;
}

// loads image from a url as a promise
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function createResourceLoader() {
  return {
    imgCount: 0,
    soundCount: 0,
    imgLoadedCount: 0,
    soundLoadedCount: 0,
    images: {},
    sounds: {},
    imagePromises: [],
    soundPromises: [],
    addImage(name, src) {
      this.imgCount++;
      const promise = loadImage(src).then((img) => {
        this.images[name] = img;
        this.imgLoadedCount++;
        return img;
      });
      this.imagePromises.push(promise);
      return promise;
    },
    addSound(name, src) {
      this.soundCount++;
      const promise = loadSound(src).then((sound) => {
        this.sounds[name] = sound;
        this.soundLoadedCount++;
        return sound;
      });
      this.soundPromises.push(promise);
      return promise;
    },
    getPercentComplete() {
      return (this.imgLoadedCount + this.soundLoadedCount) / (this.imgCount + this.soundCount);
    },
    isComplete() {
      return this.imgLoadedCount === this.imgCount && this.soundLoadedCount === this.soundCount;
    },
    load() {
      return Promise.all([...this.imagePromises, ...this.soundPromises]);
    },
    reset() {
      this.imgLoadedCount = 0;
      this.soundLoadedCount = 0;
      this.images = {};
      this.sounds = {};
      this.imagePromises = [];
      this.soundPromises = [];
    },
  };
}

function getDefaultBtn() {
  return {
    pressed: false,
    value: 0,
  };
}

const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key] = keys[e.key] || getDefaultBtn();
  keys[e.key].pressed = true;
  keys[e.key].value = 1;
});
window.addEventListener('keyup', (e) => {
  keys[e.key] = keys[e.key] || getDefaultBtn();
  keys[e.key].pressed = false;
  keys[e.key].value = 0;
});

// normalizes input from a gamepad or keyboard
// if there's a gamepad, player 1 is the gamead and player 2 is the keyboard
// if there's no gamepad, player 1 is the keyboard
function getInput() {
  const gamepads = navigator.getGamepads();
  const players = [];
  gamepads.forEach((gp) => {
    if (gp) {
      const player = {
        type: 'gp',
        name: gp.id,
        DPAD_UP: gp.buttons[12],
        DPAD_DOWN: gp.buttons[13],
        DPAD_LEFT: gp.buttons[14],
        DPAD_RIGHT: gp.buttons[15],
        BUTTON_SOUTH: gp.buttons[0], // A on xbox, B on nintendo
        BUTTON_EAST: gp.buttons[1], // B on xbox, A on nintendo
        BUTTON_WEST: gp.buttons[2], // X on xbox, Y on nintendo
        BUTTON_NORTH: gp.buttons[3], // Y on xbox, X on nintendo
        LEFT_SHOULDER: gp.buttons[4] || getDefaultBtn(),
        RIGHT_SHOULDER: gp.buttons[5] || getDefaultBtn(),
        LEFT_TRIGGER: gp.buttons[6] || getDefaultBtn(),
        RIGHT_TRIGGER: gp.buttons[7] || getDefaultBtn(),
        SELECT: gp.buttons[8] || getDefaultBtn(),
        START: gp.buttons[9] || getDefaultBtn(),
        GUIDE: gp.buttons[16] || getDefaultBtn(),
        LEFT_STICK: gp.buttons[10] || getDefaultBtn(),
        RIGHT_STICK: gp.buttons[11] || getDefaultBtn(),
        LEFT_STICK_X: gp.axes[0] || 0,
        LEFT_STICK_Y: gp.axes[1] || 0,
        RIGHT_STICK_X: gp.axes[2] || 0,
        RIGHT_STICK_Y: gp.axes[3] || 0,
      };
      players.push(player);
    }
  });
  players.push({
    type: 'keyboard',
    name: 'keyboard',
    DPAD_UP: keys['ArrowUp'] || getDefaultBtn(),
    DPAD_DOWN: keys['ArrowDown'] || getDefaultBtn(),
    DPAD_LEFT: keys['ArrowLeft'] || getDefaultBtn(),
    DPAD_RIGHT: keys['ArrowRight'] || getDefaultBtn(),
    BUTTON_SOUTH: keys['z'] || getDefaultBtn(),
    BUTTON_EAST: keys['x'] || getDefaultBtn(),
    BUTTON_WEST: keys['a'] || getDefaultBtn(),
    BUTTON_NORTH: keys['s'] || getDefaultBtn(),
    LEFT_SHOULDER: keys['q'] || getDefaultBtn(),
    RIGHT_SHOULDER: keys['r'] || getDefaultBtn(),
    LEFT_TRIGGER: keys['e'] || getDefaultBtn(),
    RIGHT_TRIGGER: keys['r'] || getDefaultBtn(),
    SELECT: keys['Shift'] || getDefaultBtn(),
    START: keys['Enter'] || getDefaultBtn(),
    GUIDE: keys['Escape'] || getDefaultBtn(),
    LEFT_STICK: keys['c'] || getDefaultBtn(),
    RIGHT_STICK: keys['v'] || getDefaultBtn(),
    LEFT_STICK_X: 0,
    LEFT_STICK_Y: 0,
    RIGHT_STICK_X: 0,
    RIGHT_STICK_Y: 0,
  });
  return players;
}

let currentTime = performance.now();
function gameLoop() {
  const newTime = performance.now();
  const millis = newTime - currentTime;
  update(millis);
  draw();
  currentTime = newTime;
  requestAnimationFrame(gameLoop);
}

function update(millis) {
    const [p1] = getInput();
    const adjust_angle = (p1.DPAD_RIGHT.pressed ? 1 : 0) + (p1.DPAD_LEFT.pressed ? -1 : 0);
    cam.angle += adjust_angle * millis / 1000 * Math.PI;
    const adjust_lower = (p1.DPAD_UP.pressed ? 1 : 0) + (p1.DPAD_DOWN.pressed ? -1 : 0);
    cam.lower += adjust_lower * millis / 1000 * Math.PI;
    if (p1.BUTTON_EAST.pressed ) {
        const advance = millis/200;
        const m = Transform.CombineTransforms([
            Transform.Translation(new Vector3d(-cam.pos.x, -cam.pos.y, -cam.pos.z)),
            Transform.Rotation(-cam.angle, new Vector3d(0, 0, 1), new Point3d(0,0,0)),
            Transform.Rotation(-cam.lower, new Vector3d(0, 1, 0), new Point3d(0,0,0))
        ]);
        const {X, Y, Z} = (new Vector3d(advance, 0, 0)).Transform(m.TryGetInverse());
        cam.pos.x += X;
        cam.pos.y += Y;
        cam.pos.z += Z;
    }
}

const th = Math.sqrt(3)/2;

function tpoints({x, y}) {
    const dir = (x + y) % 2;
    const a = y / 2;
    const b = (x + 1) * th;
    const [z1, z2, z3] = theights({x, y});
    if (dir === 0) {
        return [
            {x: a, y: b, z: z1},
            {x: a + 1, y: b, z: z2},
            {x: a + .5, y: b - th, z: z3}
        ]
    } else {
        return [
            {x: a, y: b - th, z: z1},
            {x: a + 1, y: b - th, z: z2},
            {x: a + .5, y: b, z: z3}
        ]
    }
}

function center([a, b, c]) {
    return {
        x: (a.x + b.x + c.x) / 3,
        y: (a.y + b.y + c.y) / 3,
        z: (a.z + b.z + c.z) / 3,
    }
}

function camdist(p) {
    const c = cam.pos;
    const x = c.x - p.x;
    const y = c.y - p.y;
    const z = c.z - p.z;
    return Math.sqrt(x * x + y * y + z * z);
}

function tcolor({x, y}) {
    // Check if coordinates are within bounds
    if (x < 0 || y < 0 || x >= mh || y >= mw) {
        return 'gray'; // Default color for out of bounds
    }
    
    const type = map.type[x][y];
    switch(type) {
    case " ": return 'pink';
    case "x": return 'blue';
    case "r": return 'yellow';
    case "a": return 'rgb(50,50,50)';
    case "b": return 'rgb(70,70,70)';
    case "c": return 'rgb(90,90,90)';
    case "d": return 'rgb(110,110,110)';
    case "e": return 'rgb(130,130,130)';
    case "f": return 'rgb(150,150,150)';
    default: return 'gray'; // Default color if type is undefined
    }
}

function theights({x, y}) {
    const safeGetHeight = (x, y) => {
        //console.log("corner", x, y);
        return map.heights[y][x] / 5;
    };

    const dir = (x + y) % 2;
    const xx = Math.floor(x/2)
    //    console.log("in", x, y, {xx, dir})
    if (dir === 0) {
        return [
            safeGetHeight(xx, y+1),
            safeGetHeight(xx+1, y+1),
            safeGetHeight(xx, y)
        ]
    } else {
        return [
            safeGetHeight(xx, y),
            safeGetHeight(xx+1, y),
            safeGetHeight(xx+1, y+1)
        ]
    }
}

function tocam(m, {x, y, z}) {
    const {X, Y, Z} = (new Point3d(x, y, z).Transform(m));
    const r = Math.sqrt(Y * Y + Z * Z);
    if(X < 0) {
        return undefined;
    }
    // const d = Math.sqrt(r * r + X * X);
    const k = height / 2 / X;
    return {
        x: k * Y + width / 2,
        y: height - (k * Z + height / 2)
    }
}

function draw() {
    cx.fillStyle = 'rgb(100,100,255)';
    cx.fillRect(0, 0, width, height);
    const m = Transform.CombineTransforms([
        Transform.Translation(new Vector3d(-cam.pos.x, -cam.pos.y, -cam.pos.z)),
        Transform.Rotation(-cam.angle, new Vector3d(0, 0, 1), new Point3d(0,0,0)),
        Transform.Rotation(-cam.lower, new Vector3d(0, 1, 0), new Point3d(0,0,0))
    ]);
    const pss = [];
    // Generate triangles for the entire map
    // Fixed to use the correct dimensions
    for(let x = 0; x < mh; x++) {
        for(let y = 0; y < mw; y++) {
            const t = {x, y};
            const ps = tpoints(t);
            const c = tcolor(t);
            const d = camdist(center(ps));

            pss.push({t, ps, c, d});
        }
    }
    // Sort by distance for proper rendering order (back-to-front)
    pss.sort((a, b) => b.d - a.d);
    
    // Render the triangles
    for (let item of pss) {
        const { ps, c } = item;
        const cs = ps.map((p) => tocam(m, p));
        
        // Skip if any point is not visible
        if (!cs[0] || !cs[1] || !cs[2]) {
            continue;
        }
        
        // Draw the triangle
        cx.fillStyle = c;
        cx.strokeStyle = 'rgba(0,0,0,0.2)'; // Subtle border for definition
        cx.beginPath();
        cx.moveTo(cs[0].x, cs[0].y);
        cx.lineTo(cs[1].x, cs[1].y);
        cx.lineTo(cs[2].x, cs[2].y);
        cx.closePath();
        cx.fill();
        cx.stroke();
    }
}

gameLoop();
