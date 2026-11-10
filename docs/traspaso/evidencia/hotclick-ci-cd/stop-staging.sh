#!/bin/bash
kill $(cat /workspace/staging-43188186/backend.pid) $(cat /workspace/staging-43188186/front.pid) 2>/dev/null
curl -s -XPOST localhost:2375/containers/stg-pg-43188186/stop; curl -s -XPOST localhost:2375/containers/stg-mailpit/stop
echo stopped
