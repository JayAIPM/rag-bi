const { NODE_TYPES } = require('../constants/structuredDocument');

const CHINESE_SECTION_PATTERN = /^[一二三四五六七八九十百千]+、/;
const CHINESE_CHAPTER_PATTERN = /^第[一二三四五六七八九十百千]+[章节部分篇]/;
const NUMBERED_QUESTION_PATTERN = /^(\d+)\.\s+/;

/**
 * 将 Word 中未映射为 h1-h6 的「伪标题」段落提升为 heading 节点
 * 例如：「一、行业落地认知（6题）」「12. 结合通用互联网业务...」
 */
const detectParagraphHeadingLevel = (text) => {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 200) {
    return 0;
  }

  if (CHINESE_SECTION_PATTERN.test(trimmed) || CHINESE_CHAPTER_PATTERN.test(trimmed)) {
    return 1;
  }

  if (NUMBERED_QUESTION_PATTERN.test(trimmed)) {
    return 2;
  }

  return 0;
};

const promoteParagraphHeadings = (nodes) =>
  nodes.map((node) => {
    if (node.type !== NODE_TYPES.PARAGRAPH) {
      return node;
    }

    const level = detectParagraphHeadingLevel(node.text);
    if (level === 0) {
      return node;
    }

    return {
      ...node,
      type: NODE_TYPES.HEADING,
      level
    };
  });
const { parsePlainText } = require('./markdownStructureParser');

const HTML_ENTITIES = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'"
};

const decodeHtmlEntities = (text) =>
  text.replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, (entity) => HTML_ENTITIES[entity] || entity);

const stripInlineHtml = (html) =>
  decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(strong|em|b|i|span|a|u)>/gi, '')
      .replace(/<(strong|em|b|i|span|a|u)(?:\s[^>]*)?>/gi, '')
      .replace(/<[^>]+>/g, '')
  ).trim();

const BLOCK_PATTERNS = [
  {
    regex: /<h([1-6])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/gi,
    mapMatch: (match) => ({
      type: NODE_TYPES.HEADING,
      level: Number(match[1]),
      text: stripInlineHtml(match[2])
    })
  },
  {
    regex: /<li(?:\s[^>]*)?>([\s\S]*?)<\/li>/gi,
    mapMatch: (match) => ({
      type: NODE_TYPES.LIST_ITEM,
      level: 0,
      text: stripInlineHtml(match[1])
    })
  },
  {
    regex: /<t[dh](?:\s[^>]*)?>([\s\S]*?)<\/t[dh]>/gi,
    mapMatch: (match) => ({
      type: NODE_TYPES.TABLE,
      level: 0,
      text: stripInlineHtml(match[1]),
      metadata: { cell: true }
    })
  },
  {
    regex: /<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi,
    mapMatch: (match) => ({
      type: NODE_TYPES.PARAGRAPH,
      level: 0,
      text: stripInlineHtml(match[1])
    })
  }
];

const collectHtmlBlocks = (html) => {
  const blocks = [];

  for (const { regex, mapMatch } of BLOCK_PATTERNS) {
    const pattern = new RegExp(regex.source, regex.flags);
    let match = pattern.exec(html);

    while (match) {
      const node = mapMatch(match);
      if (node.text) {
        blocks.push({
          index: match.index,
          length: match[0].length,
          node
        });
      }
      match = pattern.exec(html);
    }
  }

  blocks.sort((a, b) => a.index - b.index);

  const filtered = [];
  let lastEnd = -1;

  for (const block of blocks) {
    if (block.index >= lastEnd) {
      filtered.push(block);
      lastEnd = block.index + block.length;
    }
  }

  return filtered;
};

const buildStructuredDocument = (blocks, sourceType) => {
  const nodes = [];
  let plainText = '';

  for (const block of blocks) {
    if (plainText) {
      plainText += '\n';
    }
    const start = plainText.length;
    plainText += block.node.text;
    const end = plainText.length;

    nodes.push({
      ...block.node,
      start,
      end
    });
  }

  return {
    plainText,
    sourceType,
    nodes
  };
};

const parseHtmlStructure = (html, sourceType) => {
  const normalizedHtml = html.replace(/\r\n/g, '\n').trim();
  const blocks = collectHtmlBlocks(normalizedHtml);

  if (blocks.length === 0) {
    const fallbackText = stripInlineHtml(normalizedHtml);
    if (fallbackText) {
      const doc = parsePlainText(fallbackText, sourceType);
      return { ...doc, nodes: promoteParagraphHeadings(doc.nodes) };
    }
    return {
      plainText: '',
      sourceType,
      nodes: []
    };
  }

  const doc = buildStructuredDocument(blocks, sourceType);
  return { ...doc, nodes: promoteParagraphHeadings(doc.nodes) };
};

module.exports = {
  parseHtmlStructure,
  stripInlineHtml,
  collectHtmlBlocks,
  promoteParagraphHeadings,
  detectParagraphHeadingLevel
};
