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
        <div style={{backgroundColor: !!(topLevelIdx % 2) ? "#fff" : "#f8f8f8", gridColumnStart: 1, gridColumnEnd: 7+sortedSprints.length, gridRow: row + 1}} key={issue.key + "::bg"} />,
        <div style={{backgroundColor: "#dfd", gridColumn: 7+activeSprintIdx, gridRow: row + 1}} key={issue.key + "::abg"} />,
        <div style={{...style, gridColumn: 1, gridRow: row + 1}} key={issue.key + "::0"} />,
        <div style={{...style, paddingLeft: 4, gridColumnStart: isNested ? 2 : 1, gridColumnEnd: 3, gridRow: row + 1}} key={issue.key + "::1"}>
            <img src={ISSUE_ICONS[issue.fields.issuetype.name]} />
            {" "}
            <a href={`https://khanacademy.atlassian.net/browse/${issue.key}`} target="_blank">{issue.key}</a>
        </div>,
        <div style={{...style, gridColumn: 3, gridRow: row + 1}} key={issue.key + "::2"} />,
        <div style={{...style, gridColumnStart: isNested ? 4 : 3, gridColumnEnd: 5, gridRow: row + 1}} key={issue.key + "::3"}>
            {issue.fields.summary}
        </div>,
        <div style={{...style, gridColumn: 5, gridRow: row + 1}} key={issue.key + "::4"} />,
        <div style={{...style, gridColumnStart: isNested ? 6 : 5, gridColumnEnd: 7, gridRow: row + 1}} key={issue.key + "::5"}>
            {issue.fields.status.name}
        </div>,
    ];
    issue.sprints.forEach((sprint, idx) => {
        ret.push(<div style={{...style, gridColumn: 7+sortedSprints.indexOf(sprint), gridRow: row + 1}} key={issue.key + "::S" + idx}>
            X
        </div>);
    })
    return ret;
};

const flattenIssues = (topLevelIssues) => {
    const ret = [];
    topLevelIssues.forEach((issue, idx) => {
        /*if (issue.fields.status.name === "Done") {
            return;
        }*/
        ret.push([false, issue.children.length === 0, idx, issue]);
        issue.children.forEach((subissue, subidx) => {
            ret.push([true, subidx === issue.children.length - 1, idx, subissue]);
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
