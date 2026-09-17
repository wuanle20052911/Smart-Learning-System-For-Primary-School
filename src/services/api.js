export const sessionKey = 'learnhub-session';

export const readSession = () => {
  try {
    return JSON.parse(localStorage.getItem(sessionKey) || 'null');
  } catch {
    return null;
  }
};

export const authHeaders = (json = false) => {
  const session = readSession();
  return {
    Authorization: `Bearer ${session?.access_token || ''}`,
    ...(json ? { 'Content-Type': 'application/json' } : {})
  };
};

export const api = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(Boolean(options.body)),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Đã xảy ra lỗi.');
  return data;
};
