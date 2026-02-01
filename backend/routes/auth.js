const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');


const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { validatePassword, hashPassword } = require('../utils/encryption');

const router = express.Router();

// This is the email I am using to send the OTP from (i.e. my own)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

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



router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        if (!validatePassword(password)) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
            });
        }

        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        const hashedPassword = await hashPassword(password);

        const verificationToken = crypto.randomBytes(32).toString('hex');

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


        const verificationLink = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
        await sendEmail(
            email,
            'Verify Your Email - Secure Exam Portal',
            `<h2>Welcome to Secure Exam Portal!</h2>
       <p>Please click the link below to verify your email:</p>
       <a href="${verificationLink}">${verificationLink}</a>
       <p>This link will expire in 24 hours.</p>`
        );


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


router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
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

        if (!user.emailVerified) {
            return res.status(401).json({ message: 'Please verify your email first' });
        }
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

        if (!user.isActive) {
            return res.status(401).json({ message: 'Account is inactive' });
        }
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

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        user.otpHash = await bcrypt.hash(otp, 12);
        user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        await user.save();

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

        if (!user.otpExpires || new Date() > user.otpExpires) {
            return res.status(400).json({ message: 'OTP expired' });
        }
        const isOtpValid = await bcrypt.compare(otp, user.otpHash);
        if (!isOtpValid) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        user.otpHash = null;
        user.otpExpires = null;
        user.lastLogin = new Date();
        await user.save();
        const jwtToken = jwt.sign(
            { userId: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

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
