# MBot Omni App

Web app for the MBot Omni robot.

## Dependencies

The front end relies on NodeJS (to compile and run the JavaScript files), NPM (a
package manager for NodeJS applications) and React, as well as some other
packages used to build and serve the files. FThere are a few ways to install NodeJS and NPM. Using `nvm` is easy and recommended. To install it, use the [install script](https://github.com/nvm-sh/nvm#install--update-script):
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
```
You will have to open a new terminal after installation for the `nvm` command to be available. Install the latest version of NodeJS (as of this writing, the latest version is 18):
```bash
nvm install 18
```
Now you should have the `node` and `npm` command installed. You can check with `node --version` and `npm --version`.

## Setup on a Robot

To set up the webapp on a new robot, use the helper scripts. First, install nginx and the Python dependencies:
```bash
./scripts/install_nginx.sh
./scripts/install_python_deps.sh
```
Then, build and install the app.
```bash
./scripts/deploy_app.sh
```
The webapp is accessible by typing the robot's IP into the browser.

Once you have done the setup once, you only need to rerun the `deploy_app.sh` script in order to update the webapp code with a new version.

## Local Execution

If you are developing this app and want to run it locally, follow these instructions.

### Front end

#### Installation

First install packages with:
```bash
npm install
```
This will grab all the packages needed to run the React app.

#### Running

To run the React app, in the root directory of this repository, do:
```bash
npm run dev
```
This will start a development server and display the page `index.html`.
The style file is in `css/main.css`, and the JavaScript being run is in
`src/main.jsx`.

If you go to `http://[SERVER_IP]:8000` in your browser, you should see the
webapp.

### Back end

The backend is build using Flask and Python 3. If
working on a Linux computer, you probably want to run the code in a virtual
environment (on the Raspberry Pi, you can install things directly if you want).
To make a virtual environment and then activate it, do:
```bash
python3.8 -m venv ~/envs/mbot-web-app
source ~/envs/mbot-web-app/bin/activate
```
It will probably work with versions of Python 3 other than 3.8, if you don't
have it installed, but the current code was tested with Python 3.8. You can
replace `~/envs/` with your preferred path if you would like. To get out of the
virtual environment, type `deactivate`.

The setup for the Flask + React app is based off
[this tutorial](https://blog.miguelgrinberg.com/post/how-to-create-a-react--flask-project).

#### Installation

In the virtual environment (if applicable), do:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```
Note: Any other Python requirements should be added to `requirements.txt`.

You will need to install the LCM messages for the MBot in this environment. See the corresponding repo for instructions. If you have already installed it globally, you might have to delete build, activate this environment, then rebuild and reinstall. This will just additionally install the messages in your current Python virtual environment. It will not mess up your previous global version.

#### Running

To run the Flask app, do:
```bash
npm run start-api
```

Traffic on `http://[SERVER_IP]:8000` will be forwarded to `http://[SERVER_IP]:5000`,
where the Flask server is running.
