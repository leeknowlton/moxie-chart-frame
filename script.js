import { readFile, writeFile } from "fs/promises";

const RANDOM_AUCTION_ARRAY = [
  12, 37, 239, 274, 528, 602, 2904, 8685, 11124, 13983, 245124, 281836, 311933,
  366713, 472, 539, 557, 880, 7960, 16148, 278406, 284063, 309710, 337018,
  403619, 510364, 66, 358, 577, 1285, 1689, 1970, 2211, 2282, 7258, 7732, 10259,
  242661, 310928, 385955, 758919, 762, 1214, 2391, 5431, 6714, 6806, 11528,
  214447, 270504, 344203, 350139, 398596, 404871, 2, 2745, 3642, 3895, 7097,
  7464, 281289, 446697, 459385, 478906, 8, 20, 169, 426, 1048, 1325, 1471, 1918,
  2163, 4085, 4482, 193158, 293719, 412843, 490435, 1606, 4461, 5650, 13874,
  247143, 320215, 354669, 408746, 410943, 129, 251, 1236, 1886, 2252, 7418,
  221578, 258848, 269694, 281676, 436577, 3, 207, 225, 4327, 4905, 5309, 12256,
  301340, 315256, 328757, 414955, 426045, 541292, 784003, 99, 378, 616, 771,
  2210, 253127, 276562, 308045, 327165, 406157, 420540, 516028, 56, 2923, 3112,
  3621, 3635, 4179, 5181, 9856, 211693, 212556, 237884, 326040, 478308, 18,
  2802, 193928, 230147, 18910, 3115, 323251, 406815, 10144, 449539, 337090,
  397392, 4715, 418456, 599368, 193930, 297319, 12048, 372323, 434908, 19105,
  8451, 210628, 439396, 285462, 191503, 296687, 1068, 268455, 8447, 8405,
  302556, 534, 245579, 213310, 12921, 311845, 456735, 2480, 308536, 321969,
  4513, 379089, 262938, 196149, 72, 309567, 211205, 14351, 3652, 1407, 5701,
  280, 6596, 9816,
];

async function extractProfileData() {
  try {
    // Read the JSON data from a file
    const data = await readFile("moxie_resolve_data.json", "utf8");

    // Parse the JSON data
    const jsonData = JSON.parse(data);

    // Extract profileNames and fids only for FIDs in RANDOM_AUCTION_ARRAY
    const result = jsonData
      .filter((item) => RANDOM_AUCTION_ARRAY.includes(item.fid))
      .map((item) => [item.profileName, item.fid]);

    // Print the result
    console.log(result);

    // Optionally, write the result to a new JSON file
    await writeFile("output_file.json", JSON.stringify(result, null, 2));
    console.log("Result has been written to output_file.json");

    // Log the number of matches found
    console.log(
      `Found ${result.length} matches out of ${RANDOM_AUCTION_ARRAY.length} FIDs in RANDOM_AUCTION_ARRAY`
    );
  } catch (err) {
    console.error("Error:", err);
  }
}

// Run the function
extractProfileData();
