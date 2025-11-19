import {StreamedResponseHandler} from "./scrapers/utils/scraper.js";

import {Term} from "./types/term.type.js";
import {TermScraper} from "./scrapers/term.scraper.js";

import {Section} from "./types/section.type.js";
import {SectionTermScraper} from "./scrapers/section.term.scraper.js";
import {SectionQueryScraper} from "./scrapers/section.query.scraper.js";

import {CatalogCourse, CourseDetails, CourseID} from "./types/course.type.js";
import {CourseDetailScraper} from "./scrapers/course.detail.scraper.js";
import {CourseQueryScraper} from "./scrapers/course.query.scraper.js";
import {CourseTermScraper} from "./scrapers/course.term.scraper.js";

import {ClassDetails, SemesterClass} from "./types/class.type.js";
import {ClassDetailScraper} from "./scrapers/class.detail.scraper.js";
import {ClassQueryScraper} from "./scrapers/class.query.scraper.js";
import {ClassTermScraper } from "./scrapers/class.term.scraper.js";

/**
 * Fetches all Terms available on YES
 @param handler Streamed Response Handler to incrementally process discovered Terms
 */
export async function getTerms(handler?: StreamedResponseHandler<Term>): Promise<Term[]> {
    const scraper = new TermScraper();
    const defaultHandler: StreamedResponseHandler<Term> = () => {};
    return await scraper.scrape(handler ?? defaultHandler);
}

/**
 * Fetches all Sections by a search query
 * @param query Query to search by
 * @param term A Term object to search for Sections within
 * @param handler Streamed Response Handler to incrementally process discovered Sections
 */
export async function searchSections(query: string, term: Term, handler?: StreamedResponseHandler<Section>): Promise<Section[]> {
    const scraper = new SectionQueryScraper(query, term.id);
    return await scraper.scrape(handler);
}

/**
 * Fetches all Sections for a given Term
 * @param term A Term object to search for Sections within
 * @param handler Streamed Response Handler to incrementally process discovered Sections
 */
export async function getAllSections(term: Term, handler?: StreamedResponseHandler<Section>): Promise<Section[]> {
    const scraper = new SectionTermScraper(term.id);
    return await scraper.scrape(handler);
}

/**
 * Fetches detailed information for a Course from the catalog
 * @param courseId ID of the Course to fetch details for
 * @param offerNumber Offer number (defaults to '1')
 * @param handler Streamed Response Handler to incrementally process discovered Course Details
 */
export async function getCourseDetails(courseId: CourseID, offerNumber: string = '1', handler?: StreamedResponseHandler<CourseDetails>): Promise<CourseDetails> {
    const scraper = new CourseDetailScraper(courseId, offerNumber);
    return (await scraper.scrape(handler))[0];
}

/**
 * Fetches all Courses by a search query
 * @param courseId ID of the Course to fetch
 * @param offerNumber Offer number (defaults to '1')
 * @param handler Streamed Response Handler to incrementally process discovered Course
 */
export async function searchCourses(courseId: CourseID, offerNumber: string = '1', handler?: StreamedResponseHandler<CatalogCourse>): Promise<CatalogCourse> {
    const scraper = new CourseQueryScraper(courseId, offerNumber);
    return (await scraper.scrape(handler))[0];
}

/**
 * Fetches all Courses from the catalog
 * @param handler Streamed Response Handler to incrementally process discovered Courses
 * @param subjectFilter Optional subject code filter (e.g., "CS", "MATH") to only fetch courses from that subject
 */
export async function getAllCourses(handler?: StreamedResponseHandler<CatalogCourse>, subjectFilter?: string): Promise<CatalogCourse[]> {
    const scraper = new CourseTermScraper(undefined, undefined, subjectFilter);
    return await scraper.scrape(handler);
}

/**
 * Fetches detailed information for a Class section in a specific term
 * @param classNumber Class number to fetch details for
 * @param termCode Term code for the class section
 * @param handler Streamed Response Handler to incrementally process discovered Class Details
 */
export async function getClassDetails(classNumber: string, termCode: string, handler?: StreamedResponseHandler<ClassDetails>): Promise<ClassDetails> {
    const scraper = new ClassDetailScraper(classNumber, termCode);
    return (await scraper.scrape(handler))[0];
}

/**
 * Fetches all Classes by a search query
 * @param query Query to search by
 * @param term A Term object to search for Classes within
 * @param handler Streamed Response Handler to incrementally process discovered Classes
 */
export async function searchClasses(query: string, term: Term, handler?: StreamedResponseHandler<SemesterClass>): Promise<SemesterClass[]> {
    const scraper = new ClassQueryScraper(query, term.id);
    return await scraper.scrape(handler);
}

/**
 * Fetches all Classes for a given Term
 * @param term A Term object to search for Classes within
 * @param handler Streamed Response Handler to incrementally process discovered Classes
 */
export async function getAllClasses(term: Term, handler?: StreamedResponseHandler<SemesterClass>): Promise<SemesterClass[]> {
    const scraper = new ClassTermScraper(term.id);
    return await scraper.scrape(handler);
}