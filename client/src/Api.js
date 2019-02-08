import { useState, useEffect } from 'react';
import EpicIssues from './EpicIssues';

const ISSUE_PRIORITIES = {
    "Done": 0,
    "Awaiting Deploy": 4000000,
    "In Review": 3000000,
    "In Progress": 2000000,
    "Dev": 2000000,
    "To Do": 1000000,
};

window.ALL_EPICS = {};
window.ALL_ISSUES = {};

export function useIssues(epic) {
    function calcIssuePriority(issue, activeSprint) {
        // TODO: Include dependencies in sort
        let priority = 0;
        let sprints = [];

        // Primary sort: "Done" at the top, then current sprint, then rest
        if (issue.fields.status.name === "Done") {
            priority = 10000000;
            sprints = issue.sprints;
        } else if (issue.sprints.indexOf(activeSprint) >= 0) {
            priority = 5000000;
            // sprints not relevant
        } else {
            // Sort based on first upcoming sprint
            sprints = issue.sprints.filter(s => s > activeSprint);
        }

        // Secondary sort: statuses in logical order
        priority += ISSUE_PRIORITIES[issue.fields.status.name];

        // Tertiary sort: chronological by sprint
        if (sprints.length > 0) {
            priority += 999999 - Math.min.apply(null, sprints.map(s => +s.replace("-", "")))
        }

        return priority;
    }

    function loadIssues(offset, issues, force) {
        return fetch(`/api/issues?epic=${epic}&startAt=${offset}&force=${force}`)
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
            topLevelIssuesMap[issue.key] = issue;
            issue.fields.subtasks.forEach(subtask => subtask.sprints = []);
            issue.blockedBy = null;
            issue.assignee = (issue.fields.assignee || {}).displayName;
            issue.status = issue.fields.status.name;
        });
        issues.forEach(issue => {
            issue.fields.issuelinks.forEach(link => {
                if (link.type.name === "Blocks" && link.outwardIssue &&
                    topLevelIssuesMap[link.outwardIssue.key]) {
                    topLevelIssuesMap[link.outwardIssue.key].blockedBy = issue;
                }
            });
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
        issues.forEach(issue => issue.priority = calcIssuePriority(issue, activeSprint));

        const topLevelIssues = (
            Object.values(topLevelIssuesMap)
            .sort((a, b) => b.priority - a.priority));
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

export function useEpics() {
    function loadEpics(force) {
        return fetch(`/api/epics?force=${force}`)
            .then(resp => resp.json())
            .then(data => {
                data.issues.forEach(issue => window.ALL_EPICS[issue.key] = issue);
                return data.issues;
            });
    }

    const [reloadNum, setReloadNum] = useState(0);
    const [epics, setEpics] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!loading) {
            setLoading(true);
        }
        loadEpics(reloadNum > 0).then(epics => {
            setEpics(epics);
            setLoading(false);
        });
    }, [reloadNum]);

    return [epics, loading, () => setReloadNum(reloadNum + 1)];
}