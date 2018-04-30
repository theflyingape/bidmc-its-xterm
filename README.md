# BIDMC ITS xterm services

> ## an Apache-NodeJs implementation for web SSH client needs

- ./install.sh [rpm]
- ./build.sh
- npm test

Create a new instance in the **its** folder. Each instance has an **app.json**
(node app listener) and a **client.json** (terminal characteristics for the
browser-side) configuration file.

## Resources

### [XTerm.js](https://xtermjs.org)

> terminal front-end component written in TypeScript that works in the
modern-day browser

### [node-pty](https://www.npmjs.com/package/node-pty)

> node.js bindings to fork processes with pseudoterminal file descriptors. It
returns a terminal object which allows reads and writes.

:us: :copyright: 2018 [Robert Hurst](https://www.linkedin.com/in/roberthurstrius/)
