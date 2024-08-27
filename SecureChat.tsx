import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import CryptoJS from 'crypto-js';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const socket = io('http://localhost:3001');

// Función para generar un par de claves (simulado con CryptoJS)
function generateKeyPair() {
  const privateKey = CryptoJS.lib.WordArray.random(256 / 8);
  const publicKey = CryptoJS.SHA256(privateKey);
  return { privateKey: privateKey.toString(), publicKey: publicKey.toString() };
}

// Función para encriptar un mensaje
function encryptMessage(publicKey, message) {
  return CryptoJS.AES.encrypt(message, publicKey).toString();
}

// Función para desencriptar un mensaje
function decryptMessage(privateKey, encryptedMessage) {
  const bytes = CryptoJS.AES.decrypt(encryptedMessage, privateKey);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export default function Component() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [userId, setUserId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [keyPair, setKeyPair] = useState(null);

  useEffect(() => {
    const newKeyPair = generateKeyPair();
    setKeyPair(newKeyPair);

    const newUserId = 'user_' + Math.random().toString(36).substr(2, 9);
    setUserId(newUserId);

    socket.emit('register', { userId: newUserId, publicKey: newKeyPair.publicKey });

    socket.on('receive_message', ({ from, encryptedMessage }) => {
      const decryptedMessage = decryptMessage(keyPair.privateKey, encryptedMessage);
      setMessages(prevMessages => [...prevMessages, { id: Date.now(), text: decryptedMessage, sender: from }]);
    });

    return () => {
      socket.off('receive_message');
    };
  }, []);

  const sendMessage = () => {
    if (inputMessage.trim() && recipientId) {
      const encryptedMessage = encryptMessage(keyPair.publicKey, inputMessage);
      socket.emit('send_message', { from: userId, to: recipientId, encryptedMessage });
      setMessages(prevMessages => [...prevMessages, { id: Date.now(), text: inputMessage, sender: 'me' }]);
      setInputMessage('');
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto border rounded-lg overflow-hidden">
      <div className="bg-primary text-primary-foreground p-4 flex items-center">
        <Avatar className="h-10 w-10 mr-3">
          <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
        <h1 className="text-xl font-bold">Chat Seguro</h1>
      </div>
      <ScrollArea className="flex-grow p-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`rounded-lg p-2 max-w-xs ${message.sender === 'me' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
              <p className="text-sm">{message.text}</p>
            </div>
          </div>
        ))}
      </ScrollArea>
      <div className="p-4 border-t">
        <Input
          type="text"
          placeholder="ID del destinatario"
          value={recipientId}
          onChange={(e) => setRecipientId(e.target.value)}
          className="mb-2"
        />
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Escribe un mensaje..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <Button onClick={sendMessage}>Enviar</Button>
        </div>
      </div>
    </div>
  );
}
