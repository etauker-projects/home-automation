#! env bash

read_password () {
    if [ -z "$INFLUXDB_PASSWORD" ]; then
        read -s -p "Influxdb password: " password
        echo
        read -s -p "Repeat influxdb password: " password_repeat
        echo
        if [ $password != $password_repeat ]; then
            echo "Passwords do not match, try again..."
            read_password
        fi
    else 
        password=$INFLUXDB_PASSWORD
    fi
}

if [ -z "$INFLUXDB_ORGANIZATION" ]; then
    read -p "Influxdb organization: " organization
else 
    organization=$INFLUXDB_ORGANIZATION
fi

if [ -z "$INFLUXDB_HOST" ]; then
    read -p "Influxdb host: " host
    # http://localhost:8086
    # http://home-assistant:8086
else 
    host=$INFLUXDB_HOST
fi

if [ -z "$INFLUXDB_BUCKET" ]; then
    bucket="home-automation"
else 
    bucket=$INFLUXDB_BUCKET
fi

if [ -z "$INFLUXDB_RETENTION" ]; then
    retention="1095d"  # 3 years
else 
    retention=$INFLUXDB_RETENTION
fi

if [ -z "$INFLUXDB_USERNAME" ]; then
    read -p "Influxdb username: " username
else 
    username=$INFLUXDB_USERNAME
fi

read_password

docker exec influxdb influx setup \
    --host $host \
    --org $organization \
    --bucket $bucket \
    --username $username \
    --password $password \
    --retention $retention \
    --force