const bcrypt = require('bcryptjs');

// Password hashing with bcrypt
async function hashPassword(password) {
    const salt = await bcrypt.genSalt(12);
    return await bcrypt.hash(password, salt);
}

// Verify password
async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

// Password validation function
function validatePassword(password) {
    // At least 8 characters, uppercase, lowercase, number, special character
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
}

module.exports = {
    hashPassword,
    verifyPassword,
    validatePassword
};
