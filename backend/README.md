# Bound Solutions — Backend (Laravel API)

REST API for the Bound Solutions site: candidate CVs, contact messages, the B2B
vacancy-request questionnaire, admin-managed vacancies, and editable site content
(CMS). Auth is token-based (Laravel Sanctum).

## Shared-database safety: `bs_` table prefix
Every table is prefixed with **`bs_`** (`bs_applications`, `bs_vacancies`,
`bs_contents`, `bs_users`, plus Laravel's own `bs_migrations`, `bs_jobs`,
`bs_sessions`, …) so the app can live inside a database shared with other apps
without colliding. The prefix is set in [`config/database.php`](config/database.php)
via `'prefix' => env('DB_PREFIX', 'bs_')`. Change it with `DB_PREFIX` in `.env`.

## Setup

```bash
cd backend
composer install
cp .env.example .env        # if .env is missing
php artisan key:generate
php artisan migrate --seed   # creates bs_* tables + seeds admin, vacancies, sample content
php artisan storage:link     # serve uploaded CVs/images from /storage
php artisan serve            # http://127.0.0.1:8000
```

### Local dev DB
Defaults to **SQLite** (no credentials needed) — `database/database.sqlite`.

### Production / shared MySQL
In `.env` set:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=the_shared_db
DB_USERNAME=...
DB_PASSWORD=...
DB_PREFIX=bs_
```
then `php artisan migrate --seed`.

## Admin login (seeded)
`nino.bartaia@gmail.com` / `12345678` — change this in production
(`php artisan tinker` → update the user, or reseed).

## API

Base path: `/api`

### Public
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/login` | `{ email, password }` → `{ token, user }` |
| `POST` | `/applications` | Submit a CV / contact / company request. `type` ∈ `cv\|contact\|company`. Accepts multipart with a `cv` file. |
| `GET`  | `/vacancies` | Active vacancies in `{ka,en}` shape for the public page |
| `GET`  | `/content?locale=ka` | Editable content as a flat `{ key: value }` map (images → URLs) |

### Admin (header `Authorization: Bearer <token>`)
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/auth/me` · `POST /auth/logout` | session |
| `GET` | `/applications?type=&status=&search=` | inbox list |
| `PATCH` | `/applications/{id}/status` | `{ status: new\|reviewed }` |
| `DELETE` | `/applications/{id}` | delete |
| `GET` | `/admin/vacancies` | full list (raw columns) |
| `POST` | `/vacancies` · `POST /vacancies/{id}` · `DELETE /vacancies/{id}` | create / update / delete (multipart `image` supported) |
| `GET` | `/admin/content` | all editable rows (both locales) |
| `PUT` | `/content` | `{ items: [{ key, locale, value, type, group }] }` bulk upsert |
| `POST` | `/content/image` | `{ key, group, image }` upload → `{ key, url }` |

CORS origins are configured in [`config/cors.php`](config/cors.php) (env
`CORS_ALLOWED_ORIGINS`, comma-separated). Defaults allow `localhost:5173` and
`boundsolutions.ge`.

## Connecting the Vue frontend (next step)
The frontend (`../src`) currently uses a localStorage demo. To switch it to this
API, point it at the base URL via `VITE_API_BASE` (see `../.env.example`) and
replace the bodies of these composables with `fetch` calls:
- `src/composables/applications.js` → `GET/POST/PATCH/DELETE /api/applications`
- `src/composables/jobs.js` → `GET /api/vacancies`, admin `/api/vacancies`
- `src/composables/useAdminAuth.js` → `POST /api/auth/login`, store the token
- editable copy → `GET /api/content?locale=…`, merged over the i18n defaults
