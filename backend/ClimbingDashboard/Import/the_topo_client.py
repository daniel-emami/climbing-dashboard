from __future__ import annotations

from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


class TheTopoClient:
    """HTTP client for public TheTopo climber pages."""

    base_url = "https://thetopo.com"

    def get_boulder_ascents_html(self, username: str) -> str:
        """Fetch the public boulder ascents page for one TheTopo username."""

        safe_username = quote(username.strip(), safe="")
        url = f"{self.base_url}/climbers/{safe_username}/ascents/boulder"
        request = Request(
            url,
            headers={"User-Agent": "climbing-dashboard-local-importer/0.1"},
        )
        try:
            with urlopen(request, timeout=20) as response:
                return response.read().decode("utf-8", errors="ignore")
        except HTTPError as exc:
            raise ValueError(f"TheTopo returned HTTP {exc.code} for {username}") from exc
        except URLError as exc:
            raise ValueError(f"Could not reach TheTopo: {exc.reason}") from exc
