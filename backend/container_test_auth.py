import http.client, json

def post_login():
    conn = http.client.HTTPConnection('127.0.0.1', 8000, timeout=10)
    payload = json.dumps({'email':'admin@reza.com','password':'admin'})
    conn.request('POST', '/api/auth/login/', payload, {'Content-Type':'application/json'})
    res = conn.getresponse()
    body = res.read().decode()
    cookies = [v for k,v in res.getheaders() if k.lower()=='set-cookie']
    conn.close()
    return res.status, body, cookies

def get_me(cookie_header):
    conn = http.client.HTTPConnection('127.0.0.1', 8000, timeout=10)
    headers = {'Cookie': cookie_header} if cookie_header else {}
    conn.request('GET', '/api/auth/me/', headers=headers)
    res = conn.getresponse()
    body = res.read().decode()
    conn.close()
    return res.status, body

if __name__ == '__main__':
    status, body, cookies = post_login()
    print('LOGIN', status, body)
    print('SET-COOKIES', cookies)
    cookie_header = '; '.join([c.split(';',1)[0] for c in cookies])
    status2, body2 = get_me(cookie_header)
    print('ME', status2, body2)
