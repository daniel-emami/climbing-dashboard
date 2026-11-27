import sqlite3
from pathlib import Path

from ClimbingDashboard.Storage.sqlite_storage import SqliteStorage


def test_existing_grades_survive_upgrade_and_repeated_startup(tmp_path: Path) -> None:
    database_path = tmp_path / "legacy.db"
    with sqlite3.connect(database_path) as connection:
        connection.executescript(
            """
            CREATE TABLE boulder_problems (
                id INTEGER PRIMARY KEY, name TEXT, area TEXT, sector TEXT,
                created_at TEXT, updated_at TEXT
            );
            CREATE TABLE ascents (
                id INTEGER PRIMARY KEY, boulder_id INTEGER, user_id INTEGER,
                climber TEXT, grade_27crags TEXT, guide_grade TEXT, own_grade TEXT,
                flash INTEGER, climbed_on TEXT, rating INTEGER, visibility TEXT,
                created_at TEXT, updated_at TEXT
            );
            INSERT INTO boulder_problems VALUES (
                1, 'Legacy problem', 'Area', '', '2026-01-01', '2026-01-01'
            );
            INSERT INTO ascents VALUES (
                42, 1, NULL, 'climber', '6b+', '6b', '6c',
                1, '2026-01-01', 4, 'public', '2026-01-01', '2026-01-01'
            );
            """
        )

    for _ in range(2):
        records = SqliteStorage(database_path).read_boulders()
        assert len(records) == 1
        record = records[0]
        assert record.grade_thetopo == "6b+"
        assert record.own_grade == "6c"
        assert record.guide_grade == "6b"
        assert record.ascent_id == 42
        assert record.name == "Legacy problem"
        assert record.flash is True
        assert record.rating == 4
