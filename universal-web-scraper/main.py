import os
from langchain_ollama import ChatOllama
from langgraph.prebuilt import create_react_agent
from tools.agent_tools import (
    tool_handle_auth,
    tool_analyze_structure,
    tool_scrape_content,
    tool_consolidate_information
)

def create_agent():
    print("[*] Iniciando el cerebro del Agente (Ollama: Llama3.2)...")
    
    # Inicializa el modelo local
    llm = ChatOllama(model="llama3.2", temperature=0)
    
    # Definir las herramientas disponibles para el agente
    tools = [
        tool_handle_auth,
        tool_analyze_structure,
        tool_scrape_content,
        tool_consolidate_information
    ]
    
    # Sistema de instrucciones estricto para forzar el uso de herramientas
    system_prompt = (
        "You are an autonomous Web Scraping Agent. "
        "You CANNOT browse the web yourself. You MUST use the provided tools to interact with websites. "
        "Always follow this sequence: "
        "1. Use 'tool_analyze_structure' to find what sections exist. "
        "2. Use 'tool_scrape_content' to download the requested sections. "
        "3. Use 'tool_consolidate_information' to process the downloaded files. "
        "Do NOT hallucinate information. If you haven't used the scrape tool, you don't have the data."
    )
    
    # Inicializa el agente moderno usando LangGraph (sin state_modifier que fallaba en esta versión)
    agent_executor = create_react_agent(llm, tools)
    
    return agent_executor, system_prompt

def interactive_prompt():
    print("=" * 60)
    print("      UNIVERSAL WEB SCRAPER AGENT (Powered by Llama3.2)     ")
    print("=" * 60)
    
    url = input("\n[1] Ingresa la URL objetivo: ").strip()
    if not url:
        print("La URL es requerida. Saliendo...")
        return
        
    auth_needed = input("[2] ¿Esta página requiere iniciar sesión manualmente? (s/n): ").strip().lower()
    
    instructions = input("\n[3] Escribe exactamente qué quieres hacer (ej. 'Extrae los templates y las guías. Luego consolida la información'):\n> ").strip()
    
    agent, system_prompt = create_agent()
    
    task_input = f"Tu objetivo es scrapear la URL: {url}\nInstrucciones del usuario: {instructions}\n"
    if auth_needed == 's':
        task_input += "IMPORTANTE: Primero debes usar tool_handle_auth porque la página requiere iniciar sesión.\n"
        
    task_input += "Usa tus herramientas en el orden correcto para cumplir la misión. Al final, SIEMPRE usa tool_consolidate_information. Piensa en español."
    
    print("\n[!] Agente Desplegado. Observa su razonamiento...\n")
    try:
        # Pasamos el system_prompt como el primer mensaje del historial
        response = agent.invoke({"messages": [
            ("system", system_prompt),
            ("user", task_input)
        ]})
        
        print("\n[+] Respuesta Final del Agente:")
        print(response["messages"][-1].content)
        print("\n[+] ¡Misión Cumplida! Revisa el archivo Final_Report.md si se ejecutó la consolidación.")
    except Exception as e:
        print(f"\n[x] El agente encontró un error crítico: {e}")

if __name__ == "__main__":
    interactive_prompt()
