#!/bin/bash
# HotClick STAGING local front :3000
cd /workspace/staging-43188186/Hot_click_outlet/frontend
export CHOKIDAR_USEPOLLING=1 CHOKIDAR_INTERVAL=2000
export VITE_API_PROXY=http://localhost:8081
exec -a hotclick-staging-front node node_modules/vite/bin/vite.js --port 3000 --strictPort --host localhost
