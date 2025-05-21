import { NextRequest } from "next/server";
import chromium from "chrome-aws-lambda";
import puppeteer from "puppeteer-core";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const url = body.url;

  if (!url) {
    return new Response(JSON.stringify({ error: "URL is required" }), { status: 400 });
  }

  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless
    });

    const page = await browser.newPage();
    const resources: any[] = [];

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      resources.push({
        url: req.url(),
        method: req.method(),
        type: req.resourceType(),
      });
      req.continue();
    });

    await page.goto(url, { waitUntil: "load", timeout: 30000 });

    const perfData = await page.evaluate(() => ({
      ttfb: performance.timing.responseStart - performance.timing.requestStart,
      domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
      resourceEntries: performance.getEntriesByType("resource"),
    }));

    const thirdParty = perfData.resourceEntries.filter((r: any) => {
      try {
        return new URL(r.name).hostname !== location.hostname;
      } catch {
        return false;
      }
    });

    const bottlenecks: any[] = [];
    if (perfData.ttfb > 600) {
      bottlenecks.push("High TTFB – server response is slow or uncached.");
    }

    const largeAssets = perfData.resourceEntries.filter((r: any) => r.transferSize > 300000);
    if (largeAssets.length) {
      bottlenecks.push("Large assets detected – optimize images or compress files.");
    }

    const summary = {
      url,
      ttfb: perfData.ttfb,
      domContentLoaded: perfData.domContentLoaded,
      loadTime: perfData.loadTime,
      requestCount: resources.length,
      thirdPartyCount: thirdParty.length,
    };

    return new Response(JSON.stringify({ summary, bottlenecks, resources }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: "Failed to analyze site",
        details: error.message,
        stack: error.stack,
      }),
      { status: 500 }
    );
  } finally {
    if (browser) await browser.close();
  }
}
