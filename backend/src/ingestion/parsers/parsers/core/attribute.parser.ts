import {ParsedAttributes} from "../../types/core/parsed.attributes.type.js";

/**
 * Parses an array of attribute strings into structured ParsedAttributes format
 * @param attributes Array of attribute strings
 * @returns ParsedAttributes object with axle and core arrays
 */
export function parseAttributes(attributes: string[]): ParsedAttributes {
    // Handle empty or invalid input
    if (!attributes || !Array.isArray(attributes) || attributes.length === 0) {
        return { axle: null, core: null };
    }

    const axle: string[] = [];
    const core: string[] = [];

    for (const attr of attributes) {
        const trimmed = attr.trim();

        // Check for AXLE attributes
        if (trimmed.startsWith('AXLE:')) {
            axle.push(trimmed);
        }
        // Check for Core attributes
        else if (
            trimmed.startsWith('CORE:') ||
            trimmed.startsWith('LE:') ||
            trimmed.startsWith('LA-') ||
            trimmed.startsWith('LB-')
        ) {
            core.push(trimmed);
        }
    }

    return {
        axle: axle.length > 0 ? axle : null,
        core: core.length > 0 ? core : null
    };
}
