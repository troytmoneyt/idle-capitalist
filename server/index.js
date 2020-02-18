'use strict';

const debug = require('debug')('idle-capitalist-server:http');
const session = require('express-session');
const express = require('express');
const http = require('http');
const uuid = require('uuid');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();

// Map to store websockets for each user
const map = new Map();

app.use(cors());

//
// We need the same instance of the session parser in express and
// WebSocket server.
//
const sessionParser = session({
  saveUninitialized: false,
  secret: '$eCuRiTy',
  resave: false
});

app.use(sessionParser);

app.post('/login', function(req, res) {
  //
  // "Log in" user and set userId to session.
  //
  const id = uuid.v4();

  debug(`Updating session for user ${id}`);
  req.session.userId = id;
  res.send({ userId: req.session.userId });
});

app.delete('/logout', function(request, response) {
  const ws = map.get(request.session.userId);

  debug('Destroying session');
  request.session.destroy(function() {
    if (ws) ws.close();

    response.send({ result: 'OK', message: 'Session destroyed' });
  });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ clientTracking: false, noServer: true });

server.on('upgrade', function(request, socket, head) {
  debug('Parsing session from request...');

  sessionParser(request, {}, () => {
    if (!request.session.userId) {
      socket.destroy();
      return;
    }

    debug('Session is parsed!');

    wss.handleUpgrade(request, socket, head, function(ws) {
      wss.emit('connection', ws, request);
    });
  });
});

wss.on('connection', function(ws, request) {

  ws.on('message', function(message) {
    //
    // Here we can now use session parameters.
    //
    debug(`Received message ${message} from user ${userId}`);
  });

  ws.on('close', function() {
    map.delete(userId);
  });
});

//
// Start the server.
//
server.listen(3001, function() {
  debug('Listening on http://localhost:3001');
});
