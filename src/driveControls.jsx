import { useState, useEffect, useCallback } from 'react';
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

function DriveControlPanel({ drivingMode, mbot }) {
  const [speed, setSpeed] = useState(50);
  const [controlMap, setControlMap] = useState({
    s: { pressed: false, fn: "back" },
    w: { pressed: false, fn: "forward" },
    a: { pressed: false, fn: "left" },
    d: { pressed: false, fn: "right" },
    e: { pressed: false, fn: "tright" },
    q: { pressed: false, fn: "tleft" },
  });

  let x = 0;
  let y = 0;
  let t = 0;

  const handleKeyDown = useCallback((evt) => {
    if (drivingMode && controlMap[evt.key]) {
      controlMap[evt.key].pressed = true;
      if (controlMap[evt.key].fn === "back" && x > -1) x--;
      if (controlMap[evt.key].fn === "forward" && x < 1) x++;
      if (controlMap[evt.key].fn === "right" && y > -1) y--;
      if (controlMap[evt.key].fn === "left" && y < 1) y++;
      if (controlMap[evt.key].fn === "tright" && t > -1) t--;
      if (controlMap[evt.key].fn === "tleft" && t < 1) t++;

      const vx = x * speed / 100;
      const vy = y * speed / 100;
      const wz = config.ANG_VEL_MULTIPLIER * speed * t / 100;
      drive(vx, vy, wz);
    }
  }, [drivingMode, controlMap, speed, x, y, t]);

  const handleKeyUp = useCallback((evt) => {
    if (drivingMode && controlMap[evt.key]) {
      controlMap[evt.key].pressed = false;
      if (controlMap[evt.key].fn === "back" && x < 1) x++;
      if (controlMap[evt.key].fn === "forward" && x > -1) x--;
      if (controlMap[evt.key].fn === "right" && y < 1) y++;
      if (controlMap[evt.key].fn === "left" && y > -1) y--;
      if (controlMap[evt.key].fn === "tright" && t < 1) t++;
      if (controlMap[evt.key].fn === "tleft" && t > -1) t--;

      let reset = true;
      for (const key in controlMap) {
        if (controlMap[key].pressed) reset = false;
      }
      if (reset) { x = 0; y = 0; t = 0; }

      const vx = x * speed / 100;
      const vy = y * speed / 100;
      const wz = config.ANG_VEL_MULTIPLIER * speed * t / 100;
      drive(vx, vy, wz);
    }
  }, [drivingMode, controlMap, speed, x, y, t]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Setup joystick.
    const style = {
      internalFillColor: "#1397cf",
      internalStrokeColor: "#2F65A7",
      externalStrokeColor: "#2F65A7"
    };
    let joy = new JoyStick('joy1Div', style, (stickData) => {
      const xJoy = stickData.y * speed / 10000;
      const yJoy = -stickData.x * speed / 10000;
      drive(xJoy, yJoy);
    });

    // setTimeout(() => {
    //   drive(xJoy, yJoy);

    // }, 100);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      stop();

      // Remove all children of joy1Div
      const joyDiv = document.getElementById('joy1Div');
      if (joyDiv) {
        while (joyDiv.firstChild) {
          joyDiv.removeChild(joyDiv.firstChild);
        }
      }
    };
  }, [handleKeyDown, handleKeyUp, speed]);

  const onSpeedChange = (event) => {
    setSpeed(event.target.value);
  };

  const stop = () => {
    console.log("STOP robot it was about run into Popeye");
    mbot.drive(0, 0, 0);
  };

  const drive = (vx, vy, wz = 0) => {
    mbot.drive(vx, vy, wz);
  };

  return (
    <div className="drive-panel-wrapper">
      <div className="drive-buttons">
        <button className="button drive-turn" id="turn-left"
          onMouseDown={() => drive(0, 0, config.ANG_VEL_MULTIPLIER * speed / 100)}
          onMouseUp={() => stop()}>
          <FontAwesomeIcon icon={faArrowRotateLeft} />
        </button>

        <button className="button drive-turn" id="turn-right"
          onMouseDown={() => drive(0, 0, -config.ANG_VEL_MULTIPLIER * speed / 100)}
          onMouseUp={() => stop()}>
          <FontAwesomeIcon icon={faArrowRotateRight} />
        </button>
      </div>

      <div id="joy1Div" className={`joyStyle`}></div>

      <div className="button-wrapper-row top-spacing">
        <button className="button stop-color col-lg-12" id="drive-stop" onClick={stop}>Stop</button>
      </div>

      <div className="col-lg-12">
        <span>Speed: {speed} &nbsp;&nbsp;</span>
        <input type="range" min="1" max="100" value={speed} onChange={onSpeedChange}></input>
      </div>
    </div>
  );
}

export { DriveControlPanel };
