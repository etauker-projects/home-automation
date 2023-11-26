##
# For now first time setup must be done manually
##

# #! env bash

# read_password () {
#     if [ -z "$HOME_ASSISTANT_PASSWORD" ]; then
#         read -s -p "Home assistant password: " password
#         echo
#         read -s -p "Repeat home-assistant password: " password_repeat
#         echo
#         if [ $password != $password_repeat ]; then
#             echo "Passwords do not match, try again..."
#             read_password
#         fi
#     else 
#         password=$HOME_ASSISTANT_PASSWORD
#     fi
# }

# if [ -z "$HOME_ASSISTANT_USERNAME" ]; then
#     read -p "Home assistant username: " username
# else 
#     username=$HOME_ASSISTANT_USERNAME
# fi

# read_password

# # To be run while hass container is running
# docker exec home-assistant bash -c "hass --config /config --script auth change_password $username $password"


# # Install plugins
# docker exec home-assistant bash -c "mkdir -p /config/www && cd /config/www && git clone https://github.com/thomasloven/lovelace-card-mod"

# Update plugins
# docker exec home-assistant bash -c "cd /config/www && git pull"
# cd /config/www && git pull
# docker restart home-assistant

# Assumed to run from home-automation root
pwd

PLUGIN=lovelace-card-mod
echo "-- Updating '$PLUGIN' plugin"
docker exec home-assistant bash -c "cd /config/www/$PLUGIN && git pull"

PLUGIN=lovelace-auto-entities
echo "-- Updating '$PLUGIN' plugin"
docker exec home-assistant bash -c "cd /config/www/$PLUGIN && git pull"

PLUGIN=rgb-light-card
echo "-- Updating '$PLUGIN' plugin"
docker exec home-assistant bash -c "cd /config/www/$PLUGIN && git pull"

PLUGIN=config-template-card
echo "-- Updating '$PLUGIN' plugin"
docker exec home-assistant bash -c "cd /config/www/$PLUGIN && git pull"

PLUGIN=atomic-calendar-revive
echo "-- Updating '$PLUGIN' plugin"
docker exec home-assistant bash -c "cd /config/www/$PLUGIN && git pull"

PLUGIN=lovelace-multiple-entity-row
echo "-- Updating '$PLUGIN' plugin"
docker exec home-assistant bash -c "cd /config/www/$PLUGIN && git pull"

PLUGIN=lovelace-mushroom
echo "-- Updating '$PLUGIN' plugin"
docker exec home-assistant bash -c "cd /config/www/$PLUGIN && rm mushroom.js && wget https://github.com/piitaya/lovelace-mushroom/releases/latest/download/mushroom.js"

PLUGIN=apexcharts-card
echo "-- Updating '$PLUGIN' plugin"
docker exec home-assistant bash -c "cd /config/www/$PLUGIN && rm apexcharts-card.js && wget https://github.com/RomRider/apexcharts-card/releases/latest/download/apexcharts-card.js"

echo "-- Restarting home-assistant container"
docker restart home-assistant

