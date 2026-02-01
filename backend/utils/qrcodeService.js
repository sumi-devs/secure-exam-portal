const QRCode = require('qrcode');

async function generateAdmitCardQR(studentData, frontendUrl = 'http://localhost:5173') {
    try {
        const verificationUrl = `${frontendUrl}/verify-admit/${studentData.examId}/${studentData.studentId}`;

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

function verifyAdmitCardData(studentId, examId) {
    return { studentId, examId };
}

module.exports = {
    generateAdmitCardQR,
    verifyAdmitCardData
};
