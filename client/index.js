let data;
let sheet;
let walker;
let playerId;

let renderedIdSpriteMap = [];

const app = new PIXI.Application({
  resolution: window.devicePixelRatio || 1,
});
app.renderer.view.style.position = "absolute";
app.renderer.view.style.display = "block";
app.renderer.autoDensity = true;
app.renderer.resize(window.innerWidth, window.innerHeight);
document.body.appendChild(app.view);

let resolver = null;
sheetLoaded = new Promise((resolve) => {
  resolver = resolve;
});

const addPlayer = async ({ graphic, id, x, y, vx, vy }) => {
  const sprite = new PIXI.AnimatedSprite(graphic);
  sprite.id = id;
  sprite.vx = vx;
  sprite.x = x;
  sprite.y = y;
  sprite.vy = vy;
  sprite.anchor.set(0.5, 1);

  sprite.animationSpeed = 0.3;
  sprite.play();

  const nameplate = new PIXI.BitmapText(String(id), {
    font: "TitleFont",
  });

  nameplate.x = x;
  nameplate.y = y - 130;
  nameplate.anchor.set(0.5);
  sprite.nameplate = nameplate;

  app.stage.addChild(sprite);
  app.stage.addChild(nameplate);
  renderedIdSpriteMap.push(sprite);
};

const addBody = async ({ x, y, alreadyDead }) => {
  await sheetLoaded;

  const sprite = alreadyDead
    ? new PIXI.Sprite(sheet.textures["Death/Dead0033.png"])
    : new PIXI.AnimatedSprite(sheet.spritesheet.animations["Death/Dead"]);
  sprite.x = x;
  sprite.y = y;
  sprite.anchor.set(0.5, 1);
  if (!alreadyDead) {
    sprite.loop = false;
    sprite.animationSpeed = 0.4;
    sprite.play();
  }

  app.stage.addChild(sprite);
  renderedIdSpriteMap.push(sprite);
};

const removePlayer = ({ id }) => {
  const exitedSpriteIndex = renderedIdSpriteMap.findIndex(
    (idSpriteMap) => idSpriteMap.id === id
  );
  if (exitedSpriteIndex < 0) return;
  const sprite = renderedIdSpriteMap[exitedSpriteIndex];
  renderedIdSpriteMap.splice(exitedSpriteIndex, 1);
  app.stage.removeChild(sprite);
  app.stage.removeChild(sprite.nameplate);
};

const conn = new WebsocketTransport({
  name: "server-conn",
  url: "ws://localhost:8080",
  onMessage: async (evt) => {
    const parsed = JSON.parse(evt.data);
    if (parsed.type === "UPDATE") {
      data = parsed;
      return;
    }
    await sheetLoaded;
    console.debug(parsed);
    if (parsed.type === "JOINED") {
      addPlayer({
        graphic: [sheet.spritesheet.textures["idle.png"]],
        ...parsed.player,
      });
    } else if (parsed.type === "LOAD") {
      parsed.players.forEach(async (player) => {
        addPlayer({
          graphic: [sheet.spritesheet.textures["idle.png"]],
          ...player,
        });
      });
      parsed.bodies.forEach(async (body) => {
        addBody({ ...body, alreadyDead: true });
      });
    } else if (parsed.type === "EXITED") {
      removePlayer({ ...parsed.player });
    } else if (parsed.type === "DEAD_BODY") {
      removePlayer({ ...parsed.player });
      addBody({ ...parsed.player, alreadyDead: false });
    } else if (parsed.type === "NEW_GHOST_BUDDY") {
      const renderedIds = renderedIdSpriteMap.map(
        (idSpriteMap) => idSpriteMap.id
      );
      const nonRenderedIds = parsed.deadPlayers.filter(
        (dP) => !renderedIds.includes(dP.id)
      );

      nonRenderedIds.forEach(async (player) => {
        addPlayer({
          graphic: sheet.spritesheet.animations["Ghost/ghostbob"],
          ...player,
        });
      });
    }
  },
  onClose: () => {
    renderedIdSpriteMap.forEach((sprite) => {
      app.stage.removeChild(sprite);
      app.stage.removeChild(sprite.nameplate);
    });
    renderedIdSpriteMap = [];
  },
});

PIXI.Loader.shared.add("./resources/sprites/spritesheet.json").load(setup);
PIXI.BitmapFont.from("TitleFont", {
  fill: "white",
  fontSize: 25,
  fontWeight: "bold",
  align: "center",
});

function setup() {
  sheet = PIXI.Loader.shared.resources["./resources/sprites/spritesheet.json"];
  resolver();
  app.ticker.add((delta) => gameLoop(delta));
}

function gameLoop(delta) {
  data?.players.forEach((player) => {
    const sprite = renderedIdSpriteMap.find(
      (idSpriteMap) => idSpriteMap.id === player.id
    );
    if (!sprite) return;

    if (player.alive) {
      if (sprite.vx === player.vx && sprite.vy === player.vy) {
      } else {
        if (player.vx === 0 && player.vy === 0) {
          sprite.stop();
          sprite.texture = sheet.textures["idle.png"];
        } else if (sprite.vx === 0 && sprite.vy === 0) {
          sprite.textures = sheet.spritesheet.animations["walk/walk"];
          sprite.loop = true;
          sprite.animationSpeed = 0.3;
          sprite.play();
        }
      }
    }

    if (player.vx < 0) {
      sprite.scale.x = -1;
    } else if (player.vx > 0) {
      sprite.scale.x = 1;
    }

    sprite.nameplate.x = player.x;
    sprite.nameplate.y = player.y - 130;

    sprite.vx = player.vx;
    sprite.x = player.x;
    sprite.y = player.y;
    sprite.vy = player.vy;
  });
}

document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);

let rightPressed = false;
let leftPressed = false;
let upPressed = false;
let downPressed = false;

let xDirection = "NONE";
let yDirection = "NONE";

const getDirection = () =>
  JSON.stringify({
    type: "MOVEMENT",
    x: xDirection,
    y: yDirection,
  });

function keyDownHandler(event) {
  if (event.keyCode == 39) {
    rightPressed = true;
    xDirection = "RIGHT";
    conn.send(getDirection());
  } else if (event.keyCode == 37) {
    leftPressed = true;
    xDirection = "LEFT";
    conn.send(getDirection());
  }
  if (event.keyCode == 40) {
    downPressed = true;
    yDirection = "DOWN";
    conn.send(getDirection());
  } else if (event.keyCode == 38) {
    upPressed = true;
    yDirection = "UP";
    conn.send(getDirection());
  }
  if (event.keyCode === 32) {
    conn.send(
      JSON.stringify({
        type: "ATTACK",
      })
    );
  }
}

function keyUpHandler(event) {
  if (event.keyCode == 39) {
    rightPressed = false;
    if (leftPressed) {
      xDirection = "LEFT";
    } else {
      xDirection = "NONE";
    }
    conn.send(getDirection());
  } else if (event.keyCode == 37) {
    leftPressed = false;
    if (rightPressed) {
      xDirection = "RIGHT";
    } else {
      xDirection = "NONE";
    }
    conn.send(getDirection());
  }
  if (event.keyCode == 40) {
    downPressed = false;
    if (upPressed) {
      yDirection = "UP";
    } else {
      yDirection = "NONE";
    }
    conn.send(getDirection());
  } else if (event.keyCode == 38) {
    upPressed = false;
    if (downPressed) {
      yDirection = "DOWN";
    } else {
      yDirection = "NONE";
    }
    conn.send(getDirection());
  }
}
