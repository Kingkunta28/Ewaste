# Smart E-Waste Collection System (React + Django)

This project implements the SUZA Smart E-Waste Collection System with:

- `backend/` Django API and admin
- `frontend/` React (Vite) client

## Features

- User registration/login/logout
- Role-based access: `user`, `admin`, `collector`
- Users submit pickup requests
- Admin assigns collectors and updates status
- Collectors view assigned pickups and mark completed
- Admin dashboard stats

## Backend Setup (Django)

From `c:\Users\XS0ulR3aperX\Desktop\SEWSYSTEM\sewsystem`:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Backend base URL: `http://127.0.0.1:8000`

## Frontend Setup (React)

From `c:\Users\XS0ulR3aperX\Desktop\SEWSYSTEM\sewsystem\frontend`:

```powershell
npm install
npm run dev
```

Frontend URL: `http://127.0.0.1:5173`

## Deploy: Render (backend) + Vercel (frontend)

### 1) Deploy backend to Render

1. Push this repo to GitHub.
2. In Render, create a new Blueprint and select this repo.
3. Render will pick up `render.yaml` and create:
   - A Django web service
   - A PostgreSQL database
4. In the backend service env vars, set these with your final Vercel domain:
   - `DJANGO_ALLOWED_HOSTS=ewaste-backend-rjky.onrender.com`
   - `FRONTEND_ORIGIN=https://ewaste-lemon.vercel.app`
   - `FRONTEND_ORIGINS=https://ewaste-lemon.vercel.app`
   - `DJANGO_CSRF_TRUSTED_ORIGINS=https://ewaste-lemon.vercel.app`
   - `DJANGO_SUPERUSER_EMAIL=raya@ex.com`
   - `DJANGO_SUPERUSER_USERNAME=raya@ex.com`
   - `DJANGO_SUPERUSER_PASSWORD=<set this securely in Render>`
5. Backend URL: `https://ewaste-backend-rjky.onrender.com`.
6. On each deploy, `build.sh` will automatically create/update this superuser.

### 2) Deploy frontend to Vercel

1. Import the same repo in Vercel.
2. Set:
   - Root Directory: `frontend`
   - Framework Preset: `Vite`
3. API routing on Vercel is already configured in `frontend/vercel.json`:
   - `/api/*` -> `https://ewaste-backend-rjky.onrender.com/api/*`
   - You can optionally override with `VITE_API_BASE_URL` if needed.
4. Deploy.

### 3) Finalize CORS/CSRF on Render

After Vercel gives final URL, update these backend vars on Render and redeploy:

- `DJANGO_ALLOWED_HOSTS`
- `FRONTEND_ORIGIN`
- `FRONTEND_ORIGINS`
- `DJANGO_CSRF_TRUSTED_ORIGINS`

## API Endpoints

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `GET /api/me/`
- `GET, POST /api/requests/`
- `GET, PATCH /api/requests/<id>/`
- `POST /api/requests/<id>/assign/`
- `POST /api/requests/<id>/status/`
- `GET /api/collectors/`
- `GET /api/dashboard/stats/`

## Notes

- CORS is enabled for local development.
- Default database is SQLite (`db.sqlite3`).
- Use Django admin at `/admin/` for direct data management.
"# Ewaste" 
