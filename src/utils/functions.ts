import * as moment from 'moment';

export function getDayMonthYear(startTime?) {
    const timeSubTractOneDay = moment(new Date()).subtract(1, 'days').format("YYYY-MM-DD HH:mm:ss");
    const day = moment(startTime ? startTime : timeSubTractOneDay).format("DD");
    const month = moment(startTime ? startTime : timeSubTractOneDay).format("MM");
    const year = moment(startTime ? startTime : timeSubTractOneDay).format("YYYY");
    const valueOf = moment(startTime ? startTime : timeSubTractOneDay).valueOf();
    return {
        day, month, year, valueOf
    };
}