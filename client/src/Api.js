import { useState, useEffect } from 'react';

import {TEAM_MEMBER_DATA} from './static.js';

window.ALL_EPICS = {};
window.ALL_ISSUES = {};

export function useJiraData() {
    const [reloadNum, setReloadNum] = useState(0);
    const [epics, setEpics] = useState([]);
    const [issues, setIssues] = useState([]);
    const [sprints, setSprints] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!loading) {
            setLoading(true);
        }
        const force = reloadNum > 0;
        fetch(`/api/jira?force=${force}`)
            .then(resp => resp.json())
            .then(data => {
                data.epics.forEach(epic => window.ALL_EPICS[epic.key] = epic);
                data.issues.forEach(issue => {
                    window.ALL_ISSUES[issue.key] = issue;
                });
                data.issues.forEach(issue => {
                    issue.subtasks = issue.subtasks.map(issueKey => window.ALL_ISSUES[issueKey]);
                });
                data.issues.filter(issue => {
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
                });

                setEpics(data.epics);
                setIssues(data.issues);
                setSprints(data.sprints);
                setLoading(false);
            });
    }, [reloadNum]);

    return [epics, issues, sprints, loading, () => setReloadNum(reloadNum + 1)];
}

export function usePingboardData() {
    const [reloadNum, setReloadNum] = useState(0);
    const [loading, setLoading] = useState(true);
    const [teamMembers, setTeamMembers] = useState({});

    useEffect(() => {
        const force = reloadNum > 0;
        fetch(`/api/pingboard?force=${force}`)
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
                setLoading(false);
            });
    }, [reloadNum]);

    return [teamMembers, loading, () => setReloadNum(reloadNum + 1)];
}