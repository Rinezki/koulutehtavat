const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { exec } = require('child_process');  // Lisätään child_process curl-komentoja varten
const path = require('path');  // Tiedostopolkujen käsittelyyn

const app = express();
const PORT = 3000;

// Middleware JSON-datan käsittelyyn
app.use(express.json());

// Yhdistä tai luo SQLite-tietokanta
const db = new sqlite3.Database('./mydatabase.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});

// Luo taulu, jos sitä ei ole olemassa
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
)`, (err) => {
    if (err) {
        console.error('Error creating table:', err.message);
    } else {
        console.log('Users table ready.');
    }
});

// Tarjoa staattiset tiedostot (HTML-sivu)
app.use(express.static('public'));  // Palvelee tiedostoja 'public' kansiosta

// GET: Juuri-polku, joka palauttaa viestin, että palvelin on käynnissä
app.get('/', (req, res) => {
    res.send('Hello, the server is running!');
});

// GET: Hae kaikki käyttäjät
app.get('/api/users', (req, res) => {
    const query = `SELECT * FROM users`;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching users:', err.message);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.json(rows);
        }
    });
});

// POST: Lisää uusi käyttäjä
app.post('/api/users', (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
    }

    const query = `INSERT INTO users (name, email) VALUES (?, ?)`;
    db.run(query, [name, email], function (err) {
        if (err) {
            console.error('Error inserting user:', err.message);
            if (err.message.includes('UNIQUE')) {
                return res.status(409).json({ error: 'Email already exists' });
            }
            return res.status(500).json({ error: 'Internal server error' });
        } else {
            res.status(201).json({ id: this.lastID, name, email });
        }
    });
});

// GET: Suorita `curl`-komento ulkoiseen API:in
app.get('/api/fetch', (req, res) => {
    const url = 'https://jsonplaceholder.typicode.com/todos/1';

    exec(`curl ${url}`, (err, stdout, stderr) => {
        if (err) {
            console.error('Error executing curl:', stderr);
            res.status(500).json({ error: 'Failed to fetch data' });
        } else {
            const data = JSON.parse(stdout);  // Muuta JSON:iksi
            res.json(data);
        }
    });
});

// PUT: Päivitä käyttäjä
app.put('/update-user/:id', (req, res) => {
    const { id } = req.params;
    const { name, email } = req.body;

    const query = 'UPDATE users SET name = ?, email = ? WHERE id = ?';
    db.run(query, [name, email, id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: `Row(s) updated: ${this.changes}` });
    });
});

// DELETE: Poista käyttäjä
app.delete('/delete-user/:id', (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM users WHERE id = ?';
    db.run(query, [id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: `User with ID ${id} deleted` });
    });
});

// Palvelimen kuuntelu
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

