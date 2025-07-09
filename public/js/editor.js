
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/auth/me', {
      credentials: 'include'
    });
    
    if (!res.ok) {
      window.location.href = '/login';
      return;
    }
    
    const data = await res.json();
    currentUser = data.name;
    document.getElementById('user-name').textContent = currentUser;
    userFetched = true;
    
  } catch (err) {
    window.location.href = '/login';
  }
});
const socket = io("http://localhost:5000", {
  withCredentials: true,
});

let currentRoom = "";
let currentUser = "Anonymous";
let isRemoteUpdate = false;
let userCursorPosition = { line: 0, ch: 0 };

// Initialize CodeMirror
const codeMirrorEditor = CodeMirror.fromTextArea(document.getElementById('editor'), {
  mode: 'javascript',
  theme: 'dracula',
  lineNumbers: true,
  tabSize: 2,
  indentWithTabs: false,
});

// Track cursor
codeMirrorEditor.on("cursorActivity", () => {
  if (!isRemoteUpdate) {
    userCursorPosition = codeMirrorEditor.getCursor();
  }
});

// Get current user
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
    } else {
      window.location.href = '/login';
    }
  } catch (err) {
    window.location.href = '/login';
  }
}

document.addEventListener('DOMContentLoaded', fetchCurrentUser);

// Room functions
function joinRoom() {
  if (!userFetched) {
    alert("Please wait, verifying user...");
    return;
  }
  const room = document.getElementById("roomInput").value;
  if (!room) return alert("Enter a room ID");

  if (currentRoom) {
    socket.emit('leave-room', currentRoom);
    socket.off("receive-code");
    socket.off("receive-message");
  }

  currentRoom = room;
  socket.emit("join-room", room);

  socket.on("receive-code", (code) => {
    isRemoteUpdate = true;
    const currentValue = codeMirrorEditor.getValue();
    if (currentValue !== code) {
      codeMirrorEditor.setValue(code);
      try {
        codeMirrorEditor.setCursor(userCursorPosition);
      } catch {
        codeMirrorEditor.setCursor(codeMirrorEditor.lineCount(), 0);
      }
    }
    isRemoteUpdate = false;
  });

  let changeTimeout;
  codeMirrorEditor.on("change", () => {
    if (isRemoteUpdate || !currentRoom) return;
    clearTimeout(changeTimeout);
    changeTimeout = setTimeout(() => {
      const code = codeMirrorEditor.getValue();
      socket.emit("code-change", { code });
    }, 150);
  });

  socket.on("receive-message", ({ user, message, timestamp }) => {
    const msgDiv = document.createElement('div');
    msgDiv.textContent = `[${new Date(timestamp).toLocaleTimeString()}] ${user}: ${message}`;
    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}


// Version Control Functions
async function saveVersion() {
  if (!currentRoom || !userFetched) return;
  
  try {
    socket.emit('save-version', { roomId: currentRoom });
    alert('Version saved successfully!');
  } catch (err) {
    console.error('Failed to save version:', err);
  }
}

async function showVersionHistory() {
  try {
    const res = await fetch(`/api/editor/${currentRoom}/versions`, {
      credentials: 'include'
    });
    const versions = await res.json();
    
    const historyDiv = document.getElementById('version-history');
    historyDiv.innerHTML = `
      <h3>Version History (Room: ${currentRoom})</h3>
      <ul>
        ${versions.map((v, i) => `
          <li>
            ${new Date(v.createdAt).toLocaleString()} 
            by ${v.savedBy} (Room: ${v.roomId})
            <button onclick="restoreVersion(${i})">Restore</button>
            <button onclick="deleteVersion(${i})">Delete</button>
          </li>
        `).join('')}
      </ul>
      <button onclick="document.getElementById('version-history').style.display='none'">
        Close
      </button>
    `;
    historyDiv.style.display = 'block';
  } catch (err) {
    console.error('Failed to load history:', err);
  }
}

async function deleteVersion(index) {
  if (!confirm('Permanently delete this version?')) return;
  
  try {
    const res = await fetch(`/api/editor/${currentRoom}/versions/${index}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (res.ok) {
      showVersionHistory(); // Refresh the list
    }
  } catch (err) {
    console.error('Failed to delete version:', err);
  }
}

async function restoreVersion(index) {
  if (!confirm('Restore this version? Current changes will be replaced.')) return;
  
  try {
    const res = await fetch(`/api/editor/${currentRoom}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ versionIndex: index })
    });
    
    const data = await res.json();
    if (res.ok) {
      codeMirrorEditor.setValue(data.content);
    }
  } catch (err) {
    console.error('Failed to restore version:', err);
  }
}


// Chat functionality
const messagesDiv = document.getElementById("messages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

sendBtn.addEventListener("click", () => {
  const message = chatInput.value.trim();
  if (message && currentRoom) {
    socket.emit("chat-message", {
      user: currentUser,
      message
    });
    chatInput.value = "";
  }
});

// Logout
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include'
  });
  window.location.href = '/login';
});

// Connection handling
socket.on("disconnect", () => console.log("Disconnected"));
socket.on("reconnect", () => {
  if (currentRoom) socket.emit("join-room", currentRoom);
});