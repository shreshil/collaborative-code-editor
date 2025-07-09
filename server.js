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

// Routes
const authRoutes = require('./routes/authRoutes');
const editorRoutes = require('./routes/editorRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/editor', editorRoutes);

// View Routes
app.get('/login', (req, res) => res.render('login'));
app.get('/signup', (req, res) => res.render('signup'));

// Socket.IO with Version Control
const Document = require('./models/Document');

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Cleanup function to prevent duplicates
  const cleanupRoom = () => {
    if (socket.currentRoom) {
      socket.leave(socket.currentRoom);
      socket.removeAllListeners('code-change');
      socket.removeAllListeners('chat-message');
      socket.removeAllListeners('save-version');
    }
  };

  socket.on('join-room', async (roomId) => {
    cleanupRoom();
    
    // Join new room
    socket.join(roomId);
    socket.currentRoom = roomId;

    // Load or create document
    let doc = await Document.findOne({ roomId }) || 
              new Document({ roomId, currentContent: '', versions: [] });
    
    // Send current state
    socket.emit('receive-code', doc.currentContent);

    // Debounced code update handler
    let changeTimeout;
    socket.on('code-change', async ({ code }) => {
      clearTimeout(changeTimeout);
      changeTimeout = setTimeout(async () => {
        doc.currentContent = code;
        await doc.save();
        socket.to(roomId).emit('receive-code', code);
      }, 150);
    });

    // Version save handler
    socket.on('save-version', async () => {
      doc.versions.unshift({ // Add to beginning of array
        content: doc.currentContent,
        savedBy: socket.userId,
        createdAt: new Date()
      });
      await doc.save();
      socket.emit('version-saved');
    });

    // Chat handler (fixed duplicates)
    socket.on('chat-message', async ({ user, message }) => {
      const newMessage = { user, message, timestamp: new Date() };
      io.to(roomId).emit('receive-message', newMessage);
    });
  });

  socket.on('disconnect', cleanupRoom);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));