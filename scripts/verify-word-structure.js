#!/usr/bin/env node
/**
 * 批次 1B 人工验证脚本：解析 Word 文档结构并预览父子分块结果
 *
 * 用法: node scripts/verify-word-structure.js <path-to-docx>
 */
const path = require('path');
const documentParserService = require('../src/services/documentParserService');
const hierarchicalSplitterService = require('../src/services/hierarchicalSplitterService');
const { NODE_TYPES } = require('../src/constants/structuredDocument');

const filePath = process.argv[2];

if (!filePath) {
  console.error('用法: node scripts/verify-word-structure.js <path-to-docx>');
  process.exit(1);
}

const ext = path.extname(filePath).replace('.', '').toLowerCase();
if (ext !== 'docx' && ext !== 'doc') {
  console.error('仅支持 .doc / .docx 文件');
  process.exit(1);
}

async function main() {
  const structuredDoc = await documentParserService.parseStructuredDocument(filePath, ext);

  console.log('\n=== 结构化节点 ===');
  structuredDoc.nodes.forEach((node, index) => {
    console.log(
      `[${index}] type=${node.type} level=${node.level} text=${node.text.slice(0, 60)}${node.text.length > 60 ? '...' : ''}`
    );
  });

  const headings = structuredDoc.nodes.filter((node) => node.type === NODE_TYPES.HEADING);
  const paragraphs = structuredDoc.nodes.filter((node) => node.type === NODE_TYPES.PARAGRAPH);
  const listItems = structuredDoc.nodes.filter((node) => node.type === NODE_TYPES.LIST_ITEM);
  const tables = structuredDoc.nodes.filter((node) => node.type === NODE_TYPES.TABLE);

  console.log('\n=== 节点统计 ===');
  console.log(`heading: ${headings.length}, paragraph: ${paragraphs.length}, listItem: ${listItems.length}, table: ${tables.length}`);

  if (headings.length > 0) {
    console.log('\n=== 标题层级 ===');
    headings.forEach((heading) => {
      console.log(`  H${heading.level}: ${heading.text}`);
    });
  }

  const sections = hierarchicalSplitterService.buildSections(structuredDoc.nodes);
  console.log('\n=== 章节路径 ===');
  sections.forEach((section, index) => {
    console.log(`  [${index}] ${section.hierarchyPath || '(无标题)'} (contentLen=${section.content.length})`);
  });

  const chunks = await hierarchicalSplitterService.splitStructuredDocument(structuredDoc, {
    documentId: 'verify',
    chunkSize: 800,
    chunkOverlap: 150
  });

  console.log('\n=== 子块预览（前 5 条）===');
  chunks.slice(0, 5).forEach((chunk) => {
    console.log(`  [${chunk.index}] path=${chunk.hierarchyPath}`);
    console.log(`       content=${chunk.content.slice(0, 80)}${chunk.content.length > 80 ? '...' : ''}`);
  });
  console.log(`\n总子块数: ${chunks.length}`);
}

main().catch((error) => {
  console.error('验证失败:', error.message);
  process.exit(1);
});
