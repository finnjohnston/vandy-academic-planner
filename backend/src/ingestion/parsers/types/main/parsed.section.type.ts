import {SectionID} from "../../../scrapers/types/section.type.js";
import {TermID} from "../../../scrapers/types/term.type.js";
import {Class} from "../../../scrapers/types/class.type.js";
import {ParsedSchedule} from "../core/parsed.schedule.type.js";
import {ParsedCredits} from "../core/parsed.credits.type.js";

export interface ParsedSection {
    id: SectionID;
    term: TermID;
    class: Class;
    number: string;
    instructors: string[];
    type: string;
    schedule: ParsedSchedule;
    credits: ParsedCredits;
}
