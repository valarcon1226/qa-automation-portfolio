import datetime
import json
import pytest
from playwright.sync_api import Page, expect


def test_keyboard_navigation(page: Page):
    page.goto("http://localhost:8004/widget/demo/index.html")

    btn = page.get_by_role("button", name="Abrir chat")
    btn.focus()
    expect(btn).to_be_focused()

    btn.press("Enter")

    input = page.get_by_role("textbox", name="Mensaje")
    expect(input).to_be_focused()

    input.fill("test")
    input.press("Enter")

    expect(page.locator("text=Escribiendo...")).to_be_hidden(timeout=10000)

    input.press("Escape")
    expect(btn).to_be_focused()


def test_ask_menu(page: Page):
    page.goto("http://localhost:8004/widget/demo/index.html")
    btn = page.get_by_role("button", name="Abrir chat")
    btn.click()

    input = page.get_by_role("textbox", name="Mensaje")
    input.fill('{"tool": "get_menu", "arguments": {}}')
    input.press("Enter")

    # Just asserting text nodes since there's no class
    expect(page.locator("text=Escribiendo...")).to_be_hidden(timeout=10000)
    expect(page.locator("text=Ajiaco").last).to_be_visible(timeout=10000)


def test_make_reservation(page: Page):
    page.goto("http://localhost:8004/widget/demo/index.html")
    btn = page.get_by_role("button", name="Abrir chat")
    btn.click()

    input = page.get_by_role("textbox", name="Mensaje")

    t = datetime.date.today() + datetime.timedelta(days=1)
    if t.weekday() == 0:
        t += datetime.timedelta(days=1)
    res_date = t.isoformat()

    script = f'{{"tool": "create_reservation", "arguments": {{"date": "{res_date}", "time": "19:00", "party_size": 2}}}}'
    input.fill(script)
    input.press("Enter")

    expect(page.locator("text=Escribiendo...")).to_be_hidden(timeout=10000)
    expect(page.locator("text=reservation").last).to_be_visible(timeout=10000)

    assert len(pytest.fake_db.reservations) > 0
    res = list(pytest.fake_db.reservations.values())[-1]
    assert res.party_size == 2


def test_send_message_button_click(page: Page):
    """Verifies sending messages using the 'Enviar' button and input clearing."""
    page.goto("http://localhost:8004/widget/demo/index.html")
    btn = page.get_by_role("button", name="Abrir chat")
    btn.click()

    input_box = page.get_by_role("textbox", name="Mensaje")
    send_btn = page.get_by_role("button", name="Enviar")

    input_box.fill("Hola asistente, ¿qué tal?")
    send_btn.click()

    # Input should be cleared immediately
    expect(input_box).to_have_value("")

    # User message should be rendered in the chat panel
    expect(page.locator("text=Hola asistente, ¿qué tal?")).to_be_visible(timeout=5000)

    # Typing indicator should disappear when reply arrives
    expect(page.locator("text=Escribiendo...")).to_be_hidden(timeout=10000)

    # LocalStorage history should contain the message
    history = page.evaluate("() => localStorage.getItem('chat_history')")
    assert history is not None
    assert "Hola asistente, ¿qué tal?" in history


def test_network_connection_error(page: Page):
    """Verifies widget gracefully handles network failures/aborts with friendly error."""
    page.goto("http://localhost:8004/widget/demo/index.html")
    btn = page.get_by_role("button", name="Abrir chat")
    btn.click()

    # Abort requests to simulate loss of internet connection
    page.route("**/web/chat", lambda route: route.abort())

    input_box = page.get_by_role("textbox", name="Mensaje")
    input_box.fill("Mensaje con falla de red")
    input_box.press("Enter")

    # Typing indicator must be removed
    expect(page.locator("text=Escribiendo...")).to_be_hidden(timeout=5000)

    # Connection error message must be displayed to the user
    expect(page.locator("text=Error de conexión").last).to_be_visible(timeout=5000)

    # Cleanup route
    page.unroute("**/web/chat")


def test_server_http_error_response(page: Page):
    """Verifies widget extracts detail from HTTP error responses (e.g. 500/503)."""
    page.goto("http://localhost:8004/widget/demo/index.html")
    btn = page.get_by_role("button", name="Abrir chat")
    btn.click()

    error_payload = json.dumps({"detail": "Servicio temporalmente no disponible"})
    page.route(
        "**/web/chat",
        lambda route: route.fulfill(
            status=503,
            content_type="application/json",
            body=error_payload,
        ),
    )

    input_box = page.get_by_role("textbox", name="Mensaje")
    input_box.fill("Mensaje con error de servicio")
    input_box.press("Enter")

    expect(page.locator("text=Escribiendo...")).to_be_hidden(timeout=5000)
    expect(
        page.locator("text=Servicio temporalmente no disponible").last
    ).to_be_visible(timeout=5000)

    page.unroute("**/web/chat")


def test_close_button_returns_focus(page: Page):
    """Verifies clicking the close button ✕ closes panel and returns focus to launcher."""
    page.goto("http://localhost:8004/widget/demo/index.html")
    btn = page.get_by_role("button", name="Abrir chat")
    btn.click()

    close_btn = page.get_by_role("button", name="Cerrar chat")
    expect(close_btn).to_be_visible()
    close_btn.click()

    # Launcher button becomes visible again and receives focus
    expect(btn).to_be_visible()
    expect(btn).to_be_focused()


def test_admin_panel(page: Page):
    page.goto("http://localhost:8004/admin")

    page.set_input_files(
        'input[name="file"]',
        {
            "name": "test_oferta.md",
            "mimeType": "text/markdown",
            "buffer": b"# Oferta Especial\nHoy tenemos pizza gratis.",
        },
    )

    messages = []
    page.on("dialog", lambda dialog: (messages.append(dialog.message), dialog.accept()))

    page.click('button[type="submit"]')
    page.wait_for_timeout(1000)
    assert "Falta el token" in "".join(messages) or "401" in "".join(messages)

    page.fill('input[name="token"]', "test_dev_api_key")
    messages.clear()
    page.click('button[type="submit"]')
    page.wait_for_timeout(1000)

    import os

    knowledge_dir = os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "whatsapp-restaurant-assistant",
        "knowledge",
    )
    test_file = os.path.join(knowledge_dir, "test_oferta.md")
    assert os.path.exists(test_file)
    os.remove(test_file)
