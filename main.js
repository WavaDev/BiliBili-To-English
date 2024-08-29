const translationCache = {};

const ongoingRequests = {};

const MAX_TRANSLATION_LENGTH = 800;

function replaceText() {
    const textNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;

    while (node = textNodes.nextNode()) {
        const parentElement = node.parentElement;
        let originalText = node.nodeValue.trim();

        if (parentElement.id === 'h-name' || node.processed) continue;

        if (originalText !== '') {
            if (translationCache[originalText]) {
                node.nodeValue = translationCache[originalText];
                node.processed = true;
            } else if (!ongoingRequests[originalText]) {
                let translatedText = dictionary[originalText.toLowerCase()];

                if (translatedText) {
                    node.nodeValue = translatedText;
                    translationCache[originalText] = translatedText;
                    node.processed = true;
                    setTimeout(() => {
                        delete translationCache[originalText];
                    }, 600000);
                } else {
                    ongoingRequests[originalText] = true;
                    translateText(node, originalText);
                }
            }
        }
    }
    
    const inputElements = document.querySelectorAll('input[placeholder], textarea[placeholder]');
    inputElements.forEach(element => {
        if (element.dataset.processed) return;
        
        const originalPlaceholder = element.placeholder.trim();

        if (originalPlaceholder !== '') {
            if (translationCache[originalPlaceholder]) {
                element.placeholder = translationCache[originalPlaceholder];
                element.dataset.processed = true; // Mark element as processed
            } else if (!ongoingRequests[originalPlaceholder]) {
                let translatedPlaceholder = dictionary[originalPlaceholder.toLowerCase()];

                if (translatedPlaceholder) {
                    element.placeholder = translatedPlaceholder;
                    translationCache[originalPlaceholder] = translatedPlaceholder;
                    element.dataset.processed = true;
                    setTimeout(() => {
                        delete translationCache[originalPlaceholder];
                    }, 600000);
                } else {
                    ongoingRequests[originalPlaceholder] = true;
                    translatePlaceholderText(element, originalPlaceholder);
                }
            }
        }
    });

    const contentsElement = document.getElementById('contents');
    if (contentsElement) {
        const spanElements = contentsElement.querySelectorAll('span');
        spanElements.forEach(span => {
            const originalSpanText = span.textContent.trim();

            if (originalSpanText !== '' && !span.dataset.processed) {
                if (translationCache[originalSpanText]) {
                    span.textContent = translationCache[originalSpanText];
                    span.dataset.processed = true;
                } else if (!ongoingRequests[originalSpanText]) {
                    ongoingRequests[originalSpanText] = true;
                    translateText(span, originalSpanText);
                }
            }
        });
    }

    const commentElement = document.getElementById('comment');
    if (commentElement) {
        const commentTextNodes = document.createTreeWalker(commentElement, NodeFilter.SHOW_TEXT, null, false);
        let commentNode;

        while (commentNode = commentTextNodes.nextNode()) {
            let commentOriginalText = commentNode.nodeValue.trim();

            if (commentOriginalText !== '' && !commentNode.processed) {
                if (translationCache[commentOriginalText]) {
                    commentNode.nodeValue = translationCache[commentOriginalText];
                    commentNode.processed = true;
                } else if (!ongoingRequests[commentOriginalText]) {
                    ongoingRequests[commentOriginalText] = true;
                    translateText(commentNode, commentOriginalText);
                }
            }
        }
    }
}

function isTextNodeInViewport(node) {
    const rect = node.parentElement.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

async function translateText(node, text) {
    try {
        const chunks = splitTextIntoChunks(text, MAX_TRANSLATION_LENGTH);
        const translatedChunks = [];

        for (const chunk of chunks) {
            const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(chunk)}`);
            const data = await response.json();

            if (data && data[0] && data[0][0] && data[0][0][0]) {
                translatedChunks.push(data[0][0][0]);
            }
        }

        const translatedText = translatedChunks.join(' ');
        node.nodeValue = translatedText;
        translationCache[text] = translatedText;
        node.processed = true;

        setTimeout(() => {
            delete translationCache[text];
        }, 600000);

        delete ongoingRequests[text];
    } catch (error) {
        console.error("Translation error:", error);
        setTimeout(() => {
            delete ongoingRequests[text];
        }, 500);
    }
}

async function translatePlaceholderText(element, text) {
    try {
        const chunks = splitTextIntoChunks(text, MAX_TRANSLATION_LENGTH);
        const translatedChunks = [];

        for (const chunk of chunks) {
            const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(chunk)}`);
            const data = await response.json();

            if (data && data[0] && data[0][0] && data[0][0][0]) {
                translatedChunks.push(data[0][0][0]);
            }
        }

        const translatedPlaceholder = translatedChunks.join(' ');
        element.placeholder = translatedPlaceholder;
        translationCache[text] = translatedPlaceholder;
        element.dataset.processed = true;

        setTimeout(() => {
            delete translationCache[text];
        }, 600000);

        delete ongoingRequests[text];
    } catch (error) {
        console.error("Translation error:", error);
        setTimeout(() => {
            delete ongoingRequests[text];
        }, 500);
    }
}

function splitTextIntoChunks(text, maxLength) {
    const chunks = [];
    let currentChunk = '';

    text.split(' ').forEach(word => {
        if ((currentChunk + ' ' + word).length > maxLength) {
            chunks.push(currentChunk.trim());
            currentChunk = word;
        } else {
            currentChunk += ' ' + word;
        }
    });

    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

async function initialize() {
    replaceText();
}

setInterval(function() {
    replaceText();
}, 500);

initialize();
