import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowRotateLeft,
  faArrowRotateRight
} from '@fortawesome/free-solid-svg-icons'

import config from "./config.js";
import JoyStick from "./joy.js";

/********************
 * MOVE PANEL
 ********************/

class DriveControlPanel extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      speed: 50
    }

    this.controlMap = {
      s: {pressed: false, fn: "back"},
      w: {pressed: false, fn: "forward"},
      a: {pressed: false, fn: "left"},
      d: {pressed: false, fn: "right"},
      e: {pressed: false, fn: "tright"},
      q: {pressed: false, fn: "tleft"}
    };
    this.x = 0;
    this.y = 0;
    this.t = 0;

  }

  componentDidMount() {
    // TODO: The event listener should be in the main app in case anyone else uses keys.
    document.addEventListener('keydown', (evt) => { this.handleKeyDown(evt); }, false);
    document.addEventListener('keyup', (evt) => { this.handleKeyUp(evt); }, false);

    // Mounts the joystick to the screen when the DriveControl Panel is loaded

    setTimeout(() => {
      let style = {internalFillColor: "#1397cf",
                   internalStrokeColor: "#2F65A7",
                   externalStrokeColor: "#2F65A7"};
      new JoyStick('joy1Div', style, (stickData) => {
          let xJoy = stickData.y * this.state.speed / 10000;
          let yJoy = -stickData.x * this.state.speed / 10000;
          this.drive(xJoy, yJoy);
      });
     }, 100);
  }

  componentWillUnmount(){
    this.stop()
  }

  onSpeedChange(event) {
    this.setState({speed: event.target.value});
  }

  handleKeyDown(evt) {
    // First checks if the drive State is active, then adds speed values in rx, ry, and theta
    if(this.props.drivingMode)
    {
      if(this.controlMap[evt.key]){
        this.controlMap[evt.key].pressed = true
        if(this.controlMap[evt.key].fn == "back" && this.x > -1) this.x--;
        if(this.controlMap[evt.key].fn == "forward" && this.x < 1) this.x++;
        if(this.controlMap[evt.key].fn == "right" && this.y > -1) this.y--;
        if(this.controlMap[evt.key].fn == "left" && this.y < 1) this.y++;
        if(this.controlMap[evt.key].fn == "tright" && this.t > -1) this.t--;
        if(this.controlMap[evt.key].fn == "tleft" && this.t < 1) this.t++;
      }

      // Update drive speeds.
      let vx = this.x * this.state.speed / 100.;
      let vy = this.y * this.state.speed / 100.;
      let wz = config.ANG_VEL_MULTIPLIER * this.state.speed * this.t / 100.;
      this.drive(vx, vy, wz);
    }
  }

  handleKeyUp(evt) {
    // First checks if the drive State is active, then substracts speed values in rx, ry, and theta
    if(this.props.drivingMode){
      if(this.controlMap[evt.key]){
        this.controlMap[evt.key].pressed = false
        if(this.controlMap[evt.key].fn == "back") this.x++;
        if(this.controlMap[evt.key].fn == "forward") this.x--;
        if(this.controlMap[evt.key].fn == "right") this.y++;
        if(this.controlMap[evt.key].fn == "left") this.y--;
        if(this.controlMap[evt.key].fn == "tright") this.t++;
        if(this.controlMap[evt.key].fn == "tleft") this.t--;
      }

      // Stops robot if it finds that all keys have been lifted up, acts as a failsafe to above logic
      let reset = true;
      for (const [key, value] of Object.entries(this.controlMap)) {
        if (value.pressed) reset = false;
      }
      if (reset) { this.x = 0; this.y = 0; this.t = 0; }

      // Update drive speeds.
      let vx = this.x * this.state.speed / 100.;
      let vy = this.y * this.state.speed / 100.;
      let wz = config.ANG_VEL_MULTIPLIER * this.state.speed * this.t / 100.;
      this.drive(vx, vy, wz);
    }
  }

  stop(){
    console.log("STOP robot it was about run into Popeye");
    this.props.ws.socket.emit("stop", {'stop cmd': "stop"});
  }

  drive(vx, vy, wz = 0){
    this.props.ws.socket.emit("move", {'vx' : vx, 'vy' : vy, 'wz' : wz})
  }

  render() {
    return (
      <div className="drive-panel-wrapper">
        <div className="drive-buttons">
          <button className="button drive-turn" id="turn-left"
                  onMouseDown={() => this.drive(0, 0, config.ANG_VEL_MULTIPLIER * this.state.speed / 100.)}
                  onMouseUp={() => this.stop()}>
            <FontAwesomeIcon icon={faArrowRotateLeft} />
          </button>

          <button className="button drive-turn" id="turn-right"
                  onMouseDown={() => this.drive(0, 0, -config.ANG_VEL_MULTIPLIER * this.state.speed / 100.)}
                  onMouseUp={() => this.stop()}>
            <FontAwesomeIcon icon={faArrowRotateRight} />
          </button>

        </div>
        <div id="joy1Div" className={`joyStyle`}> </div>
        <div className="button-wrapper-row top-spacing">
          <button className="button stop-color col-lg-12" id="drive-stop"
                  onClick={() => this.stop()}>Stop</button>
        </div>
        <div className="col-lg-12">
          <span>Speed: {this.state.speed} &nbsp;&nbsp;</span>
          <input type="range" min="1" max="100" value={this.state.speed}
                 onChange={(evt) => this.onSpeedChange(evt)}></input>
        </div>
      </div>
    );
  }
}

export { DriveControlPanel };
