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


## References
- https://hometechhacker.com/mqtt-home-assistant-using-docker-eclipse-mosquitto/
- https://github.com/vvatelot/mosquitto-docker-compose