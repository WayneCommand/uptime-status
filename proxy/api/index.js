const express = require('express')
const app = express()

app.use(express.json())

app.post('/', async (req, res) => {
  const monitor = req.body
  console.log(`Received check request for ${monitor.name} (${monitor.id})`)

  try {
    let status = { ping: 0, up: false, err: 'Unknown' }
    const startTime = Date.now()

    if (monitor.method === 'TCP_PING') {
      const net = require('net')
      const [host, port] = monitor.target.split(':')
      const socket = new net.Socket()

      await new Promise((resolve, reject) => {
        socket.setTimeout(monitor.timeout || 10000)
        socket.on('connect', () => {
          status.ping = Date.now() - startTime
          status.up = true
          status.err = ''
          socket.destroy()
          resolve()
        })
        socket.on('error', (err) => {
          status.up = false
          status.err = err.message
          socket.destroy()
          reject()
        })
        socket.on('timeout', () => {
          status.ping = monitor.timeout || 10000
          status.up = false
          status.err = 'Connection timed out'
          socket.destroy()
          reject()
        })
        socket.connect(Number(port), host)
      })
    } else {
      const response = await fetch(monitor.target, {
        method: monitor.method || 'GET',
        headers: monitor.headers || {},
        body: monitor.body,
        signal: AbortSignal.timeout(monitor.timeout || 10000),
      })

      status.ping = Date.now() - startTime

      if (monitor.expectedCodes) {
        status.up = monitor.expectedCodes.includes(response.status)
      } else {
        status.up = response.status >= 200 && response.status < 300
      }

      if (!status.up) {
        status.err = `Unexpected status code: ${response.status}`
      }

      if (status.up && monitor.responseKeyword) {
        const body = await response.text()
        if (!body.includes(monitor.responseKeyword)) {
          status.up = false
          status.err = 'Response missing keyword'
        }
      }
    }

    res.json({
      location: 'proxy',
      status,
    })
  } catch (err) {
    console.error(`Error checking ${monitor.name}:`, err.message)
    res.json({
      location: 'ERROR',
      status: {
        ping: err.name === 'TimeoutError' ? (monitor.timeout || 10000) : 0,
        up: false,
        err: err.message,
      },
    })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Check proxy listening on port ${PORT}`)
})
