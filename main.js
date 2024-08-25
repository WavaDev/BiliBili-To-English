// Cache for storing translated text for 10 minutes
const translationCache = {};

// Track ongoing translation requests to prevent duplicate requests
const ongoingRequests = {};

// Maximum length for a single translation request
const MAX_TRANSLATION_LENGTH = 800; // Adjust as needed based on API limits

// Function to replace text instantly
function replaceText() {
    const textNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;

    while (node = textNodes.nextNode()) {
        const parentElement = node.parentElement;
        let originalText = node.nodeValue.trim();

        // Skip translation for the element with ID 'h-name'
        if (parentElement.id === 'h-name' || node.processed) continue;

        if (originalText !== '') {
            if (translationCache[originalText]) {
                node.nodeValue = translationCache[originalText];
                node.processed = true; // Mark node as processed
            } else if (!ongoingRequests[originalText]) {
                let translatedText = dictionary[originalText.toLowerCase()];

                if (translatedText) {
                    node.nodeValue = translatedText;
                    translationCache[originalText] = translatedText;
                    node.processed = true; // Mark node as processed
                    setTimeout(() => {
                        delete translationCache[originalText];
                    }, 600000); // Clear cache after 10 minutes (10 mins = 600000 ms)
                } else {
                    ongoingRequests[originalText] = true; // Mark as ongoing request
                    translateText(node, originalText);
                }
            }
        }
    }

    // Translate placeholders for input and textarea elements
    const inputElements = document.querySelectorAll('input[placeholder], textarea[placeholder]');
    inputElements.forEach(element => {
        if (element.dataset.processed) return; // Skip if already processed

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
                    element.dataset.processed = true; // Mark element as processed
                    setTimeout(() => {
                        delete translationCache[originalPlaceholder];
                    }, 600000); // Clear cache after 10 minutes (10 mins = 600000 ms)
                } else {
                    ongoingRequests[originalPlaceholder] = true; // Mark as ongoing request
                    translatePlaceholderText(element, originalPlaceholder);
                }
            }
        }
    });

    // Explicitly translate text inside <p> with id "contents" and any child <span>
    const contentsElement = document.getElementById('contents');
    if (contentsElement) {
        const spanElements = contentsElement.querySelectorAll('span');
        spanElements.forEach(span => {
            const originalSpanText = span.textContent.trim();

            if (originalSpanText !== '' && !span.dataset.processed) {
                if (translationCache[originalSpanText]) {
                    span.textContent = translationCache[originalSpanText];
                    span.dataset.processed = true; // Mark span as processed
                } else if (!ongoingRequests[originalSpanText]) {
                    ongoingRequests[originalSpanText] = true; // Mark as ongoing request
                    translateText(span, originalSpanText);
                }
            }
        });
    }

    // Explicitly translate text inside div with id "comment"
    const commentElement = document.getElementById('comment');
    if (commentElement) {
        const commentTextNodes = document.createTreeWalker(commentElement, NodeFilter.SHOW_TEXT, null, false);
        let commentNode;

        while (commentNode = commentTextNodes.nextNode()) {
            let commentOriginalText = commentNode.nodeValue.trim();

            if (commentOriginalText !== '' && !commentNode.processed) {
                if (translationCache[commentOriginalText]) {
                    commentNode.nodeValue = translationCache[commentOriginalText];
                    commentNode.processed = true; // Mark node as processed
                } else if (!ongoingRequests[commentOriginalText]) {
                    ongoingRequests[commentOriginalText] = true; // Mark as ongoing request
                    translateText(commentNode, commentOriginalText);
                }
            }
        }
    }
}

// Function to check if a text node is in the viewport
function isTextNodeInViewport(node) {
    const rect = node.parentElement.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Function to translate text to English using Google Translate
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
        node.processed = true; // Mark node as processed

        setTimeout(() => {
            delete translationCache[text];
        }, 600000); // Clear cache after 10 minutes (10 mins = 600000 ms)

        delete ongoingRequests[text]; // Remove from ongoing requests
    } catch (error) {
        console.error("Translation error:", error);
        setTimeout(() => {
            delete ongoingRequests[text]; // Retry translation after 0.5 seconds if failed
        }, 500);
    }
}

// Function to translate placeholder text to English using Google Translate
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
        element.dataset.processed = true; // Mark element as processed

        setTimeout(() => {
            delete translationCache[text];
        }, 600000); // Clear cache after 10 minutes (10 mins = 600000 ms)

        delete ongoingRequests[text]; // Remove from ongoing requests
    } catch (error) {
        console.error("Translation error:", error);
        setTimeout(() => {
            delete ongoingRequests[text]; // Retry translation after 0.5 seconds if failed
        }, 500);
    }
}

// Function to split text into smaller chunks to avoid request blocking
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

// Initial dictionary update and text replacement on page load
async function initialize() {
    replaceText(); // Start replacing text
}

// Periodically check for updates and replace text
setInterval(function() {
    replaceText();
}, 500); // Check every 0.5 seconds for updates

// Initialize the script
initialize();
