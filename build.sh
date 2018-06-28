#!/bin/sh
#
# transpile into the server-side middleware app
# and bundle for the client-side browser
# - 17-Jan-2018 RHurst
# added rpmbuild for admin installers
# - 08-Feb-2018 RHurst
#

#!/bin/sh
#
# transpile, place, and bundle
echo "Transpiling ... "
TSC=./node_modules/typescript/bin/tsc
[ -x "${TSC}" ] || npm install
${TSC} -p ./src --outDir ./build
cp -pv ./build/app.js ./bidmc-its-xterm-app.js
echo "Bundling ... "
./node_modules/browserify/bin/cmd.js ./build/client.js -o ./static/bundle.js
ls -gho ./static/bundle.js
rm build/*

# make RPM?
[ "$1" == "rpm" ] || exit 0
sudo -v || exit
which dos2unix > /dev/null && dos2unix src/bidmc-its-xterm.spec
cp src/bidmc-its-xterm.spec ~/rpmbuild/SPECS/
sudo tar czvf ~/rpmbuild/SOURCES/xterm.tgz 	\
	--transform 's,\(.*\),xterm/\1,' 	\
	README.md 			\
	*.conf 				\
	*.json 				\
	*.sh 				\
	its/localhost 			\
	src 				\
	static				\
	xterm-its@.service
cd ~/rpmbuild
rpmbuild -ba --target=noarch SPECS/bidmc-its-xterm.spec
cd -
