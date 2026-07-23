export function getStatusStyle(status: string) {
  if (status === "done") {
    return "bg-green-100 text-green-700";
  } else if (status === "in-progress") {
    return "bg-blue-100 text-blue-700";
  } else {
    return "bg-gray-100 text-gray-700";
  }
}