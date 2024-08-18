import { Button } from "frames.js/next";
import { frames } from "./frames";
import { appURL } from "../utils";
import moxieResolveData from "../../moxie_resolve_data.json";
import randomData from "../../output_file.json";

// Correct type assertions
const typedMoxieResolveData = moxieResolveData as Array<{
  profileName: string;
  fid: number;
  address: string;
  type: string;
}>;
const typedRandomData = randomData as [string, number][];

const USERNAME_FID_MAP = new Map(
  typedMoxieResolveData.map((entry) => [
    entry.profileName.toLowerCase(),
    entry.fid.toString(),
  ])
);

const frameHandler = frames(async (ctx) => {
  let symbol;

  if (ctx.message?.inputText) {
    const input = ctx.message.inputText.trim().toLowerCase();
    if (input.startsWith("@") || isNaN(Number(input))) {
      const profileName = input.startsWith("@") ? input.slice(1) : input;
      const fid = USERNAME_FID_MAP.get(profileName);
      if (fid) {
        symbol = `fid:${fid}`;
      } else {
        symbol = input;
      }
    } else if (!isNaN(Number(input))) {
      symbol = `fid:${input}`;
    } else {
      symbol = input;
    }
  } else if (ctx.message?.requesterFid) {
    symbol = `fid:${ctx.message.requesterFid}`;
  }

  if (!symbol && ctx.url) {
    console.log("parsing url");
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
      console.log("Extracted fid from params. FID: " + fid);
      symbol = `fid:${fid}`;
    }
  }

  // If symbol is still not set, use default
  if (!symbol) {
    symbol = "fid:446697";
  }

  try {
    // Fetch hourly snapshots data
    const response = await fetch(
      `${appURL()}/api/hourly-snapshots?symbol=${symbol}`
    );
    const data = await response.json();

    if (
      !data ||
      !data.tokenInfo ||
      !data.hourlySnapshots ||
      data.hourlySnapshots.length === 0
    ) {
      // No fan token found or no hourly snapshots, return the "No fan token yet" page
      return {
        image: (
          <div tw="flex flex-col p-8 bg-gray-900 text-white font-sans w-full h-full items-center justify-center">
            <h1 tw="text-6xl font-bold mb-4">No Fan Token Yet</h1>
            <p tw="text-4xl mb-8 text-center">
              This user doesn't have a Fan Token, or their auction is still
              ongoing.
            </p>
          </div>
        ),
        textInput: "Search by FID or @username",
        buttons: [
          <Button
            action="post"
            target={{ pathname: "/", query: { action: "show_me_or_search" } }}
          >
            Show Me / 🔎
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
    const chartData = data.hourlySnapshots.slice(-24); // Last 24 hours
    const prices = chartData.map(
      (snapshot: { price: number }) => snapshot.price
    );

    if (prices.length === 0) {
      throw new Error("No price data available");
    }

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

    // const SUPPLY_DIVIDER = 1000000000000000000;

    const shareText = encodeURIComponent(
      `Is it time to send this token higher? Frame by @zeni.eth`
    );
    const shareUrl = `https://warpcast.com/~/compose?text=${shareText}&embeds[]=https://moxie-chart-frame.vercel.app/frames?fid=${
      symbol.split(":")[1]
    }`;

    const buySellUrl = `https://moxie-frames.airstack.xyz/stim?t=fid_${
      symbol.split(":")[1]
    }`;

    // Get current timestamp
    const currentTimestamp = new Date().toISOString();

    return {
      image: (
        <div tw="flex flex-col p-8 bg-gray-900 text-white font-sans w-full h-full">
          <div tw="flex justify-between items-center mb-4">
            <div tw="flex items-center">
              <img src={profileImage} tw="w-24 h-24 rounded-full mr-4" />
              <div tw="flex flex-col">
                <h2 tw="flex text-4xl font-bold m-0">@{username}</h2>
                <p tw="flex text-3xl text-gray-400 m-0">
                  Fan Token Price Chart
                </p>
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
            {/* <div tw="absolute top-0 left-2 text-white text-6xl font-bold opacity-50">
              Fan Token Price Trend
            </div> */}
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
              {/* <div tw="flex text-2xl mt-2">
                Starting Price: ${earliestPrice.toFixed(4)}
              </div> */}
            </div>
            <div tw="flex flex-col items-end">
              <div tw="flex text-xl mt-8">MoxieScout</div>
            </div>
          </div>
        </div>
      ),
      textInput: "Search by FID or @username",
      buttons: [
        <Button
          action="post"
          target={{ pathname: "/", query: { action: "show_me_or_search" } }}
        >
          Show Me / 🔎
        </Button>,
        <Button action="post" target={buySellUrl}>
          ⚡️ Trade
        </Button>,
        <Button
          action="link"
          // Change the url here
          target="https://warpcast.com/~/add-cast-action?url=https%3A%2F%2Fmoxie-chart-frame.vercel.app%2Fapi%2Fcast-action"
        >
          Install
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
          target={{ pathname: "/", query: { action: "view_me" } }}
        >
          Show Me
        </Button>,
      ],
      state: { symbol: symbol },
    };
  }
});
export const GET = frameHandler;
export const POST = frameHandler;
