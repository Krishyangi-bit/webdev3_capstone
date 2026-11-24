// Minimal cookie parser: exposes the request's cookies as req.cookies.
// Only the refresh-token cookie is read by the API, so a full library is unnecessary.
function parseCookieHeader(header = '') {
  return header.split(';').reduce((cookies, pair) => {
    const index = pair.indexOf('=');
    if (index === -1) return cookies;
    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (!name) return cookies;
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
    return cookies;
  }, {});
}

function cookieParser(req, res, next) {
  req.cookies = parseCookieHeader(req.headers.cookie);
  next();
}

module.exports = { cookieParser, parseCookieHeader };
