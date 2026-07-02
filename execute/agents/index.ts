// export * from "./instruction-classifier-agent.js";
// export * from "./mutation-agent.js";
// export * from "./query-agent.js";

// agents/index.ts
import classifyInstruction from "./instruction-classifier-agent.js";
import mutationAgent from "./mutation-agent.js";
import queryAgent from "./query-agent.js";

// Bundle your agents into a structured object
const agents = {
  classifyInstruction,
  mutationAgent,
  queryAgent,
  // You can easily add more agents here later:
  // coder: codeAgent,
  // writer: writeAgent,
};

// Export the bundle as the default export
export default agents;
