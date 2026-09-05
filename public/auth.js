const form = document.querySelector('#auth-form');
const message = document.querySelector('#message');
const modeTabs = document.querySelectorAll('.tab');
const registerFields = document.querySelectorAll('.register-only');
const loginFields = document.querySelectorAll('.login-only');
const roleButtons = document.querySelectorAll('.role-button');
let mode = 'login';
let selectedRole = 'student';

function getSession(){
  try {
    return JSON.parse(localStorage.getItem('learnhub-session') || 'null');
  } catch {
    localStorage.removeItem('learnhub-session');
    return null;
  }
}

function redirectByRole(session){
  const role = session?.profile?.role || session?.user?.user_metadata?.role || 'student';
  window.location.replace(role === 'teacher' || role === 'admin' ? '/teacher' : '/learn');
}

roleButtons.forEach((button) => button.addEventListener('click', () => {
  selectedRole = button.dataset.role;
  roleButtons.forEach((item) => item.classList.toggle('active', item === button));
}));

function setMode(nextMode) {
  mode = nextMode;
  const registering = mode === 'register';
  modeTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.mode === mode));
  registerFields.forEach((field) => field.classList.toggle('hidden', !registering));
  loginFields.forEach((field) => field.classList.toggle('hidden', registering));
  document.querySelector('#form-title').textContent = registering ? 'Tạo tài khoản MathJoy' : 'Đăng nhập cổng học tập';
  document.querySelector('#form-description').textContent = registering ? 'Bắt đầu hành trình học tập vui vẻ cùng MathJoy nhé' : 'Chọn đúng vai trò của mình để bắt đầu nhé';
  document.querySelector('#submit-button').textContent = registering ? 'ĐĂNG KÝ NGAY 🚀' : 'ĐĂNG NHẬP NGAY 🚀';
  document.querySelector('#switch-label').textContent = registering ? 'Đã có tài khoản MathJoy?' : 'Chưa có tài khoản MathJoy?';
  document.querySelector('#switch-mode').textContent = registering ? 'Đăng nhập' : 'Đăng ký thành viên';
  document.querySelector('#password').autocomplete = registering ? 'new-password' : 'current-password';
  message.textContent = '';
  message.className = 'message';
}

modeTabs.forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
document.querySelector('#switch-mode').addEventListener('click', () => setMode(mode === 'login' ? 'register' : 'login'));
document.querySelector('#toggle-password').addEventListener('click', (event) => {
  const password = document.querySelector('#password');
  password.type = password.type === 'password' ? 'text' : 'password';
  event.currentTarget.setAttribute('aria-label', password.type === 'password' ? 'Show password' : 'Hide password');
});
document.querySelector('#forgot-link').addEventListener('click', (event) => {
  event.preventDefault();
  message.textContent = 'Password reset is managed in your Supabase project email flow.';
  message.className = 'message success';
});
document.querySelectorAll('.social').forEach((button) => button.addEventListener('click', () => {
  message.textContent = `${button.dataset.provider} sign-in needs to be enabled in Supabase first.`;
  message.className = 'message error';
}));

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.querySelector('#submit-button');
  const payload = { email: document.querySelector('#email').value, password: document.querySelector('#password').value };
  if (mode === 'register') {
    payload.fullName = document.querySelector('#full-name').value;
    payload.role = selectedRole;
  }
  button.disabled = true;
  message.textContent = '';
  try {
    const response = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Authentication failed.');
    if (data.session) {
      localStorage.setItem('learnhub-session', JSON.stringify({
        ...data.session,
        user: data.user,
        profile: data.profile
      }));
    }
    message.textContent = data.message || 'Signed in successfully.';
    message.className = 'message success';
    if (mode === 'login') setTimeout(() => redirectByRole({
      ...data.session,
      user: data.user,
      profile: data.profile
    }), 700);
  } catch (error) {
    message.textContent = error.message;
    message.className = 'message error';
  } finally {
    button.disabled = false;
  }
});
