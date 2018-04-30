  /*****************************************************************************\
 *  BIDMC ITS Secure SHell for Chrome/Edge/Firefox                           *
 *  app.ts authored by: Robert Hurst <rhurst@bidmc.harvard.edu>              *
\*****************************************************************************/
import dns = require('dns')
import express = require('express')
import expressWs = require('express-ws')
import https = require('https')
import fs = require('fs')
import os = require('os')
import path = require('path')
import pty = require('node-pty')
import serverStatic = require('serve-static')
import syslog = require('modern-syslog')
import { ITerminalOptions } from 'xterm'

interface config {
  profile: string
  cmd: string
  params: string[]
  debug?: boolean
  loglevel?: string
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
  static?: string
}

//  app server init
let profile = process.argv.length > 2 ? process.argv[2] : 'its@localhost'
let folder = profile.split('@').join('/')
let xterm = folder.split('/').splice(-1)[0].split('.')[0]

console.log('*'.repeat(80))
console.log(`Node.js ${process.version} BIDMC ITS XTerm service using profile: ${profile}`)
console.log(`startup on ${process.env['HOSTNAME']} (${process.platform}) at ` + new Date())

process.chdir(__dirname)
console.log(`cwd:\t\t${__dirname}`)

console.log(`configuration:\t./${folder}/app.json`)
let config: config = require(`./${folder}/app.json`)

console.log(`client options:\t./${folder}/client.json`)
let options: ITerminalOptions = require(`./${folder}/client.json`)

config.loglevel = config.loglevel || 'LOG_NOTICE'
if (isNaN(+config.loglevel)) config.loglevel = syslog.level[config.loglevel]
console.log(`syslog: \t${syslog.level[+config.loglevel]} - level ${config.loglevel} event messaging`)
syslog.upto(config.loglevel)

if (config.debug) {
  console.log('extended debugging messages will get recorded here')
}

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
if (!config.sslKey) {
  console.log('?FATAL: missing sslKey/sslCert filename pair')
  process.exit()
}
export let ssl = { key: fs.readFileSync(config.sslKey), cert: fs.readFileSync(config.sslCert) }

if (!config.static)
  config.static = './static'

var sessions = {}, logs = {}

//  app server startup
dns.lookup(config.host, (err, addr, family) => {

  const base = express()
  base.set('trust proxy', ['loopback', addr])
  let server = https.createServer(ssl, base)

  process.title = `xterm-${xterm}`
  console.log(`process:\t${process.title} [${process.pid}]`)

  server.listen(port, host)
  console.log(` + listening on https://${host}:${port}/xterm/${profile}/`)
  console.log(` + serving up:\t${config.cmd} ${config.params.join(' ')}`)
  console.log('*'.repeat(80))
  syslog.open(process.title)
  syslog.note(`listening on https://${host}:${port}/xterm/${profile}/`)
  syslog.note(`serving up '${config.cmd} ${config.params.join(' ')}'`)

  //  add WebSocket endpoints for Express applications
  const { app } = expressWs(base, server)
  //app.use(`/xterm/${profile}`, express.static(path.join(__dirname, config.static)))
  app.use(`/xterm/${profile}`, serverStatic(path.join(__dirname, folder), {redirect: false}))
  app.use(`/xterm/${profile}`, serverStatic(path.join(__dirname, config.static)))

  app.post(`/xterm/${profile}/session`, function (req, res) {
    let cols = parseInt(req.query.cols) || config.pty.cols
    let rows = parseInt(req.query.rows) || config.pty.rows
    let client = req.header('x-forwarded-for') || req.hostname
    syslog.info(`POST new session from remote host: ${client}`)
    //  filter 1st address, assume any other(s) are proxies
    process.env.SSH_CLIENT = client.split(',')[0]

    let term = pty.spawn(config.cmd, config.params, {
        name: config.pty.term || 'xterm256-color',
        cols: cols || 80, rows: rows || 25,
        cwd: config.pty.cwd || __dirname,
        env: config.pty.env || process.env
      })

    if (term.pid) {
      syslog.note(`app PID: ${term.pid} CLIENT: ${process.env.SSH_CLIENT} ${rows}x${cols}`)
      sessions[term.pid] = term
      sessions[term.pid].client = process.env.SSH_CLIENT
      logs[term.pid] = ''
    }

    term.on('data', function (data) {
      logs[term.pid] += data
    })

    res.json({ pid: term.pid, cols: cols, rows: rows, options: options })
    res.end()
  })

  app.post(`/xterm/${profile}/session/:pid/size`, function (req, res) {
    let pid = parseInt(req.params.pid)
    let cols = parseInt(req.query.cols)
    let rows = parseInt(req.query.rows)
    let term = sessions[pid]

    if (!term) return
    syslog.info(`Resize terminal ${pid} (${rows}x${cols})`)
    term.resize(cols, rows)
    res.end()
  })

  //  WebSocket handlers
  app.ws(`/xterm/${profile}/session/:pid`, function (ws, req) {
    var term = sessions[parseInt(req.params.pid)]
    syslog.info(`WebSocket connected to terminal ${term.pid}`)
    ws.send(logs[term.pid])

    term.on('close', function () {
      ws.close()
    })

    term.on('data', function (data) {
      try {
        ws.send(data);
      } catch (ex) {
        if (term.pid) {
          syslog.note(`Aborting terminal ${term.pid} from socket error:`, ex.message)
          unlock(term.pid)
          delete term.pid
        }
      }
    })

    ws.on('message', function (msg) {
      term.write(msg)
    })

    ws.on('close', function () {
      term.kill()
      syslog.note(`Closed terminal PID: ${term.pid} CLIENT: ${term.client}`)
      // Clean things up
      delete sessions[term.pid]
      delete logs[term.pid]
    })
  })

})

function unlock(pid: number) {
  syslog.warn(`Releasing ${pid}`)
}

process.on('SIGHUP', function () {
  console.log(new Date() + ' :: received hangup')
  syslog.warn('hangup')
  process.exit()
})

process.on('SIGINT', function () {
  console.log(new Date() + ' :: received interrupt')
  syslog.warn('interrupt')
  process.exit()
})

process.on('SIGQUIT', function () {
  console.log(new Date() + ' :: received quit')
  syslog.warn('quit')
  process.exit()
})

process.on('SIGTERM', function () {
  console.log(new Date() + ' shutdown')
  syslog.note('terminated')
  process.exit()
})
