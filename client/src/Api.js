import { useState, useEffect } from 'react';

import {TEAM_MEMBER_DATA, SPRINT_MAP} from './static.js';

window.ALL_EPICS = {};
window.ALL_ISSUES = {};

export function useMetaData(projectKey) {
    const [projectName, setProjectName] = useState("Loading...");

    useEffect(() => {
        if (!projectKey) {
            return;
        }
        fetch(`/api/${projectKey}/meta`)
            .then(resp => resp.json())
            .then(data => {
                setProjectName(data.ProjectName);
            });
    }, [projectKey]);

    return [projectName];
}

function hackSubteam(issue) {
    if (issue.subteam) {
        return issue.subteam;
    }
    const summary = issue.summary.toLowerCase();
    if (summary.indexOf("[be]") === 0) {
        return "Backend";
    }
    if (summary.indexOf("[fe]") === 0) {
        return "Frontend";
    }
    if (summary.indexOf("[des]") === 0) {
        return "Design";
    }
    if (summary.indexOf("[pm]") === 0) {
        return "PM";
    }
    console.log(summary);
    return null;
}

export function useJiraData(projectKey) {
    const [reloadNum, setReloadNum] = useState(0);
    const [epics, setEpics] = useState([]);
    const [issues, setIssues] = useState([]);
    const [sprints, setSprints] = useState({});
    const [loading, setLoading] = useState(true);
    const [updateTime, setUpdateTime] = useState(null);

    useEffect(() => {
        if (!projectKey) {
            return;
        }
        if (!loading) {
            setLoading(true);
        }
        const force = reloadNum > 0;
        fetch(`/api/${projectKey}/jira?force=${force}`)
            .then(resp => resp.json())
            .then(data => {
                data.epics.forEach(epic => window.ALL_EPICS[epic.key] = epic);

                setEpics(data.epics);
                setIssues(
                    data.issues.map(issue => {
                        window.ALL_ISSUES[issue.key] = issue;
                        return issue;
                    }).map(issue => ({
                        ...issue,
                        subtasks: issue.subtasks.map(issueKey => window.ALL_ISSUES[issueKey]),
                        subteam: hackSubteam(issue),
                    })).filter(issue => {
                        if (issue.type === "Epic" || issue.type === "Sub-task") {
                            return false;
                        }
                        let retain = true;
                        issue.blocks.forEach(blockedKey => {
                            const blockedIssue = window.ALL_ISSUES[blockedKey];
                            if (!blockedIssue) {
                                console.log("Cannot find blocked issue", blockedKey);
                                return;
                            }
                            blockedIssue.blockedBy = issue;
                            if (issue.type === "Design Task" && blockedIssue.type === "Story") {
                                retain = false;
                                blockedIssue.subtasks.push(issue);
                            }
                        });
                        return retain;
                    })
                );

                const sprints = {};
                const filterMap = (SPRINT_MAP[projectKey] || {});
                Object.keys(data.sprints)
                    .filter(sprintId => !!filterMap[data.sprints[sprintId].name])
                    .forEach(sprintId => {
                        const [year, sprintNum] = filterMap[data.sprints[sprintId].name];
                        const pad = (sprintNum < 10) ? "0" : "";
                        const newName = `${year}-${pad}${sprintNum}`;
                        sprints[sprintId] = {
                            ...data.sprints[sprintId],
                            name: newName,
                            year: year,
                            num: sprintNum,
                        };
                    });
                setSprints(sprints);

                setUpdateTime(new Date(data.updateTime));
                setLoading(false);
            });
    }, [projectKey, reloadNum]);

    return [epics, issues, sprints, updateTime, loading, () => setReloadNum(reloadNum + 1)];
}

export function usePingboardData(projectKey) {
    const [reloadNum, setReloadNum] = useState(0);
    const [loading, setLoading] = useState(true);
    const [updateTime, setUpdateTime] = useState(null);;
    const [teamMembers, setTeamMembers] = useState({});

    useEffect(() => {
        if (!projectKey) {
            return;
        }
        const force = reloadNum > 0;
        fetch(`/api/${projectKey}/pingboard?force=${force}`)
            .then(resp => resp.json())
            .then(data => {
                setTeamMembers(data.members.map(member => ({
                    ...member,
                    ...TEAM_MEMBER_DATA[member.id],
                    ooos: member.ooos.map(ooo => ({
                        ...ooo,
                        start: new Date(ooo.starts_at),
                        end: new Date(ooo.ends_at),
                    })),
                })));
                setUpdateTime(new Date(data.updateTime));
                setLoading(false);
            });
    }, [projectKey, reloadNum]);

    return [teamMembers, updateTime, loading, () => setReloadNum(reloadNum + 1)];
}