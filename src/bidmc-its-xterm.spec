Summary:	BIDMC ITS Xterm.js service
Name:		bidmc-its-xterm
Version:	1.3
Release:	5%{?dist}

License:	MIT
Source0:	xterm.tgz

BuildArch:	noarch
Group:		Applications/Internet
URL:		https://git.bidmc.harvard.edu/projects/CAS/repos/server/browse/opt/xterm
Prefix:		/opt

Requires:	gcc gcc-c++ nodejs openssl

%description
an Apache-Node.js implementation for web SSH client needs

%global debug_package %{nil}

%prep
%setup -n xterm -q

%build
mkdir node_modules
mkdir keys
cd keys
openssl req -nodes -newkey rsa:2048 -sha256 -keyout "localhost.key" -x509 -days 1075 -out "localhost.crt" -subj "/C=US/ST=Massachusetts/L=Boston/O=Beth Israel Deaconess Medical Center Inc/OU=IS/CN=localhost"
cd -

%install
mkdir -p %{buildroot}%{prefix}
cp -a %{_builddir}/xterm %{buildroot}%{prefix}/

%post
cd %{prefix}/xterm
find . -type d -exec chmod ug+rwx {} \;
find . -type f -exec chmod -x {} \;
chmod +x *.sh
chown root.sshd keys
chmod 2750 keys
chown nobody.wheel node_modules
chmod 2575 node_modules

echo
echo "*** USING YOUR LOCAL wheel ACCOUNT, not root ***"
echo cd %{prefix}/xterm
echo ./install.sh
echo ./build.sh
echo
echo 'Configure for use with Apache, see: xterm-localhost-proxy.conf'
echo 'sudo systemctl restart httpd'
echo 'cp xterm-its@.service /etc/systemd/system/'
echo 'systemctl enable xterm-its@localhost'
echo 'systemctl start xterm-its@localhost'
echo
echo '...or manually: npm test'
echo

%files
%attr(775,root,wheel) /opt/xterm

%changelog
* Thu Sep 10 2020 Robert Hurst <rhurst@bidmc.harvard.edu>
- rpm spec updated for RHEL 8 packaging
- updated npm dependencies
* Thu Feb 13 2020 Robert Hurst <rhurst@bidmc.harvard.edu>
- node-pty          0.8.1   ->  0.9.0
- ws                7.1.2   ->  7.2.1
- xterm             4.0.0   ->  4.4.0
- added Unicode 11 support with xterm-addon-unicode11
* Tue Sep 17 2019 Robert Hurst <rhurst@bidmc.harvard.edu>
- package errata fixes
* Wed Sep 11 2019 Robert Hurst <rhurst@bidmc.harvard.edu>
- major npm package outdates:
- @types/express    4.17.0  ->  4.17.1
- @types/node      10.14.10 -> 10.14.18
- @types/ws          6.0.1  ->  6.0.3
- browserify        16.2.3  -> 16.5.0
- typescript         3.5.2  ->  3.6.3
- ws                 7.0.1  ->  7.1.2
- xterm             3.14.4  ->  4.0.0
* Tue Jul 24 2018 Robert Hurst <rhurst@bidmc.harvard.edu>
- upgraded to ws 6.0.0
- improve client connection information to web server & pid
- added timeout and wall attributes to client.json
- re-connect a disconnected session upon window focus
* Mon Jun 11 2018 Robert Hurst <rhurst@bidmc.harvard.edu>
- upgraded to Xterm 3.4.1 package
- removed express-ws (DoS vulnerability), using ws
- improved logging and process signal handling
* Mon May 21 2018 Robert Hurst <rhurst@bidmc.harvard.edu>
- upgraded to Xterm 3.4 package
* Wed Apr 18 2018 Robert Hurst <rhurst@bidmc.harvard.edu>
- upgraded to Xterm 3.3 package
- split x-forwarded-for list up from NetScalar passing
* Mon Mar 12 2018 Robert Hurst <rhurst@bidmc.harvard.edu>
- upgraded to Xterm 3.2 package
- RPM spec optimizations
* Thu Feb  8 2018 Robert Hurst <rhurst@bidmc.harvard.edu>
- original rpm
