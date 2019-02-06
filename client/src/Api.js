import { useState, useEffect } from 'react';

const ISSUE_PRIORITIES = {
    "Done": 0,
    "In Review": 3000000,
    "In Progress": 2000000,
    "Dev": 2000000,
    "To Do": 1000000,
};

window.ALL_ISSUES = {};

export function useIssues(epic) {
    function loadIssues(offset, issues, force) {
        return fetch(`/issues?epic=${epic}&startAt=${offset}&force=${force}`)
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