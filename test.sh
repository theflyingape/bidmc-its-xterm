#!/bin/sh
#
sudo -v
[ -d logs ] || mkdir logs
[ -L /etc/profile.d/nodejs.sh ] && source /etc/profile.d/nodejs.sh
NODE=`which node 2> /dev/null`
[ -z "${NODE}" ] && NODE="/opt/rh/rh-nodejs12/root/usr/bin/node"
APP=bidmc-*.js
[ -f $APP ] || exit 1

domain="its"

for folder in $domain/*; do

	server=${folder#${domain}/*}
	profile="${domain}@${server}"

	echo -n "xterm-${server} --> "

	sudo killall xterm-${server} 2> /dev/null
	sudo ${NODE} ${APP} "$profile" >& logs/${server}.log &

	sleep 0.25
	pidof xterm-${server} || echo "error"

done

#cat logs/*.log		# service startup issue
#sudo netstat -pant | grep xterm | grep its@	# running xterm services
