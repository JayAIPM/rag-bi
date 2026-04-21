#!/bin/bash

# 启动脚本

echo "Starting RAG-BI Backend..."

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# 启动服务器
echo "Starting server..."
node index.js
