import {CourseID, Course} from "../../../scrapers/types/course.type.js";
import {ParsedCredits} from "../core/parsed.credits.type.js";
import {ParsedAttributes} from "../core/parsed.attributes.type.js";
import {ParsedRequirements} from "../core/parsed.requirements.type.js";

interface ParsedCourseDetails {
  school: string | null;
  credits: ParsedCredits;
  typicallyOffered: string | null;
  requirements: ParsedRequirements;
  attributes: ParsedAttributes;
  description: string | null;
}

export interface ParsedCatalogCourse extends Course {
  id: CourseID;
  details: ParsedCourseDetails;
}