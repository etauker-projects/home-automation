#! env bash

# tools for testing pub / sub from host cli
sudo apt-get install -y mosquitto-clients

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

config_dir="./data/mosquitto/config"
data_dir="./data/mosquitto/data"
log_dir="./data/mosquitto/log"
password_file="passwd"
config_file="mosquitto.conf"
password_filepath="$config_dir/$password_file"
config_filepath="$config_dir/$config_file"

mkdir -p $config_dir
mkdir -p $data_dir
mkdir -p $log_dir
touch $password_filepath
touch $config_filepath

temp_file="/tmp/passwd.tmp"
docker run eclipse-mosquitto /bin/sh -c "touch $temp_file && mosquitto_passwd -b $temp_file $username $password && cat $temp_file && rm $temp_file" > $password_filepath

cat  > $config_filepath << EOF
listener 1883

# security
password_file /mosquitto/config/passwd
allow_anonymous false

# persistence
persistence true
persistence_location /mosquitto/data/

# logging
log_dest stdout
log_dest file /mosquitto/log/mosquitto.log

EOF


# CREATE
mosquitto_passwd -b passwordfile username password

# READ
awk 'BEGIN { FS=":"; OFS=","; } {print $1}' passwd

# UPDATE
mosquitto_passwd -b passwordfile username password

# DELETE
mosquitto_passwd -D passwordfile username