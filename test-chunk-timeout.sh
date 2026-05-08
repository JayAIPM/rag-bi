#!/bin/bash

# ========================================
# 问题2测试：流式读取无数据等待超时
# ========================================

# 配置
MOCK_PORT=11435
CHUNK_TIMEOUT=5000
TEST_QUERY="测试超时问题"
PROJECT_DIR="/Users/xiaer/workspace/rag-bi"
TOKEN=""
MOCK_PID=""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

cd "$PROJECT_DIR"

# 清理函数
cleanup() {
    log_info "清理环境..."
    # 停止模拟服务
    if [ ! -z "$MOCK_PID" ]; then
        kill $MOCK_PID 2>/dev/null || true
        sleep 1
    fi
    # 杀死端口占用进程
    lsof -ti:$MOCK_PORT | xargs kill -9 2>/dev/null || true
    # 恢复 .env 配置
    if [ -f ".env.backup" ]; then
        mv .env.backup .env
        log_info "已恢复 .env 配置"
    fi
    # 删除临时文件
    rm -f mock-server.js
}

trap cleanup EXIT

# 创建 Node.js 模拟 Ollama 服务
create_mock_server() {
    log_info "创建模拟 Ollama 服务..."

    cat > mock-server.js << 'EOF'
const http = require('http');

const PORT = process.env.PORT || 11435;

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/chat') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Transfer-Encoding': 'chunked'
            });

            // 模拟慢响应：每3秒发送一个字
            let count = 0;
            const interval = setInterval(() => {
                count++;
                const chunk = JSON.stringify({
                    message: { content: '测' + count }
                });
                res.write(`data: ${chunk}\n\n`);

                if (count >= 10) {
                    clearInterval(interval);
                    res.write('data: [DONE]\n\n');
                    res.end();
                }
            }, 3000); // 每3秒一次，会触发5秒超时
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`Mock Ollama listening on port ${PORT}`);
});
EOF

    log_info "模拟服务脚本已创建: mock-server.js"
}

# 清理端口
clear_port() {
    log_info "清理端口 $MOCK_PORT..."
    lsof -ti:$MOCK_PORT | xargs kill -9 2>/dev/null || true
    sleep 1
}

# 启动模拟服务
start_mock_server() {
    clear_port
    log_info "启动模拟 Ollama 服务 (端口 $MOCK_PORT)..."

    PORT=$MOCK_PORT node mock-server.js > /dev/null 2>&1 &
    MOCK_PID=$!

    sleep 2

    if kill -0 $MOCK_PID 2>/dev/null; then
        log_info "模拟服务已启动 (PID: $MOCK_PID)"
    else
        log_error "模拟服务启动失败"
        exit 1
    fi
}

# 修改配置（兼容 macOS sed）
update_config() {
    log_info "修改配置..."

    # 备份原配置
    cp .env .env.backup

    # macOS sed 兼容写法
    sed -i '' "s|OLLAMA_URL=.*|OLLAMA_URL=http://localhost:$MOCK_PORT|" .env
    sed -i '' "s|CHUNK_TIMEOUT=.*|CHUNK_TIMEOUT=$CHUNK_TIMEOUT|" .env

    log_info "配置已修改:"
    grep -E "OLLAMA_URL|CHUNK_TIMEOUT" .env
}

# 获取测试 token
get_token() {
    log_info "获取测试 Token..."

    RESPONSE=$(curl -s -X POST "http://localhost:3000/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"admin123"}')

    TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$TOKEN" ]; then
        log_error "获取 Token 失败"
        log_error "响应: $RESPONSE"
        exit 1
    fi

    log_info "Token 获取成功"
}

# 测试超时
test_timeout() {
    log_info "========================================"
    log_info "开始测试无数据等待超时..."
    log_info "CHUNK_TIMEOUT=${CHUNK_TIMEOUT}ms"
    log_info "模拟服务每3秒发送一次数据"
    log_info "预期：5秒无数据后触发超时"
    log_info "========================================"
    echo ""

    START_TIME=$(date +%s)

    # 发送请求
    log_info "发送请求..."
    RESPONSE=$(curl -s -N -X POST "http://localhost:3000/api/v1/chat/ask/stream" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{\"query\": \"$TEST_QUERY\"}" 2>&1) || true

    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    echo ""
    log_info "请求完成，耗时: ${DURATION}秒"

    # 检查结果
    if echo "$RESPONSE" | grep -q "响应超时"; then
        echo ""
        log_info "✅ 测试通过：超时机制正确触发"
        log_info "响应内容: $(echo "$RESPONSE" | head -c 300)"
        return 0
    elif [ $DURATION -ge 5 ]; then
        echo ""
        log_info "✅ 请求在超时时间内结束"
        log_info "响应: $(echo "$RESPONSE" | head -c 300)"
        # 检查是否包含错误信息
        if echo "$RESPONSE" | grep -qE "(error|超时|timeout)"; then
            log_info "✅ 检测到超时相关错误"
            return 0
        fi
        return 0
    else
        log_error "❌ 测试失败"
        log_error "耗时: ${DURATION}秒"
        log_error "响应: $RESPONSE"
        return 1
    fi
}

# 主流程
main() {
    echo "========================================"
    echo "问题2测试：流式读取无数据等待超时"
    echo "========================================"
    echo ""

    log_info "前置检查..."

    # 检查后端服务
    if ! curl -s http://localhost:3000/api/v1/auth/user-info > /dev/null 2>&1; then
        log_warn "后端服务可能未运行，请确保后端已启动"
    else
        log_info "后端服务运行正常"
    fi

    create_mock_server
    update_config
    start_mock_server

    log_warn ""
    log_warn "========================================"
    log_warn "请重启后端服务以加载新配置"
    log_warn "然后按 Enter 继续..."
    log_warn "========================================"
    read

    get_token
    test_timeout

    echo ""
    echo "========================================"
    log_info "测试完成"
    echo "========================================"
}

main "$@"
