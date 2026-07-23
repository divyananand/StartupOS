const logs = [
  {
    id: 1,
    agent: "Research Agent",
    action: "Collected market data",
    status: "completed",
    timestamp: "10 minutes ago",
  },
  {
    id: 2,
    agent: "Analytics Agent",
    action: "Processing user insights",
    status: "running",
    timestamp: "5 minutes ago",
  },
  {
    id: 3,
    agent: "Document Agent",
    action: "Failed to generate report",
    status: "failed",
    timestamp: "1 hour ago",
  },
];


function getStatusStyle(status: string) {
  if (status === "completed") {
    return "bg-green-100 text-green-700";
  } 
  else if (status === "running") {
    return "bg-blue-100 text-blue-700";
  } 
  else {
    return "bg-red-100 text-red-700";
  }
}


export default function Agents() {
  return (
    <div className="px-6 py-8">

      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        Agent Logs
      </h1>


      <div className="space-y-4">

        {logs.map((log) => (
          <div
            key={log.id}
            className="border border-gray-200 rounded-lg p-4 flex justify-between items-center"
          >

            <div>
              <h2 className="font-semibold text-gray-900">
                {log.agent}
              </h2>

              <p className="text-gray-600">
                {log.action}
              </p>

              <p className="text-sm text-gray-500">
                {log.timestamp}
              </p>
            </div>


            <span
              className={`px-3 py-1 rounded-full text-sm ${getStatusStyle(
                log.status
              )}`}
            >
              {log.status}
            </span>

          </div>
        ))}

      </div>

    </div>
  );
}