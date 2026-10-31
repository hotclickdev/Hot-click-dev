#!/bin/bash
# merges one at a time: only when head==APTO, no failing/pending checks, CLEAN
R=hotclickdev/Hot-click-dev
Q="NUM:HEADSHA_CON_APTO"   # uno o varios, en orden
for p in $Q; do n=${p%%:*}; h=${p##*:}
 for i in $(seq 1 120); do
  j=$(gh pr view $n -R $R --json state,headRefOid,mergeStateStatus,statusCheckRollup)
  st=$(jq -r .state <<<"$j"); head=$(jq -r .headRefOid <<<"$j"); ms=$(jq -r .mergeStateStatus <<<"$j")
  pend=$(jq '[.statusCheckRollup[]|select((.conclusion//"")=="" )]|length' <<<"$j")
  bad=$(jq '[.statusCheckRollup[]|select(.conclusion!=null and .conclusion!="" and (.conclusion|IN("SUCCESS","SKIPPED","NEUTRAL")|not))]|length' <<<"$j")
  [ "$st" != OPEN ] && { echo "$(date +%H:%M) $n not open ($st)"; break; }
  [ "$head" != "$h" ] && { echo "$(date +%H:%M) SKIP $n head changed $head"; break; }
  [ "$bad" -gt 0 ] && { echo "$(date +%H:%M) SKIP $n failing checks"; break; }
  [ "$ms" = DIRTY ] && { echo "$(date +%H:%M) SKIP $n DIRTY"; break; }
  if [ "$pend" -eq 0 ] && [ "$ms" = CLEAN ]; then
   if [ $n = 338 ]; then c=$(gh api "repos/$R/git/trees/master?recursive=1" -q '.tree[].path' | rg -c '/V199__' ); [ "${c:-0}" -gt 0 ] && { echo "SKIP 338 V199 taken"; break; }; fi
   gh pr merge $n -R $R --merge --match-head-commit $h && echo "$(date +%H:%M) MERGED $n $h" || echo "FAILMERGE $n"; sleep 20; break
  fi
  sleep 30
 done
done
echo "DONE MASTER $(gh api repos/$R/commits/master -q .sha)"
