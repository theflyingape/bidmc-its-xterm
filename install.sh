#!/bin/sh
#
# xterm.js  -  https://www.npmjs.com/package/xterm
# an implementation for BIDMC ITS services
# - 17-Jan-2018 RHurst 
#

sudo -v
[ -d build ] || mkdir build
[ -d logs ] || mkdir logs
if [ ! -d keys ]; then
	mkdir keys
	sudo chown root.sshd keys
	sudo chmod 2750 keys
	sudo openssl req -nodes -newkey rsa:2048 -sha256 -keyout "keys/localhost.key" -x509 -days 1095 -out "keys/localhost.crt" \
		-subj "/C=US/ST=Massachusetts/L=Boston/O=Beth Israel Deaconess Medical Center Inc/OU=IS/CN=localhost"
fi

NODEJS=$( dirname "`which node 2> /dev/null`" )
[ "${NODEJS}" = "." ] && NODEJS=/opt/rh/rh-nodejs12/root/usr/bin
if [ ! -f $NODEJS/node ]; then
	sudo yum install gcc gcc-c++ openssl nodejs
	[ -n "$http_proxy" ] && $NODEJS/npm config set proxy=$http_proxy
	[ -n "$https_proxy" ] && $NODEJS/npm config set https-proxy=$https_proxy
fi

echo
echo "⇒ actively running Xterm.js app services:"
sudo netstat -pant | grep -E 'LISTEN.*xterm'
echo "⇒ actively running Xterm.js SSH client sessions:"
pstree -s | grep -E 'xterm.*ssh'

echo
echo -n "Press RETURN to continue, 'stop' all running services(s), or Ctrl-C to abort: "
read cont

domain="its"
if [ "${cont}" = "stop" ]; then
	for folder in $domain/*; do
		server=${folder#${domain}/*}
		profile="${domain}@${server}"
		sudo systemctl stop xterm-${profile}
	done
fi

echo
echo "Node.js `$NODEJS/node -v`"
[ -d node_modules ] && sudo rm -rf node_modules
mkdir node_modules
sudo chown nobody.wheel node_modules
sudo chmod 2575 node_modules
$NODEJS/npm install

[ -s browserify ] || ln -s node_modules/browserify/bin/cmd.js browserify
[ -s tsc ] || ln -s node_modules/typescript/bin/tsc

echo
echo "Construct your its/server needs and enable startup service(s), i.e.,"
echo "# sudo cp xterm-its@.service /etc/systemd/system/"
echo "# sudo systemctl daemon-reload"
for folder in $domain/*; do
	server=${folder#${domain}/*}
	profile="${domain}@${server}"
	echo "# sudo systemctl enable xterm-${profile}"
done

exit
