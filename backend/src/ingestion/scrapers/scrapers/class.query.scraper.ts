import {YES_BASE_URL} from "../config.js";
import {Scraper, StreamedResponseHandler} from "./utils/scraper.js";
import got, {Response} from "got";
import {load} from "cheerio";
import {CookieJar} from "tough-cookie";
import {SemesterClass} from "../types/class.type.js";
import {TermID} from "../types/term.type.js";
import {ClassDetailScraper} from "./class.detail.scraper.js";

export class ClassQueryScraper extends Scraper<SemesterClass> {

    private readonly query: string;
    private readonly term: TermID;

    constructor(query: string, term: TermID, cookieJar?: CookieJar, startTime?: number) {
        super(cookieJar, startTime);
        this.query = query;
        this.term = term;
    }

    override async scrape(handler: StreamedResponseHandler<SemesterClass> = () => {
    }): Promise<SemesterClass[]> {
        this.markStart();

        // Set the current term to scrape
        const setTerm = `${YES_BASE_URL}/SelectTerm!selectTerm.action?selectedTermCode=${this.term}`;
        await got(setTerm, {cookieJar: this.cookieJar})

        // Get objects from pagination
        return await this.paginateByQuery(this.query, this.term, handler);
    }

    private async paginateByQuery(query: string, term: TermID, handler: StreamedResponseHandler<SemesterClass>): Promise<SemesterClass[]> {
        // Prime the search for pagination
        const searchUrl = `${YES_BASE_URL}/SearchClassesExecute!search.action`;
        const searchResponse = await got(searchUrl, {
            searchParams: {
                keywords: query
            },
            cookieJar: this.cookieJar
        });

        // No need to do further operations if no classes found.
        if (searchResponse.body.toLowerCase().includes('no classes found')) {
            return [];
        }

        // Get number of results and results per page. feed this into pagination.
        let numResults: number = 0;
        let rowsPerPage: number = 10;

        if (searchResponse.body.includes('totalRecords')) {
            const totalRecordsMatch = searchResponse.body.match(/totalRecords: (\d+)/);
            const rowsPerPageMatch = searchResponse.body.match(/rowsPerPage : (\d+)/);

            if (totalRecordsMatch && totalRecordsMatch[1]) {
                numResults = Number.parseInt(totalRecordsMatch[1]);
            }
            if (rowsPerPageMatch && rowsPerPageMatch[1]) {
                rowsPerPage = Number.parseInt(rowsPerPageMatch[1]);
            }
        }

        let numPages: number = Math.ceil(numResults / rowsPerPage) || 1;

        // Completed array of tokens. Each one represents a class.
        let classTokens: SemesterClass[] = [];

        // Don't do pagination if there's only one page
        if (numPages === 1) {
            classTokens.push(...(await this.extractClassesFromBody(searchResponse.body, term, handler)));
        } else {
            const baseUrl = `${YES_BASE_URL}/SearchClassesExecute!switchPage.action?pageNum=`;
            let curPage = 1;

            classTokens.push(...await got.paginate.all(
                `${baseUrl}${curPage}`,
                {
                    cookieJar: this.cookieJar,
                    pagination: {
                        stackAllItems: false,
                        transform: async (response: Response<string>) => {
                            return await this.extractClassesFromBody(response.body, term, handler);
                        },
                        paginate: () => {
                            curPage++;

                            // Either stop pagination or increase the page #
                            if (curPage > numPages) {
                                return false;
                            } else {
                                return {
                                    url: new URL(`${baseUrl}${curPage}`),
                                };
                            }
                        }
                    }
                }
            ));
        }

        return classTokens;
    }

    private async extractClassesFromBody(body: string, term: TermID, handler: StreamedResponseHandler<SemesterClass>): Promise<SemesterClass[]> {
        const $ = load(body);

        let classTokens: SemesterClass[] = [];

        // Search for all classes on the page
        $(".classTable").each(function (this: any) {
            const element = $(this);

            // Extract header information
            const abbreviation = element.find('.classAbbreviation').text();
            const title = element.find('.classDescription').text().trim();

            // Only process the FIRST .classRow element
            const firstRow = element.find('.classRow').first();

            if (firstRow.length > 0) {
                const classSectionNode = firstRow.children('.classSection').first();
                const sectionIdAttr = classSectionNode.attr('id');
                const classId = sectionIdAttr ? sectionIdAttr.split('_')[1].trim() : '';

                const trimmedAbbrev = abbreviation.slice(0, abbreviation.length - 1);
                const parts = trimmedAbbrev.split(' ');
                const subject = parts[0]; // "CS"
                const courseNumber = parts.slice(1).join(' '); // "1101" or "2953L"

                // Create a placeholder - we'll fetch details later
                classTokens.push({
                    id: classId,
                    termId: term,
                    subject: subject,
                    abbreviation: courseNumber,
                    name: title,
                    details: {
                        school: null,
                        hours: null,
                        grading: null,
                        components: [],
                        requirements: null,
                        attributes: [],
                        description: null
                    }
                });
            }
        });

        // Fetch details for each class
        for (let classToken of classTokens) {
            const detailsScraper = new ClassDetailScraper(classToken.id, term, this.cookieJar, this.startTime());
            const details = (await detailsScraper.scrape())[0];
            classToken.details = details;

            await handler(classToken, this.timeSinceStart());
        }

        return classTokens;
    }

}
