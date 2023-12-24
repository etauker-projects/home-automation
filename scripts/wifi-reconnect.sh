#!/usr/bin/env

value=`nmcli radio wifi`
#value="disabled"
echo "Wifi is $value"

if [[ $value != *"enabled"* ]]; then
  echo "Restarting wifi"
  nmcli radio wifi off
  nmcli radio wifi on
  echo "Wifi restarted"
fi
