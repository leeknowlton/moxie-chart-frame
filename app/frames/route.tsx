import { farcasterHubContext } from "frames.js/middleware";
import { createFrames, Button } from "frames.js/next";
import { appURL } from "../utils";

const frames = createFrames({
  basePath: "/frames",
  middleware: [
    farcasterHubContext({
      ...(process.env.NODE_ENV === "production"
        ? {}
        : {
            hubHttpUrl: "http://localhost:3010/hub",
          }),
    }),
  ],
});

const handleRequest = frames(async (ctx) => {
  const fanTokenAddress = "0x5f75ae97ab30d2f406ce5748e58d6f2035ffa4c5";

  // Fetch hourly snapshots data
  const response = await fetch(
    `${appURL()}/api/hourly-snapshots?fanTokenAddress=${fanTokenAddress}`
  );
  const data = await response.json();

  // Prepare data for the chart
  const chartData = data.hourlySnapshots.slice(-24); // Last 24 hours
  const prices = chartData.map((snapshot: { price: number }) => snapshot.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  // Calculate price change
  const latestPrice = prices[prices.length - 1];
  const earliestPrice = prices[0];
  const priceChange = ((latestPrice - earliestPrice) / earliestPrice) * 100;

  // Simple SVG chart
  const chartWidth = 840;
  const chartHeight = 420;
  const points = chartData
    .map((snapshot: { price: number }, index: number) => {
      const x = (index / (chartData.length - 1)) * chartWidth;
      const y =
        chartHeight - ((snapshot.price - minPrice) / priceRange) * chartHeight;
      return `${x},${y}`;
    })
    .join(" ");

  return {
    image: (
      <div tw="flex flex-col p-5 bg-gray-900 text-white font-sans">
        <div tw="flex justify-between items-center mb-5">
          <h2 tw="flex text-2xl m-0">Fan Token Price</h2>
          <div tw="flex flex-col items-end">
            <div tw="flex text-2xl font-bold">${latestPrice.toFixed(4)}</div>
            <div
              tw={`flex text-base ${
                priceChange >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {priceChange >= 0 ? "+" : "-"} {Math.abs(priceChange).toFixed(2)}%
            </div>
          </div>
        </div>
        <svg width={chartWidth} height={chartHeight}>
          <polyline
            fill="none"
            stroke="#6A5ACD"
            strokeWidth="3"
            points={points}
          />
        </svg>

        <div tw="flex flex-col justify-between mt-5">
          <div tw="flex text-sm">24h Low: ${minPrice.toFixed(4)}</div>
          <div tw="flex text-sm">24h High: ${maxPrice.toFixed(4)}</div>
        </div>
      </div>
    ),
    buttons: [
      <Button action="post">Refresh</Button>,
      <Button
        action="link"
        target={`https://www.defined.fi/eth/${fanTokenAddress}`}
      >
        View on Defined
      </Button>,
    ],
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
