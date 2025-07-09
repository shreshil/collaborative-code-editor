const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();
const app = express();
const server = http.createServer(app);

// Get local IP for multi-machine access
const { networkInterfaces } = require('os');
const nets = networkInterfaces();
const localIp = Object.values(nets).flat().find(ip => ip.family === 'IPv4' && !ip.internal)?.address;

// CORS Setup
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5500', `http://${localIp}:5500`],
    credentials: true
  }
});

app.use(cors({
  origin: ['http://localhost:5500', `http://${localIp}:5500`],
  credentials: true
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// MongoDB Connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

// Routes
const authRoutes = require('./routes/authRoutes');
const editorRoutes = require('./routes/editorRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/editor', editorRoutes);

// View Routes
app.get('/login', (req, res) => res.render('login'));
app.get('/signup', (req, res) => res.render('signup'));

// Room state management
const activeRooms = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Store references to our listeners so we can remove them later
  const codeChangeHandler = ({ roomId, code }) => {
    activeRooms.set(roomId, code);
    socket.to(roomId).emit('receive-code', code);
  };

  const chatMessageHandler = ({ roomId, user, message }) => {
    const timestamp = new Date().toISOString();
    io.to(roomId).emit('receive-message', {
      user,
      message,
      timestamp
    });
  };

  socket.on('join-room', (roomId) => {
    // Leave previous room if any
    if (socket.currentRoom) {
      socket.leave(socket.currentRoom);
      socket.off('code-change', codeChangeHandler);
      socket.off('chat-message', chatMessageHandler);
    }

    // Join new room
    socket.join(roomId);
    socket.currentRoom = roomId;

    // Initialize room if doesn't exist
    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, '');
    }

    // Send current code state
    socket.emit('receive-code', activeRooms.get(roomId));

    // Set up new listeners
    socket.on('code-change', codeChangeHandler);
    socket.on('chat-message', chatMessageHandler);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on:
  - http://localhost:${PORT}
  - http://${localIp}:${PORT}`);
});