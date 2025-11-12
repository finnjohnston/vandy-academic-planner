import {Scraper, StreamedResponseHandler} from "./utils/scraper.js";
import {CookieJar} from "tough-cookie";
import {SemesterClass} from "../types/class.type.js";
import {TermID} from "../types/term.type.js";
import {ClassQueryScraper} from "./class.query.scraper.js";

export class ClassTermScraper extends Scraper<SemesterClass> {

    private readonly term: TermID;
    private readonly BLACKLISTED_CODES = [
        '3850', '3851', '3852', // Independent reading/study
        '7999', // Master's Thesis Research
        '8999', // Non candidate research
        '9999' // Ph.D dissertation research
    ];

    private searchedTerms: string[] = [];
    
    private discoveredClasses: SemesterClass[] = [];

    constructor(term: TermID, cookieJar?: CookieJar, startTime?: number) {
        super(cookieJar, startTime);
        this.term = term;
    }

    override async scrape(handler: StreamedResponseHandler<SemesterClass> = () => {
    }): Promise<SemesterClass[]> {
        this.markStart();

        this.searchedTerms = [];
        this.discoveredClasses = [];

        // Trigger the recursive call.
        await this.searchByBracketedIncreases('', handler);

        return this.discoveredClasses;
    }

    // Searches from 0[base] --> 9[base] then [base]0 --> [base]9
    // if there are 300 results or more, we recurse!
    private async searchByBracketedIncreases(base: string, handler: StreamedResponseHandler<SemesterClass>): Promise<void> {
        for (let i = 0; i < 10; i++) {
            let searchA = `${i}${base}`;
            let searchB = `${base}${i}`;

            if (!this.BLACKLISTED_CODES.includes(searchA) && !this.searchedTerms.includes(searchA)) {
                this.searchedTerms.push(searchA);

                const scraper = new ClassQueryScraper(searchA, this.term, undefined, this.startTime());
                const classes: SemesterClass[] = await scraper.scrape(handler);

                this.discoverClasses(classes);

                if (classes.length >= 300) {
                    await this.searchByBracketedIncreases(searchA, handler);
                }
            }

            if (!this.BLACKLISTED_CODES.includes(searchB) && !this.searchedTerms.includes(searchB)) {
                this.searchedTerms.push(searchB);

                const scraper = new ClassQueryScraper(searchB, this.term, undefined, this.startTime());
                const classes: SemesterClass[] = await scraper.scrape(handler);

                this.discoverClasses(classes);

                if (classes.length >= 300) {
                    await this.searchByBracketedIncreases(searchB, handler);
                }
            }
        }
    }

    private discoverClasses(classes: SemesterClass[]) {
        const existingIDs = this.discoveredClasses.map(c => c.id);

        const toAdd = classes.filter(c => !existingIDs.includes(c.id));
        this.discoveredClasses.push(...toAdd);
    }
}