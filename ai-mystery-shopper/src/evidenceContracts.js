function safeNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function evaluateClickNavigate(evidence) {
  const reasons = [];
  let score = 0;

  if (evidence.hasSevereConsoleError || evidence.has5xx) {
    return { verdict: 'failed', confidence: 0.95, reasons: ['Runtime/server failure signals detected.'] };
  }

  if (evidence.urlChanged) { score += 0.55; reasons.push('URL changed after click.'); }
  if (evidence.visualMutation) { score += 0.2; reasons.push('Visual mutation observed.'); }
  if (evidence.localMutationEvidence) { score += 0.15; reasons.push('Local target/container mutation observed.'); }
  if (evidence.structuralMutation) { score += 0.1; reasons.push('Structural mutation observed.'); }

  if (score >= 0.6) return { verdict: 'matched', confidence: Math.min(score, 0.99), reasons };
  if (score <= 0.15) return { verdict: 'failed', confidence: 0.7, reasons: reasons.length ? reasons : ['No meaningful signal after click.'] };
  return { verdict: 'inconclusive', confidence: 0.5, reasons: reasons.length ? reasons : ['Weak click evidence.'] };
}

function evaluateSubmitForm(evidence) {
  if (evidence.hasSevereConsoleError || evidence.has5xx) {
    return { verdict: 'failed', confidence: 0.95, reasons: ['Runtime/server failure during submit.'] };
  }
  if (evidence.submitTransitioned) {
    return { verdict: 'matched', confidence: 0.9, reasons: ['Submit transition signal observed.'] };
  }
  if (evidence.localMutationEvidence || evidence.structuralMutation) {
    return { verdict: 'inconclusive', confidence: 0.55, reasons: ['Submit caused local/structural change without clear transition.'] };
  }
  return { verdict: 'failed', confidence: 0.8, reasons: ['Submit produced no transition or meaningful mutation.'] };
}

function evaluateToggleState(evidence) {
  if (evidence.toggleStateChanged || evidence.elementValueChanged) {
    return { verdict: 'matched', confidence: 0.92, reasons: ['Toggle/value state changed.'] };
  }
  if (evidence.localMutationEvidence || evidence.structuralMutation) {
    return { verdict: 'inconclusive', confidence: 0.55, reasons: ['Indirect mutation observed without direct toggle confirmation.'] };
  }
  return { verdict: 'failed', confidence: 0.75, reasons: ['No toggle/value mutation detected.'] };
}

function evaluateSelectOption(evidence) {
  if (evidence.hasSevereConsoleError || evidence.has5xx) {
    return { verdict: 'failed', confidence: 0.95, reasons: ['Runtime/server failure during select.'] };
  }
  if (evidence.elementValueChanged || evidence.localMutationEvidence) {
    return { verdict: 'matched', confidence: 0.85, reasons: ['Select value/local mutation detected.'] };
  }
  if (evidence.structuralMutation || evidence.visualMutation) {
    return { verdict: 'inconclusive', confidence: 0.55, reasons: ['General mutation observed after select.'] };
  }
  return { verdict: 'failed', confidence: 0.7, reasons: ['No select-related mutation detected.'] };
}

function evaluateTypeInput(evidence) {
  if (evidence.elementValueChanged) {
    return { verdict: 'matched', confidence: 0.95, reasons: ['Input value changed.'] };
  }
  if (evidence.localMutationEvidence) {
    return { verdict: 'inconclusive', confidence: 0.5, reasons: ['Local mutation observed without explicit value delta.'] };
  }
  return { verdict: 'failed', confidence: 0.75, reasons: ['Typed input did not change observable value.'] };
}

function selectContract(decision, evidence) {
  if (decision?.action === 'submit') return 'submit_form';
  if (decision?.action === 'select') return 'select_option';
  if (decision?.action === 'type') return 'type_input';
  if (decision?.action === 'click' && evidence?.wasToggleTarget) return 'toggle_state';
  if (decision?.action === 'click') return 'click_navigate';
  return 'none';
}

function evaluateContract(decision, evidence) {
  const contractId = selectContract(decision, evidence);
  let result;
  switch (contractId) {
    case 'submit_form':
      result = evaluateSubmitForm(evidence);
      break;
    case 'select_option':
      result = evaluateSelectOption(evidence);
      break;
    case 'type_input':
      result = evaluateTypeInput(evidence);
      break;
    case 'toggle_state':
      result = evaluateToggleState(evidence);
      break;
    case 'click_navigate':
      result = evaluateClickNavigate(evidence);
      break;
    default:
      result = { verdict: 'inconclusive', confidence: 0.4, reasons: ['No applicable contract.'] };
  }

  return {
    contractId,
    verdict: result.verdict,
    confidence: Math.max(0, Math.min(1, safeNum(result.confidence, 0.4))),
    reasons: Array.isArray(result.reasons) ? result.reasons : []
  };
}

module.exports = {
  evaluateContract
};
