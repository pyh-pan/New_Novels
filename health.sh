#!/bin/sh
set -eu

curl -fsS -o /dev/null --max-time 3 http://127.0.0.1:3000/health
