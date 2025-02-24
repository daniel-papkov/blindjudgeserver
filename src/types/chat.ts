export interface IChatSession {
  id: string;
  roomId: string;
  userId: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  }>;
  status: "active" | "concluded";
  conclusion?: string;
  created: Date;
}
