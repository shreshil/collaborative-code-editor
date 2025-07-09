const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

dotenv.config();
const app = express();
const server = http.createServer(app);

// CORS Setup
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],
    credentials: true
  }
});

app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],
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

// Auth middleware
const checkAuth = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return next();
  
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.clearCookie('token');
    next();
  }
};

// Routes
const authRoutes = require('./routes/authRoutes');
const editorRoutes = require('./routes/editorRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/editor', editorRoutes);

// View Routes
app.get('/login', checkAuth, (req, res) => {
  if (req.user) return res.redirect('/editor');
  res.render('login');
});

app.get('/signup', checkAuth, (req, res) => {
  if (req.user) return res.redirect('/editor');
  res.render('signup');
});

app.get('/editor', checkAuth, (req, res) => {
  if (!req.user) return res.redirect('/login');
  res.render('editor', { 
    name: req.user.name,
    userId: req.user.id 
  });
});

// Socket.IO Authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token || 
               socket.handshake.headers.cookie?.split('token=')[1]?.split(';')[0];
  
  if (!token) return next(new Error('Authentication error'));
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Socket.IO
const Document = require('./models/Document');

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.name} (${socket.id})`);

  const cleanupRoom = () => {
    if (socket.currentRoom) {
      console.log(`User ${socket.user.name} disconnected from room ${socket.currentRoom}`);
      socket.leave(socket.currentRoom);
      socket.removeAllListeners('code-change');
      socket.removeAllListeners('chat-message');
      socket.removeAllListeners('save-version');
    }
  };

  socket.on('join-room', async (roomId) => {
    cleanupRoom();
    
    socket.join(roomId);
    socket.currentRoom = roomId;
    console.log(`User ${socket.user.name} joined room ${roomId}`);

    let doc = await Document.findOne({ roomId }) || 
              new Document({ roomId, currentContent: '', versions: [] });
    
    socket.emit('receive-code', doc.currentContent);

    let changeTimeout;
    socket.on('code-change', async ({ code }) => {
      clearTimeout(changeTimeout);
      changeTimeout = setTimeout(async () => {
        doc.currentContent = code;
        await doc.save();
        socket.to(roomId).emit('receive-code', code);
      }, 150);
    });

    socket.on('save-version', async ({ roomId }) => {
      doc.versions.unshift({
        content: doc.currentContent,
        savedBy: socket.user.id,
        savedByName: socket.user.name,
        roomId: roomId,
        createdAt: new Date()
      });
      await doc.save();
      socket.emit('version-saved');
    });

    socket.on('delete-version', async ({ versionIndex }) => {
      if (versionIndex >= 0 && versionIndex < doc.versions.length) {
        doc.versions.splice(versionIndex, 1);
        await doc.save();
        socket.emit('version-deleted', { versionIndex });
      }
    });

    socket.on('chat-message', async ({ message }) => {
      const newMessage = { 
        user: socket.user.name,
        message,
        timestamp: new Date() 
      };
      io.to(roomId).emit('receive-message', newMessage);
    });
  });

  socket.on('disconnect', () => {
    cleanupRoom();
    console.log(`User ${socket.user?.name || 'Unknown'} disconnected (${socket.id})`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));