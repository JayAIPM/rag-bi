const { SOURCE_TYPES } = require('../constants/structuredDocument');
const { parseMarkdown, parsePlainText } = require('../utils/markdownStructureParser');
const { parseWordFile } = require('../utils/wordStructureParser');
const logger = require('../utils/logger');

const WORD_SOURCE_TYPES = new Set([SOURCE_TYPES.DOC, SOURCE_TYPES.DOCX]);
const TEXT_SOURCE_TYPES = new Set([
  SOURCE_TYPES.MD,
  SOURCE_TYPES.TXT,
  SOURCE_TYPES.CSV
]);

const structuredDocumentService = {
  supportsStructuredParsing(fileType) {
    const normalizedType = fileType.toLowerCase();
    return TEXT_SOURCE_TYPES.has(normalizedType) || WORD_SOURCE_TYPES.has(normalizedType);
  },

  isWordSourceType(fileType) {
    return WORD_SOURCE_TYPES.has(fileType.toLowerCase());
  },

  async parseFromWordFile(filePath) {
    logger.debug(`Parsing structured Word document: ${filePath}`);
    return parseWordFile(filePath);
  },

  parseFromContent(content, fileType) {
    const normalizedType = fileType.toLowerCase();
    logger.debug(`Parsing structured document, type: ${normalizedType}, length: ${content.length}`);

    if (normalizedType === SOURCE_TYPES.MD) {
      return parseMarkdown(content);
    }

    const sourceType = normalizedType === SOURCE_TYPES.CSV ? SOURCE_TYPES.CSV : SOURCE_TYPES.TXT;
    return parsePlainText(content, sourceType);
  }
};

module.exports = structuredDocumentService;
