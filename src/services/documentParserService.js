/**
 * 文档解析服务
 * 负责将各类文档（PDF/Word/TXT/MD）解析为纯文本或结构化文档
 */
const fs = require('fs').promises;
const path = require('path');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const { AppError } = require('../utils/error');
const logger = require('../utils/logger');
const structuredDocumentService = require('./structuredDocumentService');

const documentParserService = {
  // 判断文件类型是否支持结构化解析
  supportsStructuredParsing(fileType) {
    return structuredDocumentService.supportsStructuredParsing(fileType);
  },

  // 结构化解析：保留文档层级结构（标题、段落、列表等）
  async parseStructuredDocument(filePath, fileType) {
    logger.info(`Parsing structured document: ${filePath}, type: ${fileType}`);

    if (!this.supportsStructuredParsing(fileType)) {
      return null;  // 不支持则返回 null，由普通解析兜底
    }

    const absolutePath = path.resolve(filePath);

    // 检查文件是否存在，不存在则跳过结构化解析
    try {
      await fs.access(absolutePath);
    } catch (error) {
      logger.warn(`Structured parsing skipped - file not found: ${absolutePath}`);
      return null;  // 文件不存在时返回 null，由普通解析兜底
    }

    let structuredDoc;
    const normalizedType = fileType.toLowerCase();

    // Word 文件使用专门的 Word 解析器
    if (structuredDocumentService.isWordSourceType(normalizedType)) {
      structuredDoc = await structuredDocumentService.parseFromWordFile(absolutePath);
    } else {
      // 其他结构化文档（Markdown 等）直接读取内容后解析
      const content = await fs.readFile(absolutePath, 'utf-8');
      if (!content || content.trim().length === 0) {
        throw new AppError('文档内容为空', 400, 'EMPTY_CONTENT');
      }
      structuredDoc = structuredDocumentService.parseFromContent(content, fileType);
    }

    if (!structuredDoc.plainText || !structuredDoc.plainText.trim()) {
      throw new AppError('文档内容为空', 400, 'EMPTY_CONTENT');
    }

    logger.info(`Structured document parsed: nodes=${structuredDoc.nodes.length}, sourceType=${structuredDoc.sourceType}`);
    return structuredDoc;
  },

  // 普通解析：直接提取纯文本，不保留结构信息
  async parseDocument(filePath, fileType) {
    logger.info(`Parsing document: ${filePath}, type: ${fileType}`);
    const absolutePath = path.resolve(filePath);

    // 文件存在性校验
    try {
      await fs.access(absolutePath);
    } catch (error) {
      logger.error(`File not found: ${absolutePath}`);
      throw new AppError('文件不存在', 404, 'FILE_NOT_FOUND');
    }

    let content = '';

    switch (fileType.toLowerCase()) {
      case 'pdf':
        content = await this.parsePDF(absolutePath);
        break;
      case 'doc':
      case 'docx':
        content = await this.parseWord(absolutePath);
        break;
      case 'txt':
      case 'md':
      case 'csv':
        content = await this.parseText(absolutePath);
        break;
      default:
        throw new AppError(`不支持的文件类型: ${fileType}`, 400, 'UNSUPPORTED_FILE_TYPE');
    }

    if (!content || content.trim().length === 0) {
      throw new AppError('文档内容为空', 400, 'EMPTY_CONTENT');
    }

    logger.info(`Document parsed successfully: ${filePath}, content length: ${content.length}`);
    return content;
  },

  // PDF 解析：提取文本内容，丢失格式和结构
  async parsePDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const parser = new PDFParse({ data: dataBuffer });
      const result = await parser.getText();
      logger.debug(`PDF parsed, pages: ${result.total}, text length: ${result.text.length}`);
      return result.text;
    } catch (error) {
      logger.error(`Failed to parse PDF: ${filePath}`, error);
      throw new AppError(`PDF解析失败: ${error.message}`, 500, 'PDF_PARSE_ERROR');
    }
  },

  // Word 解析：使用 mammoth 提取纯文本
  async parseWord(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      logger.debug(`Word parsed, text length: ${result.value.length}`);
      return result.value;
    } catch (error) {
      logger.error(`Failed to parse Word: ${filePath}`, error);
      throw new AppError(`Word文档解析失败: ${error.message}`, 500, 'WORD_PARSE_ERROR');
    }
  },

  // 文本文件解析：直接读取文件内容
  async parseText(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      logger.debug(`Text parsed, length: ${content.length}`);
      return content;
    } catch (error) {
      logger.error(`Failed to parse text: ${filePath}`, error);
      throw new AppError(`文本文件解析失败: ${error.message}`, 500, 'TEXT_PARSE_ERROR');
    }
  }
};

module.exports = documentParserService;
