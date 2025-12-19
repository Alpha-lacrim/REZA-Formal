import requests
s = requests.Session()
print('Logging in...')
login = s.post('http://localhost:8000/api/auth/login/', json={'email':'admin@reza.com','password':'admin'})
print('login', login.status_code, login.text)
print('Uploading file...')
files = {'image': open('/tmp/sample_product.avif','rb')}
data = {'name':'CI Test Product','price':'123','category':'accessories','description':'uploaded via test','currency':'Toman','short':'ci','stock':'5'}
resp = s.post('http://localhost:8000/api/admin/products/', data=data, files=files)
print('upload', resp.status_code)
print(resp.text)
