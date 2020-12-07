/*****************************************************************************\
 *  BIDMC ITS Secure SHell for Chrome/Edge/Firefox                           *
 *  app.ts authored by: Robert Hurst <rhurst@bidmc.harvard.edu>              *
\*****************************************************************************/
import dns = require('dns')
import express = require('express')
import fs = require('fs')
import http = require('http')
import https = require('https')
import os = require('os')
import path = require('path')
import pty = require('node-pty')
import serverStatic = require('serve-static')
import syslog = require('modern-syslog')
import ws = require('ws')
import { ITerminalOptions } from 'xterm'
const { URL } = require('url')

interface config {
  profile: string
  cmd: string
  params: string[]
  loglevel?: string|number
  pty?: {
    term: string
    cols: number
    rows: number
    cwd: string
    env: {}
  }
  host: string
  port: number
  sslKey?: string
  sslCert?: string
  sslFallback?: boolean
  static?: string
}

interface client extends ITerminalOptions {
  title?: string
}

//  app server init
let profile = process.argv.length > 2 ? process.argv[2] : 'its@localhost'
let folder = profile.split('@').join('/')
let xterm = folder.split('/').splice(-1)[0].split('.')[0]
process.title = `xterm-${xterm}`

console.log('*'.repeat(80))
console.log(`Node.js ${process.version} BIDMC ITS Xterm service using profile: ${profile}`)
console.log(`on ${os.hostname()} (${process.platform}) at ` + new Date())

process.chdir(__dirname)
console.log(`cwd:\t\t${__dirname}`)

console.log(`configuration:\t./${folder}/app.json`)
let config: config = require(`./${folder}/app.json`)

console.log(`client options:\t./${folder}/client.json`)
let options: client = require(`./${folder}/client.json`)
if (!options.title) options.title = os.hostname() || 'localhost'

config.loglevel = config.loglevel || 'LOG_NOTICE'
if (isNaN(+config.loglevel)) config.loglevel = syslog.level[config.loglevel]
console.log(`syslog: \t${syslog.level[+config.loglevel]} - level ${config.loglevel} event messaging`)

if (!config.profile || (config.profile !== profile)) {
  console.log(`?FATAL: missing  or mismatch profile attribute, i.e., "profile":"${profile}"`)
  process.exit()
}

if (!config.cmd) {
  console.log('?FATAL: missing cmd attribute, i.e., "cmd":"sh"')
  process.exit()
}

if (!config.params) {
  console.log('?FATAL: missing params attribute')
  process.exit()
}

if (!config.pty) {
  console.log('?WARNING: missing pty attribute, setting to defaults')
  config.pty = { term: '', cols: 0, rows: 0, cwd: '', env: {} }
}

export let host: string = config.host || 'localhost'
export let port: number = config.port || 2222

if (!config.sslKey && !config.sslFallback) {
  console.log('?FATAL: missing sslKey/sslCert filename pair')
  process.exit()
}

if (!config.static)
  config.static = './static'

var sessions = {} //, logs = {}

//  app server startup
dns.lookup(config.host, (err, addr, family) => {
  const app = express()
  app.set('trust proxy', ['loopback', addr])

  let server, ssl
  try {
    ssl = { cert: fs.readFileSync(config.sslCert), key: fs.readFileSync(config.sslKey) }
    server = https.createServer(ssl, app)
  }
  catch (err) {
    console.log(`SSL error: \t${err.message}`)
    console.log(`SSL fallback: \t${config.sslFallback}`)
    if (config.sslFallback) {
      server = http.createServer(app)
      //  is this on a Chrome Desktop (sftp/2222)?
      if (port == 2222 && os.hostname() == 'penguin') {
        config.params = [ '-l' ]
        port = 8080
      }
    }
    else
      process.exit()
  }

  console.log(`process:\t${process.title} [${process.pid}]`)

  server.listen(port, host)
  console.log(` + listening on http${ssl ? 's' : ''}://${host}:${port}/xterm/${profile}/`)
  console.log(` + serving up:\t${config.cmd} ${config.params.join(' ')}`)
  console.log('*'.repeat(80))
  syslog.open(process.title)
  syslog.upto(+config.loglevel)
  syslog.note(`listening on http${ssl ? 's' : ''}://${host}:${port}/xterm/${profile}/`)
  syslog.note(`serving up '${config.cmd} ${config.params.join(' ')}'`)

  //  enable WebSocket endpoints
  const wss = new ws.Server({ noServer:true, path:`/xterm/${profile}/session/`, clientTracking: true })

  server.on('upgrade', (req, socket, head) => {
    const pathname = new URL(req.url, `https://${config.host}`).pathname
    if (pathname === `/xterm/${profile}/session/`) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req)
      })
    } else {
      syslog.warn(`Unhandled WebSocket request: ${pathname}`)
      syslog.debug(` + REQUEST: ${req}`)
      syslog.debug(` + HEADER: ${head}`)
      socket.destroy()
    }
  })

  //  web services
  app.use(`/xterm/${profile}`, serverStatic(path.join(__dirname, folder), {redirect: false}))
  app.use(`/xterm/${profile}`, serverStatic(path.join(__dirname, config.static)))

  //  REST services
  app.post(`/xterm/${profile}/session`, function (req, res) {
    let cols = parseInt(req.query.cols.toString()) || config.pty.cols
    let rows = parseInt(req.query.rows.toString()) || config.pty.rows
    let client = req.header('x-forwarded-for') || req.hostname
    syslog.debug(`POST new session from remote host: ${client}`)
    //  filter 1st address, assume any other(s) are proxies
    process.env.SSH_CLIENT = client.split(',')[0]

    let term = pty.spawn(config.cmd, config.params, {
        name: config.pty.term || 'xterm256-color',
        cols: cols || 80, rows: rows || 25,
        cwd: config.pty.cwd || __dirname,
        env: config.pty.env || process.env
      })

    if (term.pid) {
      syslog.note(`Started app PID: ${term.pid} CLIENT: ${process.env.SSH_CLIENT} (${rows}x${cols})`)
      sessions[term.pid] = term
      sessions[term.pid].client = process.env.SSH_CLIENT
      //logs[term.pid] = ''
    }
    else
      syslog.warn(`Failed to spawn app request for CLIENT: ${process.env.SSH_CLIENT} (${rows}x${cols})`)

    res.json({ host: os.hostname(), pid: term.pid, cols: cols, rows: rows, options: options })
    res.end()

    //  buffer any initial output from forked process
    term.on('data', function (data) {
      sessions[term.pid].startup = (sessions[term.pid].startup || '') + data
    })

  })

  app.post(`/xterm/${profile}/session/:pid/size`, function (req, res) {
    let pid = parseInt(req.params.pid)
    let cols = parseInt(req.query.cols.toString())
    let rows = parseInt(req.query.rows.toString())
    let term = sessions[pid]

    if (!term) return
    syslog.debug(`Resize terminal ${pid} (${rows}x${cols})`)
    term.resize(cols, rows)
    res.end()
  })

  //  WebSocket endpoints
  //  utilize upgraded socket connection to serve I/O between app pty and browser client
  wss.on('connection', (browser, req) => {
    const what = new URL(req.url, `https://${config.host}`)
    let pid = parseInt(what.searchParams.get('pid'))
    let term = sessions[pid]
    syslog.info(`WebSocket CLIENT: ${term.client} connected to app PID: ${term.pid}`)
    if (term.startup) browser.send(term.startup)

    //  app --> browser client
    term.on('data', (data) => {
      try {
        browser.send(data)
      } catch (ex) {
        if (term.pid) {
          syslog.warn(`Aborted pty -> ws I/O from app PID: ${term.pid} to browser CLIENT: ${term.pid} error:`, ex.message)
          browser.close()
        }
      }
    })

    term.on('close', () => {
      //  app shutdown
      if (term.client) {
        syslog.note(`Closed app PID: ${term.pid} CLIENT: ${term.client}`)
        pid = 0
        browser.close()
      }
      else {
        syslog.warn(`Closed orphaned app PID: ${term.pid}`)
      }
    })

    //  browser client --> app
    browser.on('message', (msg) => {
      try {
        term.write(msg)
      } catch (ex) {
        syslog.warn(`Aborted ws -> pty I/O from browser CLIENT: ${term.client} to app PID: ${term.pid} error:`, ex.message)
        browser.close()
      }
    })

    browser.on('close', () => {
      if (pid > 1) try {
        //  did user close browser with an open app?
        term.destroy()
        syslog.warn(`Closed browser CLIENT: ${term.client}`)
        syslog.note(`Terminated app PID: ${term.pid} CLIENT: ${term.client}`)
        delete sessions[pid]
        term.client = ''
        //delete logs[pid]
      }
      catch (ex) {
        syslog.error(`?FATAL browser CLIENT: ${term.client} close event on PID: ${term.pid} "${ex}"`)
      }
    })
  })
})

function abortAll(signal = 'SIGHUP')
{
  syslog.note(`Aborting any open sessions: ${Object.keys(sessions).length}`)
  for (let user in sessions) {
    if (user) {
      let term = sessions[user]
      let pid = +user
      if (pid > 1) term.kill()
      delete sessions[user]
    }
  }
}

process.on('SIGHUP', function () {
  console.log(new Date() + ' :: received hangup')
  syslog.warn('hangup')
  abortAll()
})

process.on('SIGINT', function () {
  console.log(new Date() + ' :: received interrupt')
  syslog.warn('interrupt')
  abortAll('SIGINT')
})

process.on('SIGQUIT', function () {
  console.log(new Date() + ' :: received quit')
  syslog.warn('quit')
  abortAll('SIGQUIT')
})

process.on('SIGTERM', function () {
  console.log(new Date() + ' shutdown')
  syslog.note('Terminating this service profile')
  abortAll('SIGTERM')
  setTimeout(process.exit, 10 * (Object.keys(sessions).length + 1))
})
