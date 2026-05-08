const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  knowledgeBaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgeBase',
    default: null
  },
  title: {
    type: String,
    default: ''
  },
  messageCount: {
    type: Number,
    default: 0
  },
  messages: {
    type: [{
      role: {
        type: String,
        required: true,
        enum: ['user', 'assistant']
      },
      content: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      references: {
        type: [{
          documentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document'
          },
          content: {
            type: String
          }
        }],
        default: []
      }
    }],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

chatSchema.pre('save', function() {
  this.updatedAt = new Date();
});

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
