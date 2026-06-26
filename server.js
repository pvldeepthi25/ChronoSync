import express from 'express';
import session from 'express-session';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'db.json');
const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors({
    origin: 'http://localhost:5173', 
    credentials: true
}));

app.use(session({
    secret: 'temporal-nexus-v1-super-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, 
        sameSite: 'lax',
        maxAge: 60 * 60 * 1000 
    }
}));

const CLEARANCE_LEVELS = { "LEVEL_1": 1, "LEVEL_2": 2, "LEVEL_3": 3 };

async function readDatabase() {
    try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        const initialStructure = { users: [], tasks: [] };
        await fs.writeFile(DB_PATH, JSON.stringify(initialStructure, null, 2));
        return initialStructure;
    }
}

async function writeDatabase(data) {
    const tempPath = `${DB_PATH}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempPath, DB_PATH);
}

async function sessionClearanceGuard(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: "Access Denied: Terminal Unauthenticated." });
    }

    const userClearance = CLEARANCE_LEVELS[req.session.user.clearance] || 0;
    let targetClearanceRequired = 0;

 
    if (req.method === 'DELETE') {
        const db = await readDatabase();
        const task = db.tasks.find(t => t.id === req.params.id);
        if (!task) return res.status(404).json({ error: "Quantum task entity not found." });
        targetClearanceRequired = CLEARANCE_LEVELS[task.clearanceRequired] || 0;
    } else if (req.method === 'POST' && req.path === '/api/nexus/tasks') {
        targetClearanceRequired = CLEARANCE_LEVELS[req.body.clearanceRequired] || 0;
    }

    if (userClearance < targetClearanceRequired) {
        return res.status(403).json({ error: "Forbidden: Insufficient clearance authorization level." });
    }
    next();
}

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const db = await readDatabase();
    const user = db.users.find(u => u.username === username && u.password === password);

    if (!user) {
        return res.status(401).json({ error: "Invalid cryptographic user credentials." });
    }

    const sessionUser = { username: user.username, clearance: user.clearance };
    req.session.user = sessionUser;
    return res.status(200).json(sessionUser);
});

app.get('/api/auth/session', (req, res) => {
    if (req.session && req.session.user) {
        return res.status(200).json(req.session.user);
    }
    return res.status(401).json({ error: "No active grid session found." });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: "Failed to purge session matrix." });
        res.clearCookie('connect.sid');
        return res.status(200).json({ message: "Terminal localized cleanup complete." });
    });
});

app.get('/api/nexus/tasks', async (req, res) => {
    const db = await readDatabase();
    const now = Date.now();
    
    const activeTasks = db.tasks.filter(task => task.expirationTimestamp > now);
    if (activeTasks.length !== db.tasks.length) {
        db.tasks = activeTasks;
        await writeDatabase(db);
    }
    return res.status(200).json(activeTasks);
});

app.post('/api/nexus/tasks', sessionClearanceGuard, async (req, res) => {
    const { description, clearanceRequired } = req.body;
    if (!description || !clearanceRequired) {
        return res.status(400).json({ error: "Incomplete dataset parameters." });
    }

    const db = await readDatabase();
    const newTask = {
        id: `task_${Date.now()}`,
        description,
        clearanceRequired,
        expirationTimestamp: Date.now() + (10 * 60 * 1000)
    };

    db.tasks.push(newTask);
    await writeDatabase(db);
    return res.status(201).json(newTask);
});

app.delete('/api/nexus/tasks/:id', sessionClearanceGuard, async (req, res) => {
    const db = await readDatabase();
    db.tasks = db.tasks.filter(t => t.id !== req.params.id);
    await writeDatabase(db);
    return res.status(200).json({ success: true, message: "Task timeline successfully truncated." });
});

app.listen(PORT, () => console.log(`🚀 ChronoSync Nexus Core active on http://localhost:${PORT}`));
app.use(express.json());