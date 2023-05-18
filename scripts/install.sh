#!/bin/bash
set -e  # Quit on error.

echo "Installing Nginx..."
echo
sudo apt install nginx -y

# Remove default nginx config
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    sudo rm /etc/nginx/sites-enabled/default
fi

# Create the directory for the mbot web application
if [ ! -d "/data/www/mbot/" ]; then
    sudo mkdir -p /data/www/mbot/
    sudo chmod -R a+rwx /data/www/mbot
fi

echo
echo "Setting up Nginx"
echo
if [ -f "/etc/nginx/nginx.conf" ]; then
    sudo rm /etc/nginx/nginx.conf
fi
sudo cp config/nginx.conf /etc/nginx/nginx.conf

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
    python3.10 -m venv $MBOT_APP_ENV
fi

# Activate the environment.
source $MBOT_APP_ENV/bin/activate

echo
echo "Installing Python dependencies..."
echo

pip install --upgrade pip
pip install -r requirements.txt
# Copy messages and LCM into this environment. TODO: Fix this.
cp -r /usr/local/lib/python3.10/dist-packages/mbot_lcm_msgs $MBOT_APP_ENV/lib/python3.10/site-packages/
cp -r /usr/local/lib/python3.10/dist-packages/lcm $MBOT_APP_ENV/lib/python3.10/site-packages/

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

# Reload the service.
sudo systemctl daemon-reload
sudo systemctl enable mbot-web-server.service
sudo systemctl start mbot-web-server.service

echo
echo "Done! The webapp is now available at http://localhost"
