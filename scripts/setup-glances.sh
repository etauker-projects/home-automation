#! env bash

# tools for generating glances password
sudo apt-get install -y glances

# glances setup
# set up according to:
# https://github.com/nicolargo/glances/issues/1040
glances -s -u glances --password
sudo mv -T "$HOME/.config/glances/glances.pwd" "./data/glances/passwd"