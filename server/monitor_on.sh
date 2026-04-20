#!/bin/bash
export DISPLAY=:0
export XAUTHORITY=$HOME/.Xauthority
echo "monitor_on: turning display on"
xrandr --output HDMI-1 --auto
xset dpms force on
echo "monitor_on: display on complete"
