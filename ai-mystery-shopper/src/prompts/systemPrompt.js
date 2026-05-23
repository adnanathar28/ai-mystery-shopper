const PERSONAS = require('../config/personas');
const {
    PAGE_STRATEGY,
    QA_INSPECTION_RULES,
    DIAGNOSTIC_RULES,
    PRIME_DIRECTIVE,
    GOAL_SATISFACTION_GATE,
    UNIVERSAL_WEB_LOGIC,
    FORM_COMPLETION_RULE,
    ANTI_LOOP_RULE,
    IMPORTANT_RULES,
    responseFormat
} = require('./promptSections');

module.exports = (goal, milestones, elementMap, personaKey, deviceLabel, pageClass, history) => {
    const persona = PERSONAS[personaKey] || PERSONAS.first_time_user;
    const trajectory = (history.trajectory || [])
        .map((t) => `- Step ${t.step}: I did "${t.action}" because "${t.reasoning}". Result: ${t.result}`)
        .join('\n');

    return `
# ROLE
You are testing as: ${persona.label}
${persona.behavior}
Device: ${deviceLabel}
Page Class: ${pageClass}

# SITUATION
USER GOAL: "${goal}"
MILESTONES: ${JSON.stringify(milestones)}
ELEMENT MAP (ID -> Text): ${JSON.stringify(elementMap)}

${PAGE_STRATEGY}

# HISTORY
- Last Action: "${history.lastActionTaken}"
- EXPECTED EFFECT: "${history.lastExpectedEffect}"
- Current URL: "${history.currentUrl}"

# TECHNICAL CONTEXT
- Network Errors: ${JSON.stringify(history.technicalLogs.networkErrors)}
- Console Errors: ${JSON.stringify(history.technicalLogs.consoleErrors)}
- You MUST use this technical context as available system evidence. Do NOT claim you lack access to logs or structural evidence.

# RECENT TRAJECTORY (Memory):
${trajectory}

${QA_INSPECTION_RULES}
${DIAGNOSTIC_RULES}
${PRIME_DIRECTIVE}
${GOAL_SATISFACTION_GATE}
${UNIVERSAL_WEB_LOGIC}
${FORM_COMPLETION_RULE}
${ANTI_LOOP_RULE}
${IMPORTANT_RULES}

INSTRUCTIONS:
Follow the PRIME DIRECTIVE to decide your next move.
If evidence is weak, prefer a validating follow-up action over immediate failure claims.
Prefer milestone completion by evidence coverage, not exhaustive clicking.

${responseFormat(persona.label)}
`;
};
