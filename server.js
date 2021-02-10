const express = require('express')
const path = require('path')
const http = require('http')
const PORT = process.env.PORT || 3000
const socketio = require('socket.io')
const app = express()
const server = http.createServer(app)
const io = socketio(server)

// Set static folder
app.use(express.static(path.join(__dirname, "public")))

// Start server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`))



// Handle a socket connection request from web client
// io(server) is listening for a 'connection'. socket is the actual client that is connecting.
// In order to even get a connection we have to make some modifications to the public files. In index html we add another script *1

const connections = [null, null]  // only handle 2 connections, if a third comes -> wait or play single player.

io.on('connection', socket => {
    // console.log('New WebSocket connection')

    // Find an available player number
    // if we alredy have 2 players playerIndex will remain -1
    let playerIndex = -1
    for (const i in connections) {
        if (connections[i] === null) {
            playerIndex = i
            break
        }
    }

    // Tell the connecting client what player number they are.
    // Socket.emit is gonna tell the connecting socket what player number tey are, 
    // is like an email, 'player-number' is the title of the email and playerIndex is the body
    socket.emit('player-number', playerIndex)
    console.log(`Player ${playerIndex} has connected`)

    // Ignore player 3
    if (playerIndex === -1) return

    // player initialy is not ready
    connections[playerIndex] = false

    // Tell everyone what player number just connected

    // socket.emit only tells information to the individual socket that connected
    // socket.broadcast tells every socket that is in the server
    // socket.emit('player-connection', playerIndex)
    socket.broadcast.emit('player-connection', playerIndex)

    //Handle disconnect
    socket.on('disconnect', () => {
        console.log(`Player ${playerIndex} disconnected`)
        connections[playerIndex] = null
        // Tell everyone what player number just disconnected
        socket.broadcast.emit('player-connection', playerIndex);
    })

    // On ready
    socket.on('player-ready', () => {
        socket.broadcast.emit('enemy-ready', playerIndex)
        connections[playerIndex] = true
    })

    // Check players connections
    socket.on('check-players', () => {
        const players = []
        for (const i in connections) {
            connections[i] === null ? players.push({ connected: false, ready: false }) :
                players.push({ connected: true, ready: connections[i] })
        }
        socket.emit('check-players', players)
    })


    // On fire Received
    socket.on('fire', id => {
        console.log(`Shot fired from ${playerIndex}`, id);

        // Emit the move to the other player
        socket.broadcast.emit('fire', id)
    })

    // On fire-reply 
    socket.on('fire-reply', square => {
        console.log(square)

        // Forward the reply to the other player
        socket.broadcast.emit('fire-reply', square)
    })

    // Timeout connection
    setTimeout(() => {
        connections[playerIndex] = null;
        socket.emit('timeout')
        socket.disconect()
    }, 600000) // 10 min per player
})


