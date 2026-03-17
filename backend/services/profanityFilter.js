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

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function maskWord(word) {
  const length = String(word || "").length;
  return "*".repeat(Math.max(length, 1));
}

function sanitizeProfanity(input, words = DEFAULT_PROFANE_WORDS) {
  if (typeof input !== "string") return "";
  let output = input;

  for (const term of words) {
    const cleanTerm = String(term || "").trim();
    if (!cleanTerm) continue;

    const pattern = new RegExp(`\\b${escapeRegExp(cleanTerm)}\\b`, "gi");
    output = output.replace(pattern, (match) => maskWord(match));
  }

  return output;
}

module.exports = {
  sanitizeProfanity,
};
