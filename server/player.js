class Player {
  id;
  x;
  y;
  vx;
  vy;
  colour;
  name;
  alive;
  socket;

  constructor({ id, name, colour, socket }) {
    this.id = id;
    this.name = name;
    this.colour = colour;
    this.x = 200;
    this.y = 300;
    this.vx = 0;
    this.vy = 0;
    this.alive = true;
    this.socket = socket;
  }

  doTickUpdate() {
    this.x = this.x + this.vx < 100 ? 100 : this.x + this.vx;
    this.y = this.y + this.vy < 100 ? 100 : this.y + this.vy;
  }

  getTickData() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      alive: this.alive,
    };
  }
}

module.exports = Player;
