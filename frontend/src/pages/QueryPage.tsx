import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  executeQuery,
  type ConversationTurn,
  type ResultResponse,
} from "../services/api";

function QueryPage() {
  const navigate = useNavigate();

  const databaseUrl = sessionStorage.getItem("databaseUrl");

  const tables = JSON.parse(
    sessionStorage.getItem("tables") || "[]"
  );

  const [question, setQuestion] = useState("");
  const [activeQuestion, setActiveQuestion] = useState("");
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  const [clarification, setClarification] = useState<{
    message: string;
    options: string[];
  } | null>(null);
  const [result, setResult] = useState<ResultResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runQuery = async (
    questionToAsk: string,
    history: ConversationTurn[]
  ) => {
    if (!databaseUrl) {
      setError("Database connection not found.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await executeQuery(
        questionToAsk,
        databaseUrl,
        history
      );

      if (data.type === "clarification") {
        setClarification({
          message: data.message,
          options: data.options,
        });
        setConversationHistory([
          ...history,
          { role: "assistant", content: data.message },
        ]);
        setResult(null);
      } else {
        setResult(data);
        setClarification(null);
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
      setClarification(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!question.trim()) {
      return;
    }

    if (clarification) {
      // The typed text is the user's answer to the pending clarification.
      const updatedHistory: ConversationTurn[] = [
        ...conversationHistory,
        { role: "user", content: question },
      ];

      setQuestion("");
      setConversationHistory(updatedHistory);
      await runQuery(activeQuestion, updatedHistory);
      return;
    }

    // Starting a brand new question.
    setActiveQuestion(question);
    setConversationHistory([]);
    setResult(null);

    const askedQuestion = question;
    setQuestion("");
    await runQuery(askedQuestion, []);
  };

  const handleOptionClick = async (option: string) => {
    if (loading) return;

    const updatedHistory: ConversationTurn[] = [
      ...conversationHistory,
      { role: "user", content: option },
    ];

    setConversationHistory(updatedHistory);
    await runQuery(activeQuestion, updatedHistory);
  };

  const handleDisconnect = () => {
    sessionStorage.removeItem("databaseUrl");
    sessionStorage.removeItem("tables");

    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">

      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-gray-800 bg-gray-950 p-4">

        <h1 className="text-xl font-bold">
          QueryMind
        </h1>

        {/* Database */}
        <div className="mt-8">

          <p className="text-xs font-semibold uppercase text-gray-500">
            Database
          </p>

          <div className="mt-3 flex items-center gap-2 text-sm text-gray-300">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Connected
          </div>

        </div>

        {/* Tables */}
        <div className="mt-8">

          <p className="text-xs font-semibold uppercase text-gray-500">
            Tables
          </p>

          <div className="mt-3 space-y-1">

            {tables.map((table: string) => (
              <div
                key={table}
                className="rounded-md px-3 py-2 text-sm text-gray-400"
              >
                {table}
              </div>
            ))}

          </div>

        </div>

        {/* Disconnect */}
        <button
          onClick={handleDisconnect}
          className="mt-auto rounded-lg border border-gray-800 px-4 py-2 text-sm text-gray-400 hover:bg-gray-900 hover:text-white"
        >
          Disconnect
        </button>

      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col">

        {/* Header */}
        <header className="border-b border-gray-800 px-6 py-4">

          <h2 className="text-lg font-semibold">
            Ask your database
          </h2>

          <p className="text-sm text-gray-500">
            Ask questions using natural language.
          </p>

        </header>

        {/* Results Area */}
        <div className="flex flex-1 flex-col overflow-y-auto px-6 py-6">

          {/* Initial message */}
          {!result && !clarification && !loading && !error && (
            <div className="flex flex-1 items-center justify-center">

              <div className="text-center">

                <div className="text-4xl">
                  👋
                </div>

                <h2 className="mt-4 text-2xl font-semibold">
                  Your database is connected
                </h2>

                <p className="mt-2 text-gray-500">
                  Ask a question to generate a SQL query.
                </p>

              </div>

            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-1 items-center justify-center">

              <div className="text-center">

                <div className="text-2xl">
                  ⏳
                </div>

                <p className="mt-3 text-gray-400">
                  Generating SQL and fetching results...
                </p>

              </div>

            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-auto w-full max-w-4xl">

              <div className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
                {error}
              </div>

            </div>
          )}

          {/* Clarification */}
          {!loading && clarification && (
            <div className="mx-auto w-full max-w-3xl space-y-4">

              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Your question
                </p>

                <p className="mt-2 text-gray-200">
                  {activeQuestion}
                </p>
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">

                <p className="text-gray-200">
                  {clarification.message}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {clarification.options.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleOptionClick(option)}
                      className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800"
                    >
                      {option}
                    </button>
                  ))}
                </div>

              </div>

            </div>
          )}

          {/* Result */}
          {!loading && result && (
            <div className="mx-auto w-full max-w-5xl space-y-6">

              {/* Question */}
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Your question
                </p>

                <p className="mt-2 text-gray-200">
                  {result.question}
                </p>
              </div>

              {/* SQL */}
              <div>

                <div className="mb-2 flex items-center justify-between">

                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Generated SQL
                  </p>

                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(result.sql)
                    }
                    className="text-xs text-gray-500 hover:text-white"
                  >
                    Copy
                  </button>

                </div>

                <pre className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-gray-300">
                  <code>{result.sql}</code>
                </pre>

              </div>

              {/* Results Table */}
              <div>

                <div className="mb-2 flex items-center justify-between">

                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Query Results
                  </p>

                  <span className="text-xs text-gray-600">
                    {result.row_count} rows
                  </span>

                </div>

                {result.results.length === 0 ? (
                  <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
                    No results found.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-800">

                    <table className="w-full text-left text-sm">

                      <thead className="bg-gray-900">

                        <tr>
                          {Object.keys(result.results[0]).map(
                            (column) => (
                              <th
                                key={column}
                                className="border-b border-gray-800 px-4 py-3 font-medium text-gray-400"
                              >
                                {column}
                              </th>
                            )
                          )}
                        </tr>

                      </thead>

                      <tbody>

                        {result.results.map(
                          (row, rowIndex) => (
                            <tr
                              key={rowIndex}
                              className="border-b border-gray-800 last:border-0 hover:bg-gray-900"
                            >

                              {Object.keys(
                                result.results[0]
                              ).map((column) => (
                                <td
                                  key={column}
                                  className="px-4 py-3 text-gray-300"
                                >
                                  {String(
                                    row[column] ?? ""
                                  )}
                                </td>
                              ))}

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>

                  </div>
                )}

              </div>

            </div>
          )}

        </div>

        {/* Input */}
        <div className="border-t border-gray-800 p-4">

          <form
            onSubmit={handleSubmit}
            className="mx-auto flex w-full max-w-3xl items-center rounded-xl border border-gray-700 bg-gray-900 px-4 py-2"
          >

            <input
              type="text"
              value={question}
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              placeholder={
                clarification
                  ? "Type your answer, or click an option above..."
                  : "Ask a question about your data..."
              }
              disabled={loading}
              className="flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-gray-600 disabled:cursor-not-allowed"
            />

            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="ml-3 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "..." : "➤"}
            </button>

          </form>

        </div>

      </main>

    </div>
  );
}

export default QueryPage;