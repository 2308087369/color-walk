#!/bin/bash

# ==========================================
# Color City 服务管理脚本
# ==========================================

SERVICE_DIR="/gcl/my_project/color-city/service"
BACKEND_SVC="color-city-backend.service"
FRONTEND_SVC="color-city-frontend.service"
VLLM_SVC="color-city-vllm.service"

show_help() {
    echo "使用方法: ./manage.sh [install|start|stop|restart|restart-vllm|status|log-backend|log-frontend|log-vllm]"
    echo ""
    echo "  install       : 注册 Systemd 服务并启用开机自启"
    echo "  start         : 启动所有服务"
    echo "  stop          : 停止所有服务"
    echo "  restart       : 重启所有服务"
    echo "  restart-vllm  : 仅重启 vLLM 推理服务"
    echo "  status        : 查看所有服务状态"
    echo "  log-backend   : 查看后端日志"
    echo "  log-frontend  : 查看前端日志"
    echo "  log-vllm      : 查看 vLLM 推理服务日志"
}

if [ "$EUID" -ne 0 ]; then 
    echo "请使用 root 权限 (sudo) 运行此脚本"
    exit 1
fi

case "$1" in
    install)
        echo "=> 正在安装 systemd 服务..."
        cp "$SERVICE_DIR/$BACKEND_SVC" /etc/systemd/system/
        cp "$SERVICE_DIR/$FRONTEND_SVC" /etc/systemd/system/
        cp "$SERVICE_DIR/$VLLM_SVC" /etc/systemd/system/
        systemctl daemon-reload
        systemctl enable $BACKEND_SVC
        systemctl enable $FRONTEND_SVC
        systemctl enable $VLLM_SVC
        echo "=> 安装完成并已设置开机自启。"
        ;;
    start)
        echo "=> 正在启动服务..."
        systemctl start $BACKEND_SVC
        systemctl start $FRONTEND_SVC
        systemctl start $VLLM_SVC
        echo "=> 启动命令已发送。"
        ;;
    stop)
        echo "=> 正在停止服务..."
        systemctl stop $BACKEND_SVC
        systemctl stop $FRONTEND_SVC
        systemctl stop $VLLM_SVC
        echo "=> 停止命令已发送。"
        ;;
    restart)
        echo "=> 正在重启服务..."
        systemctl restart $BACKEND_SVC
        systemctl restart $FRONTEND_SVC
        systemctl restart $VLLM_SVC
        echo "=> 重启命令已发送。"
        ;;
    restart-vllm)
        echo "=> 正在重启 vLLM 服务..."
        systemctl restart $VLLM_SVC
        echo "=> 重启 vLLM 命令已发送。"
        ;;
    status)
        echo "================ Backend Status ================"
        systemctl status $BACKEND_SVC --no-pager
        echo ""
        echo "================ Frontend Status ================"
        systemctl status $FRONTEND_SVC --no-pager
        echo ""
        echo "================ vLLM Status ================"
        systemctl status $VLLM_SVC --no-pager
        ;;
    log-backend)
        journalctl -u $BACKEND_SVC -f -n 100
        ;;
    log-frontend)
        journalctl -u $FRONTEND_SVC -f -n 100
        ;;
    log-vllm)
        journalctl -u $VLLM_SVC -f -n 100
        ;;
    *)
        show_help
        ;;
esac