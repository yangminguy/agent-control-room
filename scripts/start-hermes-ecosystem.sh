#!/bin/bash

set -e

PROJECT_DIR="/Users/wonminyang/Desktop/양원민 개발자/agent_control_room_docs"
HERMES_DIR="/Users/wonminyang/Desktop/hermes-agent"
LOG_DIR="/tmp/hermes-ecosystem"

mkdir -p "$LOG_DIR"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     Hermes Ecosystem 시작                                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"

echo ""
echo "📡 Hermes Agent Gateway 시작..."
echo "   - 위치: $HERMES_DIR"
echo "   - 포트: 8000"
echo "   - LLM: Gemini 1.5 Flash"

cd "$HERMES_DIR"

nohup python -m hermes.gateway \
  --host 127.0.0.1 \
  --port 8000 \
  > "$LOG_DIR/hermes-gateway.log" 2>&1 &

HERMES_PID=$!
echo "   ✓ PID: $HERMES_PID"
echo "$HERMES_PID" > "$LOG_DIR/hermes-gateway.pid"

echo "   ⏳ Gateway 준비 중..."
sleep 3

echo ""
echo "🚀 Agent Control Room 개발 서버 시작..."
echo "   - 포트: 3001"

cd "$PROJECT_DIR"

nohup npm run dev \
  > "$LOG_DIR/control-room.log" 2>&1 &

CONTROL_ROOM_PID=$!
echo "   ✓ PID: $CONTROL_ROOM_PID"
echo "$CONTROL_ROOM_PID" > "$LOG_DIR/control-room.pid"

echo "   ⏳ 서버 준비 중..."
sleep 5

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     ✅ Hermes Ecosystem 시작 완료!                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📍 접근 주소:"
echo "   🌐 Agent Control Room: http://localhost:3001"
echo "   📡 Hermes Gateway API: http://localhost:8000"
echo ""
echo "📝 로그:"
echo "   - Hermes:      $LOG_DIR/hermes-gateway.log"
echo "   - Control Room: $LOG_DIR/control-room.log"
echo ""
echo "📖 다음 단계:"
echo "   1. http://localhost:3001 열기"
echo "   2. /orchestration 페이지로 이동"
echo "   3. Tab 8 'Hermes Live Analysis' 클릭"
echo "   4. 'Analyze Now' 버튼 클릭"
echo ""
