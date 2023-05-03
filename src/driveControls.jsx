import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowUp,
  faArrowDown,
  faArrowLeft,
  faArrowRight,
  faArrowRotateLeft,
  faArrowRotateRight
} from '@fortawesome/free-solid-svg-icons'

import config from "./config.js";

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
      this.drive(this.x, this.y, this.t, this.state.speed);
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
      this.drive(this.x, this.y, this.t, this.state.speed);
    }
  }

  stop(){
    console.log("STOP robot it was about run into Popeye");
    this.props.ws.socket.emit("stop", {'stop cmd': "stop"});
  }

  drive(x, y, t, spd){
    this.props.ws.socket.emit("move", {'vx' : spd * x / 100.,
                                       'vy' : spd * y / 100.,
                                       'wz' : config.ANG_VEL_MULTIPLIER * spd * t / 100.})
  }

  render() {
    return (
      <div className="drive-panel-wrapper">
        <div className="drive-buttons">
          <button className="button drive-turn" id="turn-left"
                  onClick={() => this.drive(0, 0, 1, this.state.speed)}>
            <FontAwesomeIcon icon={faArrowRotateLeft} />
          </button>
          <button className="button drive-move" id="move-str"
                  onClick={() => this.drive(1, 0, 0, this.state.speed)}>
            <FontAwesomeIcon icon={faArrowUp} />
          </button>
          <button className="button drive-turn" id="turn-right"
                  onClick={() => this.drive(0, 0, -1, this.state.speed)}>
            <FontAwesomeIcon icon={faArrowRotateRight} />
          </button>

          <button className="button drive-move" id="move-left"
                  onClick={() => this.drive(0, 1, 0, this.state.speed)}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <button className="button drive-move" id="move-right"
                  onClick={() => this.drive(0, -1, 0, this.state.speed)}>
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
          <button className="button drive-move" id="move-back"
                  onClick={() => this.drive(-1, 0, 0, this.state.speed)}>
            <FontAwesomeIcon icon={faArrowDown} />
          </button>
        </div>
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
