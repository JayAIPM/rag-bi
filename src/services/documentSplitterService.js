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

  // 基于结构化节点分块：直接利用解析出的 nodes[]（Word/Markdown 的原生层级结构）
  async splitFromStructuredNodes(nodes, options = {}) {
    logger.info(`Starting structured nodes splitting, nodes count: ${nodes.length}`);

    const {
      chunkSize = 800,
      chunkOverlap = 150
    } = options;

    // 阶段 1：将 nodes 分组为 sections（章节）
    const sections = [];
    const headingStack = []; // [{ level, text }]

    let currentSection = null;
    let hasSeenHeading = false;

    for (const node of nodes) {
      if (node.type === 'heading') {
        // 保存上一个章节
        if (currentSection && currentSection.content.trim()) {
          sections.push(currentSection);
        }

        // 更新层级栈：弹出 level >= 当前 level 的标题
        while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= node.level) {
          headingStack.pop();
        }
        headingStack.push({ level: node.level, text: node.text });

        // 构建层级路径和父级上下文
        const hierarchyPath = headingStack.map(h => h.text).join(' / ');
        const parentContext = headingStack.slice(0, -1).map(h => h.text).join(' / ');

        currentSection = {
          title: node.text,
          level: node.level,
          hierarchyPath,
          parentContext,
          content: '',
          start: node.start,
          end: node.end
        };
        hasSeenHeading = true;
      } else {
        // paragraph / table / 其他内容节点
        const nodeText = (node.text || '').trim();
        if (!nodeText) continue;

        if (!currentSection) {
          // 首个标题之前的内容 → 初始化无标题章节
          currentSection = {
            title: null,
            level: 0,
            hierarchyPath: '',
            parentContext: '',
            content: nodeText,
            start: node.start,
            end: node.end
          };
        } else {
          currentSection.content += '\n\n' + nodeText;
          currentSection.end = node.end;
        }
      }
    }

    // 保存最后一个章节
    if (currentSection && currentSection.content.trim()) {
      sections.push(currentSection);
    }

    // 阶段 2：将 sections 转换为 chunks
    let allChunks = [];
    let globalIndex = 0;

    for (const section of sections) {
      if (section.content.length <= chunkSize) {
        allChunks.push({
          index: globalIndex++,
          content: section.content,
          title: section.title,
          level: section.level,
          hierarchyPath: section.hierarchyPath,
          parentContext: section.parentContext,
          start: section.start,
          end: section.end,
          length: section.content.length
        });
      } else {
        // 章节过长，在章节内用 SentenceSplitter 拆分
        const splitter = new SentenceSplitter({ chunkSize, chunkOverlap });
        const subChunks = await splitter.splitText(section.content);

        for (let i = 0; i < subChunks.length; i++) {
          const subChunk = subChunks[i];
          const idxInContent = section.content.indexOf(subChunk);
          allChunks.push({
            index: globalIndex++,
            content: subChunk,
            title: section.title,
            level: section.level,
            hierarchyPath: section.hierarchyPath,
            parentContext: section.parentContext,
            isPart: i > 0,
            partIndex: i,
            start: section.start + (idxInContent >= 0 ? idxInContent : 0),
            end: section.start + (idxInContent >= 0 ? idxInContent + subChunk.length : subChunk.length),
            length: subChunk.length
          });
        }
      }
    }

    logger.info(`Structured nodes split completed, ${allChunks.length} chunks generated (from ${sections.length} sections)`);
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