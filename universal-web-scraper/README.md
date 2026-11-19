# Agentic Web Scraper (Powered by LangChain & Ollama)

This project demonstrates a fully autonomous AI Agent built with LangChain that uses a local LLM (`llama3.2` via Ollama) to autonomously browse, scrape, and consolidate information from the web.

## Architecture: ReAct Agent with Tool-Calling
Instead of a rigid script, this project features a single "Brain" (the Agent) equipped with 4 specialized Tools:
1. `tool_handle_auth`: Manually logs into platforms (like Coursera/LinkedIn) if required, saving session cookies.
2. `tool_analyze_structure`: Uses Scrapling (driving Microsoft Edge) to open the target URL, read the DOM, and map out the semantic structure (Headers/Sections).
3. `tool_scrape_content`: Receives specific section targets from the Agent, finds them by text, extracts all relevant links, navigates to them, and downloads the raw HTML as Markdown.
4. `tool_consolidate_information`: Reads the raw Markdown files and uses Ollama to deduplicate, clean, and consolidate the data into a professional `Final_Report.md`.

## Setup
1. Ensure Ollama is running locally with the `llama3.2` model installed (`ollama run llama3.2`).
2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage
Run the interactive console:
```bash
python main.py
```
The agent will prompt you for a URL and instructions in natural language. Example prompt:
*"Ve a la página, revisa la estructura, extrae únicamente las secciones 'MCS GUIDES & PUBLICATIONS' y 'RESUME/CV/COVER LETTER TEMPLATES', y consolida la información."*

The Agent will reason through the steps, call the necessary tools in order, and output a final report.
