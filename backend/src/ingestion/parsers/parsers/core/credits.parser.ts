import {ParsedCredits} from "../../types/core/parsed.credits.type.js";

/**
 * Parses a credit hours string into structured ParsedCredits format
 * Handles formats from sections, classes, and courses:
 * - Sections: "X.X hrs" or "X.X-Y.Y hrs"
 * - Classes: "X.X" or "X.X-Y.Y"
 * - Courses: "X.X" or "X.X - Y.Y" (with spaces around dash)
 *
 * @param creditsStr Credit hours string (e.g., "3.0 hrs", "1.0-3.0 hrs", "4.0", "1.0 - 3.0")
 * @returns ParsedCredits object with min and max credits
 */
export function parseCredits(creditsStr: string): ParsedCredits {
    // Handle empty string
    if (!creditsStr || creditsStr.trim() === '') {
        return { min: 0, max: 0 };
    }

    // Remove " hrs" suffix (case insensitive) and trim
    const cleaned = creditsStr.replace(/\s*hrs\s*$/i, '').trim();

    // Split on dash (with or without spaces around it)
    const parts = cleaned.split(/\s*-\s*/);

    if (parts.length === 1) {
        // Single value: min and max are the same
        const credits = parseFloat(parts[0]);
        return { min: credits, max: credits };
    } else if (parts.length === 2) {
        // Range: different min and max
        return {
            min: parseFloat(parts[0]),
            max: parseFloat(parts[1])
        };
    } else {
        // Invalid format, return zeros
        return { min: 0, max: 0 };
    }
}
