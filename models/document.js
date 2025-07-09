const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
  content: String,
  savedBy: mongoose.Schema.Types.ObjectId,
  savedByName: String,
  roomId: String,
  createdAt: { type: Date, default: Date.now }
});

const documentSchema = new mongoose.Schema({
  roomId: { type: String, unique: true },
  currentContent: String,
  versions: [versionSchema]
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);