const mqtt = require('mqtt')
const options = {
    clientId: 'script_' + Math.random().toString(16).substr(2, 8),
    protocolId: 'MQTT',
    protocolVersion: 4,
    clean: true,
    connectTimeout: 30000,
    username: 'username',
    password: 'password',
}
const client  = mqtt.connect('mqtt://192.168.1.16', options)
// const topic = 'zigbee2mqtt/#';
const topic = 'zigbee2mqtt/cube_001';

client.on('error', error => {
    console.log(error);
})

client.on('connect', function () {
  client.subscribe(topic, function (err) {
    // if (!err) {
    //   client.publish(topic, 'Hello mqtt')
    // }

    if (err) {
        console.log(err);
    }
  })
})

client.on('message', function (topic, message) {
  // message is Buffer

  try {
    // wakeup, tap, shake, slide, rotate_right, rotate_left, flip90, flip180
    const json = JSON.parse(message.toString());
    if (json.action) {
        // console.log(json)
        // if (['flip90'].includes(json.action)) {
        //     console.log(`${json.action} ${json.action_from_side} -> ${json.action_to_side} (current = ${json.side}, link = ${json.linkquality})`)
        // } else if (['rotate_right', 'rotate_left'].includes(json.action)) {
        //     console.log(`${json.action} ${json.action_angle} (angle = ${json.angle}, side = ${json.side} link = ${json.linkquality})`)
        // } else {
        //     console.log(json);
        // }

        console.log({
            action: json.action,
            side: json.side,
            action_angle: json.action_angle,
            action_from_side: json.action_from_side,
            action_side: json.action_side,
            action_to_side: json.action_to_side,
            angle: json.angle,
        })
    }
  } catch (error) {
    console.error('error parsing json', error);
  }
  setTimeout(() => {
    client.end();
  }, 60000);
})