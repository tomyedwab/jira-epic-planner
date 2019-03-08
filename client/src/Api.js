import { useState, useEffect } from 'react';

import {TEAM_MEMBER_DATA} from './static.js';

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
                setSprints(data.sprints);
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