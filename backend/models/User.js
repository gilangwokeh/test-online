const mysql = require('mysql2');

const db = mysql.createConnection({
  host: "localhost",
  user: "gilang",
  password: "password123",
  database: "test",
});

db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log("Terhubung ke database MySQL");
});

db.query(
  `
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') NOT NULL
  )
`,
  (err) => {
    if (err) {
      throw err;
    }
    console.log("Tabel users telah dibuat");
  }
);

// module.exports = { db };
