# Collaborative Code Editor

A real-time collaborative code editor with built-in chat functionality, supporting multiple rooms and user authentication. Perfect for teams, classrooms, or remote pair programming.

![display of every feature](<Screenshot 2025-07-10 032433.png>)

---

## **Features**

-  Real-time code collaboration (CodeMirror + Socket.IO)
-  Multi-room support (work in separate groups)
-  Integrated chat system per room
-  User authentication (signup/login with JWT)
-  Cursor position synchronization
-  Local network access (collaborate over LAN)
-  Version control(save and access codes )

---

## **Folder Structure**

```
collab_code_editor/
  models/           # Mongoose models (User)
  public/           # Static assets (CSS, JS)
    css/
    js/
  routes/           # Express route handlers (auth, editor)
  views/            # EJS templates (login, signup, editor)
  server.js         # Main server entry point
  package.json      # Project metadata and dependencies
  README.md         # Project documentation
```

---

## **Prerequisites**

- [Node.js](https://nodejs.org/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/) (local or cloud)
- [Git](https://git-scm.com/)

---

## **Setup Instructions**

1. **Clone the repository**
   ```bash
   git clone https://github.com/shreshil/collaborative-code-editor.git
   cd collaborative-code-editor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
---

## 🛠️ Environment Variable Setup (If You’re New)

 If you don’t have MongoDB installed locally, you can use MongoDB Atlas (cloud version) for free:

### 🔹 MongoDB URI (MONGO_URI)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create an account and login
3. Click "Build a Database" → Choose **Free Tier**
4. Set up your Cluster (you can name it anything)
5. Go to your database dashboard → **Connect** → **Connect your application**
6. Copy the URI like:
mongodb+srv://<username>:<password>@cluster0.mongodb.net/<dbname>?retryWrites=true&w=majority
7. Replace `<username>`, `<password>`, and `<dbname>` with your details
8. Paste this into your `.env` file as: MONGO_URI=mongodb+srv://yourUser:yourPass@cluster0.mongodb.net/collab_code?retryWrites=true&w=majority

---

### 🔹  Set JWT Secret

JWT (JSON Web Token) is used for secure login sessions. You can use any long, random string as the secret.

Example:JWT_SECRET=superstrongjwtsecret

---

3. **Configure environment variables**

   Create a `.env` file in the root directory:
   ```
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Access the app**

   - Open [http://localhost:5000/login](http://localhost:5000/login) in your browser.
   - For LAN collaboration, use the local IP shown in the terminal.

---

## **Usage**

- **Sign up** for a new account or **log in**.
- **Join a room** by entering a room name (create a new one or join an existing).
- **Edit code** collaboratively in real-time.
- **Chat** with other users in the same room.

---

## **Main Functionalities**

- **Authentication:** Secure signup/login with JWT and cookies.
- **Real-time Collaboration:** Code and chat updates are instantly broadcast to all users in the same room.
- **Room Management:** Each room has its own code and chat state.
- **Cursor Sync:** Tracks and (optionally) displays user cursors.
- **LAN Support:** Detects local IP for easy team collaboration on the same network.
 **Version Control:** Save snapshots of code at any point.View complete version history per room and restore/delete with one click

---

## **Contributing**

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

---

## **Acknowledgements**

- [CodeMirror](https://codemirror.net/)
- [Socket.IO](https://socket.io/)
- [Express](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)

---




