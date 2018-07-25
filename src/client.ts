/*****************************************************************************\
 *  BIDMC ITS Secure SHell for Chrome/Edge/Firefox                           *
 *  client.ts authored by: Robert Hurst <rhurst@bidmc.harvard.edu>           *
\*****************************************************************************/

//  CLIENT startup
//  https://webfarm/xterm/its@server/
//  @params [?rows=25&cols=80&size=18]

//  REST API 
//  https://webfarm/xterm/its@server/session/
//  @params :pid[/size?cols=:cols&rows=:rows]
//  https://webfarm/xterm/its@server/support/
//  @params :remote=[ip|host]

//  IE11 polyfills
(<any>Promise)._unhandledRejectionFn = function(rejectError) {}
import { assign } from 'es6-object-assign'
import 'whatwg-fetch'

//  Xterm.js
import { Terminal, ITerminalOptions } from 'xterm'
import * as attach from 'xterm/lib/addons/attach/attach'
import * as fit from 'xterm/lib/addons/fit/fit'

interface client extends ITerminalOptions {
    title?: string
    bgColor?: string
    keymap?: [{
        keyCode: number
        shiftKey: boolean
        mapCode: number
    }]
    timeout?: number
    wall?: string
}

const BELL_SOUND = 'data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU='
let app = location.pathname.replace(/\/+$/, "")
let flexible = true
let params = parseStartup(location.search)
let cols = params.cols, rows = params.rows, fontSize = params.size
let startup: client = {
    bellSound: BELL_SOUND, bellStyle: 'sound',
    cursorBlink: true, fontFamily: 'Consolas,Lucida Console,monospace',
    experimentalCharAtlas: 'dynamic',
    timeout: 60
}
let options: client = assign({}, startup)
let host = ''
let pid = 0
let term: Terminal

var reconnect
var protocol, socketURL, socket

newSession()

function newSession() {
    pid = 0
    if (reconnect) clearInterval(reconnect)

    // fit is called within a setTimeout, cols and rows need this
    setTimeout(function () {
        fetch(app + '/session/?cols=' + cols + '&rows=' + rows, { method: 'POST' }).then(function (res) {
            res.json().then(function (session) {
                //res.text()
                //pid = parseInt(session)
                host = session.host
                pid = session.pid

                options.cols = 0
                options.rows = 0
                assign(startup, session.options)
                if (startup.title) document.title = startup.title
                if (startup.bgColor) document.bgColor = startup.bgColor
                if (startup.cols) options.cols = startup.cols
                if (startup.rows) options.rows = startup.rows
                if (startup.fontSize) options.fontSize = startup.fontSize
                //  assert any URL overrides
                if (params.cols) options.cols = params.cols
                if (params.rows) options.rows = params.rows
                if (params.size) options.fontSize = params.size
                if (options.cols || options.rows)
                    flexible = false
                else
                    flexible = true
                //  init client to match backend
                startup.cols = session.cols
                startup.rows = session.rows

                term = new Terminal(startup)
                Terminal.applyAddon(attach)
                Terminal.applyAddon(fit)

                if (options.keymap && options.keymap.length)
                    term.attachCustomKeyEventHandler(function (ev) {
                        for (let i in options.keymap)
                            if (options.keymap[i].keyCode == ev.keyCode && options.keymap[i].shiftKey == ev.shiftKey) {
                                socket.send(String.fromCharCode(options.keymap[i].mapCode))
                                return false
                            }
                    })

                term.on('resize', function (size) {
                    if (!pid) return
                    cols = size.cols
                    rows = size.rows
                    fetch(app + '/session/' + pid + '/size?cols=' + cols + '&rows=' + rows, { method: 'POST' })
                })

                term.open(document.getElementById('terminal'))
                window.dispatchEvent(new Event('resize'))

                term.writeln('\x1B[0;1;4mW\x1B[melcome to \x1B[35mBIDMC\x1B[m ITS Xterm.js on \x1B[1m' + host +'\x1B[m (' + pid + ' 🖥 )')
                term.write('\x1B[2mConnecting secure WebSocket to ' + app.split('@')[1] + ' ... ')

                protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://'
                socketURL = protocol + location.hostname + ((location.port) ? (':' + location.port) : '')
                    + app + '/session/'

                socketURL += '?pid=' + pid
                socket = new WebSocket(socketURL)

                socket.onopen = function() {
                    //term.attach(socket)
                    attach.attach(term, socket, true, true)
                    term.focus()
                    term.setOption('cursorBlink', true)
                    term.writeln('open\x1B[m\n')
                }

                socket.onclose = function() {
                    term.setOption('cursorBlink', false)
                    term.writeln('\x1B[0;2mWebSocket close\x1B[m')
                    pid = 0
                    if (startup.timeout > 0)
                        reconnect = setInterval(checkCarrier, startup.timeout * 1000)
                }

                socket.onerror = function() {
                    term.writeln('\x1B[0;2mWebSocket \x1B[22;1;31merror\x1B[m')
                    pid = 0
                }
            })
        })
    }, 0)
}

// terminate endpoint view and access to the web server
function checkCarrier() {
    term.dispose()
    document.getElementById('terminal').hidden = true
    let wall = document.getElementById('wall')
    if (startup.wall) wall.innerHTML += startup.wall
    wall.hidden = false
    if (reconnect) clearInterval(reconnect)
}

// if user returns to a closed session window, refresh
window.onfocus = function() {
    if (pid) return
    //window.location.reload(true)
}

window.onresize = function() {
    if (!pid || !term) return

    let t: CSSStyleRule
	let stylesheet = <CSSStyleSheet>document.styleSheets[0]
    for (let i in stylesheet.cssRules) {
		let css: CSSStyleRule = <any>stylesheet.cssRules[i]
        if (css.selectorText === '#terminal')
            t = css
    }

    assign(t.style, { 'top':'0px', 'left': '0px', 'height':window.innerHeight + 'px', 'width':window.innerWidth + 'px' })
//  autocompute resize ROWSxCOLS to fullwindow and notify backend app
    if (flexible) {
        if (fontSize) term.setOption('fontSize', fontSize)
        fit.fit(term)
        centerize()
        return
    }

//  client has a targeted ROWSxCOLS goal, adjust terminal within browser window
    term.setOption('fontSize', 20)
    let xy = fit.proposeGeometry(term)
    let w = Math.trunc(20 * xy.cols / (options.cols || xy.cols))
    let h = Math.trunc(20 * xy.rows / (options.rows || xy.rows))
    term.setOption('fontSize', h < w ? h : w)
    xy = fit.proposeGeometry(term)

//  make it stick
    term.resize(options.cols || xy.cols, options.rows || xy.rows)
    centerize()

//  menterize terminal's canvas within browser window
    function centerize() {
        let xvp: CSSStyleRule = <any>document.getElementsByClassName('xterm-viewport')[0]
        let xt = document.getElementsByClassName('xterm-screen')[0]
        if (!xt) return
        let sb = 0
        if ((<any>term).viewport) sb = (<any>term).viewport.scrollBarWidth
        let th = xt.clientHeight
        let tw = xt.clientWidth
        let tt = (window.innerHeight - th) >>1
        let tl = (window.innerWidth - tw) >>1
        assign(t.style, { 'top':tt + 'px', 'left':tl + 'px', 'height':th + 'px', 'width':tw + 'px' })
        //  expand viewport (with scroll area) to match screen/canvas, else it covers the scrollbar
        xvp.style.width = (tw + sb) + 'px'
    }
}

//  allow for URL to manually set geometry/font requirements
function parseStartup(queryString: string) {
    let params = { cols:0, rows:0, size:0 }, queries, temp, i, l
    queries = queryString.replace(/^\?/, "").split("&")
    for (i = 0, l = queries.length; i < l; i++ ) {
        temp = queries[i].split('=')
        params[temp[0]] = parseInt(temp[1])
    }
    //if (params.rows || params.cols) flexible = false
    return params
}
