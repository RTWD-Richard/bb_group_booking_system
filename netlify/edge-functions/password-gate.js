// Temporary shared-password gate for the testing phase.
// Active only when SITE_PASSWORD is set (scoped to the production context),
// so local dev and any future contexts without the var pass straight through.
// Remove this file once real authentication lands.

const PUBLIC_PATHS = [
  '/manifest.webmanifest', // fetched without credentials, would break PWA install
  '/sw.js',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-icon.png',
  '/favicon.ico',
];

export default async (request, context) => {
  const url = new URL(request.url);
  if (PUBLIC_PATHS.includes(url.pathname)) {
    return context.next();
  }

  const expected = Netlify.env.get('SITE_PASSWORD');
  if (!expected) {
    return context.next();
  }

  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const password = decoded.slice(decoded.indexOf(':') + 1);
      if (password === expected) {
        return context.next();
      }
    } catch {
      // fall through to the 401
    }
  }

  return new Response('Password required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="B&B Bookings (testing)"' },
  });
};

export const config = { path: '/*' };
