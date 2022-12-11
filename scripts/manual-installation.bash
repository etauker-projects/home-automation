#! env bash
# Instructions based on: https://www.home-assistant.io/installation/raspberrypi#install-home-assistant-core

echo "Script not automated, plesse run the steps manually"
exit 1

sudo apt-get update && \
sudo apt-get upgrade -y && \
sudo apt-get install -y \
    python3 \
    python3-dev \
    python3-venv \
    python3-pip \
    bluez \
    libffi-dev \
    libssl-dev \
    libjpeg-dev \
    zlib1g-dev \
    autoconf \
    build-essential \
    libopenjp2-7 \
    libtiff5 \
    libturbojpeg0-dev \
    tzdata \
    python3.10-venv \
    python3.10-dev

# Optionals
sudo apt-get install -y \
    sqlite3                 # needed to saved sensor data


# TODO: find out and document how to set a password
sudo useradd -rm homeassistant -G dialout,gpio,i2c && \
sudo mkdir /srv/homeassistant && \
sudo chown homeassistant:homeassistant /srv/homeassistant && \
sudo -u homeassistant -H -s

cd /srv/homeassistant && \
python3 -m venv . && \
source bin/activate && \
python3 -m pip install wheel && \
pip3 install homeassistant && \
hass

# Optional
mkdir ~/scripts
echo "cd /srv/homeassistant && source bin/activate && hass &" > ~/scripts/start-hass.bash

# TODO: find out and document how to to run this at startup



# SQL helpers
SELECT entity_id, COUNT(*) as count FROM states GROUP BY entity_id ORDER BY count DESC LIMIT 10;
SELECT * FROM states WHERE entity_id = "sensor.dexcom_tkersulis94_gmail_com_glucose_value" AND state != "unknown" ORDER BY last_updated DESC LIMIT 10;
