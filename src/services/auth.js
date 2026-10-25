import { readSession, sessionKey } from './api.js';
import { signOutGoogleSession } from './supabaseAuth.js';

export const go = (path) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

export const logout = async () => {
  localStorage.removeItem(sessionKey);
  go('/');
  try {
    await signOutGoogleSession();
  } catch (error) {
    console.error('Could not clear Google sign-in session:', error);
  }
};

export { readSession, sessionKey };
