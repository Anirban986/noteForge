"""
ml/ml_predictor.py 
----------------------------
Fix: year_num is not stored in ml_features table.
     It is now computed on the fly in build_X() instead of
     being read from the DB as a column.
"""

import argparse
import json
import logging
import os
import sys
import warnings

import joblib
import numpy as np
import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.multioutput import MultiOutputRegressor
from sklearn.model_selection import cross_val_score

warnings.filterwarnings("ignore")

logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger(__name__)

DB_URL    = os.environ.get("DATABASE_URL", "postgresql://localhost/shortnote")
MODEL_DIR = os.environ.get("MODEL_DIR", os.path.join(os.path.dirname(__file__), "models"))

os.makedirs(MODEL_DIR, exist_ok=True)

# ─────────────────────────────────────────────────────────
#  Feature columns — read from ml_features table
#  year_num is NOT here — it's computed on the fly in build_X()
# ─────────────────────────────────────────────────────────

FEATURE_COLS = [
    "q_count_lag1",
    "q_count_lag2",
    "q_count_rolling3",
    "weightage_lag1",
    "weightage_rolling3",
    "q_trend",
    "streak_asked",
    "years_since_asked",
    "gap_years",
]

TARGET_COLS = [
    "q_count",
    "marks_total",
    "weightage_pct",
]


# ─────────────────────────────────────────────────────────
#  DB helpers
# ─────────────────────────────────────────────────────────

def get_connection():
    return psycopg2.connect(DB_URL, cursor_factory=RealDictCursor)


def load_features(exam_id: str) -> pd.DataFrame:
    conn = get_connection()
    cur  = conn.cursor()

    cur.execute(
        """
        SELECT
            mf.chapter_id,
            mf.year,
            mf.q_count,
            mf.marks_total,
            mf.weightage_pct,
            mf.q_count_lag1,
            mf.q_count_lag2,
            mf.q_count_rolling3,
            mf.weightage_lag1,
            mf.weightage_rolling3,
            mf.q_trend,
            mf.streak_asked,
            mf.years_since_asked,
            mf.gap_years,
            c.name  AS chapter_name,
            s.name  AS subject_name
        FROM ml_features mf
        JOIN chapters c ON mf.chapter_id = c.id
        JOIN subjects  s ON c.subject_id  = s.id
        WHERE mf.exam_id = %s
        ORDER BY mf.chapter_id, mf.year
        """,
        (exam_id,),
    )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    if not rows:
        raise ValueError(
            f"No ml_features rows found for exam {exam_id}. "
            "Run build_features.py first."
        )

    df = pd.DataFrame([dict(r) for r in rows])
    logger.info(f"Loaded {len(df)} feature rows for {df['chapter_id'].nunique()} chapters")
    return df


def load_latest_features_per_chapter(exam_id: str) -> pd.DataFrame:
    conn = get_connection()
    cur  = conn.cursor()

    cur.execute(
        """
        SELECT DISTINCT ON (mf.chapter_id)
            mf.chapter_id,
            mf.year                AS last_year,
            mf.q_count,
            mf.marks_total,
            mf.weightage_pct,
            mf.q_count_lag1,
            mf.q_count_lag2,
            mf.q_count_rolling3,
            mf.weightage_lag1,
            mf.weightage_rolling3,
            mf.q_trend,
            mf.streak_asked,
            mf.years_since_asked,
            mf.gap_years,
            c.name  AS chapter_name,
            s.name  AS subject_name
        FROM ml_features mf
        JOIN chapters c ON mf.chapter_id = c.id
        JOIN subjects  s ON c.subject_id  = s.id
        WHERE mf.exam_id = %s
        ORDER BY mf.chapter_id, mf.year DESC
        """,
        (exam_id,),
    )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    return pd.DataFrame([dict(r) for r in rows])


def save_predictions(exam_id: str, predict_year: int, predictions: list, model_version: str):
    conn = psycopg2.connect(DB_URL)
    cur  = conn.cursor()

    for p in predictions:
        cur.execute(
            """
            INSERT INTO predictions (
                chapter_id, exam_id, predicted_year,
                predicted_q_count, predicted_marks, predicted_weightage,
                confidence_score, model_version
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (chapter_id, exam_id, predicted_year) DO UPDATE SET
                predicted_q_count   = EXCLUDED.predicted_q_count,
                predicted_marks     = EXCLUDED.predicted_marks,
                predicted_weightage = EXCLUDED.predicted_weightage,
                confidence_score    = EXCLUDED.confidence_score,
                model_version       = EXCLUDED.model_version,
                generated_at        = now()
            """,
            (
                p["chapter_id"], exam_id, predict_year,
                p["predicted_q_count"], p["predicted_marks"],
                p["predicted_weightage"], p["confidence_score"],
                model_version,
            ),
        )

    conn.commit()
    cur.close()
    conn.close()
    logger.info(f"Saved {len(predictions)} predictions for year {predict_year}")


# ─────────────────────────────────────────────────────────
#  Feature helpers
# ─────────────────────────────────────────────────────────

def build_X(df: pd.DataFrame, min_year: int, predict_year: int = None) -> np.ndarray:
    """
    Build feature matrix.
    year_num is computed here on the fly — not read from DB.
    """
    X = df[FEATURE_COLS].copy()

    # Compute year_num on the fly
    if predict_year is not None:
        # Prediction mode — override with the future year
        X["year_num"] = predict_year - min_year
    else:
        # Training mode — use the row's own year
        X["year_num"] = df["year"] - min_year

    X = X.fillna(0)
    return X.values


def confidence_score(row: pd.Series) -> float:
    streak      = row.get("streak_asked",    0) or 0
    years_since = row.get("years_since_asked", 5) or 5
    gap         = row.get("gap_years",        0) or 0

    base  = 0.4
    base += min(streak * 0.08, 0.32)
    base -= min(years_since * 0.05, 0.20)
    base -= min(gap * 0.03, 0.12)

    return round(max(0.05, min(base, 1.0)), 2)


# ─────────────────────────────────────────────────────────
#  TRAIN
# ─────────────────────────────────────────────────────────

def train(exam_id: str, exam_name: str) -> dict:
    logger.info(f"=== TRAINING START  exam={exam_name} ===")

    df = load_features(exam_id)

    n_samples  = len(df)
    n_chapters = df["chapter_id"].nunique()

    if n_samples < 4:
        raise ValueError(
            f"Only {n_samples} training samples. Need at least 4. "
            "Upload more past papers."
        )

    min_year = int(df["year"].min())

    # year_num column added here via build_X
    X = build_X(df, min_year)
    y = df[TARGET_COLS].fillna(0).values

    # All features including year_num
    all_feature_cols = FEATURE_COLS + ["year_num"]

    base_estimator = GradientBoostingRegressor(
        n_estimators=300,
        max_depth=3,
        learning_rate=0.05,
        subsample=0.8,
        min_samples_leaf=2,
        random_state=42,
    )

    model = MultiOutputRegressor(base_estimator, n_jobs=-1)
    model.fit(X, y)

    # Cross-validation
    cv_results = {}
    n_folds    = min(3, n_samples // 5)

    if n_folds >= 2:
        for target in TARGET_COLS:
            scores = cross_val_score(
                MultiOutputRegressor(
                    GradientBoostingRegressor(n_estimators=100, max_depth=3, random_state=42)
                ),
                X, y,
                cv=n_folds,
                scoring="neg_mean_absolute_error",
            )
            mae = round(float(-scores.mean()), 3)
            std = round(float(scores.std()), 3)
            cv_results[target] = {"mae": mae, "std": std}
            logger.info(f"  CV MAE [{target}]: {mae} ± {std}")
    else:
        logger.warning("Too few samples for cross-validation — skipping")

    # Feature importances
    importances = np.mean(
        [est.feature_importances_ for est in model.estimators_], axis=0
    )
    feat_imp = {
        col: round(float(imp), 4)
        for col, imp in sorted(
            zip(all_feature_cols, importances),
            key=lambda x: -x[1],
        )
    }

    # Save
    model_version = f"gbm_v1_{exam_id[:8]}"
    model_path    = os.path.join(MODEL_DIR, f"model_{exam_id}.pkl")
    meta_path     = os.path.join(MODEL_DIR, f"meta_{exam_id}.json")

    joblib.dump(model, model_path)

    meta = {
        "exam_id":             exam_id,
        "exam_name":           exam_name,
        "model_version":       model_version,
        "train_samples":       n_samples,
        "chapters":            n_chapters,
        "min_year":            min_year,
        "max_year":            int(df["year"].max()),
        "feature_cols":        all_feature_cols,
        "target_cols":         TARGET_COLS,
        "cv_results":          cv_results,
        "feature_importances": feat_imp,
    }

    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    logger.info(f"=== TRAINING COMPLETE ===")
    return meta


# ─────────────────────────────────────────────────────────
#  PREDICT
# ─────────────────────────────────────────────────────────

def predict(exam_id: str, predict_year: int) -> list:
    logger.info(f"=== PREDICTION START  exam={exam_id}  year={predict_year} ===")

    model_path = os.path.join(MODEL_DIR, f"model_{exam_id}.pkl")
    meta_path  = os.path.join(MODEL_DIR, f"meta_{exam_id}.json")

    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"No trained model for exam {exam_id}. Run --train first."
        )

    model = joblib.load(model_path)

    with open(meta_path) as f:
        meta = json.load(f)

    min_year      = meta["min_year"]
    model_version = meta["model_version"]

    df = load_latest_features_per_chapter(exam_id)

    if df.empty:
        raise ValueError(f"No features found for exam {exam_id}.")

    logger.info(f"Predicting for {len(df)} chapters")

    # Build prediction matrix with year_num = predict_year - min_year
    X_pred = build_X(df, min_year, predict_year=predict_year)

    raw_preds = model.predict(X_pred)

    results = []
    for i, (_, row) in enumerate(df.iterrows()):
        pred_q_count   = max(0.0, float(raw_preds[i][0]))
        pred_marks     = max(0.0, float(raw_preds[i][1]))
        pred_weightage = max(0.0, float(raw_preds[i][2]))
        conf           = confidence_score(row)

        results.append({
            "chapter_id":          str(row["chapter_id"]),
            "chapter_name":        row["chapter_name"],
            "subject_name":        row["subject_name"],
            "predicted_year":      predict_year,
            "predicted_q_count":   round(pred_q_count,   1),
            "predicted_marks":     round(pred_marks,      1),
            "predicted_weightage": round(pred_weightage,  2),
            "confidence_score":    conf,
            "model_version":       model_version,
            "last_year":           int(row.get("last_year", 0)),
            "historical_avg_q":    round(float(row.get("q_count_rolling3", 0) or 0), 1),
            "trend":               round(float(row.get("q_trend", 0) or 0), 2),
        })

    results.sort(key=lambda x: x["predicted_weightage"], reverse=True)
    logger.info(f"=== PREDICTION COMPLETE  {len(results)} chapters ===")
    return results


# ─────────────────────────────────────────────────────────
#  CLI
# ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ShortNote ML Predictor")
    parser.add_argument("--exam-id",      required=True)
    parser.add_argument("--exam-name",    default="Unknown")
    parser.add_argument("--train",        action="store_true")
    parser.add_argument("--predict-year", type=int, dest="predict_year")
    parser.add_argument("--save-to-db",   action="store_true")
    args = parser.parse_args()

    if not args.train and not args.predict_year:
        parser.error("Provide --train or --predict-year or both")

    if args.train:
        try:
            meta = train(args.exam_id, args.exam_name)
            print(json.dumps(meta, indent=2))
        except Exception as e:
            logger.error(f"Training failed: {e}")
            sys.exit(1)

    if args.predict_year:
        try:
            predictions = predict(args.exam_id, args.predict_year)

            if args.save_to_db:
                model_version = predictions[0]["model_version"] if predictions else "unknown"
                save_predictions(
                    exam_id=args.exam_id,
                    predict_year=args.predict_year,
                    predictions=predictions,
                    model_version=model_version,
                )

            print(json.dumps(predictions, indent=2))

        except FileNotFoundError as e:
            logger.error(str(e))
            sys.exit(1)
        except Exception as e:
            logger.error(f"Prediction failed: {e}")
            sys.exit(1)