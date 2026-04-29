const fs = require('fs').promises;
const path = require('path');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const { AppError } = require('../utils/error');
const logger = require('../utils/logger');

const documentParserService = {
  async parseDocument(filePath, fileType) {
    logger.info(`Parsing document: ${filePath}, type: ${fileType}`);
    
    const absolutePath = path.resolve(filePath);
    
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

  async parsePDF(filePath) {
    logger.debug(`Parsing PDF file: ${filePath}`);
    
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

  async parseWord(filePath) {
    logger.debug(`Parsing Word file: ${filePath}`);
    
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      
      logger.debug(`Word parsed, text length: ${result.value.length}`);
      return result.value;
    } catch (error) {
      logger.error(`Failed to parse Word: ${filePath}`, error);
      throw new AppError(`Word文档解析失败: ${error.message}`, 500, 'WORD_PARSE_ERROR');
    }
  },

  async parseText(filePath) {
    logger.debug(`Parsing text file: ${filePath}`);
    
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
