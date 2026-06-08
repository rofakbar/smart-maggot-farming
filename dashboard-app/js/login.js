const loginForm = document.getElementById('login-form');
const errorMsg = document.getElementById('login-error');

// Akun yang ditanam langsung di codingan
const VALID_USER = "admin@gmail.com";
const VALID_PASS = "maggot2026";

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const inputUser = document.getElementById('username').value;
    const inputPass = document.getElementById('password').value;

    if (inputUser === VALID_USER && inputPass === VALID_PASS) {
        // Set status login di browser
        localStorage.setItem('isLoggedIn', 'true');
        // Lempar ke dashboard
        window.location.href = 'index.html';
    } else {
        errorMsg.innerText = "Username atau Password salah!";
    }
});