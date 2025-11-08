import { createCanvas } from "./action"; // Import the Server Action

export default function HomePage() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-6 text-black">
          System Design Sketchpad
        </h1>
        <p className="text-lg text-gray-700 mb-8">
          A real-time collaborative tool for your system design interviews.
        </p>
        <form action={createCanvas}>
          <button
            type="submit"
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
          >
            Create a New Canvas
          </button>
        </form>
      </div>
    </div>
  );
}
