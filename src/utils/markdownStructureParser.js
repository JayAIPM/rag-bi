const { NODE_TYPES, SOURCE_TYPES } = require('../constants/structuredDocument');

const nodeToText = (node) => {
  if (node.type === NODE_TYPES.LIST_ITEM) {
    return `- ${node.text}`;
  }
  return node.text;
};

const parseMarkdown = (content) => {
  const nodes = [];
  const lines = content.split('\n');
  let offset = 0;
  let inCodeBlock = false;
  let codeBlockLines = [];
  let codeBlockStart = 0;
  let paragraphLines = [];
  let paragraphStart = 0;

  const flushParagraph = () => {
    const raw = paragraphLines.join('\n');
    const text = raw.trim();
    if (text) {
      nodes.push({
        type: NODE_TYPES.PARAGRAPH,
        level: 0,
        text,
        start: paragraphStart,
        end: paragraphStart + raw.length
      });
    }
    paragraphLines = [];
  };

  const flushCodeBlock = () => {
    const text = codeBlockLines.join('\n');
    if (text) {
      nodes.push({
        type: NODE_TYPES.CODE_BLOCK,
        level: 0,
        text,
        start: codeBlockStart,
        end: codeBlockStart + text.length
      });
    }
    codeBlockLines = [];
  };

  for (const line of lines) {
    const lineStart = offset;

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        flushParagraph();
        inCodeBlock = true;
        codeBlockStart = lineStart;
      }
      offset += line.length + 1;
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      offset += line.length + 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      nodes.push({
        type: NODE_TYPES.HEADING,
        level,
        text,
        start: lineStart,
        end: lineStart + line.length
      });
      offset += line.length + 1;
      continue;
    }

    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)/);
    if (listMatch) {
      flushParagraph();
      nodes.push({
        type: NODE_TYPES.LIST_ITEM,
        level: 0,
        text: listMatch[3].trim(),
        start: lineStart,
        end: lineStart + line.length,
        metadata: { marker: listMatch[2], indent: listMatch[1].length }
      });
      offset += line.length + 1;
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      offset += line.length + 1;
      continue;
    }

    if (paragraphLines.length === 0) {
      paragraphStart = lineStart;
    }
    paragraphLines.push(line);
    offset += line.length + 1;
  }

  if (inCodeBlock) {
    flushCodeBlock();
  } else {
    flushParagraph();
  }

  return {
    plainText: content,
    sourceType: SOURCE_TYPES.MD,
    nodes
  };
};

const parsePlainText = (content, sourceType = SOURCE_TYPES.TXT) => {
  const nodes = [];
  const blocks = content.split(/\n\s*\n/);
  let searchFrom = 0;

  for (const block of blocks) {
    const text = block.trim();
    if (!text) {
      continue;
    }

    const start = content.indexOf(text, searchFrom);
    const end = start + text.length;
    nodes.push({
      type: NODE_TYPES.PARAGRAPH,
      level: 0,
      text,
      start,
      end
    });
    searchFrom = end;
  }

  if (nodes.length === 0 && content.trim()) {
    const text = content.trim();
    nodes.push({
      type: NODE_TYPES.PARAGRAPH,
      level: 0,
      text,
      start: 0,
      end: text.length
    });
  }

  return {
    plainText: content,
    sourceType,
    nodes
  };
};

module.exports = {
  parseMarkdown,
  parsePlainText,
  nodeToText
};
