const crypto = require('crypto');


function getEncryptionKeyBuffer() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error('ENCRYPTION_KEY not set in environment');
    }
    return Buffer.from(key, 'hex');
}

// encrypting with AES-256-CBC
function encryptExamQuestions(questionsData) {
    try {
        const iv = crypto.randomBytes(16);
        const key = getEncryptionKeyBuffer();

        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

        let encrypted = cipher.update(JSON.stringify(questionsData), 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt exam questions');
    }
}


function decryptExamQuestions(encryptedData) {
    try {
        const [ivHex, encryptedHex] = encryptedData.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const key = getEncryptionKeyBuffer();

        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt exam questions');
    }
}

function encryptStudentAnswers(answersData) {
    return encryptExamQuestions(answersData);
}


function decryptStudentAnswers(encryptedAnswers) {
    return decryptExamQuestions(encryptedAnswers);
}

function encryptSensitiveData(data) {
    return encryptExamQuestions(data);
}

function decryptSensitiveData(encryptedData) {
    return decryptExamQuestions(encryptedData);
}

module.exports = {
    encryptExamQuestions,
    decryptExamQuestions,
    encryptStudentAnswers,
    decryptStudentAnswers,
    encryptSensitiveData,
    decryptSensitiveData
};
