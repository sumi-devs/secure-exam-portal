# Secure Exam Portal

A full-stack web application for conducting secure online examinations with multi-factor authentication, encrypted data storage, and automated grading.

## Features

- **Authentication**: User registration with email verification, MFA via OTP
- **Role-Based Access**: Student, Instructor, and Admin roles
- **Exam Management**: Create exams with MCQ, True/False, Short Answer, and Essay questions
- **Security**: AES-256 encryption for exam data, answer hashing for integrity verification
- **Admit Cards**: QR code-based verification for exam entry
- **Grading**: Auto-grading for objective questions, manual grading interface for subjective questions
- **Results**: Grade calculation, pass/fail status, detailed feedback

## Access Control List (ACL)

The application implements a Role-Based Access Control (RBAC) model with the following Access Control Matrix:

### Roles
- **Student**: End users who take exams
- **Instructor**: Creates and manages exams, grades submissions
- **Admin**: Full system access, manages all users and exams

### Access Control Matrix

| Resource | Student | Instructor | Admin |
|----------|---------|------------|-------|
| **Exam** | view | create, view, edit, delete | create, view, edit, delete |
| **Submission** | create, view (own) | view, grade | view, delete |
| **Results** | view (own) | view, edit | view, edit, delete |
| **Users** | view (self) | view | create, view, edit, delete |

### Policy Justification

| Permission | Justification |
|------------|---------------|
| Students can only view exams | Students need to access exam content during the exam window |
| Students can create submissions | Students must submit their answers |
| Students can only view own results | Privacy - students should not see others' grades |
| Instructors can create/edit exams | Instructors are responsible for exam content |
| Instructors can grade submissions | Instructors evaluate student work |
| Instructors cannot delete users | User management is admin-only for security |
| Admins have full access | Admins need to manage the entire system |

### Implementation

Access control is enforced in `backend/middleware/authorization.js` using:
- `checkPermission(resource, action)` - Validates user has permission for action
- `requireRole(...roles)` - Restricts route access to specific roles

## Tech Stack

**Frontend**: React, React Router, Axios, Vite

**Backend**: Node.js, Express, MongoDB, Mongoose

**Security**: JWT, bcrypt, crypto-js, speakeasy (TOTP)

## Project Structure

```
exam-portal/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/
│   │   └── pages/
│   └── package.json
├── backend/           # Express API server
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   └── package.json
└── README.md
```

## Setup

### Prerequisites

- Node.js 18+
- MongoDB

### Backend

```bash
cd backend
npm install
```

Create `.env` file:

```
MONGO_URI=mongodb://localhost:27017/exam-portal
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=32-character-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
PORT=5000
```

Start the server:

```bash
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:5173`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | User registration |
| POST | /api/auth/login | User login |
| POST | /api/auth/verify-mfa | Verify OTP |
| GET | /api/exams | List exams |
| POST | /api/exams/create | Create exam |
| POST | /api/exams/submit/:examId | Submit exam |
| GET | /api/results/my-results | Get student results |
