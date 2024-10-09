import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MBot } from "mbot-js-api";

import MBotApp from "./app";

const mbotIP = window.location.host.split(":")[0]  // Grab the IP from which this page was accessed.
const mbot = new MBot(mbotIP);  // TODO: Check if this is connected and display.

const root = createRoot(document.getElementById("app-root"));
root.render(
  <StrictMode>
    <MBotApp mbot={mbot} />
  </StrictMode>
);
