
const GROUP_ID = "653127537";

const API_KEY = process.env.ROBLOX_API_KEY;
const CUSTOMER_ROLE_ID = String(
  process.env.CUSTOMER_ROLE_ID ?? ""
).trim();
const DEFAULT_ROLE_ID = String(
  process.env.DEFAULT_ROLE_ID ?? ""
).trim();

if (!API_KEY || !CUSTOMER_ROLE_ID || !DEFAULT_ROLE_ID) {
  throw new Error("Missing required GitHub repository secrets.");
}

if (!/^\d+$/.test(CUSTOMER_ROLE_ID)) {
  throw new Error(
    "CUSTOMER_ROLE_ID must contain only the numeric role ID."
  );
}

if (!/^\d+$/.test(DEFAULT_ROLE_ID)) {
  throw new Error(
    "DEFAULT_ROLE_ID must contain only the numeric role ID."
  );
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

async function main() {
  let pageToken;
  let processed = 0;

  do {
    const url = new URL(`${BASE_URL}/memberships`);
    url.searchParams.set("maxPageSize", "100");

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const data = await robloxRequest(url.toString());

    for (const member of data.groupMemberships ?? []) {
      const currentRoleId = member.role?.split("/").pop();

      // Alleen leden met de standaardrol wijzigen.
      // Bestaande staffrollen blijven behouden.
      if (currentRoleId !== DEFAULT_ROLE_ID) continue;

      const membershipId = member.path?.split("/").pop();

      if (!membershipId) {
        console.warn("Skipping membership without an ID.");
        continue;
      }

      await robloxRequest(
        `${BASE_URL}/memberships/${membershipId}:assignRole`,
        {
          method: "POST",
          body: JSON.stringify({
            role: `groups/${GROUP_ID}/roles/${CUSTOMER_ROLE_ID}`,
          }),
        }
      );

      processed++;
      console.log(
        `Customer role assigned to membership ${membershipId}`
      );
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  console.log(`Finished. Processed: ${processed}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
