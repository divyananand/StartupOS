"use client";

import { useState, useEffect } from "react";
import { getStatusStyle } from "@/lib/utils";


type Task = {
  title: string
  status: string
  date: string
   priority: string
  owner: string
  deadline: string
};

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("low")
  const [date, setDate] = useState("");
  const[filter,setFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")

  const filteredTasks = tasks
  .filter((task) => filter === "all" ? true : task.status === filter)
  .filter((task) => priorityFilter === "all" ? true : task.priority === priorityFilter)

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks`)
      .then((res) => res.json())
      .then((data) => setTasks(data));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const newTask = {
      title,
      status,
      date,
      priority
    };

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newTask),
    });

    setTitle("");
    setStatus("todo");
    setDate("");
    setPriority("low");
    fetchTasks();
  }

  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        Tasks
      </h1>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <input
          type="text"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 rounded w-full"
          required
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="todo">todo</option>
          <option value="in-progress">in-progress</option>
          <option value="done">done</option>
        </select>

        <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        className="border p-2 rounded w-full"
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border p-2 rounded w-full"
          required
        />

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded"
        >
          Add Task
        </button>
      </form>

      <div className="flex gap-2 mb-6" >
        <button onClick={() => setFilter("all")} className={filter === "all" 
          ? "px-3 py-1 text-sm rounded-md bg-gray-900 text-white cursor-pointer" 
          : "px-3 py-1 text-sm border border-gray-300 rounded-md cursor-pointer hover:bg-gray-100"}>All</button>
        <button onClick={() => setFilter("todo")} className={filter === "todo" 
          ? "px-3 py-1 text-sm rounded-md bg-gray-900 text-white cursor-pointer" 
          : "px-3 py-1 text-sm border border-gray-300 rounded-md cursor-pointer hover:bg-gray-100"}>Todo</button>
        <button onClick={() => setFilter("in-progress")} className={filter === "done" 
          ? "px-3 py-1 text-sm rounded-md bg-gray-900 text-white cursor-pointer" 
          : "px-3 py-1 text-sm border border-gray-300 rounded-md cursor-pointer hover:bg-gray-100"}>In Progress</button>
        <button onClick={() => setFilter("done")} className={filter === "in-progress" 
          ? "px-3 py-1 text-sm rounded-md bg-gray-900 text-white cursor-pointer" 
          : "px-3 py-1 text-sm border border-gray-300 rounded-md cursor-pointer hover:bg-gray-100"}>Done</button>
      </div>

      {/* TASK LIST */}
      <div className="space-y-4">
        {filteredTasks.map((task, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg p-4 flex justify-between items-center"
          >
            <div>
              <h2 className="font-semibold text-gray-900">
                {task.title}
              </h2>

              <p className="text-sm text-gray-500">{task.date}</p>
            </div>
            <span className="text-xs text-gray-500 ml-2">{task.priority}</span>

            <span
              className={`px-3 py-1 rounded-full text-sm ${getStatusStyle(
                task.status
              )}`}
            >
              {task.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}