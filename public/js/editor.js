// Version Control Functions
async function saveVersion() {
  if (!currentRoom || !userFetched) return;
  
  try {
    socket.emit('save-version');
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
      <h3>Version History</h3>
      <ul>
        ${versions.map((v, i) => `
          <li>
            ${new Date(v.createdAt).toLocaleString()} 
            by ${v.savedBy || 'Anonymous'}
            <button onclick="restoreVersion(${i})">Restore</button>
          </li>
        `).join('')}
      </ul>
    `;
    historyDiv.style.display = 'block';
  } catch (err) {
    console.error('Failed to load history:', err);
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