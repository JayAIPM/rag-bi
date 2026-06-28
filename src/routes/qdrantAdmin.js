const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/permission');
const qdrantAdminController = require('../controllers/qdrantAdminController');

router.get(
  '/collections',
  authenticate,
  requireRole('admin'),
  qdrantAdminController.getCollections
);

router.get(
  '/collections/:name',
  authenticate,
  requireRole('admin'),
  qdrantAdminController.getCollectionInfo
);

router.get(
  '/collections/:name/points',
  authenticate,
  requireRole('admin'),
  qdrantAdminController.scrollPoints
);

router.get(
  '/collections/:name/stats',
  authenticate,
  requireRole('admin'),
  qdrantAdminController.getStats
);

router.delete(
  '/collections/:name',
  authenticate,
  requireRole('admin'),
  qdrantAdminController.deleteCollection
);

router.delete(
  '/collections/:name/documents/:documentId',
  authenticate,
  requireRole('admin'),
  qdrantAdminController.deletePointsByDocumentId
);

module.exports = router;
