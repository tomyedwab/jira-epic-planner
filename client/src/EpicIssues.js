import React, {useState} from 'react';
import {useIssues} from './Api.js';

const ISSUE_ICONS = {
    "Task": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10318&avatarType=issuetype",
    "Design Task": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10322&avatarType=issuetype",
    "Story": "https://khanacademy.atlassian.net/images/icons/issuetypes/story.svg",
    "Bug": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10303&avatarType=issuetype",
    "Improvement": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10310&avatarType=issuetype",
    "Support": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10308&avatarType=issuetype",
    "Sub-task": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10316&avatarType=issuetype",
};

const SUBTEAM_STYLES = {
    "Frontend": {backgroundColor: "rgb(255, 177, 0, 0.4)"},
    "Backend": {backgroundColor: "rgb(55, 197, 253, 0.4)"},
    "Front/Backend": {backgroundImage: "-webkit-linear-gradient(-30deg, rgb(255, 177, 0, 0.4) 50%, rgb(55, 197, 253, 0.4) 50%)"},
    "Design": {backgroundColor: "rgb(20, 191, 150, 0.4)"},
}

// Column offset of the right edge of the static columns & first column of the sprint list
const SEND = 7;

const SPRINT_DATE_MAP = {
    "2018-01": new Date("2018-02-05 12:00:00"),
    "2018-02": new Date("2018-02-12 12:00:00"),
    "2018-03": new Date("2018-03-05 12:00:00"),
    "2019-00": new Date("2018-01-07 12:00:00"),
};

const getSprintDate = sprintId => {
    const sprints = Object.keys(SPRINT_DATE_MAP).sort();
    let latestSprint = null;
    sprints.forEach(sprint => {
        if (sprintId >= sprint) {
            latestSprint = sprint;
        }
    });
    if (!latestSprint) {
        return null;
    }
    const sprintOffset = sprintId.split("-")[1] - latestSprint.split("-")[1];
    const nextDate = new Date(SPRINT_DATE_MAP[latestSprint]);
    nextDate.setDate(nextDate.getDate() + 14*sprintOffset);
    return nextDate;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const getSprintDateStr = sprintId => {
    const startDate = getSprintDate(sprintId);
    if (!startDate) {
        return null;
    }
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 11);
    return <span>
        {MONTHS[startDate.getMonth()] + " " + startDate.getDate()}
        <br/>
        {MONTHS[endDate.getMonth()] + " " + endDate.getDate()}
    </span>;
}

const renderIssue = ([isNested, isLast, issue], row, sortedSprints, activeSprintIdx) => {
    const style = {
        paddingTop: isNested ? 4 : 8,
        paddingBottom: isLast ? 8 : 4,
        color: (issue.status === "Done") ? "#aaa": "#000",
        fontFamily: "'Lato', sans-serif",
        fontSize: "14px",
    };

    const ret = [
        <div style={{backgroundColor: !!(row % 2) ? "rgba(0, 0, 0, 0)" : "rgba(0, 0, 0, 5%)", gridColumnStart: 1, gridColumnEnd: SEND+sortedSprints.length, gridRow: row + 1}} key={issue.key + "::bg"} />,
        <div style={{...style, paddingLeft: 4, gridColumnStart: isNested ? 2 : 1, gridColumnEnd: 3, gridRow: row + 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}} key={issue.key + "::1"}>
            <img src={ISSUE_ICONS[issue.type]} style={{marginRight: 6, verticalAlign: "bottom"}} />
            {" "}
            {issue.fields.summary}
        </div>,
        <div style={{...style, gridColumn: 3, gridRow: row + 1, textAlign: "left"}} key={issue.key + "::3"} title={issue.fields.summary}>
            <a href={`https://khanacademy.atlassian.net/browse/${issue.key}`} target="_blank" style={{verticalAlign: "top"}}>{issue.key}</a>
        </div>,
        <div style={{...style, ...SUBTEAM_STYLES[issue.subteam], gridColumn: 4, gridRow: row + 1, fontSize: "12px", fontWeight: "bold", textAlign: "center"}} key={issue.key + "::4"} title={issue.fields.summary}>
            {issue.subteam}
        </div>,
        <div style={{...style, gridColumnStart: 5, gridColumnEnd: issue.status === "To Do" ? 6 : 7, gridRow: row + 1, fontSize: "12px", fontWeight: "bold", textAlign: "center"}} key={issue.key + "::5"}>
            {issue.status}
        </div>,
        issue.status === "To Do" && <div style={{...style, gridColumn: 6, gridRow: row + 1, fontSize: "12px", fontWeight: "900", textAlign: "center"}} key={issue.key + "::6"}>
            {`${issue.estimate || "-"}`}
        </div>,
    ];

    const spans = [];
    let activeSpan = null;
    sortedSprints.forEach((sprint, idx) => {
        const found = issue.sprints.indexOf(sprint) >= 0;
        if (found) {
            if (activeSpan === null) {
                activeSpan = spans.length;
                spans[activeSpan] = {
                    start: idx,
                    end: idx,
                };
            } else {
                spans[activeSpan].end = idx;
            }
        } else {
            activeSpan = null;
        }
    });

    let issueColor = "#ccc";
    let issueIcon = null;

    if (issue.status === "Done") {
        issueColor = "#00a60e";
        issueIcon = <svg viewBox="-6 -6 60 60" width={"24px"} height={"24px"} style={{verticalAlign: "top", float: "right", marginRight: 8}}>
            <polygon fill="#ffffff" points="40.6,12.1 17,35.7 7.4,26.1 4.6,31 17,43.3 43.4,16.9"/>
        </svg>;
    } else {
        if (issue.status === "In Progress" || issue.status === "Dev") {
            issueColor = "#1865f2";
        } else if (issue.status === "In Review" || issue.status === "Awaiting Deploy") {
            issueColor = "#9059ff";
        } else if (issue.blockedBy) {
            issueColor = "#d92916";
            issueIcon = <svg viewBox="0 0 512 512" width={"20px"} height={"20px"} style={{verticalAlign: "top", float: "right", marginRight: 8, marginTop: 3}}>
                <path d="M501.35,369.069L320.565,66.266c-13.667-23.008-37.805-36.749-64.567-36.749c-26.762,0-50.9,13.741-64.567,36.749    L10.662,369.069c-13.96,23.492-14.224,51.706-0.719,75.462c13.536,23.771,37.922,37.951,65.27,37.951h361.57    c27.348,0,51.736-14.18,65.27-37.951C515.56,420.776,515.296,392.561,501.35,369.069z M255.999,122.094    c16.587,0,30.032,13.445,30.032,30.032v120.13c0,16.585-13.445,30.032-30.032,30.032c-16.587,0-30.032-13.448-30.032-30.032    v-120.13h0C225.966,135.539,239.412,122.094,255.999,122.094z M255.999,422.417c-24.841,0-45.049-20.208-45.049-45.049    c0-24.841,20.208-45.049,45.049-45.049c24.841,0,45.049,20.208,45.049,45.049C301.047,402.21,280.84,422.417,255.999,422.417z" fill="#ffffff" />
            </svg>;
        }

        if (issue.assignee) {
            const assigneeStyle = {
                backgroundColor: "#fff",
                float: "right",
                borderRadius: 14,
                margin: 2,
                padding: 4,
                fontSize: "12px",
                fontWeight: "bold",
                minWidth: 18,
                minHeight: 14,
                textAlign: "center",
            };

            const initials = issue.assignee ? issue.assignee.split(" ").map(x => x[0]).join("").toUpperCase() : null;

            issueIcon = <div style={assigneeStyle}>
                {initials}
            </div>;
        }
    }

    spans.forEach((span, idx) => {
        ret.push(<div style={{gridColumnStart: SEND+span.start, gridColumnEnd: SEND+1+span.end, gridRow: row + 1, padding: 4}} key={issue.key + "::S" + idx}>
            <div style={{backgroundColor: issueColor, width: "100%", height: "100%", borderRadius: 16}}>
                {(idx === spans.length - 1) && issueIcon}
            </div>
        </div>);
    });

    return ret;
};

export default function EpicIssues(props) {
    const [issues, topLevelIssues, activeSprint, loading, forceReload] = useIssues(props.epic.key);
    const [showDone, setShowDone] = useState(false);
    const [showFrontend, setShowFrontend] = useState(true);
    const [showBackend, setShowBackend] = useState(true);
    const [showDesign, setShowDesign] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    const filteredIssues = topLevelIssues.filter(issue => (
        (showDone || issue.status !== "Done") &&
        (showDesign || issue.subteam !== "Design") &&
        (showFrontend || (issue.subteam !== "Frontend" && issue.subteam !== "Front/Backend")) &&
        (showBackend || (issue.subteam !== "Backend" && issue.subteam !== "Front/Backend"))
    ));

    const flattenedIssues = [];
    filteredIssues.forEach((issue, idx) => {
        flattenedIssues.push([false, issue.fields.subtasks.length === 0, issue]);
        issue.fields.subtasks.forEach((subissue, subidx) => {
            flattenedIssues.push([true, subidx === issue.fields.subtasks.length - 1, subissue]);
        });
    });

    let sprintsMap = {};
    flattenedIssues.forEach(([_, __, issue]) => {
        issue.sprints.forEach(sprint => {
            sprintsMap[sprint] = 1;
        });
    });
    const sortedSprints = Object.keys(sprintsMap).sort();
    let yearIdx = -1;
    const sortedYears = [];
    sortedSprints.forEach((sprint, idx) => {
        const year = sprint.split("-")[0];
        if (yearIdx < 0 || sortedYears[yearIdx][0] !== year) {
            yearIdx++;
            sortedYears[yearIdx] = [year, idx, 1];
        } else {
            sortedYears[yearIdx][2]++;
        }
    });

    const fontStyle = {
        fontFamily: "'Lato', sans-serif",
    };

    let highlightColumn1 = null;
    let highlightColumn2 = null;
    const activeSprintIdx = sortedSprints.indexOf(activeSprint);
    if (activeSprintIdx >= 0) {
        highlightColumn1 = <div style={{backgroundColor: "#dfd", gridColumn: SEND+activeSprintIdx, gridRowStart: 1, gridRowEnd: 4}} key={"highlight"} />;
        highlightColumn2 = <div style={{backgroundColor: "#dfd", gridColumn: SEND+activeSprintIdx, gridRowStart: 1, gridRowEnd: 1+flattenedIssues.length}} key={"highlight"} />;
    }

    let headerContent = <span>"Loading issues..."</span>;
    if (!loading) {
        headerContent = [
            <span>{`Showing ${filteredIssues.length} of ${topLevelIssues.length} issues.`}</span>,
            <button style={{margin: 4, background: "none", border: "none", color: "#1865f2"}} onClick={() => setShowFilters(!showFilters)} title="Filters">
                <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0.5 0H15.5C15.7761 0 16 0.223858 16 0.5V1.5C16 1.77614 15.7761 2 15.5 2H0.5C0.223858 2 0 1.77614 0 1.5V0.5C0 0.223858 0.223858 0 0.5 0ZM3.5 5H12.5C12.7761 5 13 5.22386 13 5.5V6.5C13 6.77614 12.7761 7 12.5 7H3.5C3.22386 7 3 6.77614 3 6.5V5.5C3 5.22386 3.22386 5 3.5 5ZM6.5 10H9.5C9.77614 10 10 10.2239 10 10.5V11.5C10 11.7761 9.77614 12 9.5 12H6.5C6.22386 12 6 11.7761 6 11.5V10.5C6 10.2239 6.22386 10 6.5 10Z" fill="#1865f2" />
                </svg>
            </button>,
            <button style={{fontSize: "16px", fontWeight: "bold", margin: 4, marginRight: 12, marginLeft: 0, background: "none", border: "none", color: "#1865f2"}} onClick={forceReload} title="Reload">
                ↺
            </button>,
            showFilters && <div style={{position: "absolute", right: 42, top: 30, padding: 16, backgroundColor: "#fff", border: "1px solid #000"}}>
                <div>
                    <input type="checkbox" checked={showDone} onClick={() => setShowDone(!showDone)} />
                    <label>Show completed</label>
                </div>
                <div>
                    <input type="checkbox" checked={showFrontend} onClick={() => setShowFrontend(!showFrontend)} />
                    <label>Show Frontend</label>
                </div>
                <div>
                    <input type="checkbox" checked={showBackend} onClick={() => setShowBackend(!showBackend)} />
                    <label>Show Backend</label>
                </div>
                <div>
                    <input type="checkbox" checked={showDesign}  onClick={() => setShowDesign(!showDesign)}/>
                    <label>Show Design</label>
                </div>
            </div>,
        ];
    }

    const header0 = [
        <div style={{...fontStyle, gridColumnStart: 1, gridColumnEnd: SEND, gridRowStart: 1, gridRowEnd: 3, fontWeight: "bold"}}>
            <button onClick={props.clearSelectedEpic} style={{fontSize: "22px", margin: 4, backgroundColor: "rgba(0, 0, 0, 5%)", borderRadius: 8}} title="Back to epics">
                ⤺
            </button>{" "}
            {props.epic.key}: {props.epic.fields.customfield_10003}{" "}
            <div style={{display: "inline-block", fontSize: "12px", float: "right", position: "relative"}}>
                {headerContent}
            </div>
        </div>,
        <div style={{...fontStyle, gridColumnStart: 1, gridColumnEnd: 3, gridRow: 3, paddingLeft: 30, fontWeight: "bold"}}>
            Task
        </div>,
        <div style={{...fontStyle, gridColumn: 3, gridRow: 3, fontWeight: "bold", textAlign: "center"}}>
            Issue #
        </div>,
        <div style={{...fontStyle, gridColumn: 4, gridRow: 3, fontWeight: "bold", textAlign: "center"}}>
            Subteam
        </div>,
        <div style={{...fontStyle, gridColumnStart: 5, gridColumnEnd: 7, gridRow: 3, fontWeight: "bold", textAlign: "center"}}>
            Status
            <span style={{fontSize: "10px"}}> (estim.)</span>
        </div>,
    ];
    const header1 = sortedYears.map((yearInfo, idx) => <div style={{...fontStyle, gridColumnStart: SEND + yearInfo[1], gridColumnEnd: SEND + yearInfo[1] + yearInfo[2], gridRow: 1}} key={"year-" + yearInfo[0]}>
        {yearInfo[0]}
    </div>);
    const header2 = sortedSprints.map((sprint, idx) => <div style={{...fontStyle, gridColumn: SEND + idx, gridRow: 2, fontSize: "8pt"}} key={"sprintdate-" + sprint}>
        {getSprintDateStr(sprint)}
    </div>);
    const header3 = sortedSprints.map((sprint, idx) => <div style={{...fontStyle, gridColumn: SEND + idx, gridRow: 3, fontWeight: "bold"}} key={"sprint-" + sprint}>
        {sprint.split("-")[1]}
    </div>);

    const header4 = <div style={{gridColumnStart: 1, gridColumnEnd: SEND+sortedSprints.length, gridRow: 1, backgroundColor: "rgba(0, 0, 0, 5%)", paddingLeft: 30, paddingTop: 8}}>
        {headerContent}
    </div>;

    return <div style={{display: "flex", flexDirection: "column", position: "absolute", left: 0, right: 0, top: 0, bottom: 0}}>
        <div style={{ display: "grid", width: "calc(100% - 15px)", gridTemplateColumns: `20px auto 75px 90px 90px 30px repeat(${sortedSprints.length}, 50px)`, overflowY: "visible", flex: "0 0 68px"}}>
            {highlightColumn1}
            {header0}
            {header1}
            {header2}
            {header3}
        </div>
        <div style={{ display: "grid", overflowY: "scroll", width: "100%", gridTemplateColumns: `20px auto 75px 90px 90px 30px repeat(${sortedSprints.length}, 50px)`, gridTemplateRows: `repeat(${flattenedIssues.length}, 35px)` }}>
            {highlightColumn2}
            {flattenedIssues.map((info, row) => renderIssue(info, row, sortedSprints, sortedSprints.indexOf(activeSprint)))}
        </div>
    </div>;
}
