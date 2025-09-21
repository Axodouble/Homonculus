export type OllamaMessage = {
  persistent: boolean;
  role: "user" | "assistant" | "system";
  content: string;
};
