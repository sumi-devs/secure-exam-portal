const QRCode = require('qrcode');

// Generate QR code for exam admit card with URL
async function generateAdmitCardQR(studentData, frontendUrl = 'http://localhost:5173') {
    try {
        // Create verification URL
        const verificationUrl = `${frontendUrl}/verify-admit/${studentData.examId}/${studentData.studentId}`;

        // Generate QR code as data URL
        const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            margin: 2,
            width: 200
        });

        return qrCodeDataUrl;
    } catch (error) {
        console.error('QR Code generation error:', error);
        throw new Error('Failed to generate QR code');
    }
}

// Verify admit card data
function verifyAdmitCardData(studentId, examId) {
    return { studentId, examId };
}

module.exports = {
    generateAdmitCardQR,
    verifyAdmitCardData
};
