document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const documentList = document.getElementById("documentList");
  const list = document.getElementById("list");

  // Fungsi untuk menampilkan daftar dokumen
  function showDocumentList(documents) {
    list.innerHTML = "";
    documents.forEach((doc) => {
      const listItem = document.createElement("li");
      const title = document.createElement("span");
      title.textContent = doc.title;
      listItem.appendChild(title);
      list.appendChild(listItem);
    });
  }

  // Fungsi untuk mengambil daftar dokumen dari server
  function getDocuments() {
    fetch("/documents")
      .then((response) => response.json())
      .then((data) => {
        showDocumentList(data.documents);
      })
      .catch((error) => console.log(error));
  }

  // Fungsi untuk menampilkan halaman setelah login sukses
  function showLoggedInPage() {
    loginForm.classList.add("hidden");
    documentList.classList.remove("hidden");
    getDocuments();
  }

  // Submit form login
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    fetch("http://localhost:5001/api/route/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          showLoggedInPage();
        } else {
          alert("Login gagal");
        }
      })
      .catch((error) => console.log(error));
  });
});
