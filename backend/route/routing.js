const express = require("express");
const router = express.Router();
const multer = require("multer");
const bcrypt = require("bcrypt");
const mysql = require("mysql2");
const path = require("path");

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

db.promise()
  .query(
    `
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') NOT NULL
  )
`
  )
  .then(() => {
    console.log("Tabel admins dan users telah dibuat");
  })
  .catch((err) => {
    throw err;
  });

db.promise()
  .query(
    `CREATE TABLE IF NOT EXISTS files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255),
    deskripsi VARCHAR(255),
    nama_pengunggah VARCHAR(255),
    content MEDIUMBLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`
  )
  .then(() => {
    console.log("Tabel admins telah dibuat");
  })
  .catch((err) => {
    throw err;
  });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage:storage });

router.post("/register/user", (req, res) => {
  const { username, password } = req.body;

  const checkQuery = "SELECT * FROM users WHERE username = ?";
  db.query(checkQuery, [username], (err, result) => {
    if (err) {
      res.status(500).send("Error saat memeriksa pengguna  " + err);
    } else {
      if (result.length > 0) {
        res.status(400).send("Username sudah digunakan");
      } else {
        bcrypt.hash(password, 10, (err, hashedPassword) => {
          if (err) {
            res.status(500).send("Error saat mengenkripsi password");
          } else {
            const insertQuery =
              "INSERT INTO users (username, password, role) VALUES (?, ?, ?)";
            db.query(
              insertQuery,
              [username, hashedPassword, "user"],
              (err, result) => {
                if (err) {
                  res.status(500).send("Error saat membuat akun pengguna");
                } else {
                  res.status(200).send("Akun pengguna berhasil dibuat");
                }
              }
            );
          }
        });
      }
    }
  });
});

router.post("/register/admin", (req, res) => {
  const { username, password } = req.body;

  const checkQuery = "SELECT * FROM users WHERE username = ?";
  db.query(checkQuery, [username], (err, result) => {
    if (err) {
      res.status(500).send("Error saat memeriksa pengguna");
    } else {
      if (result.length > 0) {
        res.status(400).send("Username sudah digunakan");
      } else {
        bcrypt.hash(password, 10, (err, hashedPassword) => {
          if (err) {
            res.status(500).send("Error saat mengenkripsi password");
          } else {
            const insertQuery =
              "INSERT INTO users(username, password, role) VALUES (?, ?, ?)";
            db.query(
              insertQuery,
              [username, hashedPassword, "admin"],
              (err, result) => {
                if (err) {
                  res.status(500).send("Error saat membuat akun admin");
                } else {
                  res.status(200).send("Akun admin berhasil dibuat");
                }
              }
            );
          }
        });
      }
    }
  });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  const checkLoginQuery = `SELECT * FROM users WHERE username = '${username}'`;
  db.query(checkLoginQuery, (err, results) => {
    if (err) {
      throw err;
    }
    if (results.length > 0) {
      const user = results[0];

      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          throw err;
        }
        if (isMatch) {
          const role = user.role;
          res.status(200).json({ message: "Login berhasil", role });
        } else {
          res.status(401).json({ message: "Invalid username or password" });
        }
      });
    } else {
      res.status(401).json({ message: "Invalid username or password" });
    }
  });
});

router.get("/files", (req, res) => {
  const query = "SELECT * FROM files";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error:", err);
      res
        .status(500)
        .json({ error: "Terjadi kesalahan saat mengambil daftar file" });
      return;
    } else {
      res.json(results);
    }
  });
});

router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "No file uploaded" });
  } else {
    const { originalname, filename, path } = req.file;
    const { deskripsi, nama_pengunggah } = req.body;

    const query =
      "INSERT INTO files (filename, deskripsi, nama_pengunggah ,content) VALUES (?, ?, ?,?)";
    db.query(query, [originalname, filename,deskripsi, nama_pengunggah , path], (err, result) => {
      if (err) {
        console.error("Error saving file to MySQL:", err);
        res.status(500).json({ message: "Failed to save file to MySQL" });
      } else {
        res.status(200).json({ message: "File uploaded successfully" });
      }
    });
  }
});

router.get('/download/:id', (req, res) => {
  const fileId = req.params.id;

  if (!fileId) {
    return res.status(400).send('ID file tidak diberikan.');
  }

  const query = 'SELECT * FROM files WHERE id = ?';
  db.query(query, [fileId], (error, results) => {
    if (error) {
      console.error('Error saat menjalankan query: ' + error.stack);
      return res.status(500).send('Terjadi kesalahan saat mengambil informasi file.');
    }

    if (results.length === 0) {
      return res.status(404).send('File tidak ditemukan.');
    }

    const file = results[0];
    const filePath = __dirname + '/uploads/' + file.filename;

    res.download(filePath, file.originalname, (error) => {
      if (error) {
        console.log('Gagal mengirimkan file:', error);
        res.status(500).send('Terjadi kesalahan saat mengunduh file.' + error);
      }
    });
  });
});

router.delete("/delete/files/:id", (req, res) => {
  const fileId = req.params.id;

  const query = "DELETE FROM files WHERE id = ?";
  db.query(query, [fileId], (err, result) => {
    if (err) {
      res.status(500).send("Error saat menghapus file dokumen");
    } else {
      if (result.affectedRows > 0) {
        res.status(200).send("File dokumen berhasil dihapus");
      } else {
        res.status(404).send("File dokumen tidak ditemukan");
      }
    }
  });
});

module.exports = router;
