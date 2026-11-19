"""Live smoke tests (need network + Edge). tmp cwd keeps edge_profile/ and raw_data/ out of the project."""
from tools.agent_tools import tool_analyze_structure, tool_handle_auth, tool_scrape_content

SITE = "https://quotes.toscrape.com/"


def test_analyze_structure(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    out = tool_analyze_structure.invoke({"url": SITE})
    assert "- [h1] Quotes to Scrape" in out and "- [h2] Top Ten tags" in out


def test_scrape_section(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    out = tool_scrape_content.invoke({"url": SITE, "sections_to_extract": "top ten tags"})
    files = sorted(p.name for p in (tmp_path / "raw_data").glob("*.md"))
    assert "Se guardaron 10 archivos" in out, out
    assert "love.md" in files and len(files) == 10
    love = (tmp_path / "raw_data" / "love.md").read_text(encoding="utf-8")
    assert love.startswith("# love") and f"{SITE}tag/love/" in love and len(love) > 500


def test_auth_rejects_non_http_url():
    assert "Error" in tool_handle_auth.invoke({"url": "--remote-debugging-port=9222"})
