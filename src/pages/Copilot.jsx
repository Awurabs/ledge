import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, Plus, MessageSquare } from "lucide-react";
import {
  useCopilotConversations,
  useCopilotMessages,
  useCreateConversation,
  useSendMessage,
} from "../hooks/useCopilot";

const SUGGESTED_PROMPTS = [
  "Analyze this month's spend",
  "Show pending approvals",
  "Flag policy violations",
  "Generate expense report",
  "Compare vs last quarter",
  "Show top vendors",
];

const WELCOME = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello! I'm Ledge AI, your financial intelligence assistant. I can help you analyze spend patterns, explain transactions, generate reports, and answer questions about your finances. What would you like to know?",
};

function cannedAIContent(input) {
  return `I'm analyzing your financial data for "${input}".\n\nBased on current trends, I can see strong growth in operational spend (+12.4% MoM) while staying within budget targets. Would you like me to dig deeper into any specific area or generate a detailed report?`;
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  const text = msg.content ?? msg.text ?? "";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-green-500 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm whitespace-pre-wrap">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
        <Bot size={14} className="text-green-600" />
      </div>
      <div className="max-w-[85%] bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap">
        {text}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
        <Bot size={14} className="text-green-600" />
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

export default function Copilot() {
  const [activeConvId, setActiveConvId] = useState(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);

  const { data: conversations = [], isLoading: convsLoading } = useCopilotConversations();
  const { data: dbMessages = [], isLoading: msgsLoading } = useCopilotMessages(activeConvId);
  const createConvMut = useCreateConversation();
  const sendMsgMut = useSendMessage();

  // Auto-select most recent conversation
  useEffect(() => {
    if (!activeConvId && conversations.length > 0) {
      setActiveConvId(conversations[0].id);
    }
  }, [conversations, activeConvId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dbMessages, isTyping]);

  const displayMessages = dbMessages.length === 0 && !msgsLoading
    ? [WELCOME]
    : dbMessages;

  const handleNewConversation = async () => {
    const conv = await createConvMut.mutateAsync("New Conversation");
    setActiveConvId(conv.id);
  };

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput("");

    // Ensure we have an active conversation
    let convId = activeConvId;
    if (!convId) {
      const conv = await createConvMut.mutateAsync(
        trimmed.length > 40 ? trimmed.slice(0, 40) + "…" : trimmed
      );
      convId = conv.id;
      setActiveConvId(convId);
    }

    // Persist user message
    await sendMsgMut.mutateAsync({ conversationId: convId, role: "user", content: trimmed });

    // Simulate AI typing then persist AI response
    setIsTyping(true);
    setTimeout(async () => {
      setIsTyping(false);
      await sendMsgMut.mutateAsync({
        conversationId: convId,
        role: "assistant",
        content: cannedAIContent(trimmed),
      });
    }, 1200);
  };

  return (
    <div className="flex gap-4" style={{ height: "calc(100vh - 56px - 4rem)" }}>
      {/* Sidebar: conversation list */}
      <div className="w-52 flex-shrink-0 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-3 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chats</span>
          <button
            onClick={handleNewConversation}
            disabled={createConvMut.isPending}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            title="New conversation"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {convsLoading ? (
            <div className="space-y-2 p-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4 px-2">
              Start a new conversation
            </p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`w-full text-left px-2 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                  conv.id === activeConvId
                    ? "bg-green-50 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <MessageSquare size={12} className="flex-shrink-0" />
                <span className="truncate">{conv.title}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex flex-col flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-white shrink-0">
          <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Ledge AI</h2>
            <p className="text-xs text-gray-500">Ask anything about your finances</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-green-600 font-medium bg-green-50 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Online
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {msgsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? "" : "justify-end"}`}>
                  <div className={`h-12 w-64 rounded-2xl animate-pulse ${i % 2 === 0 ? "bg-gray-100" : "bg-green-100"}`} />
                </div>
              ))}
            </div>
          ) : (
            displayMessages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))
          )}
          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts */}
        <div className="px-6 py-3 border-t border-gray-50 flex gap-2 flex-wrap shrink-0">
          <Sparkles size={13} className="text-gray-400 mt-0.5 shrink-0" />
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="text-xs bg-gray-50 hover:bg-green-50 hover:text-green-700 text-gray-600 border border-gray-200 hover:border-green-200 rounded-full px-3 py-1 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="px-4 py-4 border-t border-gray-200 shrink-0">
          <div className="flex items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Ask Ledge AI about your finances…"
              rows={1}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || sendMsgMut.isPending || isTyping}
              className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
