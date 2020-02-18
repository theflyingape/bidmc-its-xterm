#!/bin/sh

echo "Debugging ..."
sudo -v
[ -L /etc/profile.d/nodejs.sh ] && source /etc/profile.d/nodejs.sh
NODE=`which node 2> /dev/null`
[ -z "${NODE}" ] && NODE="/opt/rh/rh-nodejs12/root/usr/bin/node"
APP=bidmc-*.js

sudo killall -KILL xterm-localhost 2> /dev/null
sudo ${NODE} ${APP} "its@localhost" >& debug.log &
google-chrome --app=https://localhost:2222/xterm/its@localhost/ 2> /dev/null &
