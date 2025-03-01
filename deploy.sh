#!/usr/bin/env bash
mkdir -p dist
cat node_modules/open3d/dist/open3d.js game.js > dist/main.js
rsync -av dist/main.js stonts.jsg  root@172.22.111.91:/userdata/roms/jsgames/stonts/
