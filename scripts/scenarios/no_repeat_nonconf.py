"""What-if scenario: bye spacing + no back-to-back P4 nonconference opponents.

Step 1 re-pairs P4 nonconference games for all five seasons at once so no pair meets in
consecutive seasons, keeping as many baseline games as possible. Step 2 re-slots weeks with the
bye-spacing rule (scripts/scenarios/bye_spacing.py).

Held fixed: every conference and G6 game; all Protected games (the six annual cross-conference
rivalries); every Published nonconference game EXCEPT Notre Dame's (CLAUDE.md: Notre Dame's
11 P4 games are schedule-flexible apart from Navy) — but Notre Dame–USC 2030/2031 stays.
Pairs that are fixed in consecutive seasons are reported as exceptions.
Preserved per team-season: number of P4 nonconference games and of nonconference home games;
≤2 opponents from any one other conference (original model rule); Notre Dame plays 5–8 ACC teams.
New pairings get status "Model generated", the home school's campus, and new Game IDs.

Run: python scripts/scenarios/no_repeat_nonconf.py [--min-games-between 4]
"""
import argparse, collections, itertools, json, os, sys, time

import numpy as np
from scipy.optimize import Bounds, LinearConstraint, milp
from scipy.sparse import coo_matrix

sys.path.insert(0, os.path.dirname(__file__))
from bye_spacing import ROOT, byes, solve_year  # noqa: E402

OUT = "data/scenarios/bye-spacing-no-repeat-nc"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-games-between", type=int, default=4)
    ap.add_argument("--time-limit", type=float, default=180)
    ap.add_argument("--keep-nd-published", action="store_true", help="also hold Notre Dame's published games fixed (repeats become exceptions)")
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--require", action="append", default=[], metavar="TEAM A|TEAM B|YEAR",
                    help="force a nonconference meeting in a season (e.g. an annual series); repeatable")
    a = ap.parse_args()
    base = json.load(open(os.path.join(ROOT, "data/cfb_full_games.json")))
    targets = json.load(open(os.path.join(ROOT, "data/logo-targets.json")))["teams"]
    conf = {t["name"]: t["conference"] for t in targets if t["pool"] == "Power"}
    teams = sorted(conf)
    years = sorted({g["Year"] for g in base})
    wb = json.load(open(os.path.join(ROOT, "src/data/generated/workbook.json")))
    locks = {frozenset((r["teamA"], r["teamB"])) for r in wb["rivalryLocks"]}

    nc = [g for g in base if g["Type"] == "P4 nonconference"]
    fixed = [g for g in nc if g["Status"] == "Protected" or (g["Status"] == "Published" and (a.keep_nd_published or "Notre Dame" not in (g["Home"], g["Away"])))
             or {g["Home"], g["Away"]} == {"Notre Dame", "USC"}]
    fixed_ids = {g["Game ID"] for g in fixed}
    fixed_by_pair = collections.defaultdict(set)
    for g in fixed:
        fixed_by_pair[frozenset((g["Home"], g["Away"]))].add(g["Year"])
    required = []
    for r in a.require:
        t1, t2, yr = [x.strip() for x in r.split("|")]
        if t1 not in conf or t2 not in conf or conf[t1] == conf[t2]:
            sys.exit(f"--require {r}: needs two Power/ND programs from different conferences")
        required.append((t1, t2, int(yr)))
        fixed_by_pair[frozenset((t1, t2))].add(int(yr))
    exempt = {k for k, ys in fixed_by_pair.items() if any(y + 1 in ys for y in ys)}

    # Directed variables z[(y, home, away)] for cross-affiliation pairs
    ordered = [(h, v) for h, v in itertools.permutations(teams, 2) if conf[h] != conf[v]]
    ids = {(y, h, v): i for i, (y, (h, v)) in enumerate((y, p) for y in years for p in ordered)}
    N = len(ids)
    base_dir = {(g["Year"], g["Home"], g["Away"]): g for g in nc}
    cost = np.full(N, 0.0)
    lb, ub = np.zeros(N), np.ones(N)
    for key, i in ids.items():
        y, h, v = key
        if key in base_dir:
            cost[i] = -1.0  # keep baseline game
        elif (y, v, h) in base_dir:
            cost[i] = -0.5  # same pairing, flipped site
        else:
            cost[i] = 0.02  # new pairing, small cost
    for g in fixed:
        i = ids[(g["Year"], g["Home"], g["Away"])]
        lb[i] = ub[i] = 1
        j = ids[(g["Year"], g["Away"], g["Home"])]
        lb[j] = ub[j] = 0

    # Notre Dame–USC hiatus: the series exists only in its published seasons (2030, 2031).
    for y in years:
        if y not in fixed_by_pair[frozenset(("Notre Dame", "USC"))]:
            for key in ((y, "Notre Dame", "USC"), (y, "USC", "Notre Dame")):
                ub[ids[key]] = 0

    rows, lo, hi = [], [], []
    add = lambda cols, L, H: (rows.append(cols), lo.append(L), hi.append(H))
    for t1, t2, yr in required:  # required meeting: exactly one game, either campus
        add([ids[(yr, t1, t2)], ids[(yr, t2, t1)]], 1, 1)
        prev = next((g for g in nc if g["Year"] == yr - 1 and {g["Home"], g["Away"]} == {t1, t2}), None)
        if prev:  # prefer alternating the site from the previous meeting
            cost[ids[(yr, prev["Away"], prev["Home"])]] -= 0.3
    stubs = collections.Counter(); homes = collections.Counter()
    for g in nc:
        stubs[(g["Year"], g["Home"])] += 1; stubs[(g["Year"], g["Away"])] += 1
        homes[(g["Year"], g["Home"])] += 1
    for y in years:
        for t in teams:
            inv = [ids[(y, t, v)] for v in teams if (y, t, v) in ids] + [ids[(y, h, t)] for h in teams if (y, h, t) in ids]
            add(inv, stubs[(y, t)], stubs[(y, t)])
            slack = 1 if any(yr == y and t in (t1, t2) for t1, t2, yr in required) else 0  # room to alternate a required series' site
            add([ids[(y, t, v)] for v in teams if (y, t, v) in ids], homes[(y, t)] - slack, homes[(y, t)] + slack)
            if conf[t] != "Independent":
                for c in {"SEC", "Big Ten", "Big 12", "ACC"} - {conf[t]}:
                    add([ids[k] for o in teams if conf[o] == c for k in ((y, t, o), (y, o, t))], 0, 2)
        add([ids[k] for o in teams if conf[o] == "ACC" for k in ((y, "Notre Dame", o), (y, o, "Notre Dame"))], 5, 8)
        for h, v in itertools.combinations(teams, 2):
            if conf[h] == conf[v]:
                continue
            both = [ids[(y, h, v)], ids[(y, v, h)]]
            add(both, 0, 1)
            if y + 1 in years and frozenset((h, v)) not in exempt:
                add(both + [ids[(y + 1, h, v)], ids[(y + 1, v, h)]], 0, 1)

    r, c, val = [], [], []
    for j, cols in enumerate(rows):
        for col in cols:
            r.append(j); c.append(col); val.append(1)
    A = coo_matrix((val, (r, c)), shape=(len(rows), N)).tocsr()
    t0 = time.time()
    res = milp(cost, integrality=np.ones(N), bounds=Bounds(lb, ub), constraints=LinearConstraint(A, lo, hi), options={"time_limit": a.time_limit})
    print(f"pairing: {res.message} in {time.time() - t0:.1f}s")
    if res.x is None:
        sys.exit("pairing infeasible")
    chosen = {k for k, i in ids.items() if res.x[i] > 0.5}

    # Rebuild the fixture list
    next_id = collections.Counter({y: 2210 for y in years})
    out, kept, dropped, added, flipped = [], [], [], [], []
    for g in base:
        if g["Type"] != "P4 nonconference":
            out.append(dict(g)); continue
        if (g["Year"], g["Home"], g["Away"]) in chosen:
            out.append(dict(g)); kept.append(g["Game ID"])
        else:
            dropped.append(g)
    for (y, h, v) in sorted(chosen):
        if (y, h, v) in base_dir:
            continue
        prior = base_dir.get((y, v, h))
        if not prior:
            next_id[y] += 1
        new = {"Year": y, "Home": h, "Away": v, "Type": "P4 nonconference", "Conference": conf[v], "Venue": f"{h} campus",
               "Site type": "Campus", "Status": "Model generated", "Source URL": "", "Requested week": None,
               "Game ID": prior["Game ID"] if prior else f"{y}-{next_id[y]:04d}", "Week": prior["Week"] if prior else None, "Date": None, "Week label": None}
        if prior:  # same matchup, other campus: keep its Game ID, it is not a dropped game
            dropped = [d for d in dropped if d["Game ID"] != prior["Game ID"]]
        (flipped if prior else added).append(new)
        out.append(new)

    # Step 2: weeks with the bye rule
    report = {"required_games": [[t1, t2, yr] for t1, t2, yr in required], "rules": [f"Two byes per team-season at least {a.min_games_between} games apart",
                        "No P4 nonconference opponent in consecutive seasons (exceptions listed)"],
              "exceptions": [sorted(k) + [sorted(fixed_by_pair[k])] for k in sorted(exempt, key=sorted) if frozenset(k) not in locks],
              "protected_annual": sorted(sorted(k) for k in exempt if frozenset(k) in locks),
              "dropped_baseline_games": [{k: g[k] for k in ("Game ID", "Year", "Away", "Home", "Status", "Source URL")} for g in dropped],
              "new_games": [{k: g[k] for k in ("Game ID", "Year", "Away", "Home")} for g in added],
              "flipped_site": [{k: g[k] for k in ("Game ID", "Year", "Away", "Home")} for g in flipped], "seasons": []}
    final = []
    for y in years:
        games = [g for g in out if g["Year"] == y]
        dates = {g["Week"]: g["Date"] for g in base if g["Year"] == y}
        weeks, msg, pinned, secs = solve_year(games, teams, a.min_games_between, a.time_limit, locks)
        if weeks is None:
            sys.exit(f"{y}: week slotting infeasible — {msg}")
        moved = []
        for g, w in zip(games, weeks):
            orig = next((b for b in base if b["Game ID"] == g["Game ID"]), None)
            if orig and w != orig["Week"]:
                moved.append({"Game ID": g["Game ID"], "Away": g["Away"], "Home": g["Home"], "Type": g["Type"], "from": orig["Week"], "to": w})
            g["Week"], g["Date"], g["Week label"] = w, dates[w], f"Week {w}"
        viol = [t for t in teams if (lambda b: b[1] - b[0] - 1)(byes(games, t)) < a.min_games_between]
        print(f"{y}: weeks {msg} in {secs:.1f}s · baseline games moved {len(moved)} · bye violations {len(viol)}")
        report["seasons"].append({"season": y, "moved": moved, "bye_violations": len(viol), "byes": {t: byes(games, t) for t in teams}})
        final += games
    final.sort(key=lambda g: g["Game ID"])
    os.makedirs(os.path.join(ROOT, a.out), exist_ok=True)
    json.dump(final, open(os.path.join(ROOT, a.out, "cfb_full_games.json"), "w"), indent=1)
    json.dump(report, open(os.path.join(ROOT, a.out, "impact-report.json"), "w"), indent=1)
    print(f"nonconference: kept {len(kept)} · dropped {len(dropped)} · new pairings {len(added)} · flipped sites {len(flipped)} · exceptions {len(report['exceptions'])}")


if __name__ == "__main__":
    main()
