# Neon startup / health verification

Executable checks for the two production-architecture fixes in this PR:
deterministic schema init (no CREATE TABLE race) and honest health that reflects
real DB reachability. See also `server/health.test.ts` (automated, `bun test server/`).

## Memory mode (no DATABASE_URL)
```bash
env -u DATABASE_URL PORT=3210 pnpm start &
curl -s localhost:3210/api/health
# expect: {"ok":true,"dbConfigured":false,"mode":"memory","detail":"DATABASE_URL not set — using in-memory storage."}
curl -s -X POST localhost:3210/api/sources -H 'content-type: application/json' \
  -d '{"title":"t","rawText":"hello"}'   # 201, mode memory
```

## Valid Neon (real DATABASE_URL)
```bash
PORT=3211 pnpm start         # log: "Persistence: Neon (DATABASE_URL) — schema ready"
curl -s localhost:3211/api/health
# expect: {"ok":true,"dbConfigured":true,"mode":"db","db":{"ready":true,"reachable":true,...}}
# Cold-start persistence: write a source, restart the server, reload by id.
RESP=$(curl -s -X POST localhost:3211/api/sources -H 'content-type: application/json' \
  -d '{"title":"c","rawText":"persist me"}')
SID=$(echo $RESP | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
# restart server, then:
curl -s -X POST localhost:3211/api/brd/generate -H 'content-type: application/json' \
  -d "{\"sourceId\":\"$SID\"}"   # 200: source survived restart; schema re-inited first
```

## Failed / unreachable Neon (configured but down)
```bash
DATABASE_URL='postgresql://u:p@127.0.0.1:1/nodb' PORT=3212 pnpm start
# log: "Persistence: Neon (DATABASE_URL) — schema init FAILED"
curl -s localhost:3212/api/health
# expect: ok:false, db.ready:false, db.reachable:false, and NO url/credentials anywhere
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3212/api/sources \
  -H 'content-type: application/json' -d '{"rawText":"x"}'   # 503, clean error
```
