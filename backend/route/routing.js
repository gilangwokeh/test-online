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
              "INSERT INTO users (username, password, role) VALUES (?, ?, ?)";
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

//  rute untuk login
router.post("/login", (req, res) => {
  const { username, password } = req.body;


  // Periksa kecocokan dengan data pengguna yang ada di database
  const query = "SELECT * FROM users WHERE username = ? AND password = ?";
  db.query(query, [username, password], (err, result) => {
    if (err) {
      res.status(500).send("Error saat melakukan login");
    } else {
      if (result.length > 0) {
        const user = result[0];

        // Periksa peran pengguna
        if (user.role === "admin") {
          res.status(200).send("Login admin berhasil");
        } else {
          res.status(200).send("Login user berhasil");
        }
      } else {
        res.status(401).send("Username atau password salah");
      }
    }
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
router.post("/upload",checkAdminAccess,checkUserAccess, upload.single("document"),
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
        const filePath = `path/to/your/documents/${file.filename}`; // Ubah dengan lokasi file yang sesuai

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

// Export router agar bisa digunakan di file lain
module.exports = router;
