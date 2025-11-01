import {StreamedResponseHandler} from "./scrapers/utils/scraper.js";
import {Subject} from "./types/subject.type.js";
import {SubjectScraper} from "./scrapers/subject.scraper.js";

export async function getSubjects(handler?: StreamedResponseHandler<Subject>): Promise<Subject[]> {
    const scraper = new SubjectScraper();
    const defaultHandler: StreamedResponseHandler<Subject> = () => {};
    return await scraper.scrape(handler ?? defaultHandler);
}