// Simple test script to login and call /api/auth/me/ using fetch
(async () => {
  try {
    const loginRes = await fetch('http://localhost:8000/api/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@reza.com', password: 'admin' }),
    });
    const loginText = await loginRes.text();
    console.log('LOGIN', loginRes.status, loginText);

    const setCookie = loginRes.headers.get('set-cookie');
    console.log('SET-COOKIE:', setCookie);
    const cookie = setCookie ? setCookie.split(';')[0] : '';

    const meRes = await fetch('http://localhost:8000/api/auth/me/', {
      method: 'GET',
      headers: { Cookie: cookie },
    });
    const meText = await meRes.text();
    console.log('ME', meRes.status, meText);
  } catch (err) {
    console.error('ERROR', err.message || err);
  }
})();
