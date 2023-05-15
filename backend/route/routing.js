const express = require("express");
const router = express.Router();
const multer = require("multer");
const bcrypt = require("bcrypt");
const mysql = require("mysql2");
const fs = require("fs");
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

  const query = 'SELECT content FROM files';
db.query(query, (error, results) => {
  if (error) {
    console.log(error);
    return;
  }

  results.forEach((row) => {
    const content = row.path;
    console.log('Path:', content);
  });
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + fileExtension);
  },
});

const upload = multer({ storage: storage });

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
  const { filename, path } = req.file;
  const { deskripsi, nama_pengunggah } = req.body;

  const content = fs.readFileSync(path);
  const sql =
    "INSERT INTO files (filename, deskripsi, nama_pengunggah, content) VALUES (?, ?, ?, ?)";
  db.query(
    sql,
    [ filename, deskripsi, nama_pengunggah, content],
    (error, result) => {
      if (error) {
        console.error("Gagal menyimpan file ke database:", error);
        res.status(500).json({ error: "Gagal menyimpan file ke database" });
        if (!req.file) {
          res.status(400).json({ error: "No file uploaded" });
          return;
        }
      } else {
        console.log("File berhasil disimpan ke database:", result);
        res.status(200).json({ message: "File berhasil disimpan ke database" });
      }
    }
  );

  // Hapus file yang diunggah setelah tersimpan di database
  fs.unlinkSync(path);
});

router.get("/download/:id", (req, res) => {
  const fileId = req.params.id;

  // Query ke database untuk mendapatkan informasi file
  const query = `SELECT filename, content FROM files WHERE id = ${fileId}`;
  db.query(query, (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Internal Server Error");
    }

    if (results.length === 0) {
      return res.status(404).send("File not found");
    }

    const file = results[0];
    const filePath = file.path;

    if (!filePath) {
      return res.status(500).send("File path not found");
    }

    // Membaca file dari sistem file
    fs.readFile(filePath, (err, data) => {
      if (err) {
        console.log(err);
        return res.status(500).send("Internal Server Error");
      }

      // Mengirimkan file sebagai respons
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${file.filename}"`
      );
      res.send(data);
    });
  });
});

//  rute untuk menghapus dokumen
router.delete("/delete/files/:id", (req, res) => {
  const fileId = req.params.id;

  // Hapus file dokumen dari database berdasarkan ID
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
