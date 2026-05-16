async function sanitizeDecision(page, decision) {
  const targetActions = new Set(['click', 'type', 'select', 'submit']);
  const action = decision?.action;
  const needsTarget = targetActions.has(action);

  const fallbackDecision = (reason) => ({
    ...decision,
    verification_verdict: 'VERIFICATION_FAILED',
    verification_reasoning: reason,
    current_milestone: decision?.current_milestone || 'Recovery',
    action: 'scroll',
    elementId: undefined,
    reasoning: `Sanitizer fallback: ${reason}`,
    expected_effect: 'Reveal additional UI context to recover.',
    frustration_level: Math.max(4, Number(decision?.frustration_level || 0)),
    diagnosis: 'Stuck',
    severity: 'Medium'
  });

  const getLocatorByAction = (a) => {
    if (a === 'type') return page.locator('input, textarea, [contenteditable="true"]').first();
    if (a === 'select') return page.locator('select').first();
    if (a === 'submit') {
      return page.locator(
        'button[type="submit"], input[type="submit"], button:has-text("Sign up"), button:has-text("Signup"), button:has-text("Register"), button:has-text("Create Account"), button:has-text("Login"), a:has-text("Sign up"), a:has-text("Signup")'
      ).first();
    }
    return page.locator('button, a, [role="button"], input[type="button"], input[type="submit"]').first();
  };

  const findDataAiId = async (locator) => {
    try {
      const v = await locator.getAttribute('data-ai-id');
      if (!v) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    } catch (_) {
      return undefined;
    }
  };

  const tagNameOf = async (locator) => {
    try {
      return await locator.evaluate((el) => el.tagName.toLowerCase());
    } catch (_) {
      return null;
    }
  };

  const isDisabled = async (locator) => {
    try {
      return await locator.evaluate((el) => !!el.disabled || el.getAttribute('aria-disabled') === 'true');
    } catch (_) {
      return true;
    }
  };

  if (!needsTarget) {
    return { ok: true, decision };
  }

  let locator = null;
  let exists = false;
  let visible = false;

  if (decision?.elementId !== undefined && decision?.elementId !== null) {
    locator = page.locator(`[data-ai-id="${decision.elementId}"]`).first();
    exists = (await locator.count()) > 0;
    visible = exists ? await locator.isVisible().catch(() => false) : false;
  }

  const validateActionElementCombo = async (loc) => {
    const tag = await tagNameOf(loc);
    if (!tag) return { ok: false, reason: 'Unable to inspect target element tag.' };

    if (action === 'type') {
      const editable = await loc.evaluate(
        (el) => el.tagName.toLowerCase() === 'input' || el.tagName.toLowerCase() === 'textarea' || el.getAttribute('contenteditable') === 'true'
      ).catch(() => false);
      if (!editable) return { ok: false, reason: 'Type action target is not input/textarea/contenteditable.' };
    }

    if (action === 'select' && tag !== 'select') {
      return { ok: false, reason: 'Select action target is not a <select> element.' };
    }

    if (action === 'click') {
      const disabled = await isDisabled(loc);
      if (disabled) return { ok: false, reason: 'Click action target is disabled.' };
    }

    if (action === 'submit') {
      const submitCapable = await loc.evaluate((el) => {
        const tagName = el.tagName.toLowerCase();
        const type = (el.getAttribute('type') || '').toLowerCase();
        return type === 'submit' || tagName === 'button' || tagName === 'a' || type === 'button';
      }).catch(() => false);
      if (!submitCapable) return { ok: false, reason: 'Submit action target is not submit-capable.' };
    }

    return { ok: true };
  };

  if (exists && visible) {
    const combo = await validateActionElementCombo(locator);
    if (combo.ok) return { ok: true, decision };
  }

  const candidate = getLocatorByAction(action);
  const candidateExists = (await candidate.count()) > 0;
  const candidateVisible = candidateExists ? await candidate.isVisible().catch(() => false) : false;

  if (candidateExists && candidateVisible) {
    const combo = await validateActionElementCombo(candidate);
    if (combo.ok) {
      const repairedId = await findDataAiId(candidate);
      const repaired = {
        ...decision,
        elementId: repairedId,
        reasoning: `${decision.reasoning || ''} [Sanitizer repaired target]`.trim()
      };
      return { ok: true, repaired: true, reason: 'Invalid target repaired by sanitizer.', decision: repaired };
    }
  }

  if (action === 'submit') {
    const submitExists = (await getLocatorByAction('submit').count()) > 0;
    const submitVisible = submitExists ? await getLocatorByAction('submit').isVisible().catch(() => false) : false;
    if (submitExists && submitVisible) {
      return {
        ok: true,
        repaired: true,
        reason: 'Submit target ID invalid; using generic submit locator fallback.',
        decision: { ...decision, elementId: undefined }
      };
    }
  }

  const reason = `${action} target invalid/unavailable (missing, hidden, stale, or wrong type).`;
  return { ok: false, reason, fallbackDecision: fallbackDecision(reason) };
}

module.exports = { sanitizeDecision };

