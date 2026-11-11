import { getFunctions, httpsCallable } from "firebase/functions";

/**
 * Resolve a GO7 agent via Cloud Function (works before vendor login).
 */
export async function lookupAgent(agentInput) {
  const raw = String(agentInput || "").trim();
  if (!raw) {
    return { found: false, error: null };
  }

  try {
    const fn = httpsCallable(getFunctions(), "verifyAgentReferral");
    const result = await fn({ agentId: raw });
    const data = result.data || {};

    if (data.found) {
      return {
        found: true,
        agentId: data.agentId,
        agent: { id: data.agentId, name: data.agentName },
      };
    }

    return { found: false, error: data.error || "Agent ID not found" };
  } catch (err) {
    console.error("lookupAgent:", err);
    return { found: false, error: "Could not verify agent ID. Try again." };
  }
}
