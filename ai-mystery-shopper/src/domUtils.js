// src/domUtils.js
module.exports = {
    markElements: async (page) => {
        return await page.evaluate(() => {
                    let idCounter = 1;
                    let map = {};
                    
                    document.querySelectorAll('.ai-marker').forEach(el => el.remove());
                    document.querySelectorAll('[data-ai-id]').forEach(el => el.removeAttribute('data-ai-id'));

                    const semanticSelector = 'button, a, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [role="option"], [role="checkbox"], [role="radio"], .modal-footer p, .modal [class*="close"], .modal [aria-label*="close" i], .close, .closebtn, .flash .close, [aria-label*="close" i], [title*="close" i]';
                    const semanticItems = Array.from(document.querySelectorAll(semanticSelector));

                    const allElements = document.querySelectorAll('div, span, li, img, h1, h2, h3, h4, h5, h6');
                    const pointerItems = Array.from(allElements).filter(el => {
                            const style = window.getComputedStyle(el);
                            const hasPointer = style.cursor === 'pointer';
                            const isVisible = style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
                            
                            // Ignore tiny "Scroll to Top" buttons often found at the bottom corners
                            const rect = el.getBoundingClientRect();
                            const isScrollToTop = rect.bottom > window.innerHeight - 50 && rect.width < 50;

                            return hasPointer && isVisible && !isScrollToTop;
                    });

                    const modalCloseTextItems = Array.from(document.querySelectorAll('.modal *')).filter(el => {
                            const txt = (el.textContent || '').trim().toLowerCase();
                            const isCloseText = txt === 'close' || txt === 'x' || txt.includes('close');
                            const rect = el.getBoundingClientRect();
                            const style = window.getComputedStyle(el);
                            const visible = style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
                            return isCloseText && visible && rect.width > 2 && rect.height > 2;
                    });

                    const allItems = [...new Set([...semanticItems, ...pointerItems, ...modalCloseTextItems])];

                    let validCount = 0;
                    
                    allItems.forEach(el => {
                        const rect = el.getBoundingClientRect();
                        const style = window.getComputedStyle(el);
                        const closeHint = `${el.getAttribute('class') || ''} ${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${(el.textContent || '').trim()}`.toLowerCase();
                        const isCloseControl =
                            closeHint.includes('close') ||
                            closeHint === 'x' ||
                            closeHint.endsWith(' x') ||
                            closeHint.startsWith('x ');
                        const minSize = isCloseControl ? 8 : 2;

                        if (rect.width > minSize && rect.height > minSize && 
                            style.visibility !== 'hidden' && 
                            style.display !== 'none' && 
                            style.opacity !== '0') {
                            
                            const isInsideModal = el.closest('.modal, [role="dialog"], #orderModal');
                            const centerX = rect.left + rect.width / 2;
                            const centerY = rect.top + rect.height / 2;
                            const topElement = document.elementFromPoint(centerX, centerY);

                            const pointMatchesElement = (x, y) => {
                                const hit = document.elementFromPoint(x, y);
                                return !!(hit && (el.contains(hit) || hit.contains(el)));
                            };

                            let markerX = centerX;
                            let markerY = centerY;
                            let hasClickablePoint = pointMatchesElement(centerX, centerY);

                            // Tiny/absolute close controls can miss center hit-testing.
                            // Probe nearby points and anchor marker to a validated clickable point.
                            if (!hasClickablePoint && isCloseControl) {
                                const pad = 1;
                                const probePoints = [
                                    [rect.left + pad, rect.top + pad],
                                    [rect.right - pad, rect.top + pad],
                                    [rect.left + pad, rect.bottom - pad],
                                    [rect.right - pad, rect.bottom - pad],
                                    [rect.left + rect.width * 0.25, rect.top + rect.height * 0.25],
                                    [rect.left + rect.width * 0.75, rect.top + rect.height * 0.25],
                                    [rect.left + rect.width * 0.25, rect.top + rect.height * 0.75],
                                    [rect.left + rect.width * 0.75, rect.top + rect.height * 0.75]
                                ];

                                for (const [px, py] of probePoints) {
                                    if (pointMatchesElement(px, py)) {
                                        markerX = px;
                                        markerY = py;
                                        hasClickablePoint = true;
                                        break;
                                    }
                                }
                            }

                            const isVisibleAtPoint =
                                isInsideModal ||
                                hasClickablePoint ||
                                (topElement && (el.contains(topElement) || topElement.contains(el)));

                            if (isVisibleAtPoint) {
                                el.setAttribute('data-ai-id', idCounter);
                                
                                let label = el.innerText || el.getAttribute('aria-label') || el.getAttribute('name') || el.getAttribute('placeholder') || el.getAttribute('title') || "";
                                const tagName = el.tagName.toUpperCase();
                                const inputType = (el.getAttribute('type') || '').toLowerCase();
                                const idNameHint = `${el.getAttribute('id') || ''} ${el.getAttribute('name') || ''} ${el.getAttribute('placeholder') || ''}`.toLowerCase();
                                const isSensitiveField =
                                    inputType === 'password' ||
                                    inputType === 'tel' ||
                                    idNameHint.includes('otp') ||
                                    idNameHint.includes('code') ||
                                    idNameHint.includes('cvv') ||
                                    idNameHint.includes('card') ||
                                    idNameHint.includes('ssn');

                                if (!isSensitiveField && (tagName === 'INPUT' || tagName === 'TEXTAREA') && typeof el.value === 'string' && el.value.trim()) {
                                    label = `${label ? label + ': ' : ''}${el.value}`;
                                }

                                if (!label || label.trim().length === 0) label = tagName === 'INPUT' ? "Input Field" : "Icon/Button";
                                label = label.substring(0, 60).replace(/\n/g, ' ').trim();
                                
                                map[idCounter] = `<${el.tagName.toLowerCase()}> ${label}`;

                                const badge = document.createElement('div');
                                badge.className = 'ai-marker';
                                badge.textContent = idCounter;
                                badge.style.position = 'absolute';
                                badge.style.left = (window.scrollX + markerX) + 'px';
                                badge.style.top = (window.scrollY + markerY) + 'px';
                                badge.style.backgroundColor = '#ff0000';
                                badge.style.color = 'white';
                                badge.style.fontSize = '12px';
                                badge.style.fontWeight = 'bold';
                                badge.style.zIndex = '2147483647';
                                badge.style.padding = '2px 4px';
                                badge.style.borderRadius = '4px';
                                badge.style.pointerEvents = 'none'; 
                                badge.style.boxShadow = '0 0 2px white';
                                document.body.appendChild(badge);
                                
                                idCounter++;
                                validCount++;
                            }
                        }
                    });
            return { count: validCount, elementMap: map };
        });
    },
    cleanupMarkers: async (page) => {
        await page.evaluate(() => {
            document.querySelectorAll('.ai-marker').forEach(el => el.remove());
        });
    }
};
