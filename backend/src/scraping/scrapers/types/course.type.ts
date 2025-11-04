export type CourseID = string;

export interface Course {
    subject: string,
    abbreviation: string,
    name: string
}

export interface CourseDetails {
    school: string | null,
    hours: number | null,
    grading: string | null,
    components: string[],
    typicallyOffered: string | null,
    requirements: string | null,
    attributes: string[],
    description: string | null
}

export interface CatalogCourse extends Course {
    id: CourseID,
    details: CourseDetails
}
