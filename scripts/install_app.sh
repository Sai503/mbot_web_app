#!/bin/bash
set -e  # Quit on error.

# Build the webapp.
echo "#############################"
echo "Building the webapp..."
echo "#############################"
npm install
npm run build

echo
echo "Installing the web app..."
echo
# Move the build files into the public repo.
sudo cp -r dist/* /data/www/mbot/

echo "Restarting Nginx..."
echo
sudo systemctl restart nginx

echo "#############################"
echo "Setting up Python server..."
echo "#############################"

MBOT_APP_ENV="/home/$USER/envs/mbot-app-env/"

# Create a new env if applicable
if [ ! -d $MBOT_APP_ENV ]; then
    python3 -m venv $MBOT_APP_ENV
fi

# Before activating, get the Python path where the LCM packages are installed.
ROOT_PYTHON_PKG_PATH=$(python3 -c "if True:
  import sysconfig as sc
  print(sc.get_path('platlib'))")
LCM_PATH=$(python3 -c "if True:
  import lcm
  print(lcm.__path__[0])")

# Activate the environment.
source $MBOT_APP_ENV/bin/activate

# After activating, get the Python path where packages are installed in the env.
ENV_PYTHON_PKG_PATH=$(python3 -c "if True:
  import sysconfig as sc
  print(sc.get_path('platlib'))")

echo
echo "Installing Python dependencies..."
echo

pip install --upgrade pip
pip install -r requirements.txt
# Copy messages and LCM into this environment. TODO: Fix this.
rsync -av --exclude='*.pyc' --exclude='*/__pycache__/' $ROOT_PYTHON_PKG_PATH/mbot_lcm_msgs $ENV_PYTHON_PKG_PATH
rsync -av --exclude='*.pyc' --exclude='*/__pycache__/' $LCM_PATH $ENV_PYTHON_PKG_PATH

# Deactivate becayse we're done with the env now.
deactivate

echo
echo "Setting up server files."

if [ ! -d "/data/www/mbot/api" ]; then
    sudo mkdir /data/www/mbot/api
fi

# Copy over all the needed Python code.
sudo cp mbot_omni_app.py /data/www/mbot/api
sudo cp -r app/ /data/www/mbot/api

echo "Setting up service."
sudo cp config/mbot-web-server.service /etc/systemd/system/
# Fill in the path to this env.
sudo sed -i "s#WEBAPP_ENV_PATH#$MBOT_APP_ENV#" /etc/systemd/system/mbot-web-server.service

# Reload the service.
sudo systemctl daemon-reload
sudo systemctl enable mbot-web-server.service
sudo systemctl start mbot-web-server.service

echo
echo "Done! The webapp is now available at http://localhost"
