import type { Handler } from "@netlify/functions";
import { readSignup, signupProblem } from "./_shared/signup-check";

const handler: Handler = async (event) => {
  try {
    const problem = signupProblem(readSignup(event));
    if (problem) return { statusCode: 422, body: JSON.stringify({ error: problem }) };
    return { statusCode: 200 };
  } catch (error) {
    console.error("identity-validate", error);
    return { statusCode: 422, body: JSON.stringify({ error: "Courtside could not check that account. Try again." }) };
  }
};

export { handler };
