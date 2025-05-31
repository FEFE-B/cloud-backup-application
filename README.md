# Altaro Cloud Backup Software

Altaro Cloud Backup is a comprehensive cloud backup solution designed to securely store and manage user data in the cloud. The platform provides robust backup functionality, subscription management, and administrative tools.

## Project Structure

The project consists of two main parts:

### Backend

The backend is built with Node.js and Express, utilizing MongoDB as the database. It handles all server-side operations including authentication, backup management, renewal processing, and administrative functions.

#### Key Features

- **User Management**: Registration, authentication, profile management
- **Backup Management**: Create, configure, run, and monitor backups
- **Subscription Management**: Plan selection, renewal processing, payment handling
- **Admin Dashboard**: Comprehensive monitoring and management of users, backups, and renewals

#### API Endpoints

The backend provides REST APIs organized into the following categories:

- **Auth Routes**: User registration, login, password reset
- **User Routes**: User profile management
- **Backup Routes**: Backup creation, configuration, execution
- **Renewal Routes**: Subscription renewal management
- **Admin Routes**: Administrative functions for users, backups, renewals

### Frontend

The frontend is built with React, providing a responsive and intuitive user interface for interacting with the system.

#### Key Pages

- **User Interface**:
  - Dashboard: Overview of backup status and subscription
  - Backup Management: Create and monitor backups
  - Renewal Management: View and process subscription renewals
  - Profile Management: Update user profile and settings

- **Admin Interface**:
  - Admin Dashboard: System-wide statistics and monitoring
  - User Management: View and manage all users
  - User Details: Detailed view of individual user information
  - Backup Management: Monitor and manage all backups
  - Renewal Management: Process and manage subscription renewals

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
2. Install backend dependencies:
   ```
   cd backend
   npm install
   ```
3. Install frontend dependencies:
   ```
   cd frontend
   npm install
   ```

### Configuration

1. Create `.env` file in the backend directory with the following variables:
   ```
   NODE_ENV=development
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRE=30d
   EMAIL_HOST=smtp.example.com
   EMAIL_PORT=587
   EMAIL_USER=your_email_user
   EMAIL_PASSWORD=your_email_password
   EMAIL_FROM=noreply@example.com
   CLIENT_URL=http://localhost:3000
   ```

### Running the Application

1. Start the backend server:
   ```
   cd backend
   npm run dev
   ```
2. Start the frontend application:
   ```
   cd frontend
   npm start
   ```

## API Documentation

### Admin API Endpoints

#### User Management

- `GET /api/admin/users`: Get all users
- `GET /api/admin/users/list`: Get filtered list of users with pagination
- `GET /api/admin/users/:id`: Get a specific user
- `PUT /api/admin/users/:id`: Update a user
- `DELETE /api/admin/users/:id`: Delete a user
- `PUT /api/admin/users/:id/status`: Update user subscription status
- `GET /api/admin/users/:id/backups`: Get user's backups
- `GET /api/admin/users/:id/renewals`: Get user's renewals
- `GET /api/admin/users/:id/history`: Get user's activity history

#### Renewal Management

- `GET /api/admin/renewals`: Get all renewals with filtering and pagination
- `GET /api/admin/renewals/summary`: Get renewal summary statistics
- `GET /api/admin/renewals/:id`: Get a specific renewal
- `PUT /api/admin/renewals/:id`: Update a renewal
- `PUT /api/admin/renewals/:id/status`: Update renewal status
- `GET /api/admin/renewals/:id/payments`: Get renewal payment history
- `POST /api/admin/renewals/:id/process-payment`: Process a payment for a renewal
- `POST /api/admin/renewals/:id/send-reminder`: Send renewal reminder email

#### Backup Management

- `GET /api/admin/backups`: Get all backups with filtering and pagination
- `GET /api/admin/backups/summary`: Get backup summary statistics
- `POST /api/admin/backups/:id/run`: Run a backup manually
- `PUT /api/admin/backups/:id/status`: Update backup status

#### Dashboard Statistics

- `GET /api/admin/dashboard`: Get dashboard statistics
- `GET /api/admin/users/recent`: Get recent users
- `GET /api/admin/backups/recent`: Get recent backups
- `GET /api/admin/charts`: Get chart data for dashboard

## Models

### User

The User model stores user account information, including:
- Basic profile details (name, email, etc.)
- Authentication credentials
- Subscription details (plan, expiry date, payment method)
- Role (user or admin)

### Backup

The Backup model represents a backup configuration, including:
- Source information
- Schedule configuration
- Status and history
- Size and other metadata

### Renewal

The Renewal model tracks subscription renewals, including:
- Due date and status
- Payment details
- Notification history

### ActivityLog

The ActivityLog model records system activities for audit purposes, including:
- User actions
- System operations
- Administrative activities

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
