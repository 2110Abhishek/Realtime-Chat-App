require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { connectDB, User, Message } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Connect to MongoDB
connectDB();

// REST API: Login / Register user
app.post('/api/login', async (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        let user = await User.findOne({ username });
        if (user) {
            user.status = 'online';
            await user.save();
            res.json({ message: 'Login successful', user });
        } else {
            user = new User({ username, status: 'online' });
            await user.save();
            res.json({ message: 'User created', user });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: err.message });
    }
});

// REST API: Fetch chat history
app.get('/api/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: 1 });
        // Format to match old SQLite output for compatibility (id -> _id)
        const formattedMessages = messages.map(msg => ({
            id: msg._id,
            sender: msg.sender,
            text: msg.text,
            timestamp: msg.timestamp,
            status: msg.status
        }));
        res.json(formattedMessages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// REST API: Get all users status
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, 'username status lastSeen');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Socket.io logic
io.on('connection', (socket) => {
    let currentUser = null;

    socket.on('user connected', async (username) => {
        currentUser = username;
        console.log(`User connected: ${username}`);
        try {
            await User.findOneAndUpdate({ username }, { status: 'online' });
            io.emit('user status', { username, status: 'online' });
            
            // Mark unread messages as delivered when a user connects
            // (A simple approach: if user connects, all sent messages become delivered)
            await Message.updateMany({ sender: { $ne: currentUser }, status: 'sent' }, { status: 'delivered' });
            io.emit('messages delivered update'); // tell clients to refetch or update
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('chat message', async (msg) => {
        try {
            const newMessage = new Message({ sender: msg.sender, text: msg.text, status: 'sent' });
            await newMessage.save();
            
            const broadcastMsg = { 
                id: newMessage._id, 
                sender: newMessage.sender, 
                text: newMessage.text, 
                timestamp: newMessage.timestamp,
                status: newMessage.status
            };
            io.emit('chat message', broadcastMsg);
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('typing', (data) => {
        socket.broadcast.emit('typing', data);
    });

    // Handle read receipts
    socket.on('message read', async (messageIds) => {
        try {
            await Message.updateMany({ _id: { $in: messageIds } }, { status: 'read' });
            io.emit('messages read', messageIds);
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('disconnect', async () => {
        if (currentUser) {
            console.log(`User disconnected: ${currentUser}`);
            try {
                await User.findOneAndUpdate({ username: currentUser }, { status: 'offline', lastSeen: Date.now() });
                io.emit('user status', { username: currentUser, status: 'offline' });
            } catch (e) {
                console.error(e);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
