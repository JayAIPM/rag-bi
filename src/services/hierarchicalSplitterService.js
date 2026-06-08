const { SentenceSplitter } = require('llamaindex');
const { NODE_TYPES, CHUNK_TYPES } = require('../constants/structuredDocument');
const { nodeToText } = require('../utils/markdownStructureParser');
const logger = require('../utils/logger');

const buildSections = (nodes) => {
  const sections = [];
  const headingStack = [];
  let current = null;

  const pushSection = () => {
    if (current && current.content.trim()) {
      sections.push(current);
    }
  };

  const formatHierarchyPath = () => headingStack.map((heading) => heading.text).join(' > ');

  for (const node of nodes) {
    if (node.type === NODE_TYPES.HEADING) {
      pushSection();

      while (
        headingStack.length > 0 &&
        headingStack[headingStack.length - 1].level >= node.level
      ) {
        headingStack.pop();
      }
      headingStack.push({ level: node.level, text: node.text });

      current = {
        title: node.text,
        level: node.level,
        hierarchyPath: formatHierarchyPath(),
        content: '',
        start: node.start
      };
      continue;
    }

    if (!current) {
      current = {
        title: null,
        level: 0,
        hierarchyPath: '',
        content: '',
        start: node.start
      };
    }

    const text = nodeToText(node);
    current.content += (current.content ? '\n' : '') + text;
  }

  pushSection();

  if (sections.length === 0 && nodes.length > 0) {
    sections.push({
      title: null,
      level: 0,
      hierarchyPath: '',
      content: nodes.map(nodeToText).join('\n'),
      start: nodes[0].start
    });
  }

  return sections;
};

const hierarchicalSplitterService = {
  buildSections,

  async splitStructuredDocument(structuredDoc, options = {}) {
    const {
      chunkSize = 800,
      chunkOverlap = 150,
      documentId = ''
    } = options;

    logger.info(
      `Starting hierarchical split, sourceType: ${structuredDoc.sourceType}, nodes: ${structuredDoc.nodes.length}`
    );

    const sections = buildSections(structuredDoc.nodes);
    const childChunks = [];
    let globalIndex = 0;

    for (let parentIndex = 0; parentIndex < sections.length; parentIndex++) {
      const section = sections[parentIndex];
      const parentContent = section.content.trim();
      if (!parentContent) {
        continue;
      }

      const parentId = documentId ? `${documentId}_p${parentIndex}` : `p${parentIndex}`;
      const hierarchyPath = section.hierarchyPath || section.title || '';
      let chunks;

      if (parentContent.length <= chunkSize) {
        chunks = [parentContent];
      } else {
        const splitter = new SentenceSplitter({ chunkSize, chunkOverlap });
        chunks = await splitter.splitText(parentContent);
      }

      chunks.forEach((chunk, partIndex) => {
        const relativeStart = parentContent.indexOf(chunk);
        childChunks.push({
          index: globalIndex++,
          content: chunk,
          chunkType: CHUNK_TYPES.CHILD,
          parentId,
          parentContent,
          hierarchyPath,
          title: section.title || '',
          level: section.level || 0,
          nodeType: NODE_TYPES.PARAGRAPH,
          isPart: partIndex > 0,
          partIndex,
          start: section.start + (relativeStart >= 0 ? relativeStart : 0),
          end: section.start + (relativeStart >= 0 ? relativeStart + chunk.length : chunk.length),
          length: chunk.length
        });
      });
    }

    logger.info(
      `Hierarchical split completed, sections: ${sections.length}, child chunks: ${childChunks.length}`
    );

    return childChunks;
  }
};

module.exports = hierarchicalSplitterService;
