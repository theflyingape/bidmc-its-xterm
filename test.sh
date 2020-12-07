#!/bin/bash
#
sudo -v
[ -d logs ] || mkdir logs
[ -L /etc/profile.d/nodejs.sh ] && source /etc/profile.d/nodejs.sh
NODE=`which node 2> /dev/null`
[ -z "${NODE}" ] && NODE="/opt/rh/rh-nodejs14/root/usr/bin/node"
APP=bidmc-*.js
[ -f $APP ] || exit 1

domain="its"

for folder in $domain/*; do

	server=${folder#${domain}/*}
	log="logs/${server}.log"
	profile="${domain}@${server}"

	echo -n "xterm-${server} --> "

	job=`pidof xterm-${server}`
	if [ -n "$job" ]; then
		echo $job
		sudo kill $job 2> /dev/null
		sleep 0.25
		tail -2 "${log}"
	fi

	echo -n "starting "
	# prepend sudo if required, else the developer can run it if the port > 1024
	${NODE} ${APP} "$profile" >& "${log}" &
	sleep 0.5
	job=`pidof xterm-${server}` && echo $job || echo "error"
	tail -2 "${log}"

done

#cat logs/*.log		# service startup issue
#sudo netstat -pant | grep xterm | grep its@	# running xterm services
