import {ClassID, Class} from "../../../scrapers/types/class.type.js";
import {ParsedCredits} from "../core/parsed.credits.type.js";
import {ParsedAttributes} from "../core/parsed.attributes.type.js";
import {ParsedRequirements} from "../core/parsed.requirements.type.js";

interface ParsedClassDetails {
  school: string | null;
  credits: ParsedCredits;
  requirements: ParsedRequirements;
  attributes: ParsedAttributes;
  description: string | null;
}

export interface ParsedSemesterClass extends Class {
  id: ClassID;
  details: ParsedClassDetails;
}