const crypto = require('crypto');

// Generate SHA-256 hash of data
function hashData(data) {
    return crypto.createHash('sha256')
        .update(JSON.stringify(data))
        .digest('hex');
}

// Verify data integrity
function verifyDataIntegrity(data, storedHash) {
    const computedHash = hashData(data);
    return computedHash === storedHash;
}

// Hash exam content for integrity verification
function generateExamContentHash(examQuestions) {
    return hashData(examQuestions);
}

// Hash submission for integrity verification
function generateSubmissionHash(answers) {
    return hashData(answers);
}

module.exports = {
    hashData,
    verifyDataIntegrity,
    generateExamContentHash,
    generateSubmissionHash
};
