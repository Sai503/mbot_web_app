#!/bin/bash
set -e  # Quit on error.

VERSION=""

while getopts ":v:" opt; do
    case $opt in
        v)
            VERSION=$OPTARG
            ;;
        \?)
            echo "Invalid option: -$OPTARG"
            ;;
    esac
done

if [ -z "$VERSION" ]; then
    echo "Error: Version is required. Usage:"
    echo
    echo "  ./generate_release.sh -v vX.X.X"
    echo
    exit 1
fi

echo "Building for version $VERSION"

# Build the webapp.
echo "#############################"
echo "Building the webapp..."
echo "#############################"
npm install
npm run build

# Make a new top level directory and copy everything into it.
INCLUDES="dist/ config/ \
          scripts/install_nginx.sh \
          scripts/install_python_deps.sh \
          scripts/deploy_app.sh \
          mbot_omni_app.py
          requirements.txt"
FILE_NAME=mbot_web_app-$VERSION.tar.gz

mkdir mbot_web_app-$VERSION
for file in $INCLUDES; do
    cp -r $file mbot_web_app-$VERSION/
done

# Copy the README.
cp scripts/deploy_readme.txt mbot_web_app-$VERSION/README.txt

echo
echo "Creating tar file..."
tar -czf $FILE_NAME mbot_web_app-$VERSION/

rm -rf mkdir mbot_web_app-$VERSION

echo
echo "Created release: $FILE_NAME"
