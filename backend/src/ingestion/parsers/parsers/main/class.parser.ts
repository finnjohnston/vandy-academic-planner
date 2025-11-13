import {SemesterClass} from "../../../scrapers/types/class.type.js";
import {ParsedSemesterClass} from "../../types/main/parsed.class.type.js";
import {parseRequirements} from "../core/requirements.parser.js";
import {parseAttributes} from "../core/attribute.parser.js";
import {parseCredits} from "../core/credits.parser.js";

/**
 * Parses a scraped SemesterClass into a ParsedSemesterClass with structured data
 * @param semesterClass The scraped SemesterClass object
 * @returns ParsedSemesterClass with parsed credits, attributes, and requirements
 */
export async function parseClass(semesterClass: SemesterClass): Promise<ParsedSemesterClass> {
    const credits = parseCredits(semesterClass.details.hours || '');
    const attributes = parseAttributes(semesterClass.details.attributes);

    // Parse requirements using AI - needs class ID and description
    const requirements = await parseRequirements(
        semesterClass.id,
        semesterClass.details.description || ''
    );

    return {
        id: semesterClass.id,
        termId: semesterClass.termId,
        subject: semesterClass.subject,
        abbreviation: semesterClass.abbreviation,
        name: semesterClass.name,
        details: {
            school: semesterClass.details.school,
            credits,
            requirements,
            attributes,
            description: semesterClass.details.description
        }
    };
}
