const mammoth = require('mammoth');
const { SOURCE_TYPES } = require('../constants/structuredDocument');
const { parseHtmlStructure } = require('./htmlStructureParser');
const logger = require('../utils/logger');

const WORD_STYLE_MAP = [
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Heading 5'] => h5:fresh",
  "p[style-name='Heading 6'] => h6:fresh",
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Subtitle'] => h2:fresh",
  "p[style-name='标题 1'] => h1:fresh",
  "p[style-name='标题 2'] => h2:fresh",
  "p[style-name='标题 3'] => h3:fresh",
  "p[style-name='标题 4'] => h4:fresh",
  "p[style-name='标题 5'] => h5:fresh",
  "p[style-name='标题 6'] => h6:fresh",
  "p[style-name='标题'] => h1:fresh",
  "p[style-name='副标题'] => h2:fresh"
];

const parseWordFile = async (filePath) => {
  logger.debug(`Converting Word file to HTML: ${filePath}`);

  const result = await mammoth.convertToHtml(
    { path: filePath },
    { styleMap: WORD_STYLE_MAP }
  );

  if (result.messages.length > 0) {
    result.messages.forEach((message) => {
      logger.debug(`Mammoth message [${message.type}]: ${message.message}`);
    });
  }

  if (!result.value || !result.value.trim()) {
    return {
      plainText: '',
      sourceType: SOURCE_TYPES.DOCX,
      nodes: []
    };
  }

  const structuredDoc = parseHtmlStructure(result.value, SOURCE_TYPES.DOCX);
  logger.debug(
    `Word HTML parsed: htmlLength=${result.value.length}, nodes=${structuredDoc.nodes.length}`
  );

  return structuredDoc;
};

module.exports = {
  parseWordFile,
  WORD_STYLE_MAP
};
