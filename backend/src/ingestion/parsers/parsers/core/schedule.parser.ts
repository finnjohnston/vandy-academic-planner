import {ParsedSchedule} from "../../types/core/parsed.schedule.type.js";

/**
 * Parses a schedule string into structured ParsedSchedule format
 * @param scheduleStr Schedule string (e.g., "MWF 10:00AM - 10:50AM")
 * @returns ParsedSchedule object
 */
export function parseSchedule(scheduleStr: string): ParsedSchedule {
    const cleaned = scheduleStr.replace(/<br\s*\/?>/gi, ' ').trim();

    const schedulePattern = /^([MTWRF]+)\s+(\d{1,2}:\d{2}[AP]M)\s*-\s*(\d{1,2}:\d{2}[AP]M)$/i;
    const match = cleaned.match(schedulePattern);

    if (!match) {
        return {
            days: [],
            startTime: '',
            endTime: '',
            raw: scheduleStr
        };
    }

    const daysStr = match[1];
    const startTime12 = match[2];
    const endTime12 = match[3];

    const days = parseDays(daysStr);

    const startTime = convertTo24Hour(startTime12);
    const endTime = convertTo24Hour(endTime12);

    return {
        days,
        startTime,
        endTime,
        raw: scheduleStr
    };
}

function parseDays(daysStr: string): string[] {
    const days: string[] = [];
    const dayMap: { [key: string]: string } = {
        'M': 'M',
        'T': 'T',
        'W': 'W',
        'R': 'R',
        'F': 'F'
    };

    for (const char of daysStr.toUpperCase()) {
        if (dayMap[char] && !days.includes(dayMap[char])) {
            days.push(dayMap[char]);
        }
    }

    return days;
}

function convertTo24Hour(time12: string): string {
    const timePattern = /^(\d{1,2}):(\d{2})([AP]M)$/i;
    const match = time12.match(timePattern);

    if (!match) {
        return time12;
    }

    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) {
        hours += 12;
    } else if (period === 'AM' && hours === 12) {
        hours = 0;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}`;
}
