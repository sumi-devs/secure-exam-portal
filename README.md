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
