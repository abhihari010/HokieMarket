# Hokie Market Frontend Phase 5 Notes

The React app now includes a small `listing` management screen for:

- loading listing rows
- inserting a new fixed-price listing
- updating an existing listing
- deleting a listing

## Local run steps

1. Copy `frontend/.env.example` to `frontend/.env` if you want to override the default backend URL.
2. Install dependencies:

```powershell
npm.cmd install
```

3. Start Vite:

```powershell
npm.cmd run dev
```

The frontend expects the FastAPI backend to be running and connected to a local MySQL instance. On Windows PowerShell, `npm.cmd` is safer than `npm` if script execution is restricted.
