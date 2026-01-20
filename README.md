# Hospital Management System - Electron Desktop Application

## Overview
This is a standalone desktop application version of the Hospital Management System (HMS), built with Electron. It runs completely offline and requires no Node.js or XAMPP installation on client machines.

## Architecture

```
/app
 ├── electron/          # Electron main process
 │   ├── main.js        # App lifecycle & backend server startup
 │   ├── preload.js     # Secure IPC bridge
 │   └── assets/        # App icons and resources
 ├── backend/           # Node.js + Express + Prisma
 │   ├── src/           # TypeScript source
 │   ├── dist/          # Compiled JavaScript (production)
 │   └── prisma/        # Database schema and migrations
 ├── frontend/          # React + Vite + Tailwind
 │   ├── src/           # React source code
 │   └── dist/          # Built static files
 ├── package.json       # Root Electron package
 └── electron-builder.json  # Packaging configuration
```

## Prerequisites

### For Development
- **Node.js**: v18+ (LTS recommended)
- **MariaDB/MySQL**: Local database server
- **npm**: v9+

### For Production Use  
- **MariaDB/MySQL**: Should be running locally
- **No other dependencies!** Everything is bundled in the `.exe`

## Installation & Setup

### 1. Install Dependencies
```bash
cd app
npm install
```

### 2. Configure Database
Create a `.env` file in `/app` directory:
```env
DATABASE_URL="mysql://username:password@localhost:3306/hospital_db"
PORT=5000
NODE_ENV=development
```

### 3. Run Database Migrations
```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

### 4. Seed Initial Data (Optional)
```bash
cd backend
npm run prisma:seed
```

## Development

### Running in Development Mode
Start all services concurrently:
```bash
cd app
npm run dev
```

This will:
- Start the backend API server (with auto-reload)
- Start the Vite dev server for frontend
- Launch Electron with DevTools enabled

### Running Components Separately
**Backend only:**
```bash
cd app/backend
npm run dev
```

**Frontend only:**
```bash
cd app/frontend
npm run dev
```

**Electron only (requires backend & frontend running):**
```bash
cd app
npm start
```

## Building for Production

### 1. Build Backend
```bash
cd app
npm run build:backend
```
This compiles TypeScript to JavaScript in `backend/dist/`

### 2. Build Frontend
```bash
cd app
npm run build:frontend
```
This creates optimized production build in `frontend/dist/`

### 3. Build Both
```bash
cd app
npm run build
```

## Packaging

### Create Windows Installer
```bash
cd app
npm run dist
```

This will:
- Build backend and frontend
- Package everything with Electron
- Bundle Prisma binaries for Windows
- Create installer in `/app/dist/`

**Output:**
- `dist/win-unpacked/` - Unpacked application
- `dist/HospitalManagementSystemSetup.exe` - Windows installer

### Electron Builder Configuration
See `electron-builder.json` for packaging options:
- App ID, product name
- File inclusions/exclusions
- NSIS installer settings
- Icon configuration

## Security Features

✅ **Node Integration Disabled** in renderer  
✅ **Context Isolation Enabled**  
✅ **Secure IPC** via preload script  
✅ **No database credentials** exposed to frontend  
✅ **DevTools disabled** in production

## How It Works

### 1. App Startup Flow
1. Electron main process starts
2. `main.js` loads environment variables  
3. Backend Express server starts on random free port
4. Prisma connects to local MariaDB/MySQL
5. React UI loads (from `dist/` in production or Vite dev server in dev)
6. Frontend calls `window.electron.getApiPort()` to get backend port
7. API requests go to `http://localhost:<port>/api`

### 2. Communication Architecture
```
┌─────────────────┐
│  React Frontend │ (Renderer Process)
│  (No Node)      │
└────────┬────────┘
         │ HTTP Requests
         ▼
┌─────────────────┐
│  Express API    │ (Main Process)
│  + Prisma ORM   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MariaDB/MySQL  │
└─────────────────┘
```

### 3. Prisma in Electron
- Schema includes `binaryTargets = ["native", "windows"]`
- Binaries bundled via `electron-builder`
- Client pre-generated before packaging
- No runtime code generation

## Troubleshooting

### ❌ "Query Engine not found"
**Solution:**
```bash
cd app/backend
npx prisma generate
```
Ensure `schema.prisma` has correct `binaryTargets`.

### ❌ Backend won't start in Electron
**Check:**
1. `.env` file exists in `/app`
2. Database is running
3. `DATABASE_URL` is correct
4. Backend compiled successfully (`backend/dist/` exists)

**View logs:**
Electron console shows backend startup logs.

### ❌ Frontend can't reach backend
**Causes:**
- Backend not started
- Port binding failed
- IPC bridge not working

**Debug:**
Open DevTools in dev mode and check console for errors.

### ❌ Build fails
**Common issues:**
1. Missing `dist` folders → Run `npm run build` first
2. Prisma not generated → Run `npm run prisma:generate`
3. TypeScript errors → Check `backend/src/` for compile errors

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm install` | Install root dependencies |
| `npm run install:all` | Install all (root + backend + frontend) |
| `npm run dev` | Start all in development mode |
| `npm run dev:backend` | Start backend only |
| `npm run dev:frontend` | Start frontend only |
| `npm run build` | Build backend + frontend |
| `npm run build:backend` | Build backend to `dist/` |
| `npm run build:frontend` | Build frontend to `dist/` |
| `npm run start` | Run Electron |
| `npm run dist` | Package for distribution |
| `npm run prisma:generate` | Generate Prisma client |

## Database Management

### Migrations
```bash
cd app/backend
npx prisma migrate dev --name migration_name
```

### Prisma Studio (DB GUI)
```bash
cd app/backend
npx prisma studio
```

### Reset Database
```bash
cd app/backend
npx prisma migrate reset
```

## Deployment

### On Client Machines
1. Ensure MariaDB/MySQL is installed and running
2. Create the database (e.g., `hospital_db`)
3. Run `HospitalManagementSystemSetup.exe`
4. Application will install and create desktop shortcut
5. First run: Database migrations will auto-apply (if configured)

### Configuration
Users can modify `.env` file in installation directory if needed (e.g., to change database connection).

**Typical install location:**
```
C:\Users\<Username>\AppData\Local\Programs\hospital-management-system-desktop\
```

## Performance Optimization

- Frontend uses code splitting (vendor chunks)
- Backend runs as fork (separate process)
- No unnecessary rebuilds in production
- Lazy loading for routes

## Known Limitations

1. **Database**: Must be installed separately (not bundled)
2. **Platform**: Currently Windows-only (can be extended to macOS/Linux)
3. **Auto-updates**: Not configured (can be added with `electron-updater`)
4. **Logging**: Console-based (can add file logging)

## Future Enhancements

- [ ] Auto-update functionality
- [ ] Bundled portable database (SQLite alternative)
- [ ] System tray integration
- [ ] Offline persistence layer
- [ ] Multi-platform builds (macOS, Linux)
- [ ] File-based logging

## Support

For issues or questions, refer to:
- `implementation_plan.md` - Detailed conversion plan
- `task.md` - Implementation checklist
- Backend logs in Electron console
- Prisma documentation: https://www.prisma.io/docs

## License

MIT License (as per original HMS project)

---

**Built with:** Electron, Node.js, Express, Prisma, React, Vite, Tailwind CSS
