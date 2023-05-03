import React from "react";

import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars } from '@fortawesome/free-solid-svg-icons'

import config from "./config.js";
import { normalizeAngle } from "./util";
import { WSHelper } from "./web.js";
import { DrawRobot } from "./robot";
import { DrawCells, DrawLasers, DrawPaths, DrawParticles, DrawCostmap } from "./canvas";
import { downloadMapFile } from "./map.js";
import { getColor, GridCellCanvas } from "./drawing.js"
import { DriveControlPanel } from "./driveControls";


/*******************
 *     BUTTONS
 *******************/

function StatusMessage(props) {
  var msg = [];
  if(props.robotPose[0] != null){
    msg.push(<p className="robot-info"><i>Robot Pose:</i> (<b>x:</b> {props.robotPose[0]}, <b>y:</b>  {props.robotPose[1]}, <b>t:</b>  {props.robotPose[2]})</p>);
    msg.push(<p className="robot-info"><i>Robot Cell:</i> ({props.robotCell[0]}, {props.robotCell[1]})</p>);
  }
  if (props.clickedCell.length > 0) {
    msg.push(<p className="robot-info"><i>Clicked:</i> Meters [{props.posClickedCell[0]}, {props.posClickedCell[1]}], Cell: [{props.clickedCell[0]}, {props.clickedCell[1]}]</p>);
  }

  return (
    <div className="status-msg">
      {msg}
    </div>
  );
}

function ConnectionStatus(connection) {
  var msg = "Wait";
  var colour = "#ffd300";
  if (connection.status === true) {
    msg = "Connected";
    colour = "#00ff00";
  }
  else if (connection.status === false) {
    msg = "Not Connected";
    colour = "#ff0000";
  }

  return (
    <div className="status" style={{backgroundColor: colour}}>
      {msg}
    </div>
  );
}

function ToggleSelect(props) {
  let sizeCls = "";
  if (props.small) sizeCls = " small";

  return (
    <div className="row my-4 text-left">
      <div className="col-8">
        <span>{props.label}</span>
      </div>
      <div className="col-4 text-right">
        <label className={"switch" + sizeCls}>
          <input type="checkbox" className="mx-2" checked={props.checked}
                 onChange={() => props.onChange()}/>
          <span className={"slider round" + sizeCls}></span>
        </label>
      </div>
    </div>
  );
}

/*******************
 *   WHOLE PAGE
 *******************/

class MBotApp extends React.Component {
  constructor(props) {
    super(props);

    // React state.
    this.state = {
      robotName: "MBOT-OMNI-???",
      connection: false,
      // Map parameters.
      width: 0,
      height: 0,
      origin: [0, 0],
      metersPerCell: 0,
      pixelsPerMeter: 0,
      cellSize: 0,
      mapLoaded: false,
      mapfile: null,
      goalCell: [],
      goalValid: true,
      localMapFileLocation: "current.map",
      // Mode variables.
      slamMode: config.slam_mode.IDLE,
      drivingMode: false,
      sideBarMode: true,
      omni: false,
      diff: false,
      // Robot parameters.
      xPose: 0,
      yPose: 0,
      evtPose: 0,
      posUpdateCount: 0,
      x: config.MAP_DISPLAY_WIDTH / 2,
      y: config.MAP_DISPLAY_WIDTH / 2,
      theta: 0,
      // Visualization elements.
      path: [],
      clickedCell: [],
      posClickedCell: [],
      drawLasers: [],
      drawPaths: [],
      drawCostmap: [],
      drawParticles: [],
      // Flags to display elements.
      laserDisplay: false,
      robotDisplay: true,
      particleDisplay: false,
      costmapDisplay: false,
    };

    this.mapCells = [];

    this.ws = new WSHelper(config.HOST, config.PORT, config.ENDPOINT, config.CONNECT_PERIOD);
    this.ws.statusCallback = (status) => { this.updateSocketStatus(status); };
    this.ws.userOnConnect = (evt) => { this.onWSConnect(evt); };
    this.ws.userHandleMap = (evt) => { this.handleMap(evt); };
    this.ws.handleName = (evt) => { this.handleName(evt); };
    this.ws.handleMapUpdate = (evt) => { this.handleMapUpdate(evt); };
    this.ws.handleLaser = (evt) => { this.handleLasers(evt)};
    this.ws.handlePose = (evt) => { this.handlePoses(evt)};
    this.ws.handlePath = (evt) => { this.handlePaths(evt)}
    this.ws.handleParticle = (evt) => { this.handleParticles(evt)};
    this.ws.handleObstacle = (evt) => { this.handleObstacles(evt)};

    this.visitGrid = new GridCellCanvas();
    this.visitCellsCanvas = React.createRef();
    this.clickCanvas = React.createRef();
    this.mapGrid = new GridCellCanvas();
    this.mapCanvas = React.createRef();

    // Map request interval.
    this.requestInterval = null;
    this.staleMapCount = 0;
  }

  /********************
   *  REACT FUNTIONS
   ********************/

  componentDidMount() {
    this.visitGrid.init(this.visitCellsCanvas.current);
    this.mapGrid.init(this.mapCanvas.current);
    this.handleWindowChange(null);

    // Get the window size and watch for resize events.
    this.rect = this.clickCanvas.current.getBoundingClientRect();
    window.addEventListener('resize', (evt) => this.handleWindowChange(evt));
    window.addEventListener('scroll', (evt) => this.handleWindowChange(evt));

    // Try to connect to the websocket backend.
    this.ws.attemptConnection();

    // Start requesting map.
    this.startRequestInterval()
  }

  onFileChange(event) {
    this.setState({ mapfile: event.target.files[0] });

    const fileSelector = document.querySelector('input[type="file"]');
    const reader = new FileReader()
    reader.onload = () => {
      this.onMapChange(JSON.parse(reader.result));
    }
    reader.readAsText(event.target.files[0])
  }

  onMapChange(map_upload){
    if(map_upload == null) return;
    //Sends a message to the backend to start SLAM in localization mode, with the passes map
    this.ws.socket.emit('reset', {'mode' : 2, 'map': map_upload})
  }

  saveMap() {
    if (this.mapCells.length !== this.state.width * this.state.height) {
      console.log("Error saving map: Invalid map data");
      return;
    }

    let mapData = {"cells": this.mapCells,
                   "width": this.state.width,
                   "height": this.state.height,
                   "origin": this.state.origin,
                   "metersPerCell": this.state.metersPerCell};

    downloadMapFile(mapData);
  }

  onMappingMode() {
    if (this.state.slamMode === config.slam_mode.FULL_SLAM) {
      // If we're in full slam, we need to reset the robot to localization only mode.
      this.ws.socket.emit('reset', {'mode' : config.slam_mode.LOCALIZATION_ONLY, 'retain_pose' : true});

      // Stop asking for map.
      this.stopRequestInterval();

      this.setState({slamMode: config.slam_mode.LOCALIZATION_ONLY});
    }
    else if (this.state.slamMode === config.slam_mode.LOCALIZATION_ONLY) {
      // If we are not mapping, we need to tell the robot to start mapping.
      if (!confirm("This will overwrite the current map. Are you sure?")) return;

      this.resetMapData();
      this.ws.socket.emit('reset', {'mode' : config.slam_mode.FULL_SLAM});

      // Start asking for map.
      this.startRequestInterval();

      this.setState({slamMode: config.slam_mode.FULL_SLAM});
    }
  }

  onLocalizationMode() {
    if (this.state.slamMode === config.slam_mode.IDLE) {
      // State is idle. Change to localization only.
      this.ws.socket.emit('reset', {'mode' : config.slam_mode.LOCALIZATION_ONLY, 'retain_pose' : false});

      // Make sure we are asking for the map. This will stop once we are in IDLE mode.
      this.startRequestInterval();

      this.setState({slamMode: config.slam_mode.LOCALIZATION_ONLY});
    }
    else {
      // We are in some other state. Turn back to idle.
      this.ws.socket.emit('reset', {'mode' : config.slam_mode.IDLE});

      // Stop asking for map.
      this.stopRequestInterval();

      this.setState({slamMode: config.slam_mode.IDLE});
    }
  }

  onResetMap(){
    if (this.state.slamMode === config.slam_mode.FULL_SLAM) {
      // Get user confirmation that the map should be cleared.
      if (!confirm("This will clear the current map. Are you sure?")) return;

      this.resetMapData();
      // Reset in full SLAM mode.
      this.ws.socket.emit('reset', {'mode' : config.slam_mode.FULL_SLAM});
    }
  }

  onDrivingMode() {
    this.setState({drivingMode: !this.state.drivingMode});
  }

  onSideBar(){
    this.setState({sideBarMode: !this.state.sideBarMode})
  }

  onSetPose(){
    console.log("Set pose. Not implemented.");
  }

  /***************************
   *  WINDOW EVENT HANDLERS
   ***************************/

  handleWindowChange(evt) {
    this.rect = this.clickCanvas.current.getBoundingClientRect();
  }

  handleMapClick(event) {
    if (!this.state.mapLoaded) return;
    let plan = true;

    this.rect = this.clickCanvas.current.getBoundingClientRect();

    var x = event.clientX - this.rect.left;
    var y = this.rect.bottom - event.clientY;
    let cs = this.rect.width / this.state.width;
    let col = Math.floor(x / cs);
    let row = Math.floor(y / cs);
    this.setState({clickedCell: [col, row] });
    var cellArr = this.cellToPixels(col, row)
    cellArr = this.pixelsToPos(cellArr[0], cellArr[1]);
    cellArr = [cellArr[0].toPrecision(4), cellArr[1].toPrecision(4)]
    this.setState({posClickedCell: cellArr});
    // Implement check for ctrl-click and whether an a* plan is required
    // if(event.type === "mousedown") plan = true;
    this.onPlan(row, col, plan);
  }

  /********************
   *   WS HANDLERS
   ********************/

  onWSConnect(evt) {
    this.requestMap();
  }

  handleMap(map) {
    // Only update if we are not requesting the map already.
    if (this.requestInterval !== null) this.updateMap(map);
  }

  updateSocketStatus(status) {
    if (this.state.connection !== status) {
      this.setState({connection: status});
    }
  }

  handleName(msg) {
    this.setState({robotName: msg["name"]});
  }

  handlePoses(evt){
    // Sets the robot position
    if (this.state.mapLoaded > 0) {
      // Convert the robot position in meters in the map coordinates to pixels
      // in the canvas coordinates.
      this.setState({posUpdateCount: this.state.posUpdateCount+1})
      if(this.state.posUpdateCount == 5){
        this.setState({poseX: evt.x.toPrecision(4), poseY: evt.y.toPrecision(4), poseTheta: evt.theta.toPrecision(4)});
        this.setState({posUpdateCount: 0})
      }
      var pix = this.posToPixels(evt.x, evt.y);
      this.setRobotPos(pix[0], pix[1], evt.theta);
    }
  }

  handleLasers(evt) {
    // Don't process this laser scan if display is disabled.
    if (!this.state.laserDisplay) return;

    let lidarLength = evt.ranges.length

    let rays = [];
    for(let i = 0; i < lidarLength; i++) {

      // Lasers come in lidar frame (origin same as robot frame but + theta is CW)
      // First tranform into robot frame
      var theta = evt.thetas[i];
      // Convert the ray into pixel coordinates.
      let rayX = evt.ranges[i] * Math.cos(normalizeAngle(theta + this.state.theta)) * this.state.pixelsPerMeter;
      let rayY = evt.ranges[i] * Math.sin(normalizeAngle(theta + this.state.theta)) * this.state.pixelsPerMeter;
      // Shift by the current robot position.
      rayX += this.state.x;
      rayY += this.state.y;
      rays.push([rayX, rayY]);
    }

    this.setState({drawLasers: rays, lidarLength: lidarLength})
  }

  handlePaths(evt) {
    var updated_path = [];

    for(let i = 0; i < evt.path.length; i++) {
      updated_path[i] = this.posToPixels(evt.path[i][0], evt.path[i][1])
    }

    this.setState({displayPaths: updated_path})
  }

  handleParticles(evt){
    // Don't process particles if display is disabled.
    if (!this.state.particleDisplay) return;

    var updated_pixels = [];
    for (let i = 0; i < evt.num_particles; i++) {
      updated_pixels[i] = this.posToPixels(evt.particles[i][0], evt.particles[i][1]);

    }
    this.setState({drawParticles: updated_pixels});
  }

  handleObstacles(evt){
    var updated_path = [];
    for(let i = 0; i < evt.distances.length; i++)
    {
      updated_path[i] = this.cellToPixels(evt.pairs[i][0], evt.pairs[i][1])
    }
    this.setState({drawCostmap: updated_path});
  }

  /**********************
   *   STATE SETTERS
   **********************/

  setRobotPos(x, y, theta = 0) {
    this.setState({x: x, y: y, theta: theta});
  }

  updateMap(result) {
    this.visitGrid.clear();

    // Check if the new cells are in byte form, and if so, convert them.
    var new_cells;
    if (result.cells instanceof ArrayBuffer) new_cells = new Int8Array(result.cells);
    else new_cells = result.cells;

    var loaded = new_cells.length > 0;

    if (loaded) {
      // Update the map grid.
      this.mapGrid.setSize(result.width, result.height);
      this.mapGrid.updateCells(new_cells, this.mapCells, config.MAP_COLOUR_LOW, config.MAP_COLOUR_HIGH);
    }

    this.mapCells = new_cells;

    if (result.slam_mode !== config.slam_mode.FULL_SLAM) {
      // If we are not in mapping mode, stop asking for map.
      this.stopRequestInterval();
    }
    else {
      // If we are in mapping mode, start asking for map.
      this.startRequestInterval();
    }

    this.setState({width: result.width,
                   height: result.height,
                   origin: result.origin,
                   metersPerCell: result.meters_per_cell,
                   cellSize: config.MAP_DISPLAY_WIDTH / result.width,
                   pixelsPerMeter: config.MAP_DISPLAY_WIDTH / (result.width * result.meters_per_cell),
                   mapLoaded: loaded,
                   path: [],
                   goalCell: [],
                   slamMode: result.slam_mode,
                   localMapFileLocation: result.slam_map_location});
  }

  resetMapData() {
    this.mapGrid.clear();
    this.mapCells = [];

    this.setState({
      width: 0,
      height: 0,
      origin: [0, 0],
      metersPerCell: 0,
      pixelsPerMeter: 0,
      cellSize: 0,
      mapLoaded: false,
      mapfile: null,
      goalCell: [],
      goalValid: true
    });
  }

  changeOmni() {
    this.setState({omni: !this.state.omni});
  }

  changeDiff() {
    this.setState({diff: !this.state.diff});
    if(this.state.omni && !this.state.diff) {
      this.setState({omni: !this.state.omni});
    }
  }

  changeRobot(){
    this.setState({robotDisplay: !this.state.robotDisplay})
  }

  changeLasers(){
    this.setState({laserDisplay: !this.state.laserDisplay})
  }

  changeParticles(){
    this.setState({particleDisplay: !this.state.particleDisplay})
  }

  changeCostMap(){
    this.setState({costmapDisplay: !this.state.costmapDisplay})
  }

  onGoalClear() {
    this.setState({clickedCell: [],
                   goalCell: []});
  }

  setGoal(goal) {
    if (goal.length === 0) return false;

    var idx = goal[1] + goal[0] * this.state.width;
    var valid = this.mapCells[idx] < 0;

    this.setState({goalCell: goal, goalValid: valid});

    return valid;
  }

  /**********************
   *   OTHER FUNCTIONS
   **********************/

  onPlan(row, col, plan) {
    if (!this.setGoal([row, col])) return;
    // Clear visted canvas
    this.visitGrid.clear();
    var start_cell = this.pixelsToCell(this.state.x, this.state.y);
    var plan_data = {type: "plan",
                    data: {
                       goal: [row, col],
                       plan: plan
                     }
                   };
    this.ws.socket.emit("plan", {goal: [row, col], plan: plan})
  }

  startRequestInterval() {
    if (this.requestInterval !== null)  return;
    this.staleMapCount = 0;
    this.requestInterval = setInterval(() => {
      this.requestMap();
    }, config.MAP_UPDATE_PERIOD);
  }

  stopRequestInterval() {
    if (this.requestInterval === null)  return;
    clearInterval(this.requestInterval);
    this.requestInterval = null;
    this.staleMapCount = 0;
  }

  requestMap() {
    if (!this.ws.status()) return;
    this.ws.socket.emit('request_map', (response) => {
      // If we got an empty dictionary, there was no map to send.
      if (Object.keys(response).length === 0) {
        this.staleMapCount++;
        if (this.staleMapCount > config.STALE_MAP_COUNT) {
          console.log("Map is stale!");
          this.resetMapData();
          this.staleMapCount = 0;
          // Set back to idle mode since data is not being received.
          this.setState({slamMode: config.slam_mode.IDLE});
        }
        return;
      }
      // Update the map data.
      this.updateMap(response);
      this.staleMapCount = 0;

      if (this.state.slamMode === config.slam_mode.LOCALIZATION_ONLY)
      {
        // If we are in localization only mode, the first map is all we need.
        this.stopRequestInterval();
      }
    });
  }

  posToPixels(x, y) {
    var u = (x - this.state.origin[0]) * this.state.pixelsPerMeter;
    var v = (y - this.state.origin[1]) * this.state.pixelsPerMeter;
    return [u, v];
  }

  pixelsToPos(u, v){
    var x = (u/this.state.pixelsPerMeter)+this.state.origin[0];
    var y = (v/this.state.pixelsPerMeter)+this.state.origin[1];
    return [x, y]
  }

  cellToPixels(r, c) {
    var u = (r * this.state.cellSize);
    var v = (c * this.state.cellSize);
    return [u, v];
  }

  pixelsToCell(u, v) {
    var row = Math.floor(u / this.state.cellSize);
    var col = Math.floor(v / this.state.cellSize);
    return [row, col];
  }

  render() {
    let sidebarClasses = "";
    if (!this.state.sideBarMode) {
      sidebarClasses += "inactive";
    }

    return (
      <div id="wrapper">
        <div id="main">

          <div id="canvas-container" ref={this.canvasWrapperRef}>
            <TransformWrapper>
              <TransformComponent>
                <div id="canvas-wrapper">
                  <canvas id="mapCanvas" ref={this.mapCanvas} width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_HEIGHT}>
                  </canvas>
                  <canvas ref={this.visitCellsCanvas} width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_HEIGHT}>
                  </canvas>
                  <DrawPaths xPos = {this.state.x} yPos = {this.state.y} path =  {this.state.displayPaths}/>
                  {/* {this.state.costmapDisplay &&
                    <DrawCostmap cells = {this.state.drawCostmap} state = {this.state.costmapDisplay}/>} */}
                  {this.state.particleDisplay &&
                    <DrawParticles particles = {this.state.drawParticles}/>}
                  {this.state.laserDisplay &&
                    <DrawLasers width={this.state.width} height={this.state.height}
                                drawLasers={this.state.drawLasers} origin={[this.state.x, this.state.y]}/>}
                  {this.state.robotDisplay &&
                    <DrawRobot x={this.state.x} y={this.state.y} theta={this.state.theta}
                               pixelsPerMeter={this.state.pixelsPerMeter} />}

                  <DrawCells loaded={this.state.mapLoaded} path={this.state.path} clickedCell={this.state.clickedCell}
                             goalCell={this.state.goalCell} goalValid={this.state.goalValid}
                             cellSize={this.state.cellSize} />

                  <canvas ref={this.clickCanvas} width={config.MAP_DISPLAY_WIDTH} height={config.MAP_DISPLAY_HEIGHT}
                          onClick={(e) => this.handleMapClick(e)}
                          onScroll={() => this.handleZoom()}>
                  </canvas>
                </div>
              </TransformComponent>
            </TransformWrapper>

          </div>
        </div>

        <div id="sidenav" className={sidebarClasses}>
          <div id="toggle-nav" onClick={() => this.onSideBar()}><FontAwesomeIcon icon={faBars} /></div>
          <div className="inner">
          <div className="title">
            {this.state.robotName}
          </div>
            <div className="status-wrapper">
              <ConnectionStatus status={this.state.connection}/>
              <StatusMessage robotCell={this.pixelsToCell(this.state.x, this.state.y)} 
                             robotPose={[this.state.poseX, this.state.poseY, this.state.poseTheta]} 
                             posClickedCell={this.state.posClickedCell} clickedCell={this.state.clickedCell} />
            </div>

            <div className="row">
              <div className="col">
                <ToggleSelect label={"Localization Mode"} checked={this.state.slamMode !== config.slam_mode.IDLE}
                              onChange={ () => this.onLocalizationMode() }/>

                  {/* TODO: Implement intial pose branch into code*/}
                  {/* {<button className="button start-color2" onClick={() => this.onSetPose()}>Set Inital Pose</button>} */}
                  {this.state.slamMode !== config.slam_mode.IDLE &&
                    <div className="subpanel">
                      <ToggleSelect label={"Mapping Mode"} checked={this.state.slamMode === config.slam_mode.FULL_SLAM}
                                    onChange={ () => this.onMappingMode() } small={true} />
                      <div className="button-wrapper-col">
                        <button className={"button" + (this.state.slamMode !== config.slam_mode.FULL_SLAM ? " inactive" : "")}
                                onClick={() => this.onResetMap()}>Reset Map</button>
                        <button className="button" onClick={() => this.saveMap()}>Download Map</button>
                      </div>
                    </div>
                  }

                {/* {<label htmlFor="file-upload" className="button upload-color mb-3">
                    Upload a Map
                  </label>
                  <input id="file-upload" type="file" onChange = {(event) => this.onFileChange(event)}/>} */}
                { /* Checkboxes for map visualization. */}
                <ToggleSelect label={"Draw Particles"} checked={this.state.particleDisplay}
                              onChange={ () => this.changeParticles() }/>
                <ToggleSelect label={"Draw Robot"} checked={this.state.robotDisplay}
                              onChange={ () => this.changeRobot() }/>
                {// Remove temporarily since backend doesn't publish this.
                /* <ToggleSelect label={"Draw Costmap"} checked={this.state.costmapDisplay}
                                 onChange={ () => this.changeCostMap() }/> */ }
                <ToggleSelect label={"Draw Lasers"} checked={this.state.laserDisplay}
                              onChange={ () => this.changeLasers() }/>

                { /* Drive mode and control panel. */}
                <ToggleSelect label={"Drive Mode"} checked={this.state.drivingMode}
                              onChange={ () => this.onDrivingMode() }/>
                {this.state.drivingMode &&
                  <DriveControlPanel ws={this.ws} drivingMode={this.state.drivingMode} />
                }

              </div>
            </div>
          </div>
        </div>
    </div>
    );
  }
}

export default MBotApp;
