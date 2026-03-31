import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Sparkles } from "lucide-react";

const initialMessages = [
  {
    id: 1, role: "ai",
    content: null,
    table: null,
    text: "Hello! I'm Ledge AI, your financial intelligence assistant. I can help you analyze spend patterns, explain transactions, generate reports, and answer questions about your finances. What would you like to know?",
  },
  {
    id: 2, role: "user",
    text: "What's our biggest expense category this month?",
  },
  {
    id: 3, role: "ai",
    text: "Based on your March 2026 data, here are your top expense categories:",
    table: {
      headers: ["Category", "Amount", "% of Total", "vs Last Month"],
      rows: [
        ["Salaries & Benefits", "$180,000", "40.0%", "+9.1% ↑"],
        ["SaaS & Technology", "$89,400", "19.9%", "+13.6% ↑"],
        ["Travel", "$67,200", "14.9%", "+18.4% ↑"],
        ["Marketing", "$42,000", "9.3%", "+9.1% ↑"],
      ],
    },
    postText: "Salaries are your largest category at 40%. Your SaaS spend has increased 13.6% vs last month — would you like me to identify which tools are driving that growth?",
  },
  {
    id: 4, role: "user",
    text: "Yes, break down the SaaS spend",
  },
  {
    id: 5, role: "ai",
    text: "Here's your SaaS spend breakdown for March 2026:",
    table: {
      headers: ["Tool", "Monthly Cost", "Seats", "Cost/Seat", "Trend"],
      rows: [
        ["Salesforce", "$38,900", "42", "$926", "+5.2% ↑"],
        ["AWS", "$22,100", "—", "—", "+18.4% ↑"],
        ["Google Workspace", "$12,800", "85", "$151", "0% →"],
        ["Zoom", "$7,200", "85", "$85", "0% →"],
        ["Slack", "$4,800", "85", "$56", "0% →"],
        ["Other (12 tools)", "$3,600", "—", "—", "+2.1% ↑"],
      ],
    },
    postText: "⚠️ I noticed 8 Salesforce seats (19%) haven't been used in 90+ days. At $926/seat, that's $7,408/month in potential savings.",
  },
];

const suggestedPrompts = [
  "Analyze this month's spend",
  "Show pending approvals",
  "Flag policy violations",
  "Generate expense report",
  "Compare vs last quarter",
  "Show top vendors",
];

const cannedResponse = (input) => ({
  id: Date.now() + 1,
  role: "ai",
  text: `I'm analyzing your financial data for "${input}"...`,
  table: null,
  postText: "Based on current trends, I can see strong growth in operational spend (+12.4% MoM) while staying within budget targets. Would you like me to dig deeper into any specific area or generate a detailed report?",
});

function MessageBubble({ msg }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-green-500 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm">
          {msg.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
        <Bot size={14} className="text-green-600" />
      </div>
      <div className="max-w-[85%] bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800">
        {msg.text && <p className="mb-2">{msg.text}</p>}
        {msg.table && (
          <div className="overflow-x-auto rounded-md border border-gray-100 my-2">
            <table className="text-xs w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {msg.table.headers.map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {msg.table.rows.map((row, i) => (
                  <tr key={i} className={`border-b border-gray-50 ${i % 2 === 1 ? "bg-gray-50/50" : ""}`}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 tabular-nums text-gray-700 whitespace-nowrap">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {msg.postText && <p className="mt-2 text-gray-700">{msg.postText}</p>}
      </div>
    </div>
  );
}

export default function Copilot() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = (text) => {
    if (!text.trim()) return;
    const userMsg = { id: Date.now(), role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, cannedResponse(text.trim())]);
    }, 1200);
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px - 4rem)" }}>
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
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {isTyping && (
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
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts */}
        <div className="px-6 py-3 border-t border-gray-50 flex gap-2 flex-wrap shrink-0">
          <Sparkles size={13} className="text-gray-400 mt-0.5 shrink-0" />
          {suggestedPrompts.map((p) => (
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
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Ask Ledge AI about your finances..."
              rows={1}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
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
