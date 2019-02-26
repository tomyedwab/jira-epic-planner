import React from 'react';

const SPRINT_DATE_MAP = {
    "2018-01": new Date("2018-02-05 12:00:00"),
    "2018-02": new Date("2018-02-12 12:00:00"),
    "2018-03": new Date("2018-03-05 12:00:00"),
    "2019-00": new Date("2019-01-07 12:00:00"),
};

const getSprintDates = sprintId => {
    const sprints = Object.keys(SPRINT_DATE_MAP).sort();
    let latestSprint = null;
    sprints.forEach(sprint => {
        if (sprintId >= sprint) {
            latestSprint = sprint;
        }
    });
    if (!latestSprint) {
        return [null, null];
    }
    const sprintOffset = sprintId.split("-")[1] - latestSprint.split("-")[1];
    const startDate = new Date(SPRINT_DATE_MAP[latestSprint]);
    startDate.setDate(startDate.getDate() + 14*sprintOffset);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 11);

    return [startDate, endDate];
}

export const getSprintDays = sprint => {
    const [startDate, endDate] = getSprintDates(sprint.name);
    if (!startDate) {
        return [];
    }

    const date = startDate;
    const ret = [];
    while (date <= endDate) {
        // Skip weekends
        if (Math.abs(date.getDay() - 3) < 3) {
            ret.push(new Date(date));
        }
        date.setDate(date.getDate() + 1);
    }
    return ret;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const shortDate = date => {
    return MONTHS[date.getMonth()] + " " + date.getDate();
}

export const getSprintDateStr = (sprint, multiline) => {
    const [startDate, endDate] = getSprintDates(sprint.name);
    if (!startDate) {
        return null;
    }
    return <span>
        {shortDate(startDate)}
        {multiline ? <br/> : " - "}
        {shortDate(endDate)}
    </span>;
}
