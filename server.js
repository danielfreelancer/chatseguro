const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const CryptoJS = require('crypto-js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3001;

// Almacén temporal de claves públicas de los usuarios
const publicKeys = new Map();

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado');

  // El cliente envía su clave pública
  socket.on('register', ({ userId, publicKey }) => {
    publicKeys.set(userId, publicKey);
    console.log(`Usuario ${userId} registrado con clave pública`);
  });

  // El cliente envía un mensaje
  socket.on('send_message', ({ from, to, encryptedMessage }) => {
    const recipientSocket = io.sockets.sockets.get(to);
    if (recipientSocket) {
      recipientSocket.emit('receive_message', { from, encryptedMessage });
    } else {
      console.log(`Usuario ${to} no está conectado`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
    // Eliminar la clave pública del usuario desconectado
    publicKeys.forEach((value, key) => {
      if (value === socket.id) publicKeys.delete(key);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
