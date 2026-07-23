import Link from "next/link";

const features = [
  {
    icon: "✅",
    title: "Tasks",
    desc: "tracking what needs to get done",
  },
  {
    icon: "📄",
    title: "Documents",
    desc: "storing all company files in one place",
  },
  {
    icon: "🤖",
    title: "AI agents",
    desc: "automatically pulling insights from the data",
  },
];

export default function Homepage() {
  return (
    <div className="text-center py-24">
      <h1 className="font-bold text-center text-4xl">
        Welcome to StartupOS
      </h1>

      <p className="text-center text-gray-600 max-w-md mx-auto">
        To Manage your startup efficiently
      </p>

      <div className="flex justify-center gap-4 mt-8">
        <Link
          href="/dashboard"
          className="bg-gray-900 text-white px-5 py-2 rounded-md text-sm"
        >
          Dashboard
        </Link>

        <Link
          href="/learn-more"
          className="border border-gray-300 text-gray-700 px-5 py-2 rounded-md text-sm"
        >
          Learn More
        </Link>
      </div>

      <div className="grid grid-cols-3 border-t border-gray-200 mt-12">
        {features.map((feature) => (
          <div
            className="p-6 border-r border-gray-200"
            key={feature.title}
          >
            <p>{feature.icon}</p>
            <p>{feature.title}</p>
            <p>{feature.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 border-t border-gray-200">
        <div className="text-center py-6 border-r border-gray-200">
          <p className="text-3xl font-bold">12</p>
          <p className="text-sm text-gray-500">Active tasks</p>
        </div>

        <div className="text-center py-6 border-r border-gray-200">
          <p className="text-3xl font-bold">5</p>
          <p className="text-sm text-gray-500">Documents</p>
        </div>

        <div className="text-center py-6">
          <p className="text-3xl font-bold">3</p>
          <p className="text-sm text-gray-500">Agents running</p>
        </div>
      </div>
    </div>
  );
}