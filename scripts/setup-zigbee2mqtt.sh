#! env bash

read_password () {
    if [ -z "$MOSQUITTO_PASSWORD" ]; then
        read -s -p "Mosquitto password: " password
        echo
        read -s -p "Repeat mosquitto password: " password_repeat
        echo
        if [ $password != $password_repeat ]; then
            echo "Passwords do not match, try again..."
            read_password
        fi
    else 
        password=$MOSQUITTO_PASSWORD
    fi
}

if [ -z "$MOSQUITTO_USERNAME" ]; then
    read -p "Mosquitto username: " username
else 
    username=$MOSQUITTO_USERNAME
fi

read_password

config_dir="./data/zigbee2mqtt"
config_file="configuration.yaml"
config_filepath="$config_dir/$config_file"

mkdir -p $config_dir
touch $config_filepath

cat > $config_filepath << EOF
# MQTT settings
mqtt:
  # MQTT base topic for Zigbee2MQTT MQTT messages
  base_topic: zigbee2mqtt
  # MQTT server URL
  server: 'mqtt://localhost'
  # MQTT server authentication, uncomment if required:
  user: $MOSQUITTO_USERNAME
  password: $MOSQUITTO_PASSWORD

# Serial settings
serial:
  # Location of the adapter (see first step of this guide)
  port: /dev/ttyACM0

frontend: true

EOF