const mongoose = require('mongoose');

const accessControlSchema = new mongoose.Schema({
    subject: {
        userId: mongoose.Schema.Types.ObjectId,
        role: String
    },
    resource: {
        type: String,
        resourceId: mongoose.Schema.Types.ObjectId
    },
    permissions: {
        view: Boolean,
        create: Boolean,
        edit: Boolean,
        delete: Boolean,
        grade: Boolean
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AccessControl', accessControlSchema);
