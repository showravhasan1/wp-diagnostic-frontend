"use client";
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function DiagnosticTool() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!url.startsWith("http")) {
      setResult({ error: "Please enter a valid URL starting with http or https." });
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const endpoint = `${process.env.NEXT_PUBLIC_API_URL}/api/analyze`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      const summary = data.summary || null;
      const bottlenecks = Array.isArray(data.bottlenecks) ? data.bottlenecks : [];

      setResult({ summary, bottlenecks });
    } catch (error) {
      console.error("Analysis failed:", error);
      setResult({
        error: "Failed to analyze the site. Please ensure the backend server is running and accessible, and the site is reachable."
      });
    } finally {
      setLoading(false);
    }
  };

  const generateClientMessage = (summary, bottlenecks) => {
    if (!summary) return "Summary not available.";
    let message = `Your site loads in about ${summary.loadTime}ms with ${summary.requestCount} requests.`;
    if (bottlenecks.length > 0) {
      message += " We noticed the following issues: " + bottlenecks.join(" ");
    } else {
      message += " No major issues detected. Looks good!";
    }
    return message;
  };

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4 bg-white text-black min-h-screen">
      <h1 className="text-2xl font-bold">WordPress Diagnostic Tool</h1>
      <input
        className="w-full p-2 border rounded"
        placeholder="https://example.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        onClick={handleAnalyze}
        disabled={loading}
      >
        {loading ? "Analyzing..." : "Analyze Website"}
      </button>

      {result && (
        <div className="bg-white p-4 rounded space-y-4 text-sm">
          {result.error && <div className="text-red-600">{result.error}</div>}

          {result.summary && (
            <Card>
              <CardContent className="p-4">
                <h2 className="font-semibold mb-2">Website Summary</h2>
                <ul className="list-disc list-inside">
                  <li><strong>URL:</strong> {result.summary.url}</li>
                  <li><strong>TTFB:</strong> {result.summary.ttfb} ms</li>
                  <li><strong>DOM Loaded:</strong> {result.summary.domContentLoaded} ms</li>
                  <li><strong>Total Load Time:</strong> {result.summary.loadTime} ms</li>
                  <li><strong>Requests:</strong> {result.summary.requestCount}</li>
                  <li><strong>3rd Party Count:</strong> {result.summary.thirdPartyCount}</li>
                </ul>
              </CardContent>
            </Card>
          )}

          {result.bottlenecks && result.bottlenecks.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h2 className="font-semibold mb-2">Detected Bottlenecks</h2>
                <ul className="list-disc list-inside">
                  {result.bottlenecks.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {result.summary && (
            <Card>
              <CardContent className="p-4">
                <h2 className="font-semibold mb-2">Client Message</h2>
                <p>{generateClientMessage(result.summary, result.bottlenecks || [])}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </main>
  );
}
