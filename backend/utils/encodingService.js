// Encode data as Base64
function encodeBase64(data) {
    const jsonString = JSON.stringify(data);
    return Buffer.from(jsonString).toString('base64');
}

// Decode Base64 data
function decodeBase64(encodedData) {
    const jsonString = Buffer.from(encodedData, 'base64').toString('utf-8');
    return JSON.parse(jsonString);
}

// Encode exam response as Base64
function encodeExamResponse(examData) {
    return encodeBase64(examData);
}

// Decode exam response
function decodeExamResponse(encodedData) {
    return decodeBase64(encodedData);
}

module.exports = {
    encodeBase64,
    decodeBase64,
    encodeExamResponse,
    decodeExamResponse
};
