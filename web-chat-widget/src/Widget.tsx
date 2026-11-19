import {
  type FC,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  ChatApiError,
  ChatApiResponse,
  ChatMessage,
  WidgetConfig,
} from "./types";

interface WidgetProps {
  config: WidgetConfig;
}

export const Widget: FC<WidgetProps> = ({ config }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("chat_history");
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (item): item is ChatMessage =>
              typeof item === "object" &&
              item !== null &&
              typeof item.text === "string" &&
              typeof item.isUser === "boolean"
          );
        }
      }
    } catch {
      // Ignore JSON parse errors on invalid stored data
    }
    return [];
  });
  const [inputText, setInputText] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 400 : false
  );

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Track window resize for responsive width
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 400);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Auto-scroll messages container to bottom on message or typing change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const saveHistory = (newMessages: ChatMessage[]) => {
    try {
      localStorage.setItem("chat_history", JSON.stringify(newMessages));
    } catch {
      // Ignore storage write issues
    }
  };

  const openChat = () => {
    setIsOpen(true);
  };

  const closeChat = () => {
    setIsOpen(false);
    // Return focus to the launcher button per accessibility guidelines
    setTimeout(() => {
      buttonRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeChat();
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    const userMsg: ChatMessage = { text, isUser: true };
    const updatedWithUser = [...messages, userMsg];
    setMessages(updatedWithUser);
    saveHistory(updatedWithUser);
    setInputText("");
    setIsTyping(true);

    try {
      const res = await fetch(`${config.api}/web/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: config.sessionId, text }),
      });

      if (!res.ok) {
        let errorDetail = "Error de conexión";
        try {
          const errData = (await res.json()) as ChatApiError;
          if (errData && typeof errData.detail === "string") {
            errorDetail = errData.detail;
          }
        } catch {
          // Keep default error text
        }
        const errorMsg: ChatMessage = { text: errorDetail, isUser: false };
        const finalMessages = [...updatedWithUser, errorMsg];
        setMessages(finalMessages);
        saveHistory(finalMessages);
      } else {
        const data = (await res.json()) as ChatApiResponse;
        const newBotMsgs: ChatMessage[] = (data.replies || []).map((reply) => ({
          text: reply,
          isUser: false,
        }));
        const finalMessages = [...updatedWithUser, ...newBotMsgs];
        setMessages(finalMessages);
        saveHistory(finalMessages);
      }
    } catch {
      const netErrorMsg: ChatMessage = { text: "Error de conexión", isUser: false };
      const finalMessages = [...updatedWithUser, netErrorMsg];
      setMessages(finalMessages);
      saveHistory(finalMessages);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 9999,
        fontFamily: "sans-serif",
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Chat Launcher Button */}
      <button
        ref={buttonRef}
        type="button"
        aria-label="Abrir chat"
        onClick={openChat}
        style={{
          display: isOpen ? "none" : "block",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          backgroundColor: "#000",
          color: "#fff",
          border: "none",
          fontSize: "30px",
          cursor: "pointer",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}
      >
        💬
      </button>

      {/* Chat Panel */}
      <div
        style={{
          display: isOpen ? "flex" : "none",
          width: isMobile ? "90vw" : "350px",
          height: "500px",
          backgroundColor: "#fff",
          border: "1px solid #ccc",
          borderRadius: "10px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          flexDirection: "column",
          overflow: "hidden",
          marginBottom: "10px",
          position: "absolute",
          bottom: "70px",
          right: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: "#000",
            color: "#fff",
            padding: "15px",
            fontWeight: "bold",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{config.title}</span>
          <button
            type="button"
            aria-label="Cerrar chat"
            onClick={closeChat}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Messages List */}
        <div
          ref={messagesContainerRef}
          aria-live="polite"
          style={{
            flex: 1,
            padding: "15px",
            overflowY: "auto",
          }}
        >
          {messages.map((item, index) => (
            <div
              key={index}
              style={{
                marginBottom: "10px",
                padding: "10px",
                borderRadius: "10px",
                maxWidth: "80%",
                wordBreak: "break-word",
                backgroundColor: item.isUser ? "#dcf8c6" : "#f1f1f1",
                marginLeft: item.isUser ? "auto" : undefined,
                color: "#000",
              }}
            >
              {item.text}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div
              style={{
                color: "#888",
                fontSize: "12px",
                marginBottom: "10px",
              }}
            >
              Escribiendo...
            </div>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            borderTop: "1px solid #ccc",
            margin: 0,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            aria-label="Mensaje"
            placeholder="Escribe un mensaje..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              flex: 1,
              padding: "15px",
              border: "none",
              outline: "none",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "0 15px",
              backgroundColor: "#000",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
};
