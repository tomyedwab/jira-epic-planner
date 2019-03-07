import React, {useState} from 'react';
import {getSprintDateStr} from './util';

const ISSUE_ICONS = {
    "Task": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10318&avatarType=issuetype",
    "Design Task": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10322&avatarType=issuetype",
    "Story": "https://khanacademy.atlassian.net/images/icons/issuetypes/story.svg",
    "Bug": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10303&avatarType=issuetype",
    "Improvement": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10310&avatarType=issuetype",
    "Support": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10308&avatarType=issuetype",
    "Sub-task": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10316&avatarType=issuetype",
};

// Column offset of the right edge of the static columns & first column of the sprint list
const SEND = 7;

const ISSUE_PRIORITIES = {
    "Done": 0,
    "QA Verify": 5000000,
    "Awaiting Deploy": 4000000,
    "In Review": 3000000,
    "In Progress": 2000000,
    "Dev": 2000000,
    "To Do": 1000000,
};

const SUBTEAM_PRIORITIES = {
    "Design": 0.05,
    "Frontend": 0.04,
    "Front/Backend": 0.03,
    "Backend": 0.02,
};

const SHOW_ISSUE_PRIORITIES = false;

const calcIssuePriority = (issue, sprintNames, activeSprintName) => {
    // TODO: Include dependencies in sort
    let priority = 0;
    let sprints = [];

    // Primary sort: "Done" at the top, then current sprint, then rest
    if (issue.status === "Done") {
        priority = 10000000;
        sprints = sprintNames;
    } else if (sprintNames.indexOf(activeSprintName) >= 0) {
        priority = 5000000;
        // sprints not relevant
    } else {
        // Sort based on first upcoming sprint, unless there are none
        sprints = sprintNames.filter(s => s > activeSprintName);
        if (sprints.length === 0) {
            sprints = sprintNames;
        }
    }

    // Secondary sort: statuses in logical order
    priority += ISSUE_PRIORITIES[issue.status];

    // Tertiary sort: chronological by sprint
    if (sprints.length > 0) {
        priority += 999999 - Math.min.apply(null, sprints.map(s => +s.replace("-", "")))
    } else if (issue.status === "Done") {
        // Assume this was done infinitely far in the past
        priority += 999999;
    }

    // Quaternary (?) sort: Whether the issue has been assigned
    if (issue.assignee) {
        priority += 0.5;
    }

    // (??) sort: Subteam
    if (SUBTEAM_PRIORITIES[issue.subteam]) {
        priority += SUBTEAM_PRIORITIES[issue.subteam];
    }

    return priority;
}

const renderIssue = ([isNested, isLast, issue, priority], row, sortedSprints, hoverItem, setHover, globalStyles) => {
    const style = globalStyles.issueStyle(isNested, isLast, issue.status);

    const hovering = hoverItem === issue.key;
    const backgroundColor = hovering ? "rgba(0, 0, 0, 15%)" : (!!(row % 2) ? "rgba(0, 0, 0, 0)" : "rgba(0, 0, 0, 5%)"); 

    const ret = [
        <div style={{backgroundColor: backgroundColor, gridColumnStart: 1, gridColumnEnd: SEND+sortedSprints.length, gridRow: row + 1}} key={issue.key + "::bg"} />,
        <div style={{...style, paddingLeft: 4, gridColumnStart: isNested ? 2 : 1, gridColumnEnd: 3, gridRow: row + 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}} key={issue.key + "::1"} onMouseOver={() => setHover(issue.key, true)} onMouseOut={() => setHover(issue.key, false)}>
            <img src={ISSUE_ICONS[issue.type]} style={{marginRight: 6, verticalAlign: "bottom"}} />
            {" "}
            {issue.summary}
            {SHOW_ISSUE_PRIORITIES && <span style={{float: "right"}}>{priority}</span>}
        </div>,
        <div style={{...style, gridColumn: 3, gridRow: row + 1, textAlign: "left"}} key={issue.key + "::3"} title={issue.summary}>
            <a href={`https://khanacademy.atlassian.net/browse/${issue.key}`} target="_blank" style={globalStyles.jiraLink}>{issue.key}</a>
        </div>,
        <div style={{...style, ...globalStyles.team(issue.subteam), ...globalStyles.teamColumn, gridColumn: 4, gridRow: row + 1}} key={issue.key + "::4"}>
            {issue.subteam}
        </div>,
        <div style={{...style, ...globalStyles.statusColumn, gridColumnStart: 5, gridColumnEnd: issue.status === "To Do" ? 6 : 7, gridRow: row + 1}} key={issue.key + "::5"}>
            {issue.status}
        </div>,
        !!issue.estimate && <div style={{...style, ...globalStyles.estimateColumn, gridColumn: 6, gridRow: row + 1}} key={issue.key + "::6"}>
            {`${issue.estimate || "-"}`}
        </div>,
    ];

    const spans = [];
    let activeSpan = null;
    sortedSprints.forEach((sprint, idx) => {
        const found = issue.sprints.indexOf(sprint.id) >= 0;
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
        issueIcon = <svg viewBox="-6 -6 60 60" style={globalStyles.issueIconContainer}>
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
            const initials = issue.assignee ? issue.assignee.split(" ").map(x => x[0]).join("").toUpperCase() : null;

            issueIcon = <div style={globalStyles.assignee}>
                {initials}
            </div>;
        }
    }

    spans.forEach((span, idx) => {
        ret.push(<div style={{gridColumnStart: SEND+span.start, gridColumnEnd: SEND+1+span.end, gridRow: row + 1, padding: 4}} key={issue.key + "::S" + idx}>
            <div style={globalStyles.issueGantt(issueColor)}>
                {(idx === spans.length - 1) && issueIcon}
            </div>
        </div>);
    });

    return ret;
};

export default function EpicIssues(props) {
    const {issues, sprints, loading, forceReload, globalStyles, clearSelectedEpic, hideNav, updateTime} = props;
    const [showDone, setShowDone] = useState(true);
    const [showFrontend, setShowFrontend] = useState(true);
    const [showBackend, setShowBackend] = useState(true);
    const [showDesign, setShowDesign] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [hoverItem, setHoverItem] = useState(null);

    // Apply issue filters
    const filteredIssues = issues.filter(issue => (
        (showDone || issue.status !== "Done") &&
        (showDesign || issue.subteam !== "Design") &&
        (showFrontend || (issue.subteam !== "Frontend" && issue.subteam !== "Front/Backend")) &&
        (showBackend || (issue.subteam !== "Backend" && issue.subteam !== "Front/Backend"))
    ));

    // Get a sorted list of relevant sprints, and identify the active one
    let sprintsMap = {};
    let activeSprintName = null;
    let activeSprintIdx = null;
    filteredIssues.forEach(issue => {
        issue.sprints.forEach(sprintId => {
            sprintsMap[sprintId] = 1;
        });
    });
    let sortedSprints = (
        Object.keys(sprintsMap)
        .map(id => sprints[id])
        .sort((a, b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0))
    );
    if (sortedSprints.length === 0) {
        // Special-case: If there are no sprints then at least show the active
        // sprint
        sortedSprints = Object.values(sprints).filter(sprint => sprint.state === "ACTIVE");
    }
    if(sortedSprints.length < 4) {
        // Special-case: If there are not many sprints than add a few at the
        // end
        const orderedSprints = (
            Object.values(sprints)
            .sort((a, b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0))
        );
        const startIdx = orderedSprints.map(sprint => sprint.name).indexOf(sortedSprints[sortedSprints.length - 1].name);
        sortedSprints = sortedSprints.concat(orderedSprints.slice(startIdx+1, startIdx+5));
    }
    let yearIdx = -1;
    const sortedYears = [];
    sortedSprints.forEach((sprint, idx) => {
        const year = sprint.name.split("-")[0];
        if (yearIdx < 0 || sortedYears[yearIdx][0] !== year) {
            yearIdx++;
            sortedYears[yearIdx] = [year, idx, 1];
        } else {
            sortedYears[yearIdx][2]++;
        }
        if (sprint.state === "ACTIVE") {
            activeSprintIdx = idx;
            activeSprintName = sprint.name;
        }
    });

    const issuePriorities = {};
    filteredIssues.forEach(issue => {
        const issueSprints = issue.sprints.map(sprintId => sprints[sprintId].name);

        issuePriorities[issue.key] = calcIssuePriority(issue, issueSprints, activeSprintName);
        issue.subtasks.forEach(subtask => {
            issuePriorities[subtask.key] = calcIssuePriority(subtask, issueSprints, activeSprintName);
        });
    });
    filteredIssues.sort((a, b) => (issuePriorities[b.key] - issuePriorities[a.key]));

    const flattenedIssues = [];
    filteredIssues.forEach((issue, idx) => {
        flattenedIssues.push([false, issue.subtasks.length === 0, issue, issuePriorities[issue.key]]);

        // Sort the subtasks as well
        const subtasks = issue.subtasks.slice().sort((a, b) => (issuePriorities[b.key] - issuePriorities[a.key]));
        subtasks.forEach((subissue, subidx) => {
            if (showDone || subissue.status !== "Done") {
                flattenedIssues.push([true, subidx === issue.subtasks.length - 1, subissue, issuePriorities[subissue.key]]);
            }
        });
    });

    let highlightColumn1 = null;
    let highlightColumn2 = null;
    if (activeSprintIdx !== null) {
        highlightColumn1 = <div style={{backgroundColor: "#dfd", gridColumn: SEND+activeSprintIdx, gridRowStart: 1, gridRowEnd: 4}} key={"highlight"} />;
        highlightColumn2 = <div style={{backgroundColor: "#dfd", gridColumn: SEND+activeSprintIdx, gridRowStart: 1, gridRowEnd: 1+flattenedIssues.length}} key={"highlight"} />;
    }

    let headerContent = <span>Loading issues...</span>;
    if (!loading) {
        headerContent = [
            updateTime && <span>Updated {updateTime.toLocaleDateString()} {updateTime.toLocaleTimeString()}. </span>,
            <span>{`Showing ${filteredIssues.length} of ${issues.length} issues.`}</span>,
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
        <div style={{gridColumnStart: 1, gridColumnEnd: SEND, gridRowStart: 1, gridRowEnd: 3}}>
            {!hideNav && <button onClick={clearSelectedEpic} style={{fontSize: "22px", margin: 4, marginRight: 0, backgroundColor: "rgba(0, 0, 0, 5%)", borderRadius: 8}} title="Back to epics">
                ⤺
            </button>}
            {" "}
            <span style={{...globalStyles.pageTitle, marginLeft: 10, marginTop: 8, display: "inline-block"}}>{props.epic.key}: {props.epic.shortName}</span>
            {" "}
            <div style={{...globalStyles.issueCount, display: "inline-block", float: "right", position: "relative"}}>
                {headerContent}
            </div>
        </div>,
        <div style={{...globalStyles.heading, gridColumnStart: 1, gridColumnEnd: 3, gridRow: 3, paddingLeft: 30}}>
            Task
        </div>,
        <div style={{...globalStyles.heading, gridColumn: 3, gridRow: 3, textAlign: "center"}}>
            Issue #
        </div>,
        <div style={{...globalStyles.heading, gridColumn: 4, gridRow: 3, textAlign: "center"}}>
            Subteam
        </div>,
        <div style={{...globalStyles.heading, gridColumnStart: 5, gridColumnEnd: 7, gridRow: 3, textAlign: "center"}}>
            Status
            <span style={{fontSize: "10px"}}> (estim.)</span>
        </div>,
    ];
    const header1 = sortedYears.map((yearInfo, idx) => <div style={{gridColumnStart: SEND + yearInfo[1], gridColumnEnd: SEND + yearInfo[1] + yearInfo[2], gridRow: 1}} key={"year-" + yearInfo[0]}>
        {yearInfo[0]}
    </div>);
    const header2 = sortedSprints.map((sprint, idx) => <div style={{...globalStyles.sprintDate, gridColumn: SEND + idx, gridRow: 2}} key={"sprintdate-" + sprint.id}>
        {getSprintDateStr(sprint, true)}
    </div>);
    const header3 = sortedSprints.map((sprint, idx) => <div style={{...globalStyles.heading, gridColumn: SEND + idx, gridRow: 3}} key={"sprint-" + sprint.id}>
        {sprint.name.split("-")[1]}
    </div>);

    return <div style={{...globalStyles.fontStyle, ...globalStyles.table, display: "flex", flexDirection: "column", position: "absolute", left: 0, right: 0, top: 0, bottom: 0}}>
        <div style={{...globalStyles.issueColumns(sortedSprints.length), width: "calc(100% - 15px)", overflowY: "visible", flex: "0 0 68px"}}>
            {highlightColumn1}
            {header0}
            {header1}
            {header2}
            {header3}
        </div>
        <div style={{...globalStyles.issueColumns(sortedSprints.length), ...globalStyles.issueRows(flattenedIssues.length), width: "100%"}}>
            {highlightColumn2}
            {flattenedIssues.map((info, row) => renderIssue(info, row, sortedSprints, hoverItem, (key, over) => {
                if (over) {
                    setHoverItem(key);
                } else if (hoverItem === key) {
                    setHoverItem(null);
                }
            }, globalStyles))}
        </div>
    </div>;
}
