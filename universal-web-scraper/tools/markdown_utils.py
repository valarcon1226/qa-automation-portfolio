from bs4 import BeautifulSoup
import markdownify

def html_to_markdown(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
        tag.decompose()
    return markdownify.markdownify(str(soup), heading_style="ATX").strip()
