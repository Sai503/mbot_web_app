#!/bin/bash
set -e  # Quit on error.

echo "Installing Nginx..."
echo
sudo apt install nginx -y

# Remove default nginx config
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    sudo rm /etc/nginx/sites-enabled/default
fi

# Create directory for mbot persistent storage api
sudo mkdir -p /data/www/mbot

# Create the directory for the mbot web application
sudo mkdir -p /data/www/mbot/
sudo chmod -R a+rwx /data/www/mbot

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

echo "#############################"
echo "Restarting Nginx..."
echo "#############################"
sudo systemctl restart nginx

# now we can setup the api
# TODO: This should be installed in a venv, LCM messages will also need to be
# installed there. The service should run in the venv.
# echo "#############################"
# echo "Installing Python dependencies..."
# echo "#############################"
# # TODO do this in a venv
# sudo pip3 install -r requirements.txt

# sudo mkdir /data/www/mbot/api
# sudo cp mbot_omni_app.py /data/www/mbot/api
# sudo cp -r app/ /data/www/mbot/api

# sudo cp config/mbot-web-server.service /etc/systemd/system/

# sudo systemctl daemon-reload
# sudo systemctl enable mbot-web-server.service
# sudo systemctl start mbot-web-server.service

echo
echo "Done! The webapp is now available at http://localhost"
