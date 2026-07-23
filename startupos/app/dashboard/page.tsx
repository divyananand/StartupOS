"use client";

import { useState, useEffect } from "react";
import { getStatusStyle } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

// const recentActivity = [
//   {
//     action: "Task created",
//     time: "2 minutes ago",
//   },
//   {
//     action: "Document uploaded",
//     time: "15 minutes ago",
//   },
//   {
//     action: "AI agent generated insights",
//     time: "1 hour ago",
//   },
//   {
//     action: "Team member added",
//     time: "3 hours ago",
//   },
// ];

function SkeletonCard() {
  return (
    <div className="p-6 border-r border-gray-200">
      <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-3"></div>
      <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mb-2"></div>
      <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
    </div>
  );
}

export default function dashboard() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [blockers, setBlockers] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchDocuments() {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents`)
      .then((res) => res.json())
      .then((data) => setDocuments(data));
  }

  async function fetchTasks() {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks`)
      .then((res) => res.json())
      .then((data) => setTasks(data));
  }

  useEffect(() => {
    setLoading(true);
    console.log("fetching now");

    Promise.all([
  fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents`).then((res) => res.json()),
  fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks`).then((res) => res.json()),
  fetch(`${process.env.NEXT_PUBLIC_API_URL}/blockers`).then((res) => res.json()),
  fetch(`${process.env.NEXT_PUBLIC_API_URL}/decisions`).then((res) => res.json()),
  fetch(`${process.env.NEXT_PUBLIC_API_URL}/report`).then((res) => res.json()),
]).then(([docsData, tasksData, blockersData, decisionsData, reportsData]) => {
      setDocuments(docsData);
      setTasks(tasksData);
      setBlockers(blockersData);
      setDecisions(decisionsData);
      setReports(reportsData);
      setLoading(false);
    });
  }, []);

  const highPriorityTasks = tasks.filter(
    (task) => task.priority === "high"
  );

  const completedTasks = tasks.filter(
    (task) => task.status === "done"
  );

  const openBlockers = blockers.filter(
    (blocker) => blocker.status === "open"
  );
  const progressPercentage = tasks.length === 0 ? 0 : Math.round((completedTasks.length / tasks.length) * 100)

  return (
    <div>
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Good morning, Divyan</h1>
        <p className="text-gray-500 text-sm mt-1">Here's what's happening with your startup today.</p>
      </div>
      {loading ? (
        <div className="grid grid-cols-6 border-t border-gray-200 mt-12">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-6 border-t border-gray-200 mt-12">
            <div className="p-6 border-r border-gray-200">
              <p className="text-sm text-gray-500">Tasks</p>
              <p className="text-3xl font-bold">{tasks.length}</p>

              {tasks.length === 0 ? (
                <p className="text-sm text-gray-400 mt-1">
                  No tasks yet
                </p>
              ) : (
                <>
                  <p className="text-sm text-gray-400 mt-1">
                    {highPriorityTasks.length} high priority
                  </p>

                  <p className="text-sm text-gray-400">
                    {completedTasks.length} completed
                  </p>
                </>
              )}
            </div>

            <div className="p-6 border-r border-gray-200">
              <p className="text-sm text-gray-500">Documents</p>
              <p className="text-3xl font-bold">{documents.length}</p>
            </div>

            <div className="p-6 border-r border-gray-200">
              <p className="text-sm text-gray-500">Blockers</p>
              <p className="text-3xl font-bold">{blockers.length}</p>

              {blockers.length === 0 ? (
                <p className="text-sm text-gray-400 mt-1">
                  No blockers
                </p>
              ) : (
                <p className="text-sm text-gray-400 mt-1">
                  {openBlockers.length} Open
                </p>
              )}
            </div>

            <div className="p-6 border-r border-gray-200">
              <p className="text-sm text-gray-500">Decisions</p>
              <p className="text-3xl font-bold">{decisions.length}</p>
            </div>

            <div className="p-6 border-r border-gray-200">
              <p className="text-sm text-gray-500">Agents running</p>
              <p className="text-3xl font-bold">0</p>
            </div>

            <div className="p-6 border-r border-gray-200">
              <p className="text-sm text-gray-500">Reports</p>
              <p className="text-3xl font-bold">{reports.length}</p>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-2">Task completion — {progressPercentage}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gray-900 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>

          <div className="border-t border-gray-200 px-6 py-8 text-left">
            <h2 className="text-xl font-bold mb-4">
              Recent Activity
            </h2>

            <div className="space-y-4">
              {tasks.length === 0 ? (
                <p className="text-gray-400 text-sm">
                  No tasks yet — extract from meeting notes or add manually.
                </p>
              ) : (
                tasks.slice(-3).map((task) => (
                  <div
                    key={task.id}
                    className="flex justify-between border-b border-gray-100 pb-3"
                  >
                    <p className="text-gray-800">{task.title}</p>

                    <p className="text-sm text-gray-500">
                      {task.created_at}
                    </p>

                    <span
                      className={`px-3 py-1 rounded-full text-sm ${getStatusStyle(
                        task.status
                      )}`}
                    >
                      {task.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
                    <div className="border-t border-gray-200 px-6 py-8 text-left">
            <h2 className="text-xl font-bold mb-4">
              Open Blockers
            </h2>

            {openBlockers.length === 0 ? (
              <p className="text-gray-400 text-sm">
                No open blockers
              </p>
            ) : (
              openBlockers.map((blocker, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 py-2 border-b border-gray-100"
                >
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>

                  <p className="text-gray-800">
                    {blocker.title}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-gray-200 px-6 py-8 text-left">
            <h2 className="text-xl font-bold mb-4">
              Recent Decisions
            </h2>

            <div className="space-y-4">
              {decisions.length === 0 ? (
                <p className="text-gray-400 text-sm">
                  No decisions yet — extract from meeting notes or add manually.
                </p>
              ) : (
                decisions.slice(-3).map((decision) => (
                  <div
                    key={decision.id}
                    className="flex justify-between border-b border-gray-100 pb-3"
                  >
                    <p className="text-gray-800">
                      {decision.title}
                    </p>

                    <p className="text-sm text-gray-500">
                      {decision.created_at}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <div className="border-t border-gray-200 px-6 py-8 text-left">
          <h2 className="text-xl font-bold mb-4">Latest Report</h2>
          {reports.length === 0 ? (
            <p className="text-gray-400 text-sm">No reports yet — generate one from the Reports page.</p>
          ) : (
            <div className="prose max-w-none text-gray-700">
              <ReactMarkdown>{reports[reports.length - 1].content}</ReactMarkdown>
            </div>
          )}
        </div>
    </div>
  );
}