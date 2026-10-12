import type { Handler } from "@netlify/functions";
import { createMembership, signupUser } from "./_shared/signup";

const handler: Handler = async (event) => {
  try {
    const user = signupUser(event.body);
    const result = await createMembership(user);
    if (typeof result === "string") return { statusCode: 422, body: result };
    return {
      statusCode: 200,
      body: JSON.stringify({
        app_metadata: {
          ...(user.app_metadata ?? {}),
          roles: result.roles,
        },
      }),
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: "The team could not be created. Try again." };
  }
};

export { handler };
