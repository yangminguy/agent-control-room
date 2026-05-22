#!/bin/bash

set -e

PROJECT_DIR="/Users/wonminyang/Desktop/양원민 개발자/agent_control_room_docs"
HERMES_DIR="/Users/wonminyang/Desktop/hermes-agent"
LOG_DIR="/tmp/hermes-ecosystem"

mkdir -p "$LOG_DIR"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     Hermes + Telegram + Agent Control Room 시작                ║"
echo "╚════════════════════════════════════════════════════════════════╝"

echo ""
echo "📡 Hermes Agent Gateway (Telegram) 시작..."
echo "   - 봇: @Agent_gravity1467_bot"
echo "   - LLM: Gemini 1.5 Flash"

cd "$HERMES_DIR"

nohup /Users/wonminyang/.local/bin/uv run --python 3.12 hermes gateway run \
  > "$LOG_DIR/hermes-gateway.log" 2>&1 &

HERMES_PID=$!
echo "   ✓ PID: $HERMES_PID"
echo "$HERMES_PID" > "$LOG_DIR/hermes-gateway.pid"

echo "   ⏳ Telegram 게이트웨이 준비 중..."
sleep 4

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
echo "║     ✅ Hermes + Telegram Ecosystem 시작 완료!                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📱 Telegram 봇:"
echo "   🤖 t.me/Agent_gravity1467_bot"
echo ""
echo "🌐 웹 UI:"
echo "   http://localhost:3001/orchestration"
echo ""
echo "📝 로그:"
echo "   - Hermes:      tail -f $LOG_DIR/hermes-gateway.log"
echo "   - Control Room: tail -f $LOG_DIR/control-room.log"
echo ""
