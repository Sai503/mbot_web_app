#!/bin/bash
set -e  # Quit on error.

echo "#############################"
echo "Setting up Python server..."
echo "#############################"

MBOT_APP_ENV="/home/$USER/envs/mbot-app-env/"

# Create a new env if applicable
if [ ! -d $MBOT_APP_ENV ]; then
    python3 -m venv $MBOT_APP_ENV
fi

# Before activating, get the Python path where the LCM packages are installed.
MSGS_PATH=$(python3 -c "if True:
  import mbot_lcm_msgs
  print(mbot_lcm_msgs.__path__[0])")
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
rsync -av --exclude='*.pyc' --exclude='*/__pycache__/' $MSGS_PATH $ENV_PYTHON_PKG_PATH
rsync -av --exclude='*.pyc' --exclude='*/__pycache__/' $LCM_PATH $ENV_PYTHON_PKG_PATH

# Deactivate becayse we're done with the env now.
deactivate
