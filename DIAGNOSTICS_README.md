# Cloud Backup Software - Diagnostics Tools

This document provides information about the diagnostics tools and utilities available for the Cloud Backup Software.

## Available Diagnostic Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | http://localhost:62376/dashboard | View system status, backups, and account information |
| Basic Diagnostics | http://localhost:62376/diagnostics.html | Basic tests for React initialization and backend connectivity |
| Comprehensive Diagnostics | http://localhost:62376/comprehensive-diagnostics.html | Detailed system diagnostics with network and storage testing |
| Simple Test | http://localhost:62376/simple-test.html | Minimal test page for JavaScript and API connectivity |

## Running the Servers

### Backend Server

The backend server runs on port 5000 and provides the API endpoints for the application.

```powershell
cd "c:\Users\OFENTSE\Documents\cloud backup software\backend"
node simple-server.js
```

### Diagnostics Server

The diagnostics server runs on port 62376 and serves the diagnostic tools.

```powershell
cd "c:\Users\OFENTSE\Documents\cloud backup software\backend"
node fixed-diagnostics-server.js
```

## Troubleshooting Common Issues

### Page Not Found Errors

If you see a "Page Not Found" error:

1. Make sure both servers are running
2. Check if you're using the correct URL (with or without .html extension)
3. Try accessing the page from the navigation links on other diagnostic pages

### Blank Pages

If you encounter a blank page:

1. Check the browser console (F12) for JavaScript errors
2. Verify that the backend server is running on port 5000
3. Clear browser cache and reload the page
4. Try a different diagnostic tool to isolate the issue

### Connection Issues

If diagnostic tools can't connect to the backend:

1. Verify the backend server is running on port 5000
2. Check for CORS issues in the browser console
3. Ensure the correct API URL is configured (http://localhost:5000)
4. Test the API endpoints directly using the comprehensive diagnostics tool

## Diagnostic Server Configuration

The diagnostics server is configured to serve static files from the frontend/public directory and includes specific routes for:

- /dashboard → dashboard.html
- /diagnostics → diagnostics.html
- / → redirects to diagnostics.html

A custom 404 page is provided with links to all available diagnostic tools.

## Backend API Endpoints for Testing

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/health | GET | Check if the backend is running |
| /api/auth/login | POST | Test authentication with test credentials |
| /api/dashboard | GET | Test authenticated access to dashboard data |

## Test Credentials

For testing the login functionality:

- Email: user@altaro.com
- Password: admin123
