import {StreamedResponseHandler} from "./scrapers/utils/scraper.js";

import {Subject} from "./types/subject.type.js";
import {SubjectScraper} from "./scrapers/subject.scraper.js";

import {Term, TermID} from "./types/term.type.js";
import {TermScraper} from "./scrapers/term.scraper.js";

import {Section, SectionDetails, SectionID} from "./types/section.type.js";
import {SectionTermScraper} from "./scrapers/section.term.scraper.js";
import {SectionDetailScraper} from "./scrapers/section.detail.scraper.js";
import {SectionQueryScraper} from "./scrapers/section.query.scraper.js";
import {SectionExistsScraper} from "./scrapers/section.exists.scraper.js";

import {CourseDetails, CourseID} from "./types/course.type.js";
import {CourseDetailScraper} from "./scrapers/course.detail.scraper.js";


/**
 * Fetches all Subjects available on YES
 * @param handler Streamed Response Handler to incrementally process discovered Subjects
 */
export async function getSubjects(handler?: StreamedResponseHandler<Subject>): Promise<Subject[]> {
    const scraper = new SubjectScraper();
    const defaultHandler: StreamedResponseHandler<Subject> = () => {};
    return await scraper.scrape(handler ?? defaultHandler);
}

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
 * Fetches all Sections by a search query.
 * @param query Query to search by
 * @param term A Term object to search for Sections within
 * @param detailed Whether to populate detailed information for each discovered Section
 * @param handler Streamed Response Handler to incrementally process discovered Sections
 */
export async function searchSections(query: string, term: Term, detailed: boolean, handler?: StreamedResponseHandler<Section>): Promise<Section[]> {
    const scraper = new SectionQueryScraper(query, term.id, detailed);
    return await scraper.scrape(handler);
}

/**
 * Fetches detailed information for a Section
 * @param section Section to fetch details for
 * @param handler Streamed Response Handler to incrementally process discovered Section Details
 */
export async function getSectionDetails(section: Section, handler?: StreamedResponseHandler<SectionDetails>): Promise<SectionDetails> {
    const scraper = new SectionDetailScraper(section);
    return (await scraper.scrape(handler))[0];
}

/**
 * Fetches all Sections for a given Term
 * @param term A Term object to search for Sections within
 * @param detailed Whether to populate detailed information for each discovered Section
 * @param handler Streamed Response Handler to incrementally process discovered Sections
 */
export async function getAllSections(term: Term, detailed: boolean, handler?: StreamedResponseHandler<Section>): Promise<Section[]> {
    const scraper = new SectionTermScraper(term.id, detailed);
    return await scraper.scrape(handler);
}

/**
 * Returns whether or not a Section exists in a given Term
 * @param sectionID ID of the Section to verify
 * @param termID ID of the term to search within
 * @param handler Streamed Response Handler to incrementally process discovered Truthiness
 */
export async function sectionExists(sectionID: SectionID, termID: TermID, handler?: StreamedResponseHandler<boolean>): Promise<boolean> {
    const scraper = new SectionExistsScraper(sectionID, termID);
    return (await scraper.scrape(handler))[0];
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