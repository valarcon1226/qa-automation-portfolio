/**
 * Strongly-typed data models for the Sabor de Casa Web Chat Widget.
 * Strict TypeScript: no 'any' allowed.
 */

export interface ChatMessage {
  text: string;
  isUser: boolean;
}

export interface WidgetConfig {
  api: string;
  title: string;
  sessionId: string;
}

export interface ChatApiResponse {
  replies: string[];
}

export interface ChatApiError {
  detail?: string;
}
