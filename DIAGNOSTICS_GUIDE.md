# Cloud Backup Software Diagnostics

This document provides instructions on how to diagnose and fix issues with the Cloud Backup application.

## Quick Links

- **Backend API:** http://localhost:5000/api/health
- **Diagnostics Portal:** http://localhost:62376/diagnostics-portal
- **Dashboard:** http://localhost:62376/dashboard
- **API Dashboard:** http://localhost:62376/api-dashboard
- **Basic Diagnostics:** http://localhost:62376/diagnostics.html
- **Comprehensive Diagnostics:** http://localhost:62376/comprehensive-diagnostics.html

## Starting the Servers

1. **Start the Backend Server:**
   ```bash
   cd backend
   node simple-server.js
   ```

2. **Start the Diagnostics Server:**
   ```bash
   cd backend
   node fixed-diagnostics-server.js
   ```

3. **Start the API Diagnostic Server (Optional):**
   ```bash
   cd backend
   node api-diagnostic.js
   ```

## Fixing the Blank Diagnostics Page

If you encounter a "Page Not Found" error at http://localhost:62376/diagnostics, follow these steps:

1. Make sure both servers are running (backend and diagnostics)
2. Use the full URL with .html extension: http://localhost:62376/diagnostics.html
3. If the page is still not available, restart the diagnostics server using:
   ```bash
   cd backend
   node fixed-diagnostics-server.js
   ```
4. Alternative diagnostic pages are also available:
   - http://localhost:62376/comprehensive-diagnostics.html
   - http://localhost:62376/simple-test.html

## Troubleshooting

If you encounter issues with the application:

1. Use the diagnostic tools to check:
   - Backend connectivity
   - API endpoints
   - Browser compatibility
   - Network latency

2. Check the browser console (F12) for JavaScript errors

3. Verify the backend server is running and accessible

## Common Issues and Solutions

1. **Port Conflicts:**
   - Backend should run on port 5000
   - Diagnostics server runs on port 62376
   - Frontend runs on port 3001 or the port assigned by the development server

2. **Connection Issues:**
   - Ensure CORS is enabled on the backend
   - Check that API URLs are correct in the frontend configuration
   - Verify network connectivity between frontend and backend

3. **Authentication Problems:**
   - Clear local storage to remove stale tokens
   - Test the login API endpoint via the diagnostics tools

4. **URL Path Issues:**
   - Use the `.html` extension when accessing diagnostic pages directly
   - If a page shows "not found", check the exact URL path
   - Use the links provided in the 404 page to navigate to available diagnostics

## Configuration

The frontend is configured to connect to the backend at http://localhost:5000.
If you need to change this, update the following files:

- `frontend/src/utils/api.js`
- `frontend/src/config/api.ts`
