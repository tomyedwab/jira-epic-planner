import { useState, useEffect } from 'react';

import {PINGBOARD_DATA} from './static.js';

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
        fetch(`/api/all?force=${force}`)
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
    const [team, setTeam] = useState({});
    const [OOOs, setOOO] = useState({});
    const [supportRotation, setSupportRotation] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Just hard-code this for now
        setTeam(PINGBOARD_DATA.TEAM_MEMBERS);
        setOOO(PINGBOARD_DATA.OOO);
        setSupportRotation(PINGBOARD_DATA.SUPPORT);
        setLoading(false);
    });

    return [team, OOOs, supportRotation, loading];
}