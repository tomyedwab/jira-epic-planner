import React, { useState, useEffect } from 'react';

window.ALL_ISSUES = {};

const ISSUE_PRIORITIES = {
    "Done": 0,
    "In Review": 1,
    "In Progress": 2,
    "Dev": 2,
    "To Do": 100,
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
        return fetch(`/issues?startAt=${offset}&force=${force}`)
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
                            const match = value.toLowerCase().match('sprint.sprint@.*name=[^,]+sprint (\\d+)');
                            if (match) {
                                let sprint = +match[1];
                                if (sprint < 5) {
                                    sprint = 201900 + sprint;
                                } else {
                                    sprint = 201800 + sprint;
                                }
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
                if (a.fields.status.name !== b.fields.status.name) {
                    return ISSUE_PRIORITIES[a.fields.status.name] - ISSUE_PRIORITIES[b.fields.status.name];
                }
                return Math.max.apply(null, a.sprints) - Math.max.apply(null, b.sprints);
            }));
        window.TOP_LEVEL_ISSUES = topLevelIssues;
        return topLevelIssues;
    }

    const [reloadNum, setReloadNum] = useState(0);
    const [issues, setIssues] = useState([]);
    const [topLevelIssues, setTopLevelIssues] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!loading) {
            setLoading(true);
        }
        loadIssues(0, [], reloadNum > 0).then(issues => {
            setIssues(issues);
            setTopLevelIssues(processIssues(issues));
            setLoading(false);
        });
    }, [reloadNum]);

    return [issues, topLevelIssues, loading, () => setReloadNum(reloadNum + 1)];
}
const renderIssue = ([isNested, isLast, topLevelIdx, issue], row, sortedSprints) => {
    const style = {
        paddingTop: isNested ? 4 : 8,
        paddingBottom: isLast ? 8 : 4,
        backgroundColor: !!(topLevelIdx % 2) ? "#fff" : "#efefef",
        color: (issue.fields.status.name === "Done") ? "#aaa": "#000",
        fontFamily: "'Lato', sans-serif",
        fontSize: "14px",
    };
    const ret = [
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
        ret.push(<div style={{...style, gridColumn: 7+sortedSprints.indexOf("" + sprint), gridRow: row + 1}} key={issue.key + "::S" + idx}>
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
    const [issues, topLevelIssues, loading, forceReload] = useIssues();

    const flattenedIssues = flattenIssues(topLevelIssues);
    let sprintsMap = {};
    flattenedIssues.forEach(([_, __, ___, issue]) => {
        issue.sprints.forEach(sprint => {
            sprintsMap[sprint] = 1;
        });
    });
    const sortedSprints = Object.keys(sprintsMap).sort();
    const header = sortedSprints.map((sprint, idx) => <div style={{gridColumn: 7 + idx, gridRow: 1}}>
        Sprint {sprint % 100}
    </div>);

    return <div>
        <div style={{ display: "grid", gridTemplateColumns: "20px 100px 20px auto 20px auto" }}>
            {header}
            {flattenedIssues.map((info, row) => renderIssue(info, row+1, sortedSprints))}
        </div>
        <p>
            {loading ? "Loading issues..." : `${issues.length} issues loaded. `}
            {!loading && <button onClick={forceReload}>Reload</button>}
        </p>
    </div>;
};

export default App;
