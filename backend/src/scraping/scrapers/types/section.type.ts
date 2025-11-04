import {TermID} from "./term.type.js";
import {Course} from "./course.type.js";

export type SectionID = string;

export interface SectionDetailsCapacity {
    seats: number,
    enrolled: number,
    waitlistSeats: number,
    waitlistEnrolled: number
}

export interface SectionDetails {
    school: string | null,
    description: string | null,
    notes: string | null,
    attributes: string[],
    availability: SectionDetailsCapacity | null,
    requirements: string | null,
    bookURL: string | null
}

export interface Section {
    id: SectionID,
    term: TermID,

    course: Course
    number: string

    instructors: string[],

    type: string,
    schedule: string,
    hours: number

    details?: SectionDetails
}