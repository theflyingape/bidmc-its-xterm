Summary:	BIDMC ITS Xterm.js service
Name:		bidmc-its-xterm
Version:	1.0
Release:	7%{?dist}

License:	MIT
Source0:	xterm.tgz

BuildArch:	noarch
Group:		Applications/Internet
URL:		https://git.bidmc.harvard.edu/projects/CAS/repos/server/browse/opt/xterm
Prefix:		/opt

Requires:	gcc gcc-c++ rh-nodejs8-nodejs

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
