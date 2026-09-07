#!/data/data/com.termux/files/usr/bin/bash
# Remote Display Helper - Setup WiFi Screen Mirroring
# Usage: ./remote-display.sh [command]

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Remote Display WiFi Setup ===${NC}"
echo ""

# Get device IP
DEVICE_IP=$(ip addr show wlan0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d'/' -f1)
if [ -z "$DEVICE_IP" ]; then
    DEVICE_IP=$(ip addr show eth0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d'/' -f1)
fi

echo -e "Device IP: ${YELLOW}$DEVICE_IP${NC}"
echo ""

case "${1:-status}" in
    status)
        echo -e "${GREEN}=== Current Status ===${NC}"
        echo ""
        
        # Check ADB
        echo -e "ADB Status:"
        adb devices 2>/dev/null || echo "  ADB not responding"
        echo ""
        
        # Check wireless debugging
        echo -e "Wireless Debugging:"
        getprop debug.adb.tcp.port 2>/dev/null | grep -q "5555" && echo "  ✓ ADB over WiFi enabled (port 5555)" || echo "  ✗ ADB over WiFi disabled"
        echo ""
        
        # Check VNC
        echo -e "VNC Server:"
        pgrep -f vnc >/dev/null 2>&1 && echo "  ✓ VNC server running" || echo "  ✗ VNC server not running"
        echo ""
        
        # Check scrcpy
        echo -e "scrcpy:"
        which scrcpy >/dev/null 2>&1 && echo "  ✓ scrcpy installed" || echo "  ✗ scrcpy not installed (need PC)"
        ;;
        
    enable-adb)
        echo -e "${YELLOW}To enable ADB over WiFi:${NC}"
        echo ""
        echo "Option 1 - From PC (USB required first):"
        echo "  1. Connect device via USB"
        echo "  2. On PC: adb tcpip 5555"
        echo "  3. On PC: adb connect $DEVICE_IP:5555"
        echo ""
        echo "Option 2 - Wireless Debugging (Android 11+):"
        echo "  1. Go to Settings → Developer Options"
        echo "  2. Enable 'Wireless Debugging'"
        echo "  3. Accept pairing"
        echo "  4. Run: adb pair <IP>:<PORT>"
        echo ""
        echo "After ADB over WiFi is active, from PC run:"
        echo "  scrcpy -s $DEVICE_IP:5555"
        ;;
        
    install-vnc)
        echo -e "${YELLOW}Installing VNC server...${NC}"
        apt update -qq
        apt install -y x11vnc 2>/dev/null
        if which x11vnc >/dev/null 2>&1; then
            echo -e "${GREEN}✓ x11vnc installed${NC}"
            echo ""
            echo "To start VNC server:"
            echo "  x11vnc -display :0 -forever -shared"
        else
            echo -e "${RED}✗ Failed to install x11vnc${NC}"
            echo "This requires X11 display which may not be available on Android"
        fi
        ;;
        
    help|*)
        echo -e "${GREEN}Usage: $0 [command]${NC}"
        echo ""
        echo "Commands:"
        echo "  status        - Show current status"
        echo "  enable-adb    - Show how to enable ADB over WiFi"
        echo "  install-vnc   - Try to install VNC server"
        echo "  help          - Show this help"
        echo ""
        echo -e "${YELLOW}Quick Start:${NC}"
        echo "  1. Enable Wireless Debugging in Android Settings"
        echo "  2. From PC: adb pair <device-ip>:<port>"
        echo "  3. From PC: adb connect <device-ip>:5555"
        echo "  4. From PC: scrcpy -s <device-ip>:5555"
        ;;
esac