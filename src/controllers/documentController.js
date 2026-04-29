const documentService = require('../services/documentService');

const documentController = {
  async uploadDocument(req, res) {
    const { knowledgeBaseId } = req.body;
    const file = req.file;
    const { userId } = req.user;

    const document = await documentService.uploadDocument(
      file,
      knowledgeBaseId,
      userId
    );

    res.json({
      code: 0,
      msg: 'success',
      data: {
        documentId: document._id,
        status: document.status
      }
    });
  },

  async getDocumentList(req, res) {
    const { page = 1, pageSize = 10, knowledgeBaseId } = req.query;
    const { userId, role } = req.user;

    const result = await documentService.getDocumentList(
      knowledgeBaseId,
      userId,
      role?.name || 'user',
      parseInt(page),
      parseInt(pageSize)
    );

    res.json({
      code: 0,
      msg: 'success',
      data: result
    });
  },

  async getDocumentById(req, res) {
    const { id } = req.params;

    const document = await documentService.getDocumentById(id);

    res.json({
      code: 0,
      msg: 'success',
      data: document
    });
  },

  async deleteDocument(req, res) {
    const { id } = req.params;
    const { role } = req.user;

    await documentService.deleteDocument(id, role?.name || 'user');

    res.json({
      code: 0,
      msg: 'success',
      data: null
    });
  }
};

module.exports = documentController;
