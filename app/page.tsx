import { fetchMetadata } from "frames.js/next";
import { appURL } from "./utils";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { fid?: string };
}) {
  const framesUrl = new URL("/frames", appURL());

  if (searchParams.fid) {
    framesUrl.searchParams.set("fid", searchParams.fid);
    framesUrl.searchParams.set("action", "fetch");
  }

  console.log("Fetching metadata from:", framesUrl.toString());

  const castActionUrl = new URL("/api/cast-action", appURL());

  return {
    title: "Fan Token Chart",
    description: "Check the performance of Moxie Fan Tokens",
    openGraph: {
      title: "Fan Token Chart",
      description: "Check the performance of Moxie Fan Tokens",
      images: [`${framesUrl.origin}/api/og`],
    },
    other: {
      ...(await fetchMetadata(framesUrl)),
      "fc:frame:cast_action:url": castActionUrl.toString(),
    },
  };
}

export default function Page() {
  return <span>Loading Moxie Fan Token Chart...</span>;
}
