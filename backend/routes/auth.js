const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');


const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { validatePassword, hashPassword } = require('../utils/encryption');

const router = express.Router();

// Configure email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Send email helper function
async function sendEmail(to, subject, html) {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            html
        });
        return true;
    } catch (error) {
        console.error('Email send error:', error);
        return false;
    }
}



// ==================== REGISTRATION ====================
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Validate password
        if (!validatePassword(password)) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Create user
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            role: role || 'student',
            emailVerified: false,
            emailVerificationToken: verificationToken,
            emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });

        await newUser.save();

        // Send verification email
        const verificationLink = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
        await sendEmail(
            email,
            'Verify Your Email - Secure Exam Portal',
            `<h2>Welcome to Secure Exam Portal!</h2>
       <p>Please click the link below to verify your email:</p>
       <a href="${verificationLink}">${verificationLink}</a>
       <p>This link will expire in 24 hours.</p>`
        );

        // Log registration
        await AuditLog.create({
            userId: newUser._id,
            action: 'register',
            status: 'success',
            timestamp: new Date()
        });

        res.status(201).json({
            message: 'Registration successful. Please check your email to verify your account.'
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== VERIFY EMAIL ====================
router.get('/verify-email/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            emailVerificationToken: req.params.token,
            emailVerificationExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        user.emailVerified = true;
        user.emailVerificationToken = null;
        user.emailVerificationExpires = null;
        await user.save();

        res.json({ message: 'Email verified successfully. You can now login.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== LOGIN (Single Factor) ====================
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user
        const user = await User.findOne({ username });
        if (!user) {
            await AuditLog.create({
                action: 'login',
                status: 'failure',
                details: { reason: 'User not found', username },
                timestamp: new Date()
            });
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        // Check if email is verified
        if (!user.emailVerified) {
            return res.status(401).json({ message: 'Please verify your email first' });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            await AuditLog.create({
                userId: user._id,
                action: 'login',
                status: 'failure',
                details: { reason: 'Invalid password' },
                timestamp: new Date()
            });
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(401).json({ message: 'Account is inactive' });
        }

        // Generate temporary token for MFA
        const tempToken = jwt.sign(
            { userId: user._id, stage: 'mfa_pending' },
            process.env.JWT_SECRET,
            { expiresIn: '5m' }
        );

        res.json({
            message: 'Password verified. Proceed to MFA.',
            tempToken,
            requiresMFA: true
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== SEND OTP ====================
router.post('/send-otp', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.stage !== 'mfa_pending') {
            return res.status(401).json({ message: 'Invalid token stage' });
        }

        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP (hashed) and expiration time
        user.otpHash = await bcrypt.hash(otp, 12);
        user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        await user.save();

        // Send OTP via email
        await sendEmail(
            user.email,
            'Your Login OTP - Secure Exam Portal',
            `<h2>Login Verification</h2>
       <p>Your OTP is: <strong style="font-size: 24px;">${otp}</strong></p>
       <p>This code is valid for 5 minutes.</p>
       <p>If you didn't request this, please ignore this email.</p>`
        );

        res.json({ message: 'OTP sent to email' });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Session expired. Please login again.' });
        }
        console.error('Send OTP error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== VERIFY OTP ====================
router.post('/verify-otp', async (req, res) => {
    try {
        const { otp } = req.body;
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check OTP expiration
        if (!user.otpExpires || new Date() > user.otpExpires) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        // Verify OTP
        const isOtpValid = await bcrypt.compare(otp, user.otpHash);
        if (!isOtpValid) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Clear OTP
        user.otpHash = null;
        user.otpExpires = null;
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token (valid for 24 hours)
        const jwtToken = jwt.sign(
            { userId: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Log successful login
        await AuditLog.create({
            userId: user._id,
            action: 'login',
            status: 'success',
            timestamp: new Date()
        });

        res.json({
            message: 'Login successful',
            token: jwtToken,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Session expired. Please login again.' });
        }
        console.error('Verify OTP error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== GET CURRENT USER ====================
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId).select('-password -otpHash');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
