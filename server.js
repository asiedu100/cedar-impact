const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const QRCode = require('qrcode');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database(':memory:'); // In-memory database for demo

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    gender TEXT NOT NULL,
    role TEXT DEFAULT 'participant',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Events table
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    location TEXT NOT NULL,
    qr_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Attendance table
  db.run(`CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    event_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (event_id) REFERENCES events (id)
  )`);

  // Insert sample data
  db.run(`INSERT OR IGNORE INTO events (name, description, date, time, location) VALUES 
    ('Tech Networking Meetup', 'Connect with fellow tech professionals', '2024-02-15', '18:00', 'Tech Hub, Downtown'),
    ('Startup Pitch Night', 'Watch amazing startup pitches', '2024-02-20', '19:00', 'Innovation Center')`);
});

// Routes

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// User routes
app.post('/api/users/register', (req, res) => {
  const { name, email, gender, password } = req.body;
  
  db.run('INSERT INTO users (name, email, gender) VALUES (?, ?, ?)', 
    [name, email, gender], function(err) {
    if (err) {
      res.status(400).json({ error: 'User already exists' });
    } else {
      res.json({ id: this.lastID, message: 'User created successfully' });
    }
  });
});

app.post('/api/users/login', (req, res) => {
  const { email, password } = req.body;
  
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
    } else if (row) {
      res.json({ user: row, message: 'Login successful' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});

// Event routes
app.get('/api/events', (req, res) => {
  db.all('SELECT * FROM events ORDER BY date ASC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
    } else {
      res.json(rows);
    }
  });
});

app.post('/api/events', (req, res) => {
  const { name, description, date, time, location } = req.body;
  
  db.run('INSERT INTO events (name, description, date, time, location) VALUES (?, ?, ?, ?, ?)', 
    [name, description, date, time, location], function(err) {
    if (err) {
      res.status(500).json({ error: 'Failed to create event' });
    } else {
      // Generate QR code
      const qrData = JSON.stringify({
        eventId: this.lastID,
        eventName: name,
        url: `${req.protocol}://${req.get('host')}/attendance?event=${this.lastID}`
      });
      
      QRCode.toDataURL(qrData, (err, qrCodeUrl) => {
        if (!err) {
          db.run('UPDATE events SET qr_code = ? WHERE id = ?', [qrCodeUrl, this.lastID]);
        }
        res.json({ id: this.lastID, message: 'Event created successfully', qrCode: qrCodeUrl });
      });
    }
  });
});

// Attendance routes
app.post('/api/attendance', (req, res) => {
  const { userId, eventId } = req.body;
  
  // Check if already attended
  db.get('SELECT * FROM attendance WHERE user_id = ? AND event_id = ?', 
    [userId, eventId], (err, row) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
    } else if (row) {
      res.status(400).json({ error: 'Already marked attendance' });
    } else {
      db.run('INSERT INTO attendance (user_id, event_id) VALUES (?, ?)', 
        [userId, eventId], function(err) {
        if (err) {
          res.status(500).json({ error: 'Failed to mark attendance' });
        } else {
          res.json({ message: 'Attendance marked successfully' });
        }
      });
    }
  });
});

app.get('/api/attendance', (req, res) => {
  const query = `
    SELECT a.*, u.name as user_name, u.email, u.gender, u.role, e.name as event_name
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    JOIN events e ON a.event_id = e.id
    ORDER BY a.timestamp DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
    } else {
      res.json(rows);
    }
  });
});

app.get('/api/analytics', (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_attendance,
      SUM(CASE WHEN u.gender = 'male' THEN 1 ELSE 0 END) as male_count,
      SUM(CASE WHEN u.gender = 'female' THEN 1 ELSE 0 END) as female_count,
      SUM(CASE WHEN u.gender = 'other' THEN 1 ELSE 0 END) as other_count
    FROM attendance a
    JOIN users u ON a.user_id = u.id
  `;
  
  db.get(query, (err, row) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
    } else {
      const total = row.total_attendance || 0;
      const malePercentage = total > 0 ? Math.round((row.male_count / total) * 100) : 0;
      const femalePercentage = total > 0 ? Math.round((row.female_count / total) * 100) : 0;
      
      res.json({
        total: total,
        maleCount: row.male_count || 0,
        femaleCount: row.female_count || 0,
        otherCount: row.other_count || 0,
        malePercentage: malePercentage,
        femalePercentage: femalePercentage
      });
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Networking Hub API server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});
