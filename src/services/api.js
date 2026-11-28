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
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...authHeaders(Boolean(options.body)),
        ...(options.headers || {})
      }
    });
  } catch (error) {
    if (window.location.pathname === '/admin') {
      window.dispatchEvent(new CustomEvent('admin-api-error', {
        detail: {
          title: 'Không thể kết nối máy chủ',
          text: error.message || 'Mất kết nối mạng hoặc máy chủ không phản hồi.',
          url,
          status: 0,
          code: null
        }
      }));
    }
    throw new Error('Không thể kết nối máy chủ. Kiểm tra mạng hoặc trạng thái dịch vụ.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Đã xảy ra lỗi.');
    error.status = response.status;
    error.url = url;
    error.databaseCode = data.code || data.errorCode || null;
    if (window.location.pathname === '/admin') {
      window.dispatchEvent(new CustomEvent('admin-api-error', {
        detail: {
          title: 'Lỗi khi truy cập cơ sở dữ liệu',
          text: `${error.message}${error.status ? ` (HTTP ${error.status})` : ''}${error.databaseCode ? ` · Mã ${error.databaseCode}` : ''}`,
          url,
          status: response.status,
          code: error.databaseCode
        }
      }));
    }
    throw error;
  }
  return data;
};
