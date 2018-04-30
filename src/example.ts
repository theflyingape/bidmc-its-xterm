import { Terminal } from 'xterm'
import * as fit from 'xterm/lib/addons/fit/fit'

let term = new Terminal()
Terminal.applyAddon(fit)
term.open(document.getElementById('#terminal'))
//term.fit()     // This method is now available for usage
fit.fit(term)  // This will do the exact same thing

term.write('Hello from \x1B[1;3;31mxterm.js\x1B[m using a bundle\n')
term.write('$ ')
