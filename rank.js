
const GROUP_ID = "653127537";

const API_KEY = process.env.ROBLOX_API_KEY;
const CUSTOMER_ROLE_ID = process.env.CUSTOMER_ROLE_ID;
const DEFAULT_ROLE_ID = process.env.DEFAULT_ROLE_ID;

if (!API_KEY || !CUSTOMER_ROLE_ID || !DEFAULT_ROLE_ID) {
  throw new Error("Missing required GitHub repository secrets.");
}

const BASE_URL =
  `https://apis.roblox.com/cloud/v2/groups/${GROUP_ID}`;

async function robloxRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Roblox API ${response.status}: ${text}`
    );
  }

  return text ? JSON.parse(text) : {};
}

function getResourceId(resource) {
  if (!resource) return null;

  // Ondersteunt zowel resource-namen als volledige URL's.
  return resource.split("/").filter(Boolean).pop() ?? null;
}

async function main() {
  let pageToken;
  let processed = 0;
  let skipped = 0;

  do {
    const url = new URL(`${BASE_URL}/memberships`);
    url.searchParams.set("maxPageSize", "100");

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const data = await robloxRequest(url.toString());

    for (const member of data.groupMemberships ?? []) {
      const currentRoleId = getResourceId(member.role);

      // Wijzig alleen leden met de standaardrol.
      if (currentRoleId !== DEFAULT_ROLE_ID) {
        skipped++;
        continue;
      }

      const membershipId = getResourceId(member.path);

      if (!membershipId) {
        console.warn("Membership ID missing; skipping member.");
        continue;
      }

      const assignUrl =
        `${BASE_URL}/memberships/${membershipId}:assignRole`;

      await robloxRequest(assignUrl, {
        method: "POST",
        body: JSON.stringify({
          role: `groups/${GROUP_ID}/roles/${CUSTOMER_ROLE_ID}`,
        }),
      });

      processed++;
      console.log(
        `Customer role assigned to membership ${membershipId}`
      );
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  console.log(`Finished. Updated: ${processed}; skipped: ${skipped}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
