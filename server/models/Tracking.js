const mongoose = require('mongoose');

const trackingSchema = new mongoose.Schema({
    goal_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', required: true },
    date: { type: String, required: true },
    count: { type: Number, default: 1 }
});

trackingSchema.index({ goal_id: 1, date: 1 }, { unique: true });

trackingSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
    }
});

module.exports = mongoose.model('Tracking', trackingSchema);
