# Logic Regression Matrix

## Backend

| Scenario | Expected result | Coverage |
| --- | --- | --- |
| Root endpoint | `/` returns API message and `/docs` link | `backend/tests/test_smoke_app.py` |
| Auth guard | `/api/auth/me` without token returns `401` | `backend/tests/test_smoke_app.py` |
| Tournament start without fixture | League/group tournament cannot enter `en_curso` | `backend/tests/services/test_competition.py` |
| Result correction | Replacing a finalized result reverses previous table stats first | `backend/tests/services/test_competition.py` |
| Elimination draw | Knockout matches reject tied scores | `backend/tests/services/test_competition.py` |
| Walkover | Retired team loses `0-3` and rival receives the win | `backend/tests/services/test_competition.py` |
| Closed enrollment | Inscription is blocked outside `inscripcion_abierta` | `backend/tests/services/test_enrollment.py` |
| Cross-institution enrollment | Institution users cannot register a foreign team | `backend/tests/services/test_enrollment.py` |
| Duplicate team name | Same institution + sport + team name is rejected | `backend/tests/services/test_enrollment.py` |
| Pending team athletes | Athletes cannot be added to non-approved teams | `backend/tests/services/test_enrollment.py` |
| Late inscription approval | Approving registrations after fixture generation is blocked | `backend/tests/services/test_enrollment.py` |

## Manual checks

- `python -m compileall backend/app backend/tests`
- `backend/venv/bin/python -m pytest`
- `cd frontend && npm run build`
