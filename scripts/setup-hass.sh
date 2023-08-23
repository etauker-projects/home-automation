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


# Install plugins
docker exec home-assistant bash -c "mkdir -p /config/www && cd /config/www && git clone https://github.com/thomasloven/lovelace-card-mod && git clone https://github.com/thomasloven/lovelace-auto-entities.git && git clone https://github.com/bokub/rgb-light-card.git && git clone https://github.com/iantrich/config-template-card.git && git clone https://github.com/totaldebug/atomic-calendar-revive.git && git clone https://github.com/benct/lovelace-multiple-entity-row.git"

# Other plugins potrentially useful in the future 
# - https://github.com/kalkih/mini-media-player



