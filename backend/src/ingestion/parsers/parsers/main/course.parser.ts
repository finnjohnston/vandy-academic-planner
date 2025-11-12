import {CatalogCourse} from "../../../scrapers/types/course.type.js";
import {ParsedCatalogCourse} from "../../types/main/parsed.course.type.js";
import {parseRequirements} from "../core/requirements.parser.js";
import {parseAttributes} from "../core/attribute.parser.js";
import {parseCredits} from "../core/credits.parser.js";

/**
 * Parses a scraped CatalogCourse into a ParsedCatalogCourse with structured data
 * @param course The scraped CatalogCourse object
 * @returns ParsedCatalogCourse with parsed credits, attributes, and requirements
 */
export async function parseCourse(course: CatalogCourse): Promise<ParsedCatalogCourse> {
    const credits = parseCredits(course.details.hours || '');
    const attributes = parseAttributes(course.details.attributes);

    // Parse requirements using AI - needs course ID and description
    const requirements = await parseRequirements(
        course.id,
        course.details.description || ''
    );

    return {
        id: course.id,
        subject: course.subject,
        abbreviation: course.abbreviation,
        name: course.name,
        details: {
            school: course.details.school,
            credits,
            typicallyOffered: course.details.typicallyOffered,
            requirements,
            attributes,
            description: course.details.description
        }
    };
}
