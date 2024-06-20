import React from "react";
import ReactDOM from "react-dom";

import MBotApp from './app'
import { MBotScene } from './scene.js'

const scene = new MBotScene();
scene.init()
  .then(() => {
    ReactDOM.render(
      <MBotApp scene = {scene}/>,
      document.getElementById('app-root')
    );
  });
