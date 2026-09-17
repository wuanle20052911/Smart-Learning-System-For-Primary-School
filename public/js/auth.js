const form = document.querySelector('#auth-form');
const message = document.querySelector('#message');

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
  window.location.replace(role === 'admin' ? '/admin' : (role === 'teacher' ? '/teacher' : '/learn'));
}

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
  button.disabled = true;
  message.textContent = '';
  try {
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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
    setTimeout(() => redirectByRole({
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
