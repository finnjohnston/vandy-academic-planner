import {Section} from "../../../scrapers/types/section.type.js";
import {ParsedSection} from "../../types/main/parsed.section.type.js";
import {parseSchedule} from "../core/schedule.parser.js";
import {parseCredits} from "../core/credits.parser.js";

/**
 * Parses a scraped Section into a ParsedSection with structured schedule and credits
 * @param section The scraped Section object
 * @returns ParsedSection with parsed schedule and credits
 */
export function parseSection(section: Section): ParsedSection {
    const schedule = parseSchedule(section.schedule);
    const credits = parseCredits(section.hours);

    return {
        id: section.id,
        term: section.term,
        class: section.class,
        number: section.number,
        instructors: section.instructors,
        type: section.type,
        schedule,
        credits
    };
}
