const crypto = require('crypto');

// Generate RSA key pair for user
function generateKeyPair() {
    return crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });
}

// Sign data with private key
function signData(data, privateKey) {
    const sign = crypto.createSign('SHA256');
    sign.update(JSON.stringify(data));
    return sign.sign(privateKey, 'hex');
}

// Verify signature with public key
function verifySignature(data, signature, publicKey) {
    try {
        const verify = crypto.createVerify('SHA256');
        verify.update(JSON.stringify(data));
        return verify.verify(publicKey, signature, 'hex');
    } catch (error) {
        return false;
    }
}

// Sign exam submission (student signs their own submission)
function signSubmission(submissionData, studentPrivateKey) {
    return signData(submissionData, studentPrivateKey);
}

// Verify submission signature
function verifySubmissionSignature(submissionData, signature, studentPublicKey) {
    return verifySignature(submissionData, signature, studentPublicKey);
}

module.exports = {
    generateKeyPair,
    signData,
    verifySignature,
    signSubmission,
    verifySubmissionSignature
};
