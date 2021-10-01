const Ws = require("ws");
const Player = require("./player");

const wss = new Ws.Server({ port: 8080 });

const connections = [];
const players = [];
const bodies = [];
const KILL_RANGE = 100;

wss.on("connection", function connection(ws) {
  const id = Math.floor(Math.random() * 1000);
  const player = new Player({
    id,
    name: "Pip",
    colour: "green",
    socket: ws,
  });

  // everyone else gets told this player joined
  connections.forEach((ws) =>
    ws.send(JSON.stringify({ type: "JOINED", player: player.getTickData() }))
  );

  // add new player to list of connections and players
  connections.push(ws);
  players.push(player);

  const time = Date.now();
  const playerCount = players.length;
  const playerData = [];
  const alivePlayerData = [];

  // get list of data for player depending on spectating / dead or alive
  players.forEach((player) => {
    const playerTickData = player.getTickData();
    if (player.alive) {
      alivePlayerData.push(playerTickData);
    }
    playerData.push(playerTickData);
  });

  ws.send(
    JSON.stringify({
      type: "LOAD",
      playerCount,
      players: player.alive ? alivePlayerData : playerData,
      bodies,
      time,
    })
  );

  ws.on("message", function incoming(message) {
    const parsed = JSON.parse(message);
    if (parsed.type === "MOVEMENT") {
      switch (parsed.x) {
        case "LEFT":
          player.vx = -15;
          break;
        case "RIGHT":
          player.vx = 15;
          break;
        case "NONE":
          player.vx = 0;
          break;
      }
      switch (parsed.y) {
        case "UP":
          player.vy = -15;
          break;
        case "DOWN":
          player.vy = 15;
          break;
        case "NONE":
          player.vy = 0;
          break;
      }
    } else if (parsed.type === "ATTACK") {
      if (!player.alive) return;
      const closestPlayer = findClosestPlayer(player);
      if (closestPlayer && closestPlayer.distance < KILL_RANGE) {
        console.log(closestPlayer.player.id, "was murdered!");
        closestPlayer.player.alive = false;
        bodies.push(closestPlayer.player.getTickData());
        const deadPlayers = players
          .filter((p) => !p.alive)
          .map((p) => p.getTickData());

        connections.forEach((ws) => {
          const player = players.find((p) => p.socket === ws);
          if (!player) return;

          ws.send(
            JSON.stringify({
              type: "DEAD_BODY",
              player: closestPlayer.player.getTickData(),
            })
          );
          if (!player.alive) {
            ws.send(
              JSON.stringify({
                type: "NEW_GHOST_BUDDY",
                deadPlayers,
              })
            );
          }
        });
      }
    }
  });

  ws.on("close", () => {
    const connIndex = connections.findIndex((arrWs) => arrWs === ws);
    const playersIndex = players.findIndex((players) => players.socket === ws);
    connections.splice(connIndex, 1);
    players.splice(playersIndex, 1);
    // console.debug("exited player: ", player);
    connections.forEach((ws) =>
      ws.send(JSON.stringify({ type: "EXITED", player: player.getTickData() }))
    );
  });
});

const findClosestPlayer = (targetPlayer) => {
  if (players.length <= 1) return null;
  const otherPlayers = players.filter((p) => targetPlayer !== p && p.alive);
  return otherPlayers
    .map((otherPlayer) => ({
      player: otherPlayer,
      distance: findDistanceBetweenPlayers(targetPlayer, otherPlayer),
    }))
    .sort((a, b) => a.distance - b.distance)[0];
};

const findDistanceBetweenPlayers = (playerA, playerB) => {
  const xDiff = playerA.x - playerB.x;
  const yDiff = playerA.y - playerB.y;
  return Math.sqrt(Math.pow(xDiff, 2) + Math.pow(yDiff, 2));
};

setInterval(() => {
  players.forEach((p) => p.doTickUpdate());
  const time = Date.now();
  const playerCount = players.length;
  const playerData = [];
  const alivePlayerData = [];

  players.forEach((player) => {
    const playerTickData = player.getTickData();
    if (player.alive) {
      alivePlayerData.push(playerTickData);
    }
    playerData.push(playerTickData);
  });

  console.debug(playerData, alivePlayerData);

  connections.forEach((ws) => {
    const player = players.find((p) => p.socket === ws);
    if (!player) return;

    ws.send(
      JSON.stringify({
        type: "UPDATE",
        playerCount,
        players: player.alive ? alivePlayerData : playerData,
        time,
      })
    );
  });
}, 50);
