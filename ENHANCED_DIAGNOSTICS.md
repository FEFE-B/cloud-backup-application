# Cloud Backup Software - Enhanced Diagnostics System

This document provides an overview of the enhanced diagnostics system for the Cloud Backup Software application.

## Overview

The enhanced diagnostics system is designed to help troubleshoot issues with the Cloud Backup software. It includes multiple tools and utilities that can help identify and fix common problems.

## Diagnostic Components

1. **Diagnostics Portal** - The main entry point for all diagnostic tools
   - URL: http://localhost:62376/diagnostics-portal
   - Features: System status overview, links to all diagnostic tools

2. **Main Dashboard** - The primary application dashboard
   - URL: http://localhost:62376/dashboard
   - Features: Backup statistics, activity logs, user information

3. **API Dashboard** - Advanced API monitoring and testing
   - URL: http://localhost:62376/api-dashboard
   - Features: API endpoint testing, server info, system resources

4. **Basic Diagnostics** - Simple diagnostic tests
   - URL: http://localhost:62376/diagnostics.html
   - Features: JavaScript, React, and backend connectivity tests

5. **Comprehensive Diagnostics** - Advanced system diagnostics
   - URL: http://localhost:62376/comprehensive-diagnostics.html
   - Features: Detailed system information, connectivity tests, troubleshooting tools

6. **API Diagnostic Server** - Backend API diagnostic utility
   - URL: http://localhost:3030/api/info
   - Features: Server information, database testing, filesystem testing

## Starting the System

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

4. Open http://localhost:62376/diagnostics-portal in your browser to access the main portal.

## Troubleshooting Common Issues

### Blank Pages

If you encounter a blank page:

1. Check that all servers are running
2. Verify that you're using the correct URL
3. Check the browser console for JavaScript errors (F12)
4. Try accessing the basic diagnostics page at http://localhost:62376/diagnostics.html

### Connection Issues

If the application cannot connect to the backend:

1. Verify that the backend server is running on port 5000
2. Check the API Dashboard for server status
3. Use the API Diagnostic Server to test backend connectivity
4. Check firewall settings to ensure the ports are open

### Error Pages

If you see a 404 or error page:

1. Make sure you're using the correct URL
2. Check that the diagnostics server is running on port 62376
3. Try accessing the diagnostics portal at http://localhost:62376/diagnostics-portal
4. Restart the servers if necessary

## Support

If you continue to experience issues after using the diagnostic tools, please contact support with the following information:

1. Screenshots of any error messages
2. Results from the comprehensive diagnostics page
3. Server logs if available
4. Steps to reproduce the issue

## System Requirements

- Node.js 14.x or higher
- Modern web browser (Chrome, Firefox, Edge, or Safari)
- Minimum 4GB RAM
- 100MB free disk space
