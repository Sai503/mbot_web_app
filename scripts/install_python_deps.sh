#!/bin/bash
set -e  # Quit on error.

echo "###################################"
echo " Installing Python Dependencies..."
echo "###################################"

sudo apt install -y python3-flask \
                    python3-flask-socketio \
                    python3-flask-cors \
                    python3-dotenv \
                    python3-eventlet

echo
echo "Done!"
echo
