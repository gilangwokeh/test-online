const express = require("express");
const router = express.Router();
const multer = require("multer");
const bcrypt = require("bcrypt");
const mysql = require("mysql2");
const fs = require("fs");

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

const upload = multer({ dest: "uploads/" });

const checkAdminAccess = (req, res, next) => {
  const userId = req.user.id;

  const query = "SELECT role FROM users WHERE id = ?";
  db.query(query, [userId], (err, result) => {
    if (err) {
      res.status(500).send("Error saat memeriksa peran pengguna");
    } else {
      if (result.length > 0) {
        const role = result[0].role;

        if (role === "admin") {
          next();
        } else {
          res.status(403).send("Akses ditolak");
        }
      } else {
        res.status(401).send("Pengguna tidak ditemukan");
      }
    }
  });
};

const checkUserAccess = (req, res, next) => {
  const userId = req.user.id;
  const fileId = req.params.id;

  // Periksa apakah pengguna memiliki akses ke file dalam database
  const query = "SELECT * FROM files WHERE id = ? AND uploaded_by = ?";
  db.query(query, [fileId, userId], (err, result) => {
    if (err) {
      res.status(500).send("Error saat memeriksa akses file");
    } else {
      if (result.length > 0) {
        next();
      } else {
        res.status(403).send("Akses ditolak");
      }
    }
  });
};

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

  // Periksa apakah pengguna dengan username yang sama sudah terdaftar
  const checkQuery = "SELECT * FROM users WHERE username = ?";
  db.query(checkQuery, [username], (err, result) => {
    if (err) {
      res.status(500).send("Error saat memeriksa pengguna");
    } else {
      if (result.length > 0) {
        res.status(400).send("Username sudah digunakan");
      } else {
        // Enkripsi password sebelum disimpan
        bcrypt.hash(password, 10, (err, hashedPassword) => {
          if (err) {
            res.status(500).send("Error saat mengenkripsi password");
          } else {
            // Simpan akun admin ke database
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

  // Cek data login di database
  const checkLoginQuery = `SELECT * FROM users WHERE username = '${username}'`;
  db.query(checkLoginQuery, (err, results) => {
    if (err) {
      throw err;
    }
    if (results.length > 0) {
      const user = results[0];

      // Bandingkan password yang diinput dengan hash password di database
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          throw err;
        }
        if (isMatch) {
          // Login berhasil, kirim data peran ke frontend
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

router.get("/documents", checkAdminAccess, checkUserAccess, (req, res) => {
  const query =
    "SELECT title, description, uploader_name, upload_date FROM documents";
  db.query(query, (err, result) => {
    if (err) {
      res.status(500).send("Error saat mengambil daftar file dokumen");
    } else {
      res.status(200).json(result);
    }
  });
});

router.post("/upload", upload.single("file"), (req, res) => {
  const { originalname, path } = req.file;
  const { filename, deskripsi, nama_pengunggah } = req.body;


  // Baca konten file
  const content = fs.readFileSync(path);

  // Simpan konten file ke dalam database
  const sql = "INSERT INTO files (filename, deskripsi, nama_pengunggah, content) VALUES (?, ?, ?, ?)";
  db.query(sql, [originalname,filename, deskripsi, nama_pengunggah, content], (error, result) => {
    if (error) {
      console.error("Gagal menyimpan file ke database:", error);
      res.status(500).json({ error: "Gagal menyimpan file ke database" });
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
    } else {
      console.log("File berhasil disimpan ke database:", result);
      res.status(200).json({ message: "File berhasil disimpan ke database" });
    }
  });

  // Hapus file yang diunggah setelah tersimpan di database
  fs.unlinkSync(path);
});

//  rute untuk mengunduh dokumen
router.get("/documents/:id", checkAdminAccess, checkUserAccess, (req, res) => {
  const fileId = req.params.id;

  // Dapatkan informasi file dari database berdasarkan ID
  const query = "SELECT * FROM documents WHERE id = ?";
  db.query(query, [fileId], (err, result) => {
    if (err) {
      res.status(500).send("Error saat mengambil informasi file");
    } else {
      if (result.length > 0) {
        const file = result[0];
        const filePath = `path/home/documents/${file.filename}`; // Ubah dengan lokasi file yang sesuai

        res.download(filePath, file.filename);
      } else {
        res.status(404).send("File tidak ditemukan");
      }
    }
  });
});

//  rute untuk menghapus dokumen
router.delete("/documents/:id", checkAdminAccess, (req, res) => {
  const fileId = req.params.id;

  // Hapus file dokumen dari database berdasarkan ID
  const query = "DELETE FROM documents WHERE id = ?";
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
