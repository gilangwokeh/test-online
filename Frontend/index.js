const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const username = loginForm.username.value;
  const password = loginForm.password.value;

  axios.post('http://localhost:5001/api/route/login', { username, password })
    .then((response) => {
      console.log(response.data);
      if (response.data.role === 'admin') {
        window.location.href = 'http://127.0.0.1:3000/Frontend/HalamanAdmin.html';
      } else if ( response.data.role === 'user') {
        window.location.href = 'http://127.0.0.1:3000/Frontend/HalamanUser.html';
      }else {
        alert('pengguna tidak di temukan role nya')
        window.location.href = 'http://127.0.0.1:3000/Frontend/index.html';
      }
    })
    .catch((error) => {
      console.error(error);
      alert('salah username atau Password');
    });
});