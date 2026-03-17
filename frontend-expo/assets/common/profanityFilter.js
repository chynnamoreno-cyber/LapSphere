const DEFAULT_PROFANE_WORDS = [
    "fuck",
    "shit",
    "bitch",
    "asshole",
    "bastard",
    "dick",
    "pussy",
    "motherfucker",
];

const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const maskWord = (word) => "*".repeat(Math.max(String(word || "").length, 1));

export const sanitizeProfanity = (input, words = DEFAULT_PROFANE_WORDS) => {
    if (typeof input !== "string") return "";

    let output = input;
    words.forEach((term) => {
        const cleanTerm = String(term || "").trim();
        if (!cleanTerm) return;

        const pattern = new RegExp(`\\b${escapeRegExp(cleanTerm)}\\b`, "gi");
        output = output.replace(pattern, (match) => maskWord(match));
    });

    return output;
};
