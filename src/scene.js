import { Container, Graphics, Application, Assets, Sprite, Point } from 'pixi.js';

import config from "./config.js";

 function colourStringToRGB(colour_str) {
  var rgb = [parseInt(colour_str.substring(1, 3), 16),
             parseInt(colour_str.substring(3, 5), 16),
             parseInt(colour_str.substring(5, 7), 16)];
  return rgb;
}

function getColor(prob, colour_low, colour_high) {
  // Takes a probability (number from 0 to 1) and converts it into a color code
  var colour_low_a = colourStringToRGB(colour_low);
  var colour_high_a = colourStringToRGB(colour_high);

  var hex = function(x) {
    x = x.toString(16);
    return (x.length == 1) ? '0' + x : x;
  };

  var r = Math.ceil(colour_high_a[0] * prob + colour_low_a[0] * (1 - prob));
  var g = Math.ceil(colour_high_a[1] * prob + colour_low_a[1] * (1 - prob));
  var b = Math.ceil(colour_high_a[2] * prob + colour_low_a[2] * (1 - prob));

  var color = hex(r) + hex(g) + hex(b);
  return "#" + color;
}


class MBotScene {
  constructor() {
    // super(props);
    this.app = null;

    this.robotState = {x: 0, y: 0, theta: 0};
    // Map data.
    this.width = 0;
    this.height = 0;
    this.metersPerCell = 0.05;
    this.pixWidth = config.CANVAS_DISPLAY_WIDTH;
    this.pixHeight = config.CANVAS_DISPLAY_HEIGHT;
    this.pixPerCell = 5;
    this.pixelsPerMeter = this.pixPerCell / this.metersPerCell;
    this.mapCells = [];

    this.dragStart = null;
  }

  async init() {
    this.app = new Application();
    await this.app.init({resizeTo: window, backgroundColor: 0xc9d1d9 });

    this.robotImage = await Assets.load('/src/images/mbot.png');
  }

  createScene(ele) {
    this.app.resizeTo = ele;
    ele.appendChild(this.app.canvas);

    this.sceneContainer = new Container();
    this.app.stage.addChild(this.sceneContainer);
    // document.body.appendChild(app.canvas);

    this.gridGraphics = new Graphics();
    this.gridGraphics.width = this.pixWidth;
    this.gridGraphics.height = this.pixHeight;
    this.gridGraphics.rect(0, 0, this.pixWidth, this.pixHeight)
                     .fill(getColor(0.5, config.MAP_COLOUR_LOW, config.MAP_COLOUR_HIGH));
    this.sceneContainer.addChild(this.gridGraphics);

    // Empty graphics to draw particles.
    this.particlesGraphics = new Graphics();
    this.sceneContainer.addChild(this.particlesGraphics);

    // Empty graphics to draw path.
    this.pathGraphics = new Graphics();
    this.sceneContainer.addChild(this.pathGraphics);

    this.robotContainer = new Container();

    this.laserGraphics = new Graphics();
    this.robotContainer.addChild(this.laserGraphics);

    this.robot = new Sprite(this.robotImage);
    this.robot.anchor.set(0.5);
    // Move the sprite to the center of the screen
    this.robotContainer.x = this.pixWidth / 2;
    this.robotContainer.y = this.pixHeight / 2;
    this.robot.x = 0;
    this.robot.y = 0;
    this.robot.width = config.ROBOT_SIZE * this.pixelsPerMeter;
    this.robot.height = config.ROBOT_SIZE * this.pixelsPerMeter;
    this.robotContainer.addChild(this.robot);

    this.sceneContainer.addChild(this.robotContainer);

    // Interaction code for panning
    this.dragStart = null;
    this.sceneContainer.interactive = true;
    this.sceneContainer.on('pointerdown', (event) => {
        this.dragStart = event.data.getLocalPosition(this.sceneContainer.parent);
        // this.sceneContainer.alpha = 0.8;
    });

    this.sceneContainer.on('pointerup', (event) => {
      this.dragStart = null;
      this.constrainSceneContainer();
    });

    this.sceneContainer.on('pointerupoutside', (event) => {
      this.dragStart = null;
      // this.sceneContainer.alpha = 1;
      this.constrainSceneContainer();
    });

    this.sceneContainer.on('pointermove', (event) => {
        if (this.dragStart) {
            const dragEnd = event.data.getLocalPosition(this.sceneContainer.parent);
            const dragNew = {
                x: dragEnd.x - this.dragStart.x,
                y: dragEnd.y - this.dragStart.y,
            };

            this.sceneContainer.x += dragNew.x;
            this.sceneContainer.y += dragNew.y;
            this.dragStart = dragEnd;
        }
    });

    // Interaction code for zooming
    this.app.canvas.addEventListener('wheel', (event) => { this.zoomHandler(event); });
  }

  zoomHandler(event) {
    event.preventDefault();
    const scaleFactor = 1.1;
    let globalPos = this.sceneContainer.toLocal(new Point(event.x, event.y));
    // The farthest out you can scale (assuming that the grid is square).
    let minScale = Math.min(this.app.canvas.width, this.app.canvas.height) / (this.pixWidth);
    const direction = event.deltaY > 0 ? -1 : 1; // Negative if scrolling up, positive if down
    const scale = Math.pow(scaleFactor, direction);
    let scaleX = this.sceneContainer.scale.x * scale;
    let scaleY = this.sceneContainer.scale.y * scale;

    if (scaleX > minScale && scaleY > minScale) {
        // Zoom
        this.sceneContainer.scale.set(scaleX); // x = scaleX;
        this.sceneContainer.pivot.x = globalPos.x;
        this.sceneContainer.pivot.y = globalPos.y;
        this.sceneContainer.position.set(event.x, event.y);
    }
    else {
      // Don't zoom out more than the size of the screen.
        this.sceneContainer.scale.set(minScale);
        this.sceneContainer.position.set(0, 0);
        this.sceneContainer.pivot.x = 0;
        this.sceneContainer.pivot.y = 0;
    }

    this.constrainSceneContainer();
  }

  constrainSceneContainer() {
    // Don't let the scene container go out of the view more than it needs to.
    let pt0 = this.sceneContainer.toLocal(new Point(0, 0));
    let pt1 = this.sceneContainer.toLocal(new Point(this.app.canvas.width, this.app.canvas.height));
    if (pt0.x < 0) {
      this.sceneContainer.pivot.x = 0;
      this.sceneContainer.x = 0;
    }
    else if (pt1.x > this.pixWidth) {
      let new_x = this.sceneContainer.x + this.sceneContainer.scale.x * (pt1.x - this.pixWidth);
      if (this.pixWidth * this.sceneContainer.scale.x < this.app.canvas.width) {
        // If the scene is smaller than the screen, don't snap to the far side.
        this.sceneContainer.pivot.x = 0;
        new_x = Math.min(new_x, 0);
      }
      this.sceneContainer.x = new_x;
    }
    if (pt0.y < 0) {
      this.sceneContainer.pivot.y = 0;
      this.sceneContainer.y = 0;
    }
    else if (pt1.y > this.pixHeight) {
      let new_y = this.sceneContainer.y + this.sceneContainer.scale.x * (pt1.y - this.pixHeight);
      if (this.pixHeight * this.sceneContainer.scale.x < this.app.canvas.height) {
        // If the scene is smaller than the screen, don't snap to the bottom.
        this.sceneContainer.pivot.y = 0;
        new_y = Math.min(new_y, 0);
      }
      this.sceneContainer.y = new_y;
    }
  }

  setMapHeaderData(width, height, m_per_cell = 0.05, origin = [0, 0]) {
    this.width = width;
    this.height = height;
    this.metersPerCell = m_per_cell;
    this.pixPerCell = this.pixWidth / this.width;
    this.pixelsPerMeter = this.pixWidth / this.width / m_per_cell;
    this.origin = origin;

    this.robot.width = config.ROBOT_SIZE * this.pixelsPerMeter;
    this.robot.height = config.ROBOT_SIZE * this.pixelsPerMeter;
  }

  getMapData() {
    if (this.mapCells.length !== this.width * this.height) {
      return;
    }

    let mapData = {"cells": this.mapCells,
                   "width": this.width,
                   "height": this.height,
                   "origin": this.origin,
                   "metersPerCell": this.metersPerCell};
    return mapData;
  }

  posToPixels(x, y) {
    var u = (x - this.origin[0]) * this.pixelsPerMeter;
    var v = this.pixHeight - (y - this.origin[1]) * this.pixelsPerMeter;
    return [u, v];
  }

  pixelsToPos(u, v){
    var x = (u/this.pixelsPerMeter)+this.origin[0];
    var y = this.pixHeight - (v/this.pixelsPerMeter)-this.origin[1];
    return [x, y]
  }

  cellToPixels(r, c) {
    var v = ((this.height - r - 1) * this.pixPerCell);
    var u = (c * this.pixPerCell);
    return [u, v];
  }

  pixelsToCell(u, v) {
    var row = Math.floor(u / this.pixPerCell);
    var col = Math.floor(v / this.pixPerCell);
    return [row, col];
  }

  posToCell(x, y) {
    let i = Math.floor((x - this.origin[0]) / this.metersPerCell);
    let j = Math.floor((y - this.origin[1]) / this.metersPerCell);
    return [j, i];
  }

  cellToIdx(r, c) {
    return c + r * this.width;
  }

  idxToCell(idx) {
    var r = Math.floor(idx / this.width);
    var c = idx % this.width;
    return [r, c];
  }

  clear() {
    this.gridGraphics.clear();
    this.gridGraphics.rect(0, 0, this.pixWidth, this.pixHeight)
                     .fill(getColor(0.5, config.MAP_COLOUR_LOW, config.MAP_COLOUR_HIGH));

    this.pathGraphics.clear();
    this.particlesGraphics.clear();

    this.mapCells = [];
  }

  updateRobot(x, y, theta = 0) {
    let pix = this.posToPixels(x, y);
    this.robotContainer.x = pix[0];
    this.robotContainer.y = pix[1];
    this.robotContainer.rotation = -theta;

    this.robotState.x = x;
    this.robotState.y = y;
    this.robotState.theta = theta;
  }

  toggleRobotView() {
    this.robot.visible = !this.robot.visible;
  }

  drawCells(cells, colour_low=config.MAP_COLOUR_LOW, colour_high=config.MAP_COLOUR_HIGH, alpha="ff") {
    if (cells.length !== this.width * this.height) {
      console.warn("Error. Cannot render canvas: " + String(cells.length) + " != " + String(this.width*this.height));
      return;
    }

    this.clear();

    for (let c = 0; c < this.width; c++) {
      for (let r = 0; r < this.height; r++) {
        // Skip any cells that already the colour of the background.
        if (cells[this.cellToIdx(r, c)] == 0) continue;

        let prob = (cells[this.cellToIdx(r, c)] + 127.) / 255.;
        let color = getColor(prob, colour_low, colour_high);

        let pos = this.cellToPixels(r, c);
        this.gridGraphics.rect(pos[0], pos[1], this.pixPerCell, this.pixPerCell).fill(color, alpha);
      }
    }

    this.mapCells = cells;
  }

  updateCells(cells, colour_low=config.MAP_COLOUR_LOW, colour_high=config.MAP_COLOUR_HIGH, alpha="ff") {
    if (cells.length !== this.width * this.height) {
      console.warn("Error. Cannot render canvas: " + String(cells.length) + " != " + String(this.width*this.height));
      return;
    }

    if (cells.length !== this.mapCells.length) {
      console.log("Redrawing from scratch");
      this.drawCells(cells, colour_low, colour_high, alpha);
      return;
    }

    for (let c = 0; c < this.width; c++) {
      for (let r = 0; r < this.height; r++) {
        let idx = this.cellToIdx(r, c);
        if (cells[idx] != this.mapCells[idx]){
          let prob = (cells[idx] + 127.) / 255.;
          let color = getColor(prob, colour_low, colour_high);
          let pos = this.cellToPixels(r, c);
          this.gridGraphics.rect(pos[0], pos[1], this.pixPerCell, this.pixPerCell).fill(color);
        }
      }
    }

    this.mapCells = cells;
  }

  drawLasers(ranges, thetas, color = "green", line_width = 1) {
    this.laserGraphics.clear();
    this.laserGraphics.beginPath();
    for (var i = 0; i < ranges.length; i++) {
      this.laserGraphics.moveTo(0, 0);
      let rayX = ranges[i] * Math.cos(thetas[i]) * this.pixelsPerMeter;
      let rayY = -ranges[i] * Math.sin(thetas[i]) * this.pixelsPerMeter;
      this.laserGraphics.lineTo(rayX, rayY);
    }

    this.laserGraphics.stroke({ width: line_width, color: color });
  }

  clearLasers() {
    this.laserGraphics.clear();
  }

  drawPath(path, color = "rgb(255, 25, 25)", line_width = 2) {
    this.pathGraphics.clear();
    this.pathGraphics.beginPath();
    let current = this.posToPixels(path[0][0], path[0][1]);
    this.pathGraphics.moveTo(current[0], current[1]);
    for(let i = 1; i < path.length; i++) {
      // Draws a line between the points
      current = this.posToPixels(path[i][0], path[i][1]);
      this.pathGraphics.lineTo(current[0], current[1]);
    }
    this.pathGraphics.stroke({ width: line_width, color: color });
  }

  clearPath() {
    this.pathGraphics.clear();
  }

  drawParticles(particles, color = 0xff0000, size = 1){
    this.particlesGraphics.clear();
    for (let i = 0; i < particles.length; i++) {
      let pt = this.posToPixels(particles[i][0], particles[i][1])
      this.particlesGraphics.circle(pt[0], pt[1], size * this.pixPerCell).fill(color)
    }
  }

  clearParticles() {
    this.particlesGraphics.clear();
  }
}

export { colourStringToRGB, getColor, MBotScene };
