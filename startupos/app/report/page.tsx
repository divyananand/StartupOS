"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

export default function ReportsPage() {
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [pastreport, setPastReport] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false)
  const [selectedReport, setSelectedReport] = useState<any>(null)

  async function HandleGenerateReport() {
    setLoading(true);

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/report`, {
      method: "POST",
    });

    const data = await response.json();

    setReport(data.report);
    setLoading(false);
  }

  useEffect(() => {
    setHistoryLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/report`)
      .then((res) => res.json())
      .then((data) => {
        setPastReport(data);
        setHistoryLoading(false);
      });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-gray-900">
        Weekly Report
      </h1>

      <p className="mt-2 text-gray-600">
        Generate an AI-powered report summarizing your startup's documents,
        tasks, and overall progress.
      </p>

      <button
        onClick={HandleGenerateReport}
        disabled={loading}
        className="mt-8 bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate Report"}
      </button>

      {pastreport.length > 0 && (
  <div className="mt-8">
    <h2 className="text-xl font-semibold">
      Report History
    </h2>

    {pastreport.map((item, index) => (
      <div key={index}>
        <h3>{item.title}</h3>
        <p>{item.created_At}</p>
      </div>
    ))}
  </div>
)}

{pastreport.map((item, index) => (
  <div 
    key={index} 
    onClick={() => setSelectedReport(item)}
    className="border border-gray-200 rounded-lg p-4 mt-3 cursor-pointer hover:bg-gray-50"
  >
    <h3 className="font-medium text-gray-900">{item.title}</h3>
    <p className="text-sm text-gray-500">{item.created_At}</p>
  </div>
))}

{selectedReport && (
  <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
    <h2 className="text-xl font-semibold mb-4">{selectedReport.title}</h2>
    <div className="prose max-w-none text-gray-700">
      <ReactMarkdown>{selectedReport.content}</ReactMarkdown>
    </div>
  </div>
)}

      {loading && (
        <div className="mt-6">
          <p className="text-gray-600">
            Claude is generating your report...
          </p>
        </div>
      )}

      {report && (
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-semibold mb-4">
            Generated Report
          </h2>

          <div className="prose max-w-none text-gray-700">
            <ReactMarkdown>
              {report}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}