import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { connectDatabase } from "../services/api";

function Home() {
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!databaseUrl.trim()) {
      setError("Please enter a database URL.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await connectDatabase(databaseUrl);

      sessionStorage.setItem("databaseUrl", databaseUrl);
      sessionStorage.setItem("tables", JSON.stringify(data.tables));

      navigate("/query");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-white">

      <div className="w-full max-w-lg">

        {/* Logo / Heading */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold">
            QueryMind
          </h1>

          <p className="mt-3 text-gray-400">
            Conversational SQL Assistant
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Connect your database and ask questions using natural language.
          </p>
        </div>

        {/* Connection Card */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl">

          <h2 className="text-lg font-semibold">
            Connect your database
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Enter your database connection URL to get started.
          </p>

          <form onSubmit={handleSubmit} className="mt-6">

            <label
              htmlFor="databaseUrl"
              className="mb-2 block text-sm font-medium text-gray-300"
            >
              Database URL
            </label>

            <input
              id="databaseUrl"
              type="text"
              value={databaseUrl}
              onChange={(event) => setDatabaseUrl(event.target.value)}
              placeholder="postgresql://user:password@localhost:5432/database"
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-gray-500"
            />

            {/* Error */}
            {error && (
              <div className="mt-3 rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Connecting..." : "Connect Database"}
            </button>

          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          Your database connection is used only for querying your data.
        </p>

      </div>
    </div>
  );
}

export default Home;