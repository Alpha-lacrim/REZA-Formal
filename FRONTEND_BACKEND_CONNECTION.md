# Frontend-Backend Connection Guide

## Docker Quick Start

From the project root:

```powershell
Copy-Item .env.docker.example .env
docker compose up --build
```

Docker starts SQL Server, Django, and the frontend together.

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Full Docker guide: `docs/DOCKER_SETUP.md`

## ✅ Connection Status: COMPLETE

Your frontend and backend are now fully connected and ready to use!

## Server Information

### Backend (Django REST API)
- **URL**: http://localhost:8000
- **Status**: Running ✅
- **Database**: Microsoft SQL Server (reza)
- **CORS Origins**: 
  - http://localhost:5173
  - http://localhost:3000
  - http://localhost:3001
  - http://127.0.0.1:5173
  - http://127.0.0.1:3000
  - http://127.0.0.1:3001
  - http://localhost:8000

### Frontend (React + Vite)
- **URL**: http://localhost:3001
- **Status**: Running ✅
- **API Base**: http://localhost:8000
- **Port Note**: Running on port 3001 because port 3000 is in use

## Configuration Details

### Frontend API Service (`frontend/services/api.ts`)
The frontend has automatic fallback logic:
- Primary API base: `VITE_API_BASE` environment variable
- Fallback: `http://localhost:8000`
- Credentials: `include` (allows cookies for JWT auth)

### Backend CORS Settings
Located in `backend/reza_backend/settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://localhost:8000'
]
CORS_ALLOW_CREDENTIALS = True  # Required for cookie-based JWT
```

### Database Connection
- **Engine**: mssql-django
- **Host**: BRO\SQLEXPRESS
- **Database**: reza
- **User**: sa
- **Driver**: ODBC Driver 17 for SQL Server
- **Encryption**: Disabled (for local development)
- **Status**: Connected ✅

## Available Backend API Endpoints

### Authentication
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login (returns JWT in cookies)
- `POST /api/auth/send-otp/` - Send OTP for 2FA
- `GET /api/auth/me/` - Get current user info
- `POST /api/auth/logout/` - Logout
- `PUT /api/auth/me/update/` - Update user profile
- `POST /api/auth/google/` - Google authentication

### Products
- `GET /api/products/` - List all products
- `GET /api/products/<id>/` - Get product details

### Orders
- `POST /api/orders/create/` - Create new order
- `GET /api/orders/my/` - Get user's orders

### Settings & Content
- `GET /api/settings/` - Get site settings
- `PUT /api/settings/` - Update site settings (admin only)
- `POST /api/contact/` - Send contact message

### Admin Endpoints
- `GET /api/admin/stats/` - Get dashboard statistics
- `GET /api/admin/orders/` - List all orders
- `PUT /api/admin/orders/<id>/status/` - Update order status
- `GET /api/admin/users/` - List all users
- `GET /api/admin/messages/` - Get contact messages
- `POST /api/admin/messages/<id>/mark-read/` - Mark message as read
- `GET /api/admin/products/` - Get all products for editing
- `POST /api/admin/products/<id>/` - Save product

## Testing the Connection

### Test Admin Login
```
Email: admin@reza.com
Password: admin
2FA Secret: KAYV46C7N5ZG62D3
```

### Quick API Test (using curl)
```bash
# Get products
curl http://localhost:8000/api/products/

# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@reza.com","password":"admin"}' \
  -c cookies.txt

# Get authenticated user
curl http://localhost:8000/api/auth/me/ -b cookies.txt
```

## How It Works

1. **Frontend** (React on http://localhost:3001)
   - Makes API calls via `services/api.ts`
   - Uses `GlobalContext` to manage state
   - Automatically syncs with backend data
   - Falls back to localStorage for offline support

2. **Backend** (Django REST API on http://localhost:8000)
   - Handles all API requests
   - Manages authentication with JWT cookies
   - Enforces CORS rules
   - Reads/writes to SQL Server database

3. **Database** (SQL Server)
   - Stores all application data
   - Tables: Users, Products, Orders, OrderItems, ContactMessages, SiteSettings

## Important Features

### Authentication Flow
1. User logs in via frontend form
2. Frontend sends credentials to `/api/auth/login/`
3. Backend validates and sets JWT in secure cookie
4. All subsequent requests include JWT automatically
5. Frontend checks `/api/auth/me/` to get user details and role

### CORS Configuration
- Frontend on different domain? Update `ALLOWED_ORIGINS` in `.env`
- Credentials are sent with each request (cookies for JWT)
- Backend allows credentials with `CORS_ALLOW_CREDENTIALS = True`

### SQL Server Compatibility
- Using SQL Server 2019+ (v15+)
- mssql-django version 1.1+
- Version check patched in settings.py to support SQL Server 2025 (v17)
- ODBC Driver 17 for SQL Server

## Troubleshooting

### "Failed to fetch from /api/..."
1. Check if backend is running: `python manage.py runserver`
2. Verify CORS allows your origin
3. Check browser console for actual error message

### "Cannot connect to SQL Server"
1. Verify SQL Server is running
2. Check connection string in `.env`
3. Ensure ODBC Driver 17 is installed
4. Check Windows authentication or user credentials

### Frontend shows outdated data
1. Clear browser cache
2. Check `localStorage` in DevTools
3. Refresh the page
4. Restart backend server

### API returns 401 Unauthorized
1. User session may have expired (refresh token)
2. Login again to get fresh JWT
3. Check JWT is in cookies (DevTools > Application > Cookies)

## Next Steps

1. **Open Frontend**: http://localhost:3001
2. **Login**: Use admin credentials (see Testing section)
3. **Test Features**:
   - View products
   - Manage admin panel
   - Create orders
   - Update settings
4. **Deploy**:
   - Backend: Use gunicorn with production database
   - Frontend: Build with `npm run build` and serve with web server

## File Reference

- Backend configuration: [backend/reza_backend/settings.py](backend/reza_backend/settings.py)
- Frontend API service: [frontend/services/api.ts](frontend/services/api.ts)
- Global state: [frontend/contexts/GlobalContext.tsx](frontend/contexts/GlobalContext.tsx)
- Database environment: [backend/.env](backend/.env)
