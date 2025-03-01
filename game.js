
const { Line, Vector3d, Point3d, Transform } = "Open3d" in globalThis ? Open3d : module.exports;

const canva = document.getElementById('game-canvas');
let cx = canva.getContext('2d');

const { width, height } = canva;
let lastTime;

let audioContext;

const cam = {
    pos: { x: 4, y: 4, z: 2 },
    angle: -Math.PI/5,
    lower: Math.PI/8
};

const maps = [{ heights: [
    [1,1,1,1,0,1,5,5,5,5,4,5,6,7,8,9],
    [6,5,2,2,1,2,5,5,5,5,5,5,5,6,7,8],
    [5,5,5,2,5,5,5,5,5,5,5,5,5,5,6,7],
    [5,5,5,1,5,5,5,5,5,5,5,5,5,5,5,6],
    [5,5,5,5,5,5,5,5,5,5,5,4,5,5,5,5],
    [5,5,6,5,5,5,5,5,5,5,5,4,5,5,5,5],
    [5,5,5,5,5,5,5,5,5,5,5,4,5,5,5,5],
    [5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    [5,5,5,5,6,6,6,6,5,5,5,5,5,5,5,5],
    [5,5,5,5,5,7,7,5,5,5,5,5,5,5,5,5],
    [5,5,5,5,5,5,5,5,5,5,5,5,4,4,5,5],
    [5,5,5,5,5,5,5,5,5,5,5,5,4,4,5,5],
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
let mw = map.heights.length;
let mh = map.heights[0].length;

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
    console.log(JSON.stringify(cam))
}

const th = Math.sqrt(3)/2;

function tpoints({x, y}) {
    const dir = (x + y) % 2;
    const a = x / 2;
    const b = (y + 1) * th;
    const z = theight({x, y}); // ...
    if (dir === 0) {
        return [
            {x: a, y: b, z},
            {x: a + 1, y:b, z},
            {x: a + .5, y:b - th, z}
                ]
    } else {
        return [
            {x: a, y: b - th, z},
            {x: a + 1, y: b - th, z},
            {x: a + .5, y: b, z}
                ]
    }
}

function tcolor({x, y}) {
    const type = map.type[x][y];
    switch(type) {
    case " ": return 'pink';
    case "x": return 'blue';
    case "r": return 'yellow';
    }
    console.error('bad type', type)
}

function theight({x, y}) {
    return map.heights[x][y] / 5;
}

function tocam(m, {x, y, z}) {
    const {X, Y, Z} = (new Point3d(x, y, z).Transform(m))
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
    cx.fillStyle = 'rgb(30,30,30)';
    cx.fillRect(0, 0, width, height);
    const m = Transform.CombineTransforms([
        Transform.Translation(new Vector3d(-cam.pos.x, -cam.pos.y, -cam.pos.z)),
        Transform.Rotation(-cam.angle, new Vector3d(0, 0, 1), new Point3d(0,0,0)),
        Transform.Rotation(-cam.lower, new Vector3d(0, 1, 0), new Point3d(0,0,0))
    ]);
    const pss = [];
    for(let x = 0; x < mw; x++) {
        for(let y = 0; y < mh; y++) {
            const t = {x, y};
            const ps = tpoints(t);
            const c = tcolor(t);

            pss.push({t, ps, c})
        }
    }
    for (let item of pss) {
        const { t, ps, c } = item
        const cs = ps.map((p) => tocam(m, p))
        if (!cs[0] || !cs[1] || !cs[2]) {
            continue;
        }
        cx.fillStyle = c;
        cx.strokeStyle = c;
        cx.beginPath();
        cx.moveTo(cs[0].x, cs[0].y);
        cx.lineTo(cs[1].x, cs[1].y);
        cx.lineTo(cs[2].x, cs[2].y);
        cx.lineTo(cs[0].x, cs[0].y);
        cx.fill();
        cx.stroke();
    }
}

gameLoop();
