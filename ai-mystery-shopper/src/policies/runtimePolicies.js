function isJsAlertsPage(url) {
    return /\/javascript_alerts(?:\/)?$/i.test(url || '');
}

function getDeterministicMilestonesForUrl(url) {
    if (!isJsAlertsPage(url)) return null;
    return [
        'Click JS Alert trigger.',
        'Verify alert outcome text appears and interaction remains stable.',
        'Click JS Confirm trigger and accept.',
        'Verify result shows confirm accepted (Ok).',
        'Click JS Confirm trigger and cancel.',
        'Verify result shows confirm cancelled.',
        'Click JS Prompt trigger, enter sample text, and accept.',
        'Verify result shows entered prompt text.',
        'Click JS Prompt trigger and cancel.',
        'Verify result shows prompt cancellation.'
    ];
}

function findDialogTriggerId(elementMap, dialogKind) {
    const mapEntries = Object.entries(elementMap || {});
    const kindNeedle = dialogKind === 'prompt' ? 'js prompt' : (dialogKind === 'confirm' ? 'js confirm' : 'js alert');
    const exact = mapEntries.find(([, label]) => String(label || '').toLowerCase().includes(kindNeedle));
    if (exact) return Number(exact[0]);
    const generic = mapEntries.find(([, label]) => String(label || '').toLowerCase().includes('click for js'));
    return generic ? Number(generic[0]) : null;
}

function normalizeDialogActionToClick(decision, elementMap) {
    if (!decision || !['accept_dialog', 'dismiss_dialog', 'prompt_dialog'].includes(decision.action)) {
        return decision;
    }

    const milestoneText = `${decision.current_milestone || ''} ${decision.reasoning || ''}`.toLowerCase();
    const dialogKind = milestoneText.includes('prompt')
        ? 'prompt'
        : milestoneText.includes('confirm')
            ? 'confirm'
            : 'alert';

    const dialogButtonId = findDialogTriggerId(elementMap, dialogKind);
    if (!dialogButtonId) return decision;

    return {
        ...decision,
        action: 'click',
        elementId: dialogButtonId,
        reasoning: `${decision.reasoning || ''} [Dialog action normalized to click trigger]`.trim()
    };
}

function shouldNeverNoveltySkipDialogFamily(familyKey, decisionText) {
    const text = (decisionText || '').toLowerCase();
    return (
        familyKey.includes('js alert') ||
        familyKey.includes('js confirm') ||
        familyKey.includes('js prompt') ||
        text.includes('javascript alert') ||
        text.includes('javascript confirm') ||
        text.includes('javascript prompt') ||
        text.includes('js alert') ||
        text.includes('js confirm') ||
        text.includes('js prompt')
    );
}

function updateJsDialogOutcomes(resultText, outcomeSet) {
    const text = (resultText || '').toLowerCase();
    if (text.includes('successfuly clicked an alert')) outcomeSet.add('alert');
    if (text.includes('you clicked: ok')) outcomeSet.add('confirm_ok');
    if (text.includes('you clicked: cancel')) outcomeSet.add('confirm_cancel');
    if (text.includes('you entered: null')) outcomeSet.add('prompt_cancel');
    if (text.includes('you entered:') && !text.includes('null')) outcomeSet.add('prompt_text');
}

function hasAllJsDialogOutcomes(outcomeSet) {
    const required = ['alert', 'confirm_ok', 'confirm_cancel', 'prompt_text', 'prompt_cancel'];
    return required.every((k) => outcomeSet.has(k));
}

module.exports = {
    isJsAlertsPage,
    getDeterministicMilestonesForUrl,
    findDialogTriggerId,
    normalizeDialogActionToClick,
    shouldNeverNoveltySkipDialogFamily,
    updateJsDialogOutcomes,
    hasAllJsDialogOutcomes
};
