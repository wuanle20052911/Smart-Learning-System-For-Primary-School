import { readSession, sessionKey } from './api.js';

export const go = (path) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

export const logout = () => {
  localStorage.removeItem(sessionKey);
  go('/');
};

export { readSession, sessionKey };
