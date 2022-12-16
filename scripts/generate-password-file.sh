#! env bash

read_password () {
    if [ -z "$MOSQUITTO_PASSWORD" ]; then
        read -s -p "Password: " password
        echo
        read -s -p "Repeat password: " password_repeat
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
    read -p "Username: " username
else 
    username=$MOSQUITTO_USERNAME
fi

read_password

file="./data/mosquitto/passwd"
temp_file="/tmp/passwd.tmp"
docker run eclipse-mosquitto /bin/sh -c "touch $temp_file && mosquitto_passwd -b $temp_file $username $password && cat $temp_file && rm $temp_file" > $file
