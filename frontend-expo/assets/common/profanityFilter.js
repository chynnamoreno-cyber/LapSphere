const DEFAULT_PROFANE_WORDS = [
    "fuck",
    "shit",
    "bitch",
    "asshole",
    "bastard",
    "dick",
    "pussy",
    "motherfucker",
    "cunt",
    "damn",
    "hell",
];

const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const maskWord = (word) => "*".repeat(Math.max(String(word || "").length, 1));

// Create a pattern that matches words with repeated characters
// E.g., "fuuuccckkk" matches "fuck", "shiiit" matches "shit"
const buildFlexiblePattern = (term) => {
    const escaped = escapeRegExp(term);
    // Replace each character with pattern allowing 1+ of that character
    // This converts "fuck" to "f+u+c+k+" to match "fuuuccckkk"
    const flexible = escaped.split("").map(char => `${char}+`).join("");
    return new RegExp(flexible, "gi");
};

export const sanitizeProfanity = (input, words = DEFAULT_PROFANE_WORDS) => {
    if (typeof input !== "string") return "";

    let output = input;
    words.forEach((term) => {
        const cleanTerm = String(term || "").trim();
        if (!cleanTerm) return;

        // Try word boundary match first (for regular words)
        const strictPattern = new RegExp(`\\b${escapeRegExp(cleanTerm)}\\b`, "gi");
        output = output.replace(strictPattern, (match) => maskWord(match));

        // Then try flexible pattern (for repeated characters like "fuuuckkk")
        const flexiblePattern = buildFlexiblePattern(cleanTerm);
        output = output.replace(flexiblePattern, (match) => maskWord(match));
    });

    return output;
};
