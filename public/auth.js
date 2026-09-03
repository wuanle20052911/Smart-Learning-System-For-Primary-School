const form = document.querySelector('#auth-form');
const message = document.querySelector('#message');
const modeTabs = document.querySelectorAll('.tab');
const registerFields = document.querySelectorAll('.register-only');
const loginFields = document.querySelectorAll('.login-only');
let mode = 'login';

function setMode(nextMode) {
  mode = nextMode;
  const registering = mode === 'register';
  modeTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.mode === mode));
  registerFields.forEach((field) => field.classList.toggle('hidden', !registering));
  loginFields.forEach((field) => field.classList.toggle('hidden', registering));
  document.querySelector('#form-title').textContent = registering ? 'Create your account' : 'Welcome back';
  document.querySelector('#form-description').textContent = registering ? 'Start your learning journey with a free account.' : 'Please enter your credentials to access your student dashboard.';
  document.querySelector('#submit-button').textContent = registering ? 'Create account' : 'Sign in';
  document.querySelector('#switch-label').textContent = registering ? 'Already have an account?' : "Don't have an account?";
  document.querySelector('#switch-mode').textContent = registering ? 'Sign in' : 'Create account';
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
  if (mode === 'register') payload.fullName = document.querySelector('#full-name').value;
  button.disabled = true;
  message.textContent = '';
  try {
    const response = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Authentication failed.');
    if (data.session) localStorage.setItem('learnhub-session', JSON.stringify(data.session));
    message.textContent = data.message || 'Signed in successfully.';
    message.className = 'message success';
    if (mode === 'login') setTimeout(() => { window.location.href = '/'; }, 700);
  } catch (error) {
    message.textContent = error.message;
    message.className = 'message error';
  } finally {
    button.disabled = false;
  }
});

