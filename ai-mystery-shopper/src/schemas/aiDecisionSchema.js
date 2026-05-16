const { z } = require('zod');

const AIDecisionSchema = z.object({
  verification_verdict: z.enum(['VERIFIED_SUCCESS', 'VERIFICATION_FAILED']),
  verification_reasoning: z.string().min(1),
  current_page_description: z.string().min(1),
  current_milestone: z.string().min(1),
  action: z.enum(['click', 'type', 'scroll', 'submit', 'finish', 'select']),
  elementId: z.coerce.number().int().optional(),
  text: z.string().optional().default(''),
  option: z.string().optional(),
  reasoning: z.string().min(1),
  expected_effect: z.string().min(1),
  frustration_level: z.coerce.number().min(0).max(10),
  diagnosis: z.enum([
    'Healthy',
    'Dead Link',
    'Broken Navigation',
    'Missing Route',
    'Backend Failure',
    'Frontend Failure',
    'UI Glitch',
    'Stuck',
    'CRITICAL_FAILURE'
  ]),
  severity: z.enum(['None', 'Low', 'Medium', 'High', 'Critical'])
}).superRefine((decision, ctx) => {
  const needsPositiveId = ['click', 'type', 'select', 'submit'].includes(decision.action);
  const allowsMissingOrSentinel = ['scroll', 'finish'].includes(decision.action);

  if (needsPositiveId) {
    if (decision.elementId === undefined || decision.elementId <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['elementId'],
        message: `${decision.action} requires a positive elementId`
      });
    }
  }

  if (allowsMissingOrSentinel && decision.elementId !== undefined && decision.elementId < -1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['elementId'],
      message: `${decision.action} allows elementId of -1 or no elementId`
    });
  }
});

function normalizeDecisionShape(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const normalized = { ...raw };

  // Common model drift aliases
  if (normalized.frustrationLevel !== undefined && normalized.frustration_level === undefined) {
    normalized.frustration_level = normalized.frustrationLevel;
  }
  if (normalized.expectedEffect !== undefined && normalized.expected_effect === undefined) {
    normalized.expected_effect = normalized.expectedEffect;
  }
  if (normalized.currentMilestone !== undefined && normalized.current_milestone === undefined) {
    normalized.current_milestone = normalized.currentMilestone;
  }
  if (normalized.currentPageDescription !== undefined && normalized.current_page_description === undefined) {
    normalized.current_page_description = normalized.currentPageDescription;
  }
  if (normalized.diagnosis === 'Backend Error') {
    normalized.diagnosis = 'Backend Failure';
  }
  if (normalized.diagnosis === 'Frontend Crash') {
    normalized.diagnosis = 'Frontend Failure';
  }
  if (normalized.text === null || normalized.text === undefined) {
    normalized.text = '';
  }
  if (normalized.elementId === null) {
    normalized.elementId = undefined;
  }

  return normalized;
}

module.exports = {
  AIDecisionSchema,
  normalizeDecisionShape
};
