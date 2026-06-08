const { SentenceSplitter } = require('llamaindex');
const logger = require('../utils/logger');

// 语义分块服务：负责将文档文本切分成适合向量化处理的块
const documentSplitterService = {
  // 基础文本分块：使用 LlamaIndex 的 SentenceSplitter 进行简单的文本分割
  async splitDocument(content, options = {}) {
    logger.info(`Starting document splitting, content length: ${content.length}`);
    
    const {
      chunkSize = 800,
      chunkOverlap = 150,
      preserveNewlines = true
    } = options;

    try {
      const splitter = new SentenceSplitter({
        chunkSize,
        chunkOverlap
      });

      const chunks = await splitter.splitText(content);
      
      logger.info(`Document split completed, ${chunks.length} chunks generated`);
      
      return chunks.map((chunk, index) => ({
        index,
        content: preserveNewlines ? chunk : chunk.replace(/\n+/g, ' ').trim(),
        start: content.indexOf(chunk),
        end: content.indexOf(chunk) + chunk.length,
        length: chunk.length
      }));
    } catch (error) {
      logger.error('Failed to split document', error);
      throw new Error(`语义分块失败: ${error.message}`);
    }
  },

  // 带章节边界检测的智能分块：先按 Markdown 标题分割章节，再在章节内分块
  async splitWithSectionDetection(content, options = {}) {
    logger.info(`Starting document splitting with section detection`);
    
    const {
      chunkSize = 800,
      chunkOverlap = 150
    } = options;

    const sections = this.detectSections(content);
    const allChunks = [];
    let globalIndex = 0;

    for (const section of sections) {
      logger.debug(`Processing section: ${section.title || 'Untitled'}, length: ${section.content.length}`);
      
      // 如果章节内容长度小于块大小，直接将整个章节作为一个块
      if (section.content.length <= chunkSize) {
        allChunks.push({
          index: globalIndex++,
          content: section.content,
          title: section.title,
          level: section.level,
          hierarchyPath: section.hierarchyPath,  // 层级路径
          parentContext: section.parentContext,  // 父级上下文
          start: section.start,
          end: section.end,
          length: section.content.length
        });
      } else {
        // 章节内容过长，需要在章节内再进行分块
        const splitter = new SentenceSplitter({
          chunkSize,
          chunkOverlap
        });

        const chunks = await splitter.splitText(section.content);
        
        chunks.forEach((chunk, i) => {
          // 子块继承父章节的层级路径，但添加分块标识
          const childHierarchyPath = section.hierarchyPath 
            ? `${section.hierarchyPath}`
            : '';
          
          allChunks.push({
            index: globalIndex++,
            content: chunk,
            title: section.title,
            level: section.level,
            hierarchyPath: childHierarchyPath,
            parentContext: section.parentContext,  // 父级上下文
            isPart: i > 0,
            partIndex: i,
            start: section.start + section.content.indexOf(chunk),
            end: section.start + section.content.indexOf(chunk) + chunk.length,
            length: chunk.length
          });
        });
      }
    }

    logger.info(`Document split with sections completed, ${allChunks.length} chunks generated`);
    return allChunks;
  },

  // 检测文档中的 Markdown 章节标题，将文档分割成逻辑章节
  detectSections(content) {
    const sections = [];
    const lines = content.split('\n');
    
    // 维护一个栈来跟踪当前层级
    const levelStack = []; // 存储每个层级的标题内容
    
    let currentSection = {
      title: null,
      level: 0,
      hierarchyPath: '',  // 层级路径，如 "第一章/第一节"
      content: '',
      start: 0,
      end: 0
    };
    let contentStart = 0;
    let lineOffset = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
      
      // 匹配到标题行，分割新章节
      if (headingMatch) {
        // 保存当前章节（如果有内容）
        if (currentSection.content.trim()) {
          currentSection.end = lineOffset - 1;
          // 添加父级上下文（基于 levelStack，不包含当前要创建的新章节）
          currentSection.parentContext = currentSection.level > 1
            ? levelStack.slice(0, currentSection.level - 1).map(l => l.title).join(' / ')
            : '';
          sections.push(currentSection);
        }
        
        // 创建新章节
        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();
        
        // 更新层级栈：弹出比当前层级更深的内容
        levelStack.length = level - 1;
        // 添加当前层级
        levelStack[level - 1] = { title, level };
        
        // 构建层级路径
        const hierarchyPath = levelStack
          .slice(0, level)
          .map(l => l.title)
          .join(' / ');
        
        // 构建父级上下文（不包含自身，即 level-1 的内容）
        const parentContext = level > 1
          ? levelStack.slice(0, level - 1).map(l => l.title).join(' / ')
          : '';
        
        currentSection = {
          title,
          level,
          hierarchyPath,
          parentContext,
          content: '',
          start: lineOffset,
          end: 0
        };
        contentStart = lineOffset + line.length + 1;
      } else {
        // 普通内容行，添加到当前章节
        currentSection.content += line + '\n';
      }
      
      lineOffset += line.length + 1;
    }

    // 添加最后一个章节
    if (currentSection.content.trim()) {
      currentSection.end = content.length;
      // 构建父级上下文（基于当前章节的 level，不包含自身）
      currentSection.parentContext = currentSection.level > 1
        ? levelStack.slice(0, currentSection.level - 1).map(l => l.title).join(' / ')
        : '';
      sections.push(currentSection);
    }

    // 如果没有检测到章节，返回整个文档作为一个章节
    if (sections.length === 0) {
      return [{
        title: null,
        level: 0,
        hierarchyPath: '',
        parentContext: '',
        content,
        start: 0,
        end: content.length
      }];
    }

    return sections;
  }
};

module.exports = documentSplitterService;