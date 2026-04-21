# 使用 Node.js 最新稳定版作为基础镜像
FROM node:latest

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制项目文件
COPY . .

# 创建必要的目录
RUN mkdir -p uploads lancedb

# 暴露端口
EXPOSE 3000

# 启动服务器
CMD ["node", "index.js"]
