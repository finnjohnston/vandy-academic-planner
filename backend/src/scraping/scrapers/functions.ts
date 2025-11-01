import {StreamedResponseHandler} from "./scrapers/utils/scraper.js";
import {Subject} from "./types/subject.type.js";
import {SubjectScraper} from "./scrapers/subject.scraper.js";
import {Term, TermID} from "./types/term.type.js";
import {TermScraper} from "./scrapers/term.scraper.js";

export async function getSubjects(handler?: StreamedResponseHandler<Subject>): Promise<Subject[]> {
    const scraper = new SubjectScraper();
    const defaultHandler: StreamedResponseHandler<Subject> = () => {};
    return await scraper.scrape(handler ?? defaultHandler);
}

export async function getTerms(handler?: StreamedResponseHandler<Term>): Promise<Term[]> {
    const scraper = new TermScraper();
    const defaultHandler: StreamedResponseHandler<Term> = () => {};
    return await scraper.scrape(handler ?? defaultHandler);
}