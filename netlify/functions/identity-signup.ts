import type { Handler } from "@netlify/functions";
import { readSignup } from "./_shared/signup-check";

const handler: Handler = async (event) => {
  try {
    const user = readSignup(event);
    if (!user.role) return { statusCode: 422, body: JSON.stringify({ error: "Choose a coach or player account." }) };
    return {
      statusCode: 200,
      body: JSON.stringify({
        app_metadata: {
          ...(user.app_metadata ?? {}),
          roles: [user.role],
        },
      }),
    };
  } catch (error) {
    console.error("identity-signup", error);
    return { statusCode: 500, body: JSON.stringify({ error: "The account could not be created." }) };
  }
};

export { handler };
