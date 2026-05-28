# API FOOTBALL

Competition:
league=1
season=2026

Endpoints:
GET /leagues?id=1&season=2026
GET /fixtures?league=1&season=2026
GET /fixtures/rounds?league=1&season=2026
GET /standings?league=1&season=2026
GET /teams?league=1&season=2026
GET /fixtures?id={fixture}
GET /fixtures/events?fixture={fixture}
GET /fixtures/lineups?fixture={fixture}
GET /fixtures/statistics?fixture={fixture}
GET /fixtures/players?fixture={fixture}

Rate limit:
100 requests/day.

Sync strategy:
Fixtures daily.
Teams weekly.
Standings daily.
Live matches every 5-10 min.

Never expose API key.
