"""What-if scenario: bye-week spacing rule.

Re-slots WEEKS ONLY for the 2027–2031 baseline so every Power/Notre Dame team's two byes
are separated by at least MIN_GAMES_BETWEEN games (default 4; back-to-back byes impossible).

Kept fixed, exactly as in the baseline: every matchup, Game ID, administrative home/away,
venue, site type, status and source (so counts, conference mandates, H/A coverage and the
G6 home-campus rule are untouched). Only Week / Date / Week label may change.

Constraints mirror the original week model (source/cfb_model.py `slot_weeks`):
  * each game in exactly one week 0..13; no participant (incl. G6 opponents) twice in a week
  * honoured published week requests stay put (Requested week == baseline week)
  * traditional rivalry-weekend pins stay put (final weekend, Cal–Stanford W12, Iowa–Iowa State W2)
  * 19–34 Power-vs-Power games per week; every Power team plays 2–4 games in Weeks 0–3
Objective: move as few games as possible; protected rivalry locks (workbook 07) cost 3× to move;
moved games prefer the original model's timing (conference games mid/late season, P4 nonconference
and G6 games early) with a tie-break toward nearby weeks.

Run (needs numpy + scipy; the web app itself never runs Python):
  python scripts/scenarios/bye_spacing.py [--min-games-between 4] [--out data/scenarios/bye-spacing]
"""
import argparse, collections, datetime, json, os, sys, time

import numpy as np
from scipy.optimize import Bounds, LinearConstraint, milp
from scipy.sparse import coo_matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
WEEKS = range(14)
RIVALRY_LAST = [("Georgia", "Georgia Tech"), ("Florida", "Florida State"), ("Clemson", "South Carolina"), ("Kentucky", "Louisville"),
    ("Michigan", "Ohio State"), ("Alabama", "Auburn"), ("Ole Miss", "Mississippi State"), ("Missouri", "Arkansas"),
    ("Tennessee", "Vanderbilt"), ("Indiana", "Purdue"), ("Iowa", "Nebraska"), ("Illinois", "Northwestern"),
    ("Minnesota", "Wisconsin"), ("UCLA", "USC"), ("Oregon", "Washington"), ("Kansas", "Kansas State"),
    ("Texas", "Texas A&M"), ("Arizona", "Arizona State"), ("BYU", "Utah"), ("Baylor", "TCU"), ("Virginia", "Virginia Tech"),
    ("North Carolina", "NC State"), ("Maryland", "Rutgers"), ("Pitt", "West Virginia"), ("Boston College", "Syracuse"),
    ("California", "Stanford"), ("Iowa", "Iowa State")]
RIVAL_KEYS = {frozenset(p) for p in RIVALRY_LAST}


def timing_pref(kind, w):
    """Week preference costs from source/cfb_model.py slot_weeks (lower is better)."""
    if kind == "Conference":
        return (0.48 if w < 3 else (0.13 if w < 5 else 0.01)) + (0.12 if w == 0 else 0)
    if kind == "P4 nonconference":
        return 0.075 * max(0, w - 3) + (0.45 if w >= 10 else 0)
    return 0.11 * max(0, w - 4) + (0.7 if w >= 10 else 0)


def solve_year(games, power, min_between, time_limit, locks):
    n = len(games)
    idx = lambda i, w: i * 14 + w
    N = n * 14
    rows, lo, hi = [], [], []

    def add(cols, L, H):
        rows.append(cols); lo.append(L); hi.append(H)

    lb = np.zeros(N); ub = np.ones(N); cost = np.zeros(N)
    pinned = {}
    for i, g in enumerate(games):
        k = frozenset((g["Home"], g["Away"]))
        if g["Week"] is None:
            pass  # new game (no baseline week): free to go anywhere
        elif g["Requested week"] is not None and g["Requested week"] == g["Week"]:
            pinned[i] = "requested week"
        elif k in RIVAL_KEYS and g["Type"] != "G6":
            pinned[i] = "rivalry weekend"
        move = 3 if k in locks else 1
        for w in WEEKS:
            if g["Week"] is None:
                cost[idx(i, w)] = 0.3 * timing_pref(g["Type"], w)
                continue
            # Moving dominates; timing preference decides where a moved game lands.
            cost[idx(i, w)] = (0 if w == g["Week"] else move + 0.001 * abs(w - g["Week"])) + 0.3 * timing_pref(g["Type"], w)
        if i in pinned:
            for w in WEEKS:
                lb[idx(i, w)] = ub[idx(i, w)] = 1 if w == g["Week"] else 0
        add([idx(i, w) for w in WEEKS], 1, 1)

    who = collections.defaultdict(list)
    for i, g in enumerate(games):
        for t in (g["Home"], g["Away"]):
            who[t].append(i)
    play = lambda t, w: [idx(i, w) for i in who[t]]
    for t, ids in who.items():
        for w in WEEKS:
            add(play(t, w), 0, 1)
    for w in WEEKS:
        add([idx(i, w) for i, g in enumerate(games) if g["Type"] != "G6"], 19, 34)
    gap = min_between + 1  # byes in weeks b1<b2 need b2-b1-1 >= min_between
    for t in power:
        add([c for w in range(4) for c in play(t, w)], 2, 4)
        for w1 in WEEKS:
            for w2 in range(w1 + 1, min(14, w1 + gap)):
                # not idle in both w1 and w2  <=>  plays in at least one of them
                add(play(t, w1) + play(t, w2), 1, 2)

    r, c, v = [], [], []
    for j, cols in enumerate(rows):
        for col in cols:
            r.append(j); c.append(col); v.append(1)
    A = coo_matrix((v, (r, c)), shape=(len(rows), N)).tocsr()
    t0 = time.time()
    res = milp(cost, integrality=np.ones(N), bounds=Bounds(lb, ub), constraints=LinearConstraint(A, lo, hi),
               options={"time_limit": time_limit})
    if res.x is None:
        return None, res.message, pinned, time.time() - t0
    weeks = [int(np.argmax(res.x[i * 14:(i + 1) * 14])) for i in range(n)]
    return weeks, res.message, pinned, time.time() - t0


def byes(games, team):
    played = {g["Week"] for g in games if team in (g["Home"], g["Away"])}
    return sorted(set(WEEKS) - played)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-games-between", type=int, default=4)
    ap.add_argument("--out", default="data/scenarios/bye-spacing")
    ap.add_argument("--time-limit", type=float, default=120)
    a = ap.parse_args()
    base = json.load(open(os.path.join(ROOT, "data/cfb_full_games.json")))
    targets = json.load(open(os.path.join(ROOT, "data/logo-targets.json")))["teams"]
    power = [t["name"] for t in targets if t["pool"] == "Power"]
    wb = json.load(open(os.path.join(ROOT, "src/data/generated/workbook.json")))
    locks = {frozenset((r["teamA"], r["teamB"])) for r in wb["rivalryLocks"]}

    out, report = [], {"rule": f"Two byes per team-season separated by at least {a.min_games_between} games (no back-to-back byes)",
                       "kept_fixed": ["matchups", "Game IDs", "home/away", "venue", "site type", "status", "source"], "seasons": []}
    for y in sorted({g["Year"] for g in base}):
        games = [dict(g) for g in base if g["Year"] == y]
        dates = {g["Week"]: g["Date"] for g in games}
        before = {t: byes(games, t) for t in power}
        viol_before = [t for t, b in before.items() if b[1] - b[0] - 1 < a.min_games_between]
        weeks, msg, pinned, secs = solve_year(games, power, a.min_games_between, a.time_limit, locks)
        if weeks is None:
            print(f"{y}: INFEASIBLE — {msg}", file=sys.stderr)
            report["seasons"].append({"season": y, "feasible": False, "message": str(msg)})
            out += games
            continue
        moved = []
        for g, w in zip(games, weeks):
            if w != g["Week"]:
                moved.append({"Game ID": g["Game ID"], "Away": g["Away"], "Home": g["Home"], "Type": g["Type"], "Status": g["Status"], "from": g["Week"], "to": w})
                g["Week"], g["Date"], g["Week label"] = w, dates[w], f"Week {w}"
        after = {t: byes(games, t) for t in power}
        viol_after = [t for t, b in after.items() if b[1] - b[0] - 1 < a.min_games_between]
        print(f"{y}: {msg} in {secs:.1f}s · moved {len(moved)} of {len(games)} games · violations {len(viol_before)} → {len(viol_after)} · pinned {len(pinned)}")
        report["seasons"].append({
            "season": y, "feasible": True, "solver": str(msg), "seconds": round(secs, 1), "games": len(games),
            "pinned": len(pinned), "moved": moved, "teams_rescheduled": sorted({t for m in moved for t in (m["Home"], m["Away"]) if t in power}),
            "violations_before": len(viol_before), "violations_after": len(viol_after),
            "byes_before": before, "byes_after": after,
        })
        out += games
    os.makedirs(os.path.join(ROOT, a.out), exist_ok=True)
    out.sort(key=lambda g: g["Game ID"])
    json.dump(out, open(os.path.join(ROOT, a.out, "cfb_full_games.json"), "w"), indent=1)
    json.dump(report, open(os.path.join(ROOT, a.out, "impact-report.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
