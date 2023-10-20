import * as moment from 'moment';

export function getDayMonthYear() {
    const day = moment(new Date()).subtract(1, 'days').format("DD");
    const month = moment(new Date()).format("MM");
    const year = moment(new Date()).format("YYYY");
    const valueOf = moment(new Date()).valueOf();
    return {
        day, month, year, valueOf
    };
}