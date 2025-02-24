export interface IRoom {
  id: string;
  password: string;
  guidingQuestion: string;
  created: Date;
  participants: {
    userId: string;
    username: string;
    chatSessionId?: string; // Claude chat session ID
    hasSubmitted: boolean;
  }[];
  conclusions: {
    userId: string;
    conclusion: string;
    timestamp: Date;
  }[];
  comparisonChatId?: string; // Final Claude comparison chat session
  finalVerdict?: string;
  status: "active" | "comparing" | "completed";
}
