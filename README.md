# MBot Omni App

Web app for the MBot Omni robot.

## Usage

This app is meant to be run on Linux. The current version can be run locally
without the robot (it has not been tested on the robot). It is meant to be run
on the Raspberry Pi. These instructions are for Linux, so they should work on
the robot, or in a Docker.

### Front end

The front end is currently a copy of the `nav-app` code (it won't do much, but
it will load a map and let you click on it and move the robot around). There is
one added function in the main component of the app, `anExamplePost()`, and an
added button, which gives an example of how to send information back to Flask
with HTTP requests.

The setup for the React app is based off
[this tutorial](https://medium.com/@JedaiSaboteur/creating-a-react-app-from-scratch-f3c693b84658).

#### Installation

The front end relies on NodeJS (to compile and run the JavaScript files), NPM (a
package manager for NodeJS applications) and React, as well as some other
packages used to build and serve the files. First, you will need to install
NodeJS:
```bash
curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y nodejs
```
Now you should have the `npm` command installed. In the root directory of this
repository, run:
```bash
npm install
```
This will grab all the packages needed to run the React app.

### Installation on the Raspberry Pi

Download the binaries for the ARM v71 processor.

```bash
wget https://nodejs.org/dist/v16.14.2/node-v16.14.2-linux-armv7l.tar.xz
```

Decompress the binaries.

```bash
tar -xsf node-v16.14.2-linux-armv7l.tar.xz node-v16.14.2-linux-armv7l/
```

Navigate to the files.

```bash
cd node-v16.14.2-linux-armv7l/
```

Copy the files to the proper directory.

```bash
sudo cp -R * /usr/local
```

To confirm that Nodejs is installed, run the commands below:
```bash
node -v
npm -v
```

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
python3.8 -m venv ~/envs/mbot-omni-app
source ~/envs/mbot-omni-app/bin/activate
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

To install LCM, get the source and unzip it, then do:
```bash
cd lcm-1.4.0/lcm-pythoninst
python setup.py install
```

Install the LCM messages by building the `botlab-soln` repo, and then installing with:
```bash
cd build
sudo make install
```

#### Running

To run the Flask app, do:
```bash
npm run start-api
```

Traffic on `http://[SERVER_IP]:8000` will be forwarded to `http://[SERVER_IP]:5000`,
where the Flask server is running.

Now, when you press the "Test me" button in the webapp, you should see a log
message printed in the terminal running the Flask app. You should also see a
message in the browser console with the (empty) response.
