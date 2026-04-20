#!/bin/bash
export DISPLAY=:0
export XAUTHORITY=$HOME/.Xauthority
echo "monitor_off: turning display off"
xrandr --output HDMI-1 --off
echo "monitor_off: display off complete"
