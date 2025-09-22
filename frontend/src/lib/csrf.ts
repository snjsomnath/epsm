// Utility to get CSRF token from cookie (Django default)
export function getCSRFTokenFromCookie(): string | null {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : null;
}
