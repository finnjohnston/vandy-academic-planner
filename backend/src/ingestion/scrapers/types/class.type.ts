export type ClassID = string;

export interface Class {
    subject: string,
    abbreviation: string,
    name: string
}

export interface ClassDetails {
    school: string | null,
    hours: string | null,
    grading: string | null,
    components: string[],
    requirements: string | null,
    attributes: string[],
    description: string | null
}

export interface SemesterClass extends Class {
    id: ClassID,
    details: ClassDetails
}
