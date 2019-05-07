#!/bin/sh
#
sudo -v
[ -L /etc/profile.d/nodejs.sh ] && source /etc/profile.d/nodejs.sh
NODE=`which node 2> /dev/null`
[ -z "${NODE}" ] && NODE="/opt/rh/rh-nodejs10/root/usr/bin/node"
APP=bidmc-*.js

domain="its"

for folder in $domain/*; do

	server=${folder#${domain}/*}
	profile="${domain}@${server}"

	sudo killall xterm-${server} 2> /dev/null
	sudo ${NODE} ${APP} "$profile" >& logs/${server}.log &

done

cat logs/*.log		# service startup issue
# sudo netstat -pant | grep xterm | grep its@	# running xterm services

