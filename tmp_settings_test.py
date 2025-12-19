import requests
s = requests.Session()
print('Logging in...')
login = s.post('http://localhost:8000/api/auth/login/', json={'email':'admin@reza.com','password':'admin'})
print('login', login.status_code)
files = {'about_image': open('/tmp/sample_product.avif','rb')}
data = {'about_title':'CI About','about_description':'desc from test'}
resp = s.put('http://localhost:8000/api/settings/', data=data, files=files)
print('settings', resp.status_code)
print(resp.text)
