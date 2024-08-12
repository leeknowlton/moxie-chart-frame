import { Button } from "frames.js/next";
import { frames } from "./frames";
import { appURL } from "../utils";
import mappings from "../../output_file.json";

// Add this new constant
const USERNAME_FID_MAP = new Map(mappings as [string, number][]);

const frameHandler = frames(async (ctx) => {
  let symbol;

  if (ctx.message?.inputText) {
    // Handle search input
    const input = ctx.message.inputText.trim();
    if (input.startsWith("@")) {
      // Search by username
      const profileName = input.slice(1).toLowerCase();
      const fid = USERNAME_FID_MAP.get(profileName);
      if (fid) {
        symbol = `fid:${fid}`;
      } else {
        symbol = input; // Keep the input as is if not found
      }
    } else if (!isNaN(Number(input))) {
      // Search by FID
      symbol = `fid:${input}`;
    } else {
      symbol = input;
    }
  } else if (ctx.searchParams?.action === "random") {
    // Handle "Random" button click
    const randomIndex = Math.floor(Math.random() * mappings.length);
    const [username, fid] = mappings[randomIndex];
    symbol = `fid:${fid}`;
  } else if (ctx.message?.requesterFid) {
    // Use requester's FID for "My Token" action
    symbol = `fid:${ctx.message.requesterFid}`;
  }

  // If symbol is still not set, try to extract FID from URL
  if (!symbol && ctx.url) {
    const extractFid = (url: string): string | null => {
      try {
        const parsedUrl = new URL(url);
        return parsedUrl.searchParams.get("fid");
      } catch (e) {
        console.error("Error parsing URL:", e);
        return null;
      }
    };

    const fid = extractFid(ctx.url.toString());
    if (fid) {
      symbol = `fid:${fid}`;
    }
  }

  // If symbol is still not set, use default
  if (!symbol) {
    symbol = "fid:5650";
  }

  try {
    // Fetch hourly snapshots data
    const response = await fetch(
      `${appURL()}/api/hourly-snapshots?symbol=${symbol}`
    );
    const data = await response.json();

    if (!data || !data.tokenInfo) {
      // No fan token found, return the "No fan token yet" page
      return {
        image: (
          <div tw="flex flex-col p-8 bg-gray-900 text-white font-sans w-full h-full items-center justify-center">
            <h1 tw="text-6xl font-bold mb-4">No Fan Token Yet</h1>
            <p tw="text-4xl mb-8">
              This user doesn't have a Fan Token, or their auction is still
              ongoing.
            </p>
          </div>
        ),
        textInput: "Search by FID or @username",
        buttons: [
          <Button
            action="post"
            target={{ pathname: "/", query: { action: "random" } }}
          >
            🎲 Random
          </Button>,
          <Button
            action="post"
            target={{ pathname: "/", query: { action: "search" } }}
          >
            🔎 Search
          </Button>,
        ],
        state: { symbol: symbol },
      };
    }

    // Fetch user data
    const userResponse = await fetch(
      `${appURL()}/api/get-user-data?symbol=${symbol}`
    );
    const userData = await userResponse.json();

    // Extract user information
    const user = userData.userData.Socials.Social[0];
    const username = user.profileName;
    const displayName = user.profileDisplayName;
    const profileImage =
      user.profileImageContentValue?.image?.extraSmall || user.profileImage;

    // Prepare data for the chart
    const chartData = data.hourlySnapshots.slice(-24); // Last 72 hours
    const prices = chartData.map(
      (snapshot: { price: number }) => snapshot.price
    );
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    // Calculate price change and earliest price
    const latestPrice = prices[prices.length - 1];
    const earliestPrice = prices[0];
    const priceChange = ((latestPrice - earliestPrice) / earliestPrice) * 100;

    // Simple SVG chart
    const chartWidth = 1050;
    const chartHeight = 350;
    const points = chartData
      .map((snapshot: { price: number }, index: number) => {
        const x = (index / (chartData.length - 1)) * chartWidth;
        const y =
          chartHeight -
          ((snapshot.price - minPrice) / priceRange) * chartHeight;
        return `${x},${y}`;
      })
      .join(" ");

    const SUPPLY_DIVIDER = 1000000000000000000;

    const shareText = encodeURIComponent(
      `${displayName}'s Fan Token is now at $${latestPrice.toFixed(
        4
      )} per token. Here's the all-time chart, made by @leeknowlton.eth . Is it time to send it higher?`
    );
    const shareUrl = `https://warpcast.com/~/compose?text=${shareText}&embeds[]=https://moxie-chart-frame.vercel.app/frames?fid=${
      symbol.split(":")[1]
    }`;

    const buySellText = encodeURIComponent(
      `I saw the Fan Token chart 📈 from @leeknowlton.eth! Time to swap some @${username} tokens with this frame. Join me?`
    );
    const buySellUrl = `https://warpcast.com/~/compose?text=${buySellText}&embeds[]=https://moxie-frames.airstack.xyz/stim?t=fid_${
      symbol.split(":")[1]
    }`;

    // Get current timestamp
    const currentTimestamp = new Date().toISOString();

    return {
      image: (
        <div tw="flex flex-col p-8 bg-gray-900 text-white font-sans w-full h-full">
          <div tw="flex justify-between items-center mb-4">
            <div tw="flex items-center">
              <img src={profileImage} tw="w-16 h-16 rounded-full mr-4" />
              <div tw="flex flex-col">
                <h2 tw="flex text-3xl font-bold m-0">
                  {displayName} Fan Token
                </h2>
                <p tw="flex text-xl text-gray-400 m-0">@{username}</p>
              </div>
            </div>
            <div tw="flex flex-col items-end">
              <div tw="flex text-4xl font-bold">${latestPrice.toFixed(4)}</div>
              <div
                tw={`flex text-2xl font-semibold ${
                  priceChange >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {priceChange >= 0 ? "+" : ""}
                {priceChange.toFixed(2)}%
              </div>
            </div>
          </div>

          <div tw="relative flex">
            <div tw="absolute top-0 left-2 text-white text-3xl font-bold">
              LAST 24 HOURS
            </div>
            <svg width={chartWidth} height={chartHeight}>
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8A2BE2" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#8A2BE2" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={`M0,${chartHeight} ${points} ${chartWidth},${chartHeight}`}
                fill="url(#gradient)"
              />
              <polyline
                fill="none"
                stroke="#8A2BE2"
                strokeWidth="3"
                points={points}
              />
            </svg>
          </div>

          <div tw="flex justify-between mt-4 text-lg">
            <div tw="flex flex-col">
              <div tw="flex text-2xl mt-2">
                Earliest Price: ${earliestPrice.toFixed(4)}
              </div>
              <div tw="flex text-2xl mb-4">
                24h: ${minPrice.toFixed(4)} (Low) / ${maxPrice.toFixed(4)}{" "}
                (High)
              </div>
              <div tw="flex text-xl">Total Snapshots: {chartData.length}</div>
            </div>
            <div tw="flex flex-col items-end">
              <div tw="flex text-xl mt-8">
                Frame by Zenigame (@leeknowlton.eth)
              </div>
              <div tw="flex text-sm text-gray-400">{currentTimestamp}</div>
            </div>
          </div>
        </div>
      ),
      textInput: "Search by FID or @username",
      buttons: [
        <Button
          action="post"
          target={{ pathname: "/", query: { action: "random" } }}
        >
          🎲 Random
        </Button>,
        <Button
          action="post"
          target={{ pathname: "/", query: { action: "search" } }}
        >
          🔎 Search
        </Button>,
        <Button action="link" target={buySellUrl}>
          ⚡️ Trade
        </Button>,
        <Button action="link" target={shareUrl}>
          Share
        </Button>,
      ],
      state: { symbol: symbol },
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    // Return an error page
    return {
      image: (
        <div tw="flex flex-col p-8 bg-gray-900 text-white font-sans w-full h-full items-center justify-center">
          <h1 tw="text-4xl font-bold mb-4">Error</h1>
          <p tw="text-xl">
            An error occurred while fetching data. Please try again later.
          </p>
        </div>
      ),
      textInput: "Search by FID or @username",
      buttons: [
        <Button
          action="post"
          target={{ pathname: "/", query: { action: "search" } }}
        >
          🔎 Try Again
        </Button>,
        <Button
          action="post"
          target={{ pathname: "/", query: { action: "my_token" } }}
        >
          My Token
        </Button>,
      ],
      state: { symbol: symbol },
    };
  }
});
export const GET = frameHandler;
export const POST = frameHandler;
