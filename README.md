# Home Automation

## Purpose
Central hub for IoT and home automation.

## Setup

### Manual Setup
`bash ./scripts/generate-password-file.sh`

### Docker Setup
```bash
# project root directory
npm run setup
npm run start
```

## Testing

### Manual Testing
To test the mosquitto:
```bash
 export $MOSQUITTO_USERNAME="<username>"
 export $MOSQUITTO_PASSWORD="<password>"

# set up user and password
npm run setup

#  start container
npm run start

# terminal 1:
mosquitto_sub -h localhost -t "test-topic" -u $MOSQUITTO_USERNAME -P $MOSQUITTO_PASSWORD

# terminal 2:
mosquitto_pub -h localhost -t "test-topic" -u $MOSQUITTO_USERNAME -P $MOSQUITTO_PASSWORD -m "Hello World"
```

Or start the app and then using using the CLI from JS dependency execute:
```bash
npx mqtt sub -t 'etauker/home-automation/response' -h 'localhost' -v -u $MOSQUITTO_USERNAME  -P $MOSQUITTO_PASSWORD
npx mqtt pub -t 'etauker/home-automation/request' -h 'localhost' -v -u $MOSQUITTO_USERNAME  -P $MOSQUITTO_PASSWORD -m 'hello from CLI'
```

## References
- https://www.awesome-ha.com/
- https://hometechhacker.com/mqtt-home-assistant-using-docker-eclipse-mosquitto/
- https://github.com/vvatelot/mosquitto-docker-compose


TODO:
- alter data drectory permissions
    - add user that runs the container and admin user to the same user group


echo $USER
groups $USER
sudo groupadd hass
sudo usermod -a -G $USER hass
groups $USER


TODO: 
1. create home-assistant user
```
sudo useradd <user>
sudo passwd <user>
sudo groupadd <group>
sudo usermod -a -G <group> <user>
```
2. change config folder ownership to home-assistant user
sudo chown --recursive <user>:<group> <directory>
3. run docker image with this user


# Mounting network drive
- https://obie.hashnode.dev/ubuntu-server-permanently-mounting-samba-shares