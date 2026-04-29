const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 上传目录配置，默认 ./uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
// 文件大小限制，默认 50MB（52428800 字节），可通过环境变量 MAX_FILE_SIZE 覆盖
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 52428800;

// 确保上传目录存在，不存在则自动创建
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 允许上传的文件格式列表
const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.csv'];

// 磁盘存储配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名：时间戳 + 随机数 + 原文件扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// 文件格式过滤器
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    // 文件格式不支持时返回标准 Error
    const error = new Error(`不支持的文件格式: ${ext}。支持的格式: ${allowedExtensions.join(', ')}`);
    error.statusCode = 400;
    error.code = 'UNSUPPORTED_FILE_TYPE';
    cb(error, false);
  }
};

// 配置 multer 实例
const upload = multer({
  storage: storage,
  limits: {
    fileSize: maxFileSize
  },
  fileFilter: fileFilter
});

module.exports = upload;
