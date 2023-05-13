const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const bcrypt  = require('bcrypt');
const mysql   = require('mysql2');

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
  console.log('Terhubung ke database MySQL');
});

db.promise().query(`
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') NOT NULL
  )
`).then(() => {
  console.log('Tabel admins telah dibuat');
}).catch((err) => {
  throw err;
});

db.promise().query(`
  CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    filename VARCHAR(255) NOT NULL,
    uploader VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`)
  .then(() => {
    console.log('Tabel documents telah dibuat');
  })
  .catch(err => {
    throw err;
  });

// Menutup koneksi database setelah selesai
db.end();

// Konfigurasi penyimpanan file menggunakan multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

const checkAdminAccess = (req, res, next) => {
  const userId = req.user.id;


  // Periksa peran pengguna dalam database
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

router.post("/register-user", (req, res) => {
  const { username, password } = req.body;


  // Periksa apakah pengguna dengan username yang sama sudah terdaftar
  const checkQuery = "SELECT * FROM users WHERE username = ?";
  db.query( checkQuery,[username], (err, result) => {
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
            // Simpan akun pengguna ke database
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

router.post("/register-admin", (req, res) => {
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

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.promise().query('SELECT * FROM users WHERE username = ?', [username])
    .then(([rows]) => {
      if (rows.length > 0) {
        const user = rows[0];
        bcrypt.compare(password, user.password, (err, result) => {
          if (err) {
            res.status(500).send('Terjadi kesalahan');
          } else if (result) {
            res.status(200).send('Login berhasil');
          } else {
            res.status(401).send('Login gagal');
          }
        });
      } else {
        res.status(401).send('Login gagal');
      }
    })
    .catch(err => {
      res.status(500).send('Terjadi kesalahan');
    });
});

//  rute untuk mendapatkan daftar dokumen
router.get("/documents", checkAdminAccess, checkUserAccess, (req, res) => {
  // Dapatkan daftar file dokumen dari database


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

//  rute untuk mengunggah dokumen
router.post("/upload",checkAdminAccess, upload.single("document"),
  (req, res) => {
    // Pastikan pengguna yang saat ini login adalah admin
    // Lakukan validasi lain sesuai kebutuhan

    // Dapatkan informasi file yang diunggah dari req.file
    const { originalname, mimetype, size } = req.file;
  

    // Simpan informasi file ke dalam database
    const query =
      "INSERT INTO documents (filename, mimetype, size) VALUES (?, ?, ?)";
    db.query(query, [originalname, mimetype, size], (err, result) => {
      if (err) {
        res.status(500).send("Error saat mengunggah file");
      } else {
        res.status(200).send("File berhasil diunggah");
      }
    });
  }
);

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
