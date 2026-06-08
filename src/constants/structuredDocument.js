const NODE_TYPES = {
  HEADING: 'heading',
  PARAGRAPH: 'paragraph',
  LIST: 'list',
  LIST_ITEM: 'listItem',
  CODE_BLOCK: 'codeBlock',
  TABLE: 'table'
};

const CHUNK_TYPES = {
  PARENT: 'parent',
  CHILD: 'child'
};

const SOURCE_TYPES = {
  MD: 'md',
  TXT: 'txt',
  CSV: 'csv',
  DOC: 'doc',
  DOCX: 'docx',
  PDF: 'pdf'
};

module.exports = {
  NODE_TYPES,
  CHUNK_TYPES,
  SOURCE_TYPES
};
