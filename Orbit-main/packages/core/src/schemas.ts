export const STARTUP_CONTEXT_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "StartupContext",
  type: "object",
  properties: {
    workspaceId: { type: "string" },
    companyName: { type: "string" },
    founderProfile: {
      type: "object",
      properties: {
        vision: { type: "string" },
        technicalSkillLevel: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
        location: { type: "string" }
      },
      required: ["vision", "technicalSkillLevel", "location"]
    },
    business: {
      type: "object",
      properties: {
        niche: { type: "string" },
        targetMarket: { type: "string" },
        stage: { type: "string", enum: ["Research", "Validation", "Design", "Development", "GTM", "Live"] },
        validationScore: { type: "number" }
      },
      required: ["niche", "targetMarket", "stage", "validationScore"]
    }
  },
  required: ["workspaceId", "companyName", "founderProfile", "business"]
};

export const AGENT_MESSAGE_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "AgentMessage",
  type: "object",
  properties: {
    messageId: { type: "string" },
    sender: { type: "string" },
    recipient: { type: "string" },
    action: { type: "string" },
    payload: { type: "object" },
    requiresApproval: { type: "boolean" },
    approvalStatus: { type: "string", enum: ["Pending", "Approved", "Rejected", "Auto-Approved"] }
  },
  required: ["messageId", "sender", "recipient", "action", "payload", "requiresApproval", "approvalStatus"]
};
