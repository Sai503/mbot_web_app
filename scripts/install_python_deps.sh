#!/bin/bash
set -e  # Quit on error.

echo "###################################"
echo " Installing Python Dependencies..."
echo "###################################"

ENVS_ROOT="/home/$USER/.envs"
MBOT_APP_ENV="$ENVS_ROOT/mbot-app-env/"

# Get the global Python library install path and add it to the path.
PY_LIB_PATH=$(python3 -c "import site; print(site.getsitepackages()[0])")
PYTHONPATH=$PYTHONPATH:/usr/lib/python3/dist-packages/:$PY_LIB_PATH

# Create a new env if applicable
if [ ! -d $ENVS_ROOT ]; then
    mkdir $ENVS_ROOT
fi

# Create a new env if applicable
if [ ! -d $MBOT_APP_ENV ]; then
    python3 -m venv $MBOT_APP_ENV
fi

# Ensure numpy is globally installed, since on the Raspberry Pi the pip wheel doesn't work.
sudo apt install -y python3-numpy

source $MBOT_APP_ENV/bin/activate

# Install the Python requirements into the env.
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# Deactivate becayse we're done with the env now.
deactivate

echo
echo "Done!"
echo
