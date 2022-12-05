#! env bash

if [ -z "$MOSQUITTO_USERNAME" ]; then
    read -p "Username: " username
else 
    username=$MOSQUITTO_USERNAME
fi

if [ -z "$MOSQUITTO_PASSWORD" ]; then
    read -p "Password: " password
else 
    password=$MOSQUITTO_PASSWORD
fi

file="/mosquitto/config/passwd.tmp"
docker-compose run eclipse-mosquitto /bin/sh -c "touch $file && mosquitto_passwd -b $file $username $password && cat $file && rm $file" > /mosquitto/config/passwd