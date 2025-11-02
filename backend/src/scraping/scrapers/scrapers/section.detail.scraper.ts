import {YES_BASE_URL} from "../config.js";
import {Scraper, StreamedResponseHandler} from "./utils/scraper.js";
import got from "got";
import {load} from "cheerio";
import {CookieJar} from "tough-cookie";
import {Section, SectionDetails, SectionDetailsCapacity} from "../types/section.type.js";

export class SectionDetailScraper extends Scraper<SectionDetails> {

    private section: Section;

    constructor(section: Section, cookieJar?: CookieJar, startTime?: number) {
        super(cookieJar, startTime);
        this.section = section;
    }

    override async scrape(handler: StreamedResponseHandler<SectionDetails> = (_) => {
    }): Promise<SectionDetails[]> {
        this.markStart();

        const url = `${YES_BASE_URL}/GetClassSectionDetail.action`;
        const request = await got(url, {
            cookieJar: this.cookieJar,
            searchParams: {
                classNumber: this.section.id,
                termCode: this.section.term
            }
        });

        // extract the body of the details panel
        const body = request.body;

        const details: SectionDetails = this.extractDetailsFromBody(body);
        await handler(details, this.timeSinceStart());

        return [details];
    }

    private extractDetailsFromBody(body: string): SectionDetails {
        const scraperThis: SectionDetailScraper = this;

        const $ = load(body);

        // Fetch description and notes
        let notes: string | null = null;
        let description: string | null = null;
        let school: string | null = null;
        let attributes: string[] = [];
        let capacity: SectionDetailsCapacity | null = null;
        let requirements: string | null = null;
        let bookURL: string | null = null;

        $('#mainSection').children().each(function (this: any, index, element) {
            // Flag that the next node will be a description or notes field
            if ($(this).attr('class') === 'detailHeader') {
                const title = $(this).text().trim();
                if (title === 'Description') {
                    description = $(this).next().text().trim();
                } else if (title === 'Notes') {
                    notes = $(this).next().text().trim();
                } else if (title === 'Details') {
                    school = scraperThis.extractSchoolFromDetailsPanel($, $(this).next());
                    requirements = scraperThis.extractRequirementsFromDetailsPanel($, $(this).next());
                }
            }
        });

        // Grab the attributes
        $('#rightSection').children().each(function (this: any, index, element) {
            // Flag that the next node will be a description or notes field
            if ($(this).attr('class') === 'detailHeader') {
                const title = $(this).text().trim();
                if (title === 'Attributes') {
                    attributes = scraperThis.extractAttributesFromDetailsPanel($, $(this).next());
                } else if (title === 'Availability') {
                    capacity = scraperThis.extractAvailability($, $(this).next());
                }
            }
        });

        bookURL = scraperThis.extractBookFromBody(body);

        return {
            school: school,
            description: description,
            notes: notes,
            attributes: attributes,
            availability: capacity,
            requirements: requirements,
            bookURL: bookURL
        };
    }

    private extractSchoolFromDetailsPanel($: any, panelNode: any): string | null {
        let school: string | null = null;

        $(panelNode).find('td.label').each(function (this: any, index: any, e: any) {
            const header = $(this).text().trim();
            if (header === 'School:') {
                school = $(this).next().text().trim();
            }
        });

        return school;
    }

    private extractRequirementsFromDetailsPanel($: any, panelNode: any): string | null {
        let requirements: string | null = null;

        $(panelNode).find('td.label').each(function (this: any, index: any, e: any) {
            const header = $(this).text().trim();
            if (header === 'Requirement(s):') {
                requirements = $(this).next().text().trim();
            }
        });

        return requirements;
    }

    private extractBookFromBody(body: string): string | null {
        let bookURL: string | null = null;

        // Extract the BOOK URL from the page's javascript
        body.replace(/'(.+)', 'BookLook'/g, (match: string, v: string) => {
            bookURL = v;
            return match;
        });

        return bookURL;
    }

    private extractAttributesFromDetailsPanel($: any, panelNode: any): string[] {
        return $(panelNode).children('.listItem').map(function (this: any, index: any, e: any) {
            return $(this).text().trim();
        }).get();
    }

    private extractAvailability($: any, panelNode: any): SectionDetailsCapacity {
        let availability: SectionDetailsCapacity = {
            seats: -1,
            enrolled: -1,
            waitlistSeats: -1,
            waitlistEnrolled: -1
        };

        $(panelNode).find('.availabilityNameValueTable').first().find('td.label').each(function (this: any, index: any, e: any) {
            const label = $(this).text().trim();
            const value = Number($(this).next().text().trim());

            switch (label) {
                case 'Class Capacity:':
                    availability.seats = value;
                    break;
                case 'Total Enrolled:':
                    availability.enrolled = value;
                    break;
                case 'Wait List Capacity:':
                    availability.waitlistSeats = value;
                    break;
                case 'Total on Wait List:':
                    availability.waitlistEnrolled = value;
                    break;
            }
        });

        return availability;
    }

}