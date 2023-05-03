import React from "react";

import config from "./config.js";
import { GridCellCanvas } from "./drawing.js"

/*******************
 *     CANVAS
 *******************/

 class DrawMap extends React.Component {
  constructor(props) {
    super(props);

    this.mapGrid = new GridCellCanvas();
    this.mapCanvas = React.createRef();
  }

  componentDidMount() {
    this.mapGrid.init(this.mapCanvas.current);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return nextProps.cells !== this.props.cells;
  }

  componentDidUpdate() {
    this.mapGrid.setSize(this.props.width, this.props.height);
    this.mapGrid.drawCells(this.props.cells, this.props.prev_cells, config.MAP_COLOUR_LOW, config.MAP_COLOUR_HIGH);
  }

  render() {
    return (
      <canvas id="mapCanvas" ref={this.mapCanvas} width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_HEIGHT}>
      </canvas>
    );
  }
}

class DrawCells extends React.Component {
  constructor(props) {
    super(props);

    this.pathUpdated = true;
    this.clickedUpdated = true;
    this.goalUpdated = true;

    this.cellGrid = new GridCellCanvas();
    this.cellsCanvas = React.createRef();
  }

  componentDidMount() {
    this.cellGrid.init(this.cellsCanvas.current);
  }

  drawPath() {
    for (var i in this.props.path) {
      this.cellGrid.drawCell(this.props.path[i], config.PATH_COLOUR, this.props.cellSize);
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    this.pathUpdated = nextProps.path !== this.props.path;
    this.clickedUpdated = nextProps.clickedCell !== this.props.clickedCell;
    this.goalUpdated = nextProps.goalCell !== this.props.goalCell;

    if (this.clickedUpdated && this.props.clickedCell.length > 0) {
      this.cellGrid.clearCell(this.props.clickedCell, this.props.cellSize)
    }
    if (this.goalUpdated && this.props.goalCell.length > 0) {
      this.cellGrid.clearCell(this.props.goalCell, this.props.cellSize)
    }

    return (this.pathUpdated || this.clickedUpdated || this.goalUpdated);
  }

  componentDidUpdate() {
    // The first time the visited cells are null, the map was reset. Clear the
    // canvas. Make sure this is only done once using this.clear.
    this.cellGrid.clear();

    // If the map has been loaded, we can draw the cells.
    if (this.props.loaded) {
      // Draw the found path.
      if (this.pathUpdated) {
        this.drawPath();
      }

      // If there's a goal cell, clear it in case it was clicked then draw it.
      if (this.props.goalCell.length > 0) {
        this.cellGrid.clearCell(this.props.goalCell, this.props.cellSize);
        var colour = this.props.goalValid ? config.GOAL_CELL_COLOUR : config.BAD_GOAL_COLOUR;
        this.cellGrid.drawCell(this.props.goalCell,
                               colour, this.props.cellSize);
      }
    }
  }

  render() {
    return (
      <canvas ref={this.cellsCanvas} width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_HEIGHT}>
      </canvas>
    );
  }
}

class DrawLasers extends React.Component {
  constructor(props) {
    super(props);

    this.laserGrid = new GridCellCanvas();
    this.laserCanvas = React.createRef();
  }

  componentDidMount() {
    this.laserGrid.init(this.laserCanvas.current);
  }

  componentDidUpdate(){
    this.laserGrid.setSize(this.props.width, this.props.height);
    // Clear all the lines on the grid from before.
    this.laserGrid.clear();

    // Checks if the Laser mode is engaged
    this.laserGrid.drawLinesFromOrigin(this.props.origin, this.props.drawLasers, 'green');

  }

  render(){
    return(
      <canvas id="mapLasers" ref={this.laserCanvas} width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_HEIGHT}>
      </canvas>
    );
  }
}

class DrawPaths extends React.Component {
  constructor(props) {
    super(props);

    this.pathGrid = new GridCellCanvas();
    this.pathCanvas = React.createRef();
  }

  componentDidMount() {
    this.pathGrid.init(this.pathCanvas.current);
  }

  shouldComponentUpdate(nextProps, nextState){
    if (this.props.path == null) return false;
    return true;
  }

  componentDidUpdate(){
    this.pathGrid.setSize(this.props.width, this.props.height);
    this.pathGrid.clear();
    this.pathGrid.drawPath(this.props.path)
  }

  render(){
    return(
      <canvas id="mapLine" ref={this.pathCanvas} width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_HEIGHT}>
      </canvas>
    );
  }
}

class DrawParticles extends React.Component {
  constructor(props) {
    super(props);

    this.particleGrid = new GridCellCanvas();
    this.particleCanvas = React.createRef();
  }

  componentDidMount() {
    this.particleGrid.init(this.particleCanvas.current);
  }

  componentDidUpdate(){
    this.particleGrid.setSize(this.props.width, this.props.height);
    this.particleGrid.clear();
    this.particleGrid.drawParticles(this.props.particles)
  }

  render(){
    return(
      <canvas id="mapParticles" ref={this.particleCanvas} width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_HEIGHT}>
      </canvas>
    );
  }
}

class DrawCostmap extends React.Component {
  constructor(props) {
    super(props);
    this.costmapGrid = new GridCellCanvas();
    this.costmapCanvas = React.createRef();
  }

  componentDidMount() {
    this.costmapGrid.init(this.costmapCanvas.current);
  }

  componentDidUpdate(){
    // if(this.props.state) {
      this.costmapGrid.setSize(this.props.width, this.props.height);
      this.costmapGrid.clear();
      this.costmapGrid.drawCostMap(this.props.cells)
    // }
  }

  render(){
    return(
      <canvas id="mapcostMaps" ref={this.costmapCanvas} width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_HEIGHT}>
      </canvas>
    );
  }
}

export { DrawMap, DrawCells, DrawLasers, DrawPaths, DrawParticles, DrawCostmap };
