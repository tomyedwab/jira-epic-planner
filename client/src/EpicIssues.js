import React from 'react';
import {useIssues} from './Api.js';

// TODO: Show/hide Done
// TODO: Freeze top row
// TODO: Styling for "in progress" issues

const ISSUE_ICONS = {
    "Task": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10318&avatarType=issuetype",
    "Design Task": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10322&avatarType=issuetype",
    "Story": "https://khanacademy.atlassian.net/images/icons/issuetypes/story.svg",
    "Bug": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10303&avatarType=issuetype",
    "Improvement": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10310&avatarType=issuetype",
    "Support": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10308&avatarType=issuetype",
    "Sub-task": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10316&avatarType=issuetype",
};

const renderIssue = ([isNested, isLast, topLevelIdx, issue], row, sortedSprints, activeSprintIdx) => {
    const style = {
        paddingTop: isNested ? 4 : 8,
        paddingBottom: isLast ? 8 : 4,
        color: (issue.fields.status.name === "Done") ? "#aaa": "#000",
        fontFamily: "'Lato', sans-serif",
        fontSize: "14px",
    };
    const ret = [
        <div style={{backgroundColor: !!(topLevelIdx % 2) ? "rgba(0, 0, 0, 0)" : "rgba(0, 0, 0, 5%)", gridColumnStart: 1, gridColumnEnd: 7+sortedSprints.length, gridRow: row + 1}} key={issue.key + "::bg"} />,
        <div style={{...style, paddingLeft: 4, gridColumnStart: isNested ? 2 : 1, gridColumnEnd: 3, gridRow: row + 1}} key={issue.key + "::1"}>
            <img src={ISSUE_ICONS[issue.fields.issuetype.name]} />
            {" "}
            <a href={`https://khanacademy.atlassian.net/browse/${issue.key}`} target="_blank">{issue.key}</a>
        </div>,
        <div style={{...style, gridColumnStart: isNested ? 4 : 3, gridColumnEnd: 5, gridRow: row + 1}} key={issue.key + "::3"}>
            {issue.fields.summary}
        </div>,
        <div style={{...style, gridColumnStart: isNested ? 6 : 5, gridColumnEnd: 7, gridRow: row + 1}} key={issue.key + "::5"}>
            {issue.fields.status.name}
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

    if (issue.fields.status.name === "Done") {
        issueColor = "#00a60e";
        issueIcon = <svg viewBox="-6 -6 60 60" width={"24px"} height={"24px"} style={{verticalAlign: "top", float: "right", marginRight: 8}}>
            <polygon fill="#ffffff" points="40.6,12.1 17,35.7 7.4,26.1 4.6,31 17,43.3 43.4,16.9"/>
        </svg>;
    } else if (issue.blockedBy) {
        issueColor = "#d92916";
        issueIcon = <svg viewBox="0 0 512 512" width={"20px"} height={"20px"} style={{verticalAlign: "top", float: "right", marginRight: 8, marginTop: 3}}>
            <path d="M501.35,369.069L320.565,66.266c-13.667-23.008-37.805-36.749-64.567-36.749c-26.762,0-50.9,13.741-64.567,36.749    L10.662,369.069c-13.96,23.492-14.224,51.706-0.719,75.462c13.536,23.771,37.922,37.951,65.27,37.951h361.57    c27.348,0,51.736-14.18,65.27-37.951C515.56,420.776,515.296,392.561,501.35,369.069z M255.999,122.094    c16.587,0,30.032,13.445,30.032,30.032v120.13c0,16.585-13.445,30.032-30.032,30.032c-16.587,0-30.032-13.448-30.032-30.032    v-120.13h0C225.966,135.539,239.412,122.094,255.999,122.094z M255.999,422.417c-24.841,0-45.049-20.208-45.049-45.049    c0-24.841,20.208-45.049,45.049-45.049c24.841,0,45.049,20.208,45.049,45.049C301.047,402.21,280.84,422.417,255.999,422.417z" fill="#ffffff" />
        </svg>;
    } else if (issue.fields.status.name === "In Progress" || issue.fields.status.name === "Dev") {
        issueColor = "#1865f2";
    } else if (issue.fields.status.name === "In Review") {
        issueColor = "#9059ff";
    }

    spans.forEach((span, idx) => {
        ret.push(<div style={{gridColumnStart: 7+span.start, gridColumnEnd: 8+span.end, gridRow: row + 1, padding: 4}} key={issue.key + "::S" + idx}>
            <div style={{backgroundColor: issueColor, width: "100%", height: "100%", borderRadius: 16}}>
                {(idx === spans.length - 1) && issueIcon}
            </div>
        </div>);
    });

    return ret;
};

const flattenIssues = (topLevelIssues) => {
    const ret = [];
    topLevelIssues.forEach((issue, idx) => {
        /*if (issue.fields.status.name === "Done") {
            return;
        }*/
        ret.push([false, issue.fields.subtasks.length === 0, idx, issue]);
        issue.fields.subtasks.forEach((subissue, subidx) => {
            ret.push([true, subidx === issue.fields.subtasks.length - 1, idx, subissue]);
        });
    });
    return ret;
};

export default function EpicIssues(props) {
    const [issues, topLevelIssues, activeSprint, loading, forceReload] = useIssues(props.epic.key);

    const flattenedIssues = flattenIssues(topLevelIssues);
    let sprintsMap = {};
    flattenedIssues.forEach(([_, __, ___, issue]) => {
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
    let highlightColumn = null;
    const activeSprintIdx = sortedSprints.indexOf(activeSprint);
    if (activeSprintIdx >= 0) {
        highlightColumn = <div style={{backgroundColor: "#dfd", gridColumn: 7+activeSprintIdx, gridRowStart: 1, gridRowEnd: 3+flattenedIssues.length}} key={"highlight"} />;
    }
    const header1 = sortedYears.map((yearInfo, idx) => <div style={{gridColumnStart: 7 + yearInfo[1], gridColumnEnd: 8 + yearInfo[1] + yearInfo[2], gridRow: 1}} key={"year-" + yearInfo[0]}>
        {yearInfo[0]}
    </div>);
    const header2 = sortedSprints.map((sprint, idx) => <div style={{gridColumn: 7 + idx, gridRow: 2, backgroundColor: sprint === activeSprint ? "#dfd" : "none"}} key={"sprint-" + sprint}>
        {sprint.split("-")[1]}
    </div>);

    return <div>
        <div style={{ display: "grid", gridTemplateColumns: `20px 100px 20px auto 20px 100px repeat(${sortedSprints.length}, 50px) auto` }}>
            <div style={{gridColumnStart: 1, gridColumnEnd: 5, gridRow: 1}} key="epicName">
                <button onClick={props.clearSelectedEpic}>&lt; Back</button>{" "}
                {props.epic.key}: {props.epic.fields.customfield_10003}
            </div>
            {highlightColumn}
            {header1}
            {header2}
            {flattenedIssues.map((info, row) => renderIssue(info, row+2, sortedSprints, sortedSprints.indexOf(activeSprint)))}
        </div>
        <p>
            {loading ? "Loading issues..." : `${issues.length} issues loaded. `}
            {!loading && <button onClick={forceReload}>Reload</button>}
        </p>
    </div>;
}
