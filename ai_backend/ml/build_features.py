import json
"""
ml/build_features.py
--------------------

Reads weightage_stats from Postgres and writes computed feature
rows into the ml_features table. Run this after every new paper
is processed, before retraining the model.

Usage:
  python3 build_features.py --exam-id <uuid>

What it computes per chapter per year:
  - Lag features      (previous 1 and 2 years' counts/weightage)
  - Rolling averages  (3-year and 5-year windows)
  - Linear trend      (slope over last 3 years — positive = growing)
  - Streak            (consecutive years chapter appeared)
  - Years since asked (0 = appeared this year, N = N years silent)
  - Gap years         (average gap between historical appearances)
  - Year num          (relative year index for the model)
"""

import argparse
import logging
import os
import sys

import numpy as np
import psycopg2
from psycopg2.extras import RealDictCursor

logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger(__name__)

DB_URL = os.environ.get("DATABASE_URL", "postgresql://localhost/shortnote")


# ─────────────────────────────────────────────────────────
#  Load raw weightage_stats for an exam
# ─────────────────────────────────────────────────────────

def load_weightage(exam_id: str) -> dict[str, list[dict]]:
    """
    Returns a dict keyed by chapter_id, each value being a list
    of weightage rows sorted by year ascending.
    """
    conn = psycopg2.connect(DB_URL, cursor_factory=RealDictCursor)
    cur  = conn.cursor()

    cur.execute(
        """
        SELECT
            ws.chapter_id,
            ws.year,
            ws.question_count::float  AS q_count,
            ws.total_marks::float     AS marks_total,
            ws.weightage_pct::float   AS weightage_pct
        FROM weightage_stats ws
        WHERE ws.exam_id = %s
        ORDER BY ws.chapter_id, ws.year ASC
        """,
        (exam_id,),
    )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    if not rows:
        raise ValueError(
            f"No weightage_stats found for exam {exam_id}. "
            "Process at least one question paper first."
        )

    # Group by chapter_id
    chapters: dict[str, list] = {}
    for row in rows:
        cid = str(row["chapter_id"])
        if cid not in chapters:
            chapters[cid] = []
        chapters[cid].append(dict(row))

    logger.info(
        f"Loaded {len(rows)} weightage rows for {len(chapters)} chapters"
    )
    return chapters


# ─────────────────────────────────────────────────────────
#  Compute features for one chapter across all its years
# ─────────────────────────────────────────────────────────

def compute_chapter_features(
    chapter_id: str,
    records: list[dict],
    min_year: int,
) -> list[dict]:
    """
    Given all historical weightage rows for one chapter (sorted
    by year), compute feature rows for every year that has at
    least one prior year of data (i.e. from index 1 onwards).

    Index 0 (the earliest year) is skipped — it has no lag features
    and would contribute zero signal to training.

    Returns a list of feature dicts ready for DB insertion.
    """
    feature_rows = []

    for i in range(1, len(records)):
        current = records[i]
        prior   = records[:i]        # all years before this one

        # ── Lag features ─────────────────────────────────
        q_lag1 = records[i - 1]["q_count"]       if i >= 1 else None
        q_lag2 = records[i - 2]["q_count"]       if i >= 2 else None
        w_lag1 = records[i - 1]["weightage_pct"] if i >= 1 else None

        # ── Rolling averages ──────────────────────────────
        tail3_q = [r["q_count"]       for r in prior[-3:]]
        tail3_w = [r["weightage_pct"] for r in prior[-3:]]

        q_roll3 = float(np.mean(tail3_q)) if tail3_q else None
        w_roll3 = float(np.mean(tail3_w)) if tail3_w else None

        # ── Linear trend over last 3 prior years ─────────
        # Positive slope = chapter is gaining importance
        # Negative slope = chapter is declining
        if len(tail3_q) >= 2:
            q_trend = float(
                np.polyfit(range(len(tail3_q)), tail3_q, 1)[0]
            )
        else:
            q_trend = 0.0

        # ── Streak: consecutive years with ≥1 question ───
        streak = 0
        for prev in reversed(prior):
            if prev["q_count"] > 0:
                streak += 1
            else:
                break

        # ── Years since last appeared ─────────────────────
        appeared = [r for r in prior if r["q_count"] > 0]
        if appeared:
            years_since = current["year"] - appeared[-1]["year"]
        else:
            years_since = 5    # default: never appeared = treat as 5-year gap

        # ── Average gap between historical appearances ────
        # NULL if chapter has only appeared once
        if len(appeared) >= 2:
            gaps      = [
                appeared[j + 1]["year"] - appeared[j]["year"]
                for j in range(len(appeared) - 1)
            ]
            gap_years = int(round(np.mean(gaps)))
        else:
            gap_years = None

        # ── Relative year index ───────────────────────────
        year_num = current["year"] - min_year

        feature_rows.append({
            "chapter_id":        chapter_id,
            "year":              current["year"],
            # raw signals
            "q_count":           current["q_count"],
            "marks_total":       current["marks_total"],
            "weightage_pct":     current["weightage_pct"],
            # lag
            "q_count_lag1":      q_lag1,
            "q_count_lag2":      q_lag2,
            "q_count_rolling3":  q_roll3,
            "weightage_lag1":    w_lag1,
            "weightage_rolling3": w_roll3,
            # pattern
            "q_trend":           q_trend,
            "streak_asked":      streak,
            "years_since_asked": years_since,
            "gap_years":         gap_years,
        })

    return feature_rows


# ─────────────────────────────────────────────────────────
#  Write feature rows to Postgres
# ─────────────────────────────────────────────────────────

def upsert_features(exam_id: str, feature_rows: list[dict]) -> int:
    conn = psycopg2.connect(DB_URL)
    cur  = conn.cursor()

    for row in feature_rows:
        cur.execute(
            """
            INSERT INTO ml_features (
                chapter_id, exam_id, year,
                q_count, marks_total, weightage_pct,
                q_count_lag1, q_count_lag2, q_count_rolling3,
                weightage_lag1, weightage_rolling3,
                q_trend, streak_asked, years_since_asked, gap_years
            )
            VALUES (
                %(chapter_id)s, %(exam_id)s, %(year)s,
                %(q_count)s, %(marks_total)s, %(weightage_pct)s,
                %(q_count_lag1)s, %(q_count_lag2)s, %(q_count_rolling3)s,
                %(weightage_lag1)s, %(weightage_rolling3)s,
                %(q_trend)s, %(streak_asked)s, %(years_since_asked)s, %(gap_years)s
            )
            ON CONFLICT (chapter_id, exam_id, year) DO UPDATE SET
                q_count             = EXCLUDED.q_count,
                marks_total         = EXCLUDED.marks_total,
                weightage_pct       = EXCLUDED.weightage_pct,
                q_count_lag1        = EXCLUDED.q_count_lag1,
                q_count_lag2        = EXCLUDED.q_count_lag2,
                q_count_rolling3    = EXCLUDED.q_count_rolling3,
                weightage_lag1      = EXCLUDED.weightage_lag1,
                weightage_rolling3  = EXCLUDED.weightage_rolling3,
                q_trend             = EXCLUDED.q_trend,
                streak_asked        = EXCLUDED.streak_asked,
                years_since_asked   = EXCLUDED.years_since_asked,
                gap_years           = EXCLUDED.gap_years,
                computed_at         = now()
            """,
            {**row, "exam_id": exam_id},
        )

    conn.commit()
    cur.close()
    conn.close()
    return len(feature_rows)


# ─────────────────────────────────────────────────────────
#  Main
# ─────────────────────────────────────────────────────────

def build_and_store(exam_id: str) -> int:
    logger.info(f"=== BUILD FEATURES  exam={exam_id} ===")

    # 1. Load weightage history
    chapters = load_weightage(exam_id)

    # Global min year across all chapters — used for year_num
    all_years = [
        r["year"]
        for records in chapters.values()
        for r in records
    ]
    min_year = min(all_years)

    # 2. Compute features per chapter
    all_feature_rows = []

    for chapter_id, records in chapters.items():
        if len(records) < 2:
            # Need at least 2 years to compute any lag feature
            # Chapter is kept but contributes nothing to training
            logger.debug(
                f"Skipping chapter {chapter_id} — only {len(records)} year(s) of data"
            )
            continue

        rows = compute_chapter_features(chapter_id, records, min_year)
        all_feature_rows.extend(rows)

    if not all_feature_rows:
        raise ValueError(
            "No feature rows computed. Need at least 2 years of data "
            "per chapter. Upload more past papers."
        )

    # 3. Write to Postgres
    total = upsert_features(exam_id, all_feature_rows)

    logger.info(
        f"=== FEATURES COMPLETE  {total} rows for "
        f"{len(chapters)} chapters ==="
    )
    return total


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build ML features from weightage_stats")
    parser.add_argument("--exam-id", required=True, help="Postgres exam UUID")
    args = parser.parse_args()

    try:
        total = build_and_store(args.exam_id)
        # Print row count to stdout for Express to read
        print(json.dumps({"features_written": total}))
    except Exception as e:
        logger.error(f"Feature build failed: {e}")
        sys.exit(1)