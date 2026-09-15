from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from html import unescape
from html.parser import HTMLParser

from ClimbingDashboard.Models.boulder_record import BoulderRecord
from ClimbingDashboard.Utilities.date_utils import parse_climbed_date


@dataclass
class ParsedCell:
    """HTML table cell extracted from TheTopo ascents."""

    text_parts: list[str] = field(default_factory=list)
    links: list[tuple[str, str]] = field(default_factory=list)

    @property
    def text(self) -> str:
        """Return normalized visible cell text."""

        return " ".join(part.strip() for part in self.text_parts if part.strip())


class TheTopoAscentsTableParser(HTMLParser):
    """Parse TheTopo ascent table rows from server-rendered HTML."""

    def __init__(self) -> None:
        """Create a parser for the boulder ascents table."""

        super().__init__(convert_charrefs=True)
        self.rows: list[list[ParsedCell]] = []
        self._in_ascent_table = False
        self._table_depth = 0
        self._in_row = False
        self._current_row: list[ParsedCell] = []
        self._current_cell: ParsedCell | None = None
        self._current_link_href: str | None = None
        self._current_link_text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = dict(attrs)
        if tag == "table" and "ascent-list" in (attrs_dict.get("class") or ""):
            self._in_ascent_table = True
            self._table_depth = 1
            return

        if self._in_ascent_table and tag == "table":
            self._table_depth += 1

        if not self._in_ascent_table:
            return

        if tag == "tr":
            self._in_row = True
            self._current_row = []
        elif tag in {"td", "th"} and self._in_row:
            self._current_cell = ParsedCell()
        elif tag == "a" and self._current_cell is not None:
            self._current_link_href = attrs_dict.get("href")
            self._current_link_text = []

    def handle_endtag(self, tag: str) -> None:
        if not self._in_ascent_table:
            return

        if tag == "a" and self._current_cell is not None and self._current_link_href:
            link_text = self._normalize_text(" ".join(self._current_link_text))
            self._current_cell.links.append((self._current_link_href, link_text))
            self._current_link_href = None
            self._current_link_text = []
        elif tag in {"td", "th"} and self._current_cell is not None:
            self._current_row.append(self._current_cell)
            self._current_cell = None
        elif tag == "tr":
            if self._current_row:
                self.rows.append(self._current_row)
            self._in_row = False
            self._current_row = []
        elif tag == "table":
            self._table_depth -= 1
            if self._table_depth <= 0:
                self._in_ascent_table = False

    def handle_data(self, data: str) -> None:
        if self._current_cell is None:
            return
        text = self._normalize_text(data)
        if not text:
            return
        self._current_cell.text_parts.append(text)
        if self._current_link_href is not None:
            self._current_link_text.append(text)

    def _normalize_text(self, value: str) -> str:
        return unescape(" ".join(value.split()))


class TheTopoParser:
    """Convert TheTopo ascent HTML into imported boulder ascents."""

    source = "thetopo"

    def parse_boulder_ascents(self, html: str) -> tuple[list[BoulderRecord], int]:
        """Parse boulder ascents and return imported ascents plus skipped rows."""

        table_parser = TheTopoAscentsTableParser()
        table_parser.feed(html)
        boulders: list[BoulderRecord] = []
        skipped_count = 0
        for row in table_parser.rows:
            if self._is_header_row(row):
                continue
            boulder = self._parse_row(row)
            if boulder is None:
                skipped_count += 1
                continue
            boulders.append(boulder)
        return boulders, skipped_count

    def _parse_row(self, row: list[ParsedCell]) -> BoulderRecord | None:
        if len(row) < 6:
            return None
        route_cell, grade_cell, crag_cell, type_cell, date_cell, ascent_type_cell = row[:6]
        if type_cell.text.strip().lower() != "boulder":
            return None

        name = self._route_name(route_cell)
        area = self._crag_name(crag_cell)
        if not name or not area:
            return None

        own_grade, grade_27crags = self._grades(grade_cell)
        climbed_on = self._date(date_cell.text)
        ascent_type = ascent_type_cell.text
        return BoulderRecord(
            name=name,
            grade_27crags=grade_27crags,
            guide_grade="",
            own_grade=own_grade,
            area=area,
            sector="",
            climber="",
            flash=ascent_type.strip().lower() == "flash",
            climbed_on=climbed_on,
            rating=None,
        )

    def _is_header_row(self, row: list[ParsedCell]) -> bool:
        return bool(row) and row[0].text.strip().lower() == "route"

    def _route_name(self, cell: ParsedCell) -> str:
        route_links = [
            text
            for href, text in cell.links
            if "/routes/" in href and text
        ]
        if not route_links:
            return ""
        return route_links[-1]

    def _crag_name(self, cell: ParsedCell) -> str:
        crag_links = [
            text
            for href, text in cell.links
            if href.startswith("/crags/") and "/routes/" not in href and text
        ]
        if crag_links:
            return crag_links[-1]
        return cell.text

    def _grades(self, cell: ParsedCell) -> tuple[str, str]:
        tokens = [
            token
            for token in cell.text.replace("(", " ").replace(")", " ").split()
            if not token.isdigit()
        ]
        if not tokens:
            return "", ""
        if len(tokens) == 1:
            grade = self._normalize_grade(tokens[0])
            return grade, grade
        return self._normalize_grade(tokens[0]), self._normalize_grade(tokens[-1])

    def _normalize_grade(self, value: str) -> str:
        return value.strip().lower()

    def _date(self, value: str) -> date | None:
        try:
            return parse_climbed_date(value.split()[0] if value else None)
        except ValueError:
            return None
