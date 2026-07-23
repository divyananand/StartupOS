"use client";

import { useState,useEffect } from "react";
import ReactMarkdown from 'react-markdown'

export default function AskPage() {
  const [ask, setAsk] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading,setLoading] = useState(false);
  const [history,setHistory] = useState<any[]>([])

  async function HandleSubmit() {
    setLoading(true);
    const response = await fetch("http://localhost:8000/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: ask,
        history:history
      }),
    });

    const data = await response.json();
    setResult(data);
    setLoading(false);
    setHistory([...history,
      {role:"user",content:ask},
      {role:"assistant",content:data.answer}
    ])
  }

  async function HandleClear()
  {
    setHistory([])
    setResult(null)
    setAsk("")
  }

 return (
  <div className="max-w-4xl mx-auto px-6 py-8">
    <h1 className="text-3xl font-bold text-gray-900">Ask</h1>
    <p className="mt-2 text-gray-600">
      Ask questions about your startup, documents, tasks, or recent progress.
      StartupOS AI will answer based on the information you've stored.
    </p>

    <div className="mt-8">
      <textarea
        className="w-full min-h-[140px] border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900"
        placeholder="Ask anything about your startup..."
        value={ask}
        onChange={(e) => setAsk(e.target.value)}
      />
    </div>

    <div className="flex flex-wrap gap-2 mt-4">
      {[
        "What are our current blockers?",
        "What should we focus on this week?",
        "What decisions have we made?"
      ].map((suggestion) => (
        <button
          key={suggestion}
          onClick={() => setAsk(suggestion)}
          className="text-sm border border-gray-300 rounded-full px-4 py-2 text-gray-600 hover:bg-gray-100 transition cursor-pointer"
        >
          {suggestion}
        </button>
      ))}
    </div>

    <div className="flex gap-3 mt-6">
      <button
        type="button"
        onClick={HandleSubmit}
        className="bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-md text-sm font-medium transition"
      >
        Ask
      </button>

      <button
        type="button"
        onClick={HandleClear}
        className="border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 px-6 py-2 rounded-md text-sm font-medium transition"
      >
        Clear
      </button>
    </div>

    {loading && (
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-gray-600">Generating answer...</p>
      </div>
    )}

    {history.length > 0 && (
      <div className="mt-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Conversation
        </h2>

        <div className="space-y-4">
          {history.map((item, index) => (
            <div
              key={index}
              className={`rounded-lg p-4 ${
                item.role === "user"
                  ? "bg-gray-100"
                  : "bg-blue-50 border border-blue-100"
              }`}
            >
              <p className="text-xs font-medium text-gray-500 mb-2">
                {item.role === "user" ? "You" : "StartupOS AI"}
              </p>

              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown>
                  {item.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {result && (
      <div className="mt-10 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Latest Answer
        </h2>

        <div className="prose max-w-none text-gray-700">
          <ReactMarkdown>
            {result.answer}
          </ReactMarkdown>
        </div>
      </div>
    )}
  </div>
)
}