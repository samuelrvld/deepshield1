const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/db');

const loginUser = async (req, res) => {
  try {
    const { identifier, email, password } = req.body || {};
    const userIdentifier = identifier || email;

    if (!userIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'Email/username dan password wajib diisi.' });
    }

    const [rows] = await pool.query(
      'SELECT id, username, email, password, role FROM users WHERE email = ? OR username = ? LIMIT 1',
      [userIdentifier, userIdentifier]
    );

    if (rows.length === 0) return res.status(401).json({ success: false, message: 'Login gagal.' });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Login gagal.' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return res.status(200).json({ success: true, data: { token } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) return res.status(400).json({ success: false, message: 'Data kurang.' });
    
    const hashedPassword = await bcrypt.hash(password, 12);
    await pool.query('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, "user")', [username, email, hashedPassword]);
    
    return res.status(201).json({ success: true, message: 'Registrasi berhasil.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// INI BAGIAN PALING PENTING:
module.exports = { loginUser, registerUser };