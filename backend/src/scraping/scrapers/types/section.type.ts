import {TermID} from "./term.type.js";
import {Course} from "./course.type.js";

export type SectionID = string;

export interface Section {
    id: SectionID,
    term: TermID,

    course: Course
    number: string

    instructors: string[],

    type: string,
    schedule: string,
    hours: number
}