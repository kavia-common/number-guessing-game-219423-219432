#!/bin/bash
cd /home/kavia/workspace/code-generation/number-guessing-game-219423-219432/frontend_react_js
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

