#!/bin/bash
export SWAYSOCK=$(ls /run/user/1000/sway-ipc.* | head -n 1)
swaymsg output HDMI-A-1 disable