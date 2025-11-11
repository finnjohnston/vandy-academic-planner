import {TermID} from "./term.type.js";
import {Class} from "./class.type.js";

export type SectionID = string;

export interface Section {
    id: SectionID,
    term: TermID,

    class: Class
    number: string

    instructors: string[],

    type: string,
    schedule: string,
    hours: string
}