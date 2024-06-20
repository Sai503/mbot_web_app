import React from "react";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars, faCircleInfo } from '@fortawesome/free-solid-svg-icons'

import config from "./config.js";
import { WSHelper } from "./web.js";
import { downloadMapFile } from "./map.js";
import { DriveControlPanel } from "./driveControls";


/*******************
 *     BUTTONS
 *******************/

function StatusMessage(props) {
  let msg = [];
  if(props.robotPose != null){
    msg.push(
      <p className="robot-info" key="robotInfoPose">
        <i>Robot Pose:</i> (
          <b>x:</b> {props.robotPose.x.toFixed(3)},&nbsp;
          <b>y:</b> {props.robotPose.y.toFixed(3)},&nbsp;
          <b>t:</b> {props.robotPose.theta.toFixed(3)})
      </p>
    );
    msg.push(
      <p className="robot-info" key="robotInfoCell">
        <i>Robot Cell:</i> ({props.robotCell[0]}, {props.robotCell[1]})
      </p>
  );
  }
  if (props.clickedCell.length > 0) {
    msg.push(
      <p className="robot-info" key="robotInfoClicked">
        <i>Clicked:</i>&nbsp;
        <b>x:</b> {props.posClickedCell[0].toFixed(3)},&nbsp;
        <b>y:</b> {props.posClickedCell[1].toFixed(3)},&nbsp;
        Cell: [{props.clickedCell[1]}, {props.clickedCell[0]}]
      </p>
    );
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
    <div className="toggle-wrapper">
      <div className="row">
        <div className="col-7">
          <span>{props.label}</span>
        </div>
        <div className="col-1 info">
          <div className="info-icon">
            <FontAwesomeIcon icon={faCircleInfo} size="xs" />
          </div>
        </div>
        <span className="explain">
          {props.explain}
        </span>
        <div className="col-4 text-right toggle">
          <label className={"switch" + sizeCls}>
            <input type="checkbox" className="mx-2" checked={props.checked}
                  onChange={() => props.onChange()}/>
            <span className={"slider round" + sizeCls}></span>
          </label>
        </div>
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
      robotName: "MBOT-???",
      connection: false,
      // Map parameters.
      mapLoaded: false,
      mapfile: null,
      goalCell: [],
      goalValid: true,
      // Mode variables.
      slamMode: config.slam_mode.IDLE,
      drivingMode: false,
      sideBarMode: true,
      omni: false,
      diff: false,
      // Robot parameters.
      robotPose: {x: 0, y: 0, theta: 0},
      robotCell: [0, 0],
      // Visualization elements.
      clickedCell: [],
      posClickedCell: [],
      // Flags to display elements.
      laserDisplay: false,
      robotDisplay: true,
      particleDisplay: false,
      costmapDisplay: false,
    };

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
    this.ws.handleSLAMStatus = (evt) => { this.handleSLAMStatus(evt)};
    this.ws.handleObstacle = (evt) => { this.handleObstacles(evt)};

    this.canvasWrapperRef = React.createRef();
    this.scene = props.scene;

    // Map request interval.
    this.requestInterval = null;
    this.staleMapCount = 0;
  }

  /********************
   *  REACT FUNTIONS
   ********************/

  componentDidMount() {
    this.scene.createScene(this.canvasWrapperRef.current);
    this.scene.clickCallback = (u, v) => this.handleMapClick(u, v);

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
    const mapData = this.scene.getMapData();

    if (mapData === null) {
      console.log("Error saving map: Invalid map data");
      return;
    }

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

  handleMapClick(u, v) {
    if (!this.state.mapLoaded) return;

    let pos = this.scene.pixelsToPos(u, v);
    let cell = this.scene.pixelsToCell(u, v);

    this.setState({clickedCell: cell, posClickedCell: pos });
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
      this.scene.updateRobot(evt.x, evt.y, evt.theta);
      const robotCell = this.scene.posToCell(evt.x, evt.y);
      this.setState({robotPose: {x: evt.x, y: evt.y, theta: evt.theta},
                     robotCell: robotCell});
    }
  }

  handleLasers(evt) {
    // Don't process this laser scan if display is disabled.
    if (!this.state.laserDisplay) return;

    this.scene.drawLasers(evt.ranges, evt.thetas);
  }

  handlePaths(evt) {
    this.scene.drawPath(evt.path);
  }

  handleParticles(evt){
    // Don't process particles if display is disabled.
    if (!this.state.particleDisplay) return;

    this.scene.drawParticles(evt.particles);
  }

  handleSLAMStatus(evt){
    // Only update if the mode has changed.
    if (evt.slam_mode !== this.state.slamMode) {
      if (evt.slam_mode !== config.slam_mode.FULL_SLAM) {
        // If we are not in mapping mode, stop asking for map.
        this.stopRequestInterval();
      }
      else {
        // If we are in mapping mode, start asking for map.
        this.startRequestInterval();
      }

      this.setState({slamMode: evt.slam_mode,
                     mapfile: evt.map_path});
    }
  }

  handleObstacles(evt){
    // TODO: Add this functionality.
    // var updated_path = [];
    // for(let i = 0; i < evt.distances.length; i++)
    // {
    //   updated_path[i] = this.cellToPixels(evt.pairs[i][0], evt.pairs[i][1])
    // }
    // this.setState({drawCostmap: updated_path});
  }

  /**********************
   *   STATE SETTERS
   **********************/

  updateMap(result) {
    // Check if the new cells are in byte form, and if so, convert them.
    let new_cells;
    if (result.cells instanceof ArrayBuffer) new_cells = new Int8Array(result.cells);
    else new_cells = result.cells;

    let loaded = new_cells.length > 0;
    let pixPerMeter = config.MAP_DISPLAY_WIDTH / (result.width * result.meters_per_cell);

    if (loaded) {
      // Update the map grid.
      this.scene.setMapHeaderData(result.width, result.height, result.meters_per_cell, result.origin);
      this.scene.updateCells(new_cells);
    }

    if (loaded != this.state.mapLoaded) {
      this.setState({ mapLoaded: loaded });
    }
  }

  resetMapData() {
    this.scene.clear();

    this.setState({
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
    this.scene.toggleRobotView();
    this.setState({robotDisplay: !this.state.robotDisplay})
  }

  changeLasers(){
    // If we are currently drawing the lasers, clear them.
    if (this.state.laserDisplay) this.scene.clearLasers();

    this.setState({laserDisplay: !this.state.laserDisplay})
  }

  changeParticles(){
    // If we are currently drawing the lasers, clear them.
    if (this.state.particleDisplay) this.scene.clearParticles();

    this.setState({particleDisplay: !this.state.particleDisplay})
  }

  changeCostMap(){
    this.setState({costmapDisplay: !this.state.costmapDisplay})
  }

  onGoalClear() {
    this.setState({clickedCell: [],
                   goalCell: []});
  }

  /**********************
   *   OTHER FUNCTIONS
   **********************/

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

  render() {
    let sidebarClasses = "";
    if (!this.state.sideBarMode) {
      sidebarClasses += "inactive";
    }

    return (
      <div id="wrapper">
        <div id="main">
          <div id="canvas-container" ref={this.canvasWrapperRef}>
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
              <StatusMessage robotCell={this.state.robotCell}
                              robotPose={this.state.robotPose}
                              posClickedCell={this.state.posClickedCell} clickedCell={this.state.clickedCell} />
            </div>

            <div className="row">
              <ToggleSelect label={"Localization Mode"} explain={"Toggles localization mode and displays map."}
                            checked={this.state.slamMode !== config.slam_mode.IDLE}
                            onChange={ () => this.onLocalizationMode() }/>
                {this.state.slamMode !== config.slam_mode.IDLE &&
                  <div className="subpanel">
                    <ToggleSelect label={"Mapping Mode"} checked={this.state.slamMode === config.slam_mode.FULL_SLAM}
                                  explain={"Toggles mapping mode on the robot."}
                                  onChange={ () => this.onMappingMode() } small={true} />
                    <div className="button-wrapper-col">
                      <button className={"button" + (this.state.slamMode !== config.slam_mode.FULL_SLAM ? " inactive" : "")}
                              onClick={() => this.onResetMap()}>Reset Map</button>
                      <button className="button" onClick={() => this.saveMap()}>Download Map</button>
                    </div>
                  </div>
                }

              { /* Checkboxes for map visualization. */}
              <ToggleSelect label={"Draw Robot"} checked={this.state.robotDisplay}
                              explain={"Displays the robot on the map."}
                              onChange={ () => this.changeRobot() }/>

              <ToggleSelect label={"Draw Particles"} checked={this.state.particleDisplay}
                            explain={"Shows all the positions the robot thinks it might be at."}
                            onChange={ () => this.changeParticles() }/>

              <ToggleSelect label={"Draw Lasers"} checked={this.state.laserDisplay}
                            explain={"Displays the Lidar rays."}
                            onChange={ () => this.changeLasers() }/>

              { /* Drive mode and control panel. */}
              <ToggleSelect label={"Drive Mode"} checked={this.state.drivingMode}
                            explain={"To drive the robot with your keyboard, use A,D for left & right, " +
                                      "W,S for forward & backward, and Q,E to rotate. " +
                                      "Or, use the joystick and turn buttons in the drive panel."}
                            onChange={ () => this.onDrivingMode() }/>
              {this.state.drivingMode &&
                <DriveControlPanel ws={this.ws} drivingMode={this.state.drivingMode} />
              }
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default MBotApp;
