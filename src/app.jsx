import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars, faCircleInfo } from '@fortawesome/free-solid-svg-icons'

import config from "./config.js";
import { isDeepEqual } from "./util.js";
import { DriveControlPanel } from "./driveControls";
import { MBotScene } from './scene.js'

function ConnectionStatus({ status }) {
  let msg = "Wait";
  let colour = "#ffd300";
  if (status === true) {
    msg = "Connected";
    colour = "#00ff00";
  }
  else if (status === false) {
    msg = "Not Connected";
    colour = "#ff0000";
  }

  return (
    <div className="status" style={{backgroundColor: colour}}>
      {msg}
    </div>
  );
}

function StatusMessage({ robotPose, robotCell, clickedCell }) {
  let msg = [];
  if(robotPose != null){
    msg.push(
      <p className="robot-info" key="robotInfoPose">
        <i>Robot Pose:</i> (
          <b>x:</b> {robotPose.x.toFixed(3)},&nbsp;
          <b>y:</b> {robotPose.y.toFixed(3)},&nbsp;
          <b>t:</b> {robotPose.theta.toFixed(3)})
      </p>
    );
    msg.push(
      <p className="robot-info" key="robotInfoCell">
        <i>Robot Cell:</i> ({robotCell[0]}, {robotCell[1]})
      </p>
  );
  }
  if (clickedCell.length > 0) {
    msg.push(
      <p className="robot-info" key="robotInfoClicked">
        <i>Clicked:</i>&nbsp;
        <b>x:</b> {clickedCell[2].toFixed(3)},&nbsp;
        <b>y:</b> {clickedCell[3].toFixed(3)},&nbsp;
        Cell: [{clickedCell[1]}, {clickedCell[0]}]
      </p>
    );
  }

  return (
    <div className="status-msg">
      {msg}
    </div>
  );
}

function ToggleSelect({ small, label, explain, checked, onChange }) {
  const [viewInfo, setViewInfo] = useState(false);
  const [top, setTop] = useState(0);

  let sizeCls = "";
  if (small) sizeCls = " small";

  return (
    <div className="toggle-wrapper">
      <div className="row">
        <div className="col-7">
          <span>{label}</span>
        </div>
        <div
          className="col-1 info"
          onMouseEnter={(evt) => {
            setViewInfo(true);
            setTop(evt.clientY - 20);
          }}
          onMouseLeave={() => { setViewInfo(false); }}
        >
          <div className="info-icon">
            <FontAwesomeIcon icon={faCircleInfo} size="xs" />
          </div>
        </div>
        {viewInfo && (
          <span className="explain" style={{ top: top }}>
            {explain}
          </span>
        )}
        <div className="col-4 text-right toggle">
          <label className={"switch" + sizeCls}>
            <input
              type="checkbox"
              className="mx-2"
              checked={checked}
              onChange={onChange}
            />
            <span className={"slider round" + sizeCls}></span>
          </label>
        </div>
      </div>
    </div>
  );
}

function SLAMControlPanel({ slamMode, onLocalizationMode, onMappingMode, onResetMap, saveMap }) {
  return (
    <>
      <ToggleSelect
        label={"Localization Mode"}
        explain={"Toggles localization mode and displays map."}
        checked={slamMode !== config.slam_mode.IDLE}
        onChange={onLocalizationMode}
      />
      {slamMode !== config.slam_mode.IDLE &&
        <div className="subpanel">
          <ToggleSelect
            label={"Mapping Mode"}
            checked={slamMode === config.slam_mode.FULL_SLAM}
            explain={"Toggles mapping mode on the robot."}
            onChange={onMappingMode}
            small={true}
          />
          <div className="button-wrapper-col">
            <button
              className={"button" + (slamMode !== config.slam_mode.FULL_SLAM ? " inactive" : "")}
              onClick={onResetMap}
            >
              Reset Map
            </button>
            <button
              className="button"
              onClick={saveMap}
            >
              Download Map
            </button>
          </div>
        </div>
      }
    </>
  );
}

function MBotSceneWrapper({ mbot, connected, robotDisplay, laserDisplay, particleDisplay,
                            setClickedCell, setRobotPose, setRobotCell}) {
  // Ref for the canvas.
  const canvasWrapperRef = useRef(null);
  const scene = useRef(new MBotScene());
  // Channel data.
  const POSE_CHANNEL = "MBOT_ODOMETRY";
  const LIDAR_CHANNEL = "LIDAR";

  // Click callback when the user clicks on the scene.
  const handleCanvasClick = useCallback((pos) => {
    if (!scene.current.loaded) return;
    if (pos.length === 0 || scene.current.isMapLoaded()) {
      // If the map is not loaded or an empty cell is passed, clear.
      setClickedCell([]);
      return;
    }

    const clickedCell = [...scene.current.pixelsToCell(pos[0], pos[1]),
                         ...scene.current.pixelsToPos(pos[0], pos[1])];
    setClickedCell(clickedCell);
  }, [setClickedCell]);

  useEffect(() => {
    const runID = Math.floor(Math.random() * 10000);
    console.log("MBot Scene Init Effect", runID);

    scene.current.init().then(() => {
      console.log("Init scene complete", runID, scene.current.loaded)
      scene.current.createScene(canvasWrapperRef.current);
      scene.current.clickCallback = handleCanvasClick;
    }).catch((error) => {
      console.warn(error, runID);
    });

    // Return the cleanup function which stops the rerender.
    return () => {
      console.log("CLEANUP INIT SCENE", runID);
      // scene.current.destroy();
    }
  }, [canvasWrapperRef, handleCanvasClick]);

  // Effect to manage subscribing to the pose.
  useEffect(() => {
    if (scene.current.loaded) scene.current.toggleRobotView(robotDisplay);

    if (robotDisplay) {
      mbot.subscribe(POSE_CHANNEL, (msg) => {
        // Sets the robot position
        setRobotPose({x: msg.data.x, y: msg.data.y, theta: msg.data.theta});
        if (!scene.current.loaded) return;
        scene.current.updateRobot(msg.data.x, msg.data.y, msg.data.theta);
        if (scene.current.isMapLoaded()) {
          const robotCell = scene.current.posToCell(msg.data.x, msg.data.y);
          setRobotCell(robotCell);
        }
      }).catch((error) => {
        console.error('Subscription failed for channel', POSE_CHANNEL, error);
      });
    }

    // Return the cleanup function which stops the rerender.
    return () => {
      mbot.unsubscribe(POSE_CHANNEL).catch((err) => console.warn(err));
    }
  }, [robotDisplay, setRobotPose, setRobotCell]);

  // Effect to manage subscribing to the Lidar.
  useEffect(() => {
    if (laserDisplay) {
      mbot.subscribe(LIDAR_CHANNEL, (msg) => {
        if (!scene.current.loaded) return;
        scene.current.drawLasers(msg.data.ranges, msg.data.thetas);
      }).catch((error) => {
        console.error('Subscription failed for channel', LIDAR_CHANNEL, error);
      });
    }
    else {
      scene.current.clearLasers();
    }

    // Return the cleanup function which stops the rerender.
    return () => {
      mbot.unsubscribe(LIDAR_CHANNEL).catch((err) => console.warn(err));
    }
  }, [laserDisplay]);

  return (
    <div id="canvas-container" ref={canvasWrapperRef}>
    </div>
  );
}

export default function MBotApp({ mbot }) {
  const [hostname, setHostname] = useState("mbot-???");
  const [connected, setConnected] = useState(false);
  const [channels, setChannels] = useState(null);
  // Toggle selectors.
  const [robotDisplay, setRobotDisplay] = useState(true);
  const [laserDisplay, setLaserDisplay] = useState(false);
  const [particleDisplay, setParticleDisplay] = useState(false);
  const [drivingMode, setDrivingMode] = useState(false);
  // Robot parameters.
  const [robotPose, setRobotPose] = useState({x: 0, y: 0, theta: 0});
  const [robotCell, setRobotCell] = useState([0, 0]);
  // Visualization elements.
  const [clickedCell, setClickedCell] = useState([]);
  // Mapping parameters.
  const [slamMode, setSlamMode] = useState(config.slam_mode.INVALID);

  function handleSLAMStatus(data){
    // Only update if the mode has changed.
    if (data.slam_mode !== slamMode) {
      if (data.slam_mode !== config.slam_mode.FULL_SLAM) {
        // If we are not in mapping mode, stop asking for map.
        // this.stopRequestInterval();
      }
      else {
        // If we are in mapping mode, start asking for map.
        // this.startRequestInterval();
      }

      setSlamMode(data.slam_mode);
      // this.setState({slamMode: evt.slam_mode,
      //                mapfile: evt.map_path});
    }
  }

  // This lets the React App start and cleanup the timer properly.
  useEffect(() => {
    console.log("Main App Effect");
    let timerId = null;

    // Read the hostname.
    mbot.readHostname().then((name) => {
      setHostname(name);
      if (!connected) setConnected(true);
      // TODO: also keep track of whether we are disconnected.
    }).catch((err) => {
      setConnected(false);
      // Check for connection every 3 seconds.
      timerId = setInterval(() => {
        mbot.readHostname().then((name) => {
          setHostname(name);
          setConnected(true);
          clearInterval(timerId);
        }).catch((err) => {
          console.warn("Not connected...", err);
        });
      }, 3000);
    });

    // Return the cleanup function which stops the rerender.
    return () => {
      console.log("CLEANUP");
      if (timerId) clearInterval(timerId);
    };
  }, []);

  return (
    <div id="wrapper">
      <div id="main">
        <MBotSceneWrapper mbot={mbot} connected={connected}
                          robotDisplay={robotDisplay}
                          laserDisplay={laserDisplay}
                          particleDisplay={particleDisplay}
                          setClickedCell={setClickedCell}
                          setRobotPose={setRobotPose}
                          setRobotCell={setRobotCell} />
      </div>

      <div id="sidenav">
        <div id="toggle-nav" onClick={() => {}}><FontAwesomeIcon icon={faBars} /></div>
        <div className="inner">
          <div className="title">
            {hostname.toUpperCase()}
          </div>

          <div className="status-wrapper">
            <ConnectionStatus status={connected}/>
            <StatusMessage robotCell={robotCell} robotPose={robotPose}
                           clickedCell={clickedCell} />
          </div>

          <div className="row">
            {/* Only show the SLAM control panel if we have received a SLAM status message. */}
            {slamMode != config.slam_mode.INVALID &&
                <SLAMControlPanel slamMode={slamMode}
                                  onLocalizationMode={() => {}}
                                  onMappingMode={() => {}}
                                  onResetMap={() => {}}
                                  saveMap={() => {}} />
              }

              { /* Checkboxes for map visualization. */}
              <ToggleSelect label={"Draw Robot"} checked={robotDisplay}
                            explain={"Displays the robot on the map."}
                            onChange={ () => { setRobotDisplay(!robotDisplay); } }/>

              <ToggleSelect label={"Draw Particles"} checked={particleDisplay}
                            explain={"Shows all the positions the robot thinks it might be at."}
                            onChange={ () => { setParticleDisplay(!particleDisplay); } }/>

              <ToggleSelect label={"Draw Lasers"} checked={laserDisplay}
                            explain={"Displays the Lidar rays."}
                            onChange={ () => { setLaserDisplay(!laserDisplay); } }/>

              { /* Drive mode and control panel. */}
              <ToggleSelect label={"Drive Mode"} checked={drivingMode}
                            explain={"To drive the robot with your keyboard, use A,D for left & right, " +
                                      "W,S for forward & backward, and Q,E to rotate. " +
                                      "Or, use the joystick and turn buttons in the drive panel."}
                            onChange={ () => { setDrivingMode(!drivingMode); } }/>
              {drivingMode &&
                <DriveControlPanel mbot={mbot} drivingMode={drivingMode} />
              }
          </div>
        </div>
      </div>
    </div>
  );
}
