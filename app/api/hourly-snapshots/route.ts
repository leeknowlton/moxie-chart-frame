import { NextResponse } from "next/server";
import { gql, GraphQLClient } from "graphql-request";

const graphQLClient = new GraphQLClient(
  "https://api.studio.thegraph.com/query/23537/moxie_protocol_stats_mainnet/version/latest"
);

const HOURLY_SNAPSHOTS_QUERY = gql`
  query HourlySnapshots($fanTokenAddress: String!) {
    subjectTokens(where: { id: $fanTokenAddress }) {
      hourlySnapshots(orderBy: endTimestamp, orderDirection: asc, first: 1000) {
        endTimestamp
        endPrice
      }
    }
  }
`;

interface HourlySnapshotResponse {
  subjectTokens: Array<{
    hourlySnapshots: Array<{
      endTimestamp: string;
      endPrice: string;
    }>;
  }>;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fanTokenAddress = searchParams.get("fanTokenAddress");

  if (!fanTokenAddress) {
    return NextResponse.json(
      { error: "fanTokenAddress is required" },
      { status: 400 }
    );
  }

  try {
    const data = await graphQLClient.request<HourlySnapshotResponse>(
      HOURLY_SNAPSHOTS_QUERY,
      {
        fanTokenAddress,
      }
    );

    const processedData =
      data.subjectTokens[0]?.hourlySnapshots.map((snapshot: any) => ({
        date: new Date(
          parseInt(snapshot.endTimestamp, 10) * 1000
        ).toISOString(),
        price: parseFloat(snapshot.endPrice),
      })) || [];

    console.log(`Returning ${processedData.length} snapshots`);
    return NextResponse.json({ hourlySnapshots: processedData });
  } catch (error: any) {
    console.error("Error fetching hourly snapshots:", error);
    return NextResponse.json(
      { error: `Failed to fetch hourly snapshots: ${error.message}` },
      { status: 500 }
    );
  }
}
