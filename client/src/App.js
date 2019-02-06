import React, { useState, useEffect } from 'react';

// TODO: Show/hide Done
// TODO: Freeze top row
// TODO: Styling for "in progress" issues
window.ALL_ISSUES = {};

const ISSUE_PRIORITIES = {
    "Done": 0,
    "In Review": 3000000,
    "In Progress": 2000000,
    "Dev": 2000000,
    "To Do": 1000000,
};

const ISSUE_ICONS = {
    "Task": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10318&avatarType=issuetype",
    "Design Task": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10322&avatarType=issuetype",
    "Story": "https://khanacademy.atlassian.net/images/icons/issuetypes/story.svg",
    "Bug": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10303&avatarType=issuetype",
    "Improvement": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10310&avatarType=issuetype",
    "Support": "https://khanacademy.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10308&avatarType=issuetype",
};

function useIssues() {
    function loadIssues(offset, issues, force) {
        return fetch(`/issues?epic=CP-1834&startAt=${offset}&force=${force}`)
            .then(resp => resp.json())
            .then(data => {
                if (data.issues.length === 0) {
                    return issues;
                }
                data.issues.forEach(issue => window.ALL_ISSUES[issue.key] = issue);
                issues = issues.concat(data.issues);
                offset += data.issues.length;
                return loadIssues(offset, issues, force);
            });
    }

    function processIssues(issues) {
        const topLevelIssuesMap = {};
        let activeSprint = null;
        // All stories are top level issues, put them in first
        issues.forEach(issue => {
            if (issue.fields.issuetype.name === "Story") {
                topLevelIssuesMap[issue.key] = issue;
                issue.children = [];
            }
        });
        issues.forEach(issue => {
            // An issue that blocks a story is a child of that story
            let parent = null;
            issue.fields.issuelinks.forEach(link => {
                if (link.type.name === "Blocks" && link.outwardIssue &&
                    topLevelIssuesMap[link.outwardIssue.key] &&
                    topLevelIssuesMap[link.outwardIssue.key].fields.issuetype.name === "Story") {
                    parent = link.outwardIssue.key;
                }
            });
            // If the issue isn't a child of a story then it is also a top-level issue
            if (parent && topLevelIssuesMap[parent]) {
                topLevelIssuesMap[parent].children.push(issue);
            } else {
                topLevelIssuesMap[issue.key] = issue;
                issue.children = [];
            }
        });
        issues.forEach(issue => {
            // Look for a custom field that contains sprints
            issue.sprints = [];
            Object.keys(issue.fields).forEach(field => {
                if (issue.fields[field] instanceof Array) {
                    issue.fields[field].forEach(value => {
                        if (typeof value === "string") {
                            let sprint = null;
                            const match1 = value.toLowerCase().match('sprint.sprint@.*name=[^,]+sprint (\\d+-\\d+)');
                            if (match1) {
                                sprint = match1[1];
                                if (value.indexOf("state=ACTIVE") >= 0) {
                                    activeSprint = sprint;
                                }
                            } else {
                                const match2 = value.toLowerCase().match('sprint.sprint@.*name=[^,]+sprint (\\d+)');
                                if (match2) {
                                    sprint = "2018-" + match2[1];
                                }
                            }
                            if (sprint) {
                                issue.sprints.push(sprint);
                            }
                        }
                    });
                }
            });
        });
        const topLevelIssues = (
            Object.values(topLevelIssuesMap)
            .sort((a, b) => {
                let pri_a = 0;
                let pri_b = 0;
                if (a.fields.status.name === "Done") {
                    pri_a = 9000000;
                } else if (a.sprints.indexOf(activeSprint) >= 0) {
                    pri_a = 5000000;
                }
                pri_a += ISSUE_PRIORITIES[a.fields.status.name];
                const sprints_a = a.sprints.filter(s => s > activeSprint);
                if (sprints_a.length > 0) {
                    pri_a += 999999 - Math.min.apply(null, sprints_a.map(s => +s.replace("-", "")))
                }

                if (b.fields.status.name === "Done") {
                    pri_b = 9000000;
                } else if (b.sprints.indexOf(activeSprint) >= 0) {
                    pri_b = 5000000;
                }
                pri_b += ISSUE_PRIORITIES[b.fields.status.name];
                const sprints_b = b.sprints.filter(s => s > activeSprint);
                if (sprints_b.length > 0) {
                    pri_b += 999999 - Math.min.apply(null, sprints_b.map(s => +s.replace("-", "")))
                }
                
                return pri_b - pri_a;
            }));
        window.TOP_LEVEL_ISSUES = topLevelIssues;
        return {
            activeSprint: activeSprint,
            issues: topLevelIssues,
        };
    }

    const [reloadNum, setReloadNum] = useState(0);
    const [issues, setIssues] = useState([]);
    const [topLevelIssues, setTopLevelIssues] = useState([]);
    const [activeSprint, setActiveSprint] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!loading) {
            setLoading(true);
        }
        loadIssues(0, [], reloadNum > 0).then(issues => {
            setIssues(issues);
            const issueInfo = processIssues(issues);
            setTopLevelIssues(issueInfo.issues);
            setActiveSprint(issueInfo.activeSprint);
            setLoading(false);
        });
    }, [reloadNum]);

    return [issues, topLevelIssues, activeSprint, loading, () => setReloadNum(reloadNum + 1)];
}
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

const App = () => {
    const [issues, topLevelIssues, activeSprint, loading, forceReload] = useIssues();

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
    const header1 = sortedYears.map((yearInfo, idx) => <div style={{gridColumnStart: 7 + yearInfo[1], gridColumnEnd: 8 + yearInfo[1] + yearInfo[2], gridRow: 1}}>
        {yearInfo[0]}
    </div>);
    const header2 = sortedSprints.map((sprint, idx) => <div style={{gridColumn: 7 + idx, gridRow: 2, backgroundColor: sprint === activeSprint ? "#dfd" : "none"}}>
        {sprint.split("-")[1]}
    </div>);

    return <div>
        <div style={{ display: "grid", gridTemplateColumns: `20px 100px 20px auto 20px repeat(${sortedSprints.length}, 50px)` }}>
            {header1}
            {header2}
            {flattenedIssues.map((info, row) => renderIssue(info, row+2, sortedSprints, sortedSprints.indexOf(activeSprint)))}
        </div>
        <p>
            {loading ? "Loading issues..." : `${issues.length} issues loaded. `}
            {!loading && <button onClick={forceReload}>Reload</button>}
        </p>
    </div>;
};

export default App;
