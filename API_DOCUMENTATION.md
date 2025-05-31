# API Documentation - Altaro Cloud Backup

This document outlines all available API endpoints in the Altaro Cloud Backup system.

## Base URL

All API endpoints are relative to the base URL of the server.

Development: `http://localhost:5000/api`
Production: `https://your-production-url.com/api`

## Authentication

Most endpoints require authentication using JSON Web Tokens (JWT). Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## User Authentication

### Register User

- **URL**: `/auth/register`
- **Method**: `POST`
- **Auth Required**: No
- **Description**: Register a new user account
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "company": "ACME Corp",
    "phone": "123-456-7890"
  }
  ```
- **Success Response**: `201 Created`
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "data": {
      "id": "60d21b4667d0d8992e610c85",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  }
  ```

### Login User

- **URL**: `/auth/login`
- **Method**: `POST`
- **Auth Required**: No
- **Description**: Authenticate a user and get token
- **Request Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "data": {
      "id": "60d21b4667d0d8992e610c85",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  }
  ```

### Get Current User

- **URL**: `/auth/me`
- **Method**: `GET`
- **Auth Required**: Yes
- **Description**: Get current authenticated user
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "id": "60d21b4667d0d8992e610c85",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "company": "ACME Corp",
      "phone": "123-456-7890",
      "subscription": {
        "plan": "basic",
        "startDate": "2023-06-15T00:00:00.000Z",
        "expiryDate": "2024-06-15T00:00:00.000Z",
        "autoRenew": true,
        "isActive": true
      }
    }
  }
  ```

## User Management

### Update User Profile

- **URL**: `/users/profile`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Description**: Update current user profile
- **Request Body**:
  ```json
  {
    "name": "John Smith",
    "company": "New Company",
    "phone": "987-654-3210"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "id": "60d21b4667d0d8992e610c85",
      "name": "John Smith",
      "email": "john@example.com",
      "company": "New Company",
      "phone": "987-654-3210"
    }
  }
  ```

### Change Password

- **URL**: `/users/password`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Description**: Change user password
- **Request Body**:
  ```json
  {
    "currentPassword": "password123",
    "newPassword": "newpassword123"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Password updated successfully"
  }
  ```

## Backup Management

### Get User Backups

- **URL**: `/backups`
- **Method**: `GET`
- **Auth Required**: Yes
- **Description**: Get all backups for current user
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "count": 2,
    "data": [
      {
        "id": "60d21b4667d0d8992e610c86",
        "name": "Documents Backup",
        "description": "Daily backup of documents folder",
        "status": "active",
        "backupType": "file",
        "size": 1024,
        "lastBackupDate": "2023-07-15T10:30:00.000Z",
        "schedule": {
          "enabled": true,
          "frequency": "daily",
          "time": "22:00"
        }
      },
      {
        "id": "60d21b4667d0d8992e610c87",
        "name": "Database Backup",
        "description": "Weekly backup of MySQL database",
        "status": "active",
        "backupType": "database",
        "size": 2048,
        "lastBackupDate": "2023-07-10T23:15:00.000Z",
        "schedule": {
          "enabled": true,
          "frequency": "weekly",
          "day": "Sunday",
          "time": "01:00"
        }
      }
    ]
  }
  ```

### Create Backup

- **URL**: `/backups`
- **Method**: `POST`
- **Auth Required**: Yes
- **Description**: Create a new backup configuration
- **Request Body**:
  ```json
  {
    "name": "Email Backup",
    "description": "Monthly backup of email archive",
    "backupType": "email",
    "sourcePath": "/var/mail/archive",
    "schedule": {
      "enabled": true,
      "frequency": "monthly",
      "day": 1,
      "time": "03:00"
    }
  }
  ```
- **Success Response**: `201 Created`
  ```json
  {
    "success": true,
    "data": {
      "id": "60d21b4667d0d8992e610c88",
      "name": "Email Backup",
      "description": "Monthly backup of email archive",
      "status": "active",
      "backupType": "email",
      "sourcePath": "/var/mail/archive",
      "size": 0,
      "schedule": {
        "enabled": true,
        "frequency": "monthly",
        "day": 1,
        "time": "03:00"
      }
    }
  }
  ```

### Run Backup

- **URL**: `/backups/:id/run`
- **Method**: `POST`
- **Auth Required**: Yes
- **Description**: Manually trigger a backup
- **URL Parameters**: `:id` - ID of the backup
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Backup started successfully"
  }
  ```

## Renewal Management

### Get User Renewals

- **URL**: `/renewals`
- **Method**: `GET`
- **Auth Required**: Yes
- **Description**: Get all renewals for current user
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "count": 2,
    "data": [
      {
        "id": "60d21b4667d0d8992e610c89",
        "plan": "basic",
        "amount": 99.99,
        "status": "paid",
        "dueDate": "2023-06-15T00:00:00.000Z",
        "createdAt": "2023-05-15T00:00:00.000Z"
      },
      {
        "id": "60d21b4667d0d8992e610c90",
        "plan": "basic",
        "amount": 99.99,
        "status": "pending",
        "dueDate": "2024-06-15T00:00:00.000Z",
        "createdAt": "2023-06-15T00:00:00.000Z"
      }
    ]
  }
  ```

### Process Renewal Payment

- **URL**: `/renewals/:id/payment`
- **Method**: `POST`
- **Auth Required**: Yes
- **Description**: Process payment for a renewal
- **URL Parameters**: `:id` - ID of the renewal
- **Request Body**:
  ```json
  {
    "paymentMethod": "credit_card",
    "cardNumber": "4111111111111111",
    "expiryMonth": "12",
    "expiryYear": "2025",
    "cvv": "123",
    "amount": 99.99
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Payment processed successfully",
    "data": {
      "id": "60d21b4667d0d8992e610c90",
      "plan": "basic",
      "amount": 99.99,
      "status": "paid",
      "paymentDate": "2023-07-20T15:30:00.000Z"
    }
  }
  ```

## Admin API Endpoints

### Get All Users

- **URL**: `/admin/users`
- **Method**: `GET`
- **Auth Required**: Yes (Admin only)
- **Description**: Get all users
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "count": 10,
    "data": [
      {
        "id": "60d21b4667d0d8992e610c85",
        "name": "John Smith",
        "email": "john@example.com",
        "role": "user",
        "company": "ACME Corp",
        "subscription": {
          "plan": "basic",
          "isActive": true,
          "expiryDate": "2024-06-15T00:00:00.000Z"
        },
        "createdAt": "2023-06-15T00:00:00.000Z"
      },
      // More users...
    ]
  }
  ```

### Get User List with Filtering

- **URL**: `/admin/users/list`
- **Method**: `GET`
- **Auth Required**: Yes (Admin only)
- **Description**: Get filtered list of users with pagination
- **Query Parameters**:
  - `search`: Search term for name, email, or company
  - `status`: Filter by subscription status (active, inactive)
  - `plan`: Filter by subscription plan
  - `sortBy`: Field to sort by
  - `sortOrder`: Sort direction (asc, desc)
  - `page`: Page number
  - `limit`: Items per page
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": [
      // User objects
    ],
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
  ```

### Get Renewals with Filtering

- **URL**: `/admin/renewals`
- **Method**: `GET`
- **Auth Required**: Yes (Admin only)
- **Description**: Get filtered list of renewals with pagination
- **Query Parameters**:
  - `search`: Search term for user name, email, or renewal ID
  - `status`: Filter by renewal status
  - `plan`: Filter by subscription plan
  - `dateRange`: Filter by date range (7days, 30days, 90days, thisYear)
  - `sortBy`: Field to sort by
  - `sortOrder`: Sort direction (asc, desc)
  - `page`: Page number
  - `limit`: Items per page
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": [
      // Renewal objects with populated user info
    ],
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
  ```

### Get Backups with Filtering

- **URL**: `/admin/backups`
- **Method**: `GET`
- **Auth Required**: Yes (Admin only)
- **Description**: Get filtered list of backups with pagination
- **Query Parameters**:
  - `search`: Search term for backup name, user name, email, or backup ID
  - `status`: Filter by backup status
  - `type`: Filter by backup type
  - `plan`: Filter by user's subscription plan
  - `sortBy`: Field to sort by
  - `sortOrder`: Sort direction (asc, desc)
  - `page`: Page number
  - `limit`: Items per page
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": [
      // Backup objects with populated user info
    ],
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
  ```

### Process Renewal Payment (Admin)

- **URL**: `/admin/renewals/:id/process-payment`
- **Method**: `POST`
- **Auth Required**: Yes (Admin only)
- **Description**: Process manual payment for a renewal
- **URL Parameters**: `:id` - ID of the renewal
- **Request Body**:
  ```json
  {
    "amount": 99.99,
    "paymentMethod": "bank_transfer",
    "transactionId": "BTR123456",
    "notes": "Manual payment processed by admin"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "renewal": {
        // Updated renewal object
      },
      "payment": {
        "date": "2023-07-20T15:30:00.000Z",
        "amount": 99.99,
        "method": "bank_transfer",
        "transactionId": "BTR123456",
        "notes": "Manual payment processed by admin",
        "status": "success",
        "processedBy": "Admin User"
      }
    }
  }
  ```

## Error Responses

All endpoints may return the following error responses:

- **400 Bad Request**: Invalid request parameters
  ```json
  {
    "success": false,
    "message": "Invalid request parameters",
    "error": "Details about the error"
  }
  ```
- **401 Unauthorized**: Missing or invalid authentication token
  ```json
  {
    "success": false,
    "message": "Not authorized to access this resource"
  }
  ```
- **403 Forbidden**: Not authorized to access the resource
  ```json
  {
    "success": false,
    "message": "Not authorized to access this resource"
  }
  ```
- **404 Not Found**: Resource not found
  ```json
  {
    "success": false,
    "message": "Resource not found"
  }
  ```
- **500 Server Error**: Internal server error
  ```json
  {
    "success": false,
    "message": "Server error",
    "error": "Details about the error"
  }
  ```
