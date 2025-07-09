const socket = io("http://localhost:5000", {
  withCredentials: true,
});

let currentRoom = "";
let currentUser = "Anonymous";
let isRemoteUpdate = false;
let userCursorPosition = { line: 0, ch: 0 };

// Initialize CodeMirror editor
const codeMirrorEditor = CodeMirror.fromTextArea(document.getElementById('editor'), {
  mode: 'javascript',
  theme: 'dracula',
  lineNumbers: true,
  tabSize: 2,
  indentWithTabs: false,
});

// Track cursor position
codeMirrorEditor.on("cursorActivity", () => {
  if (!isRemoteUpdate) {
    userCursorPosition = codeMirrorEditor.getCursor();
  }
});

// Get current user from backend
let userFetched = false;

async function fetchCurrentUser() {
  try {
    const res = await fetch("http://localhost:5000/api/auth/me", {
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok && data.name) {
      currentUser = data.name;
      userFetched = true;
      document.getElementById('user-name').textContent = currentUser;
      console.log("Logged in as:", currentUser);
    } else {
      console.log("No logged in user");
      window.location.href = '/login';
    }
  } catch (err) {
    console.error("Error fetching user:", err);
    window.location.href = '/login';
  }
}

document.addEventListener('DOMContentLoaded', fetchCurrentUser);

// Real-time code sync
function joinRoom() {
  if (!userFetched) {
    alert("Please wait, verifying user...");
    return;
  }
  const room = document.getElementById("roomInput").value;
  if (!room) return alert("Enter a room ID");

  // Clean up previous listeners to prevent duplicates
  socket.off("receive-code");
  socket.off("receive-message");

  currentRoom = room;
  socket.emit("join-room", room);

  socket.on("receive-code", (code) => {
    isRemoteUpdate = true;
    const currentValue = codeMirrorEditor.getValue();
    
    if (currentValue !== code) {
      codeMirrorEditor.setValue(code);
      try {
        codeMirrorEditor.setCursor(userCursorPosition);
      } catch (e) {
        codeMirrorEditor.setCursor(codeMirrorEditor.lineCount(), 0);
      }
    }
    isRemoteUpdate = false;
  });

  // Debounced local changes
  let changeTimeout;
  codeMirrorEditor.on("change", () => {
    if (isRemoteUpdate || !currentRoom) return;
    
    clearTimeout(changeTimeout);
    changeTimeout = setTimeout(() => {
      const code = codeMirrorEditor.getValue();
      socket.emit("code-change", { 
        roomId: currentRoom, 
        code 
      });
    }, 150);
  });

  // Chat message handling (with duplicate prevention)
  socket.on("receive-message", ({ user, message, timestamp }) => {
    const msgDiv = document.createElement('div');
    msgDiv.textContent = `[${new Date(timestamp).toLocaleTimeString()}] ${user}: ${message}`;
    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

// Chat functionality
const messagesDiv = document.getElementById("messages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

sendBtn.addEventListener("click", () => {
  const message = chatInput.value.trim();
  if (message !== "" && currentRoom) {
    socket.emit("chat-message", {
      roomId: currentRoom,
      user: currentUser,
      message,
    });
    chatInput.value = "";
  }
});

// Handle logout
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    if (response.ok) {
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Logout failed:', error);
  }
});

// Connection handling
socket.on("disconnect", () => console.log("Disconnected from server"));
socket.on("reconnect", () => {
  console.log("Reconnected to server");
  if (currentRoom) socket.emit("join-room", currentRoom);
});