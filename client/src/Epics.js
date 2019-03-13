import React from 'react';
import {getSprintDateStr, getSprintDays, shortDate} from './util';
import {SUBTEAM_PRIORITIES} from './static.js';

// TODO: This file needs cleanup
// TODO: Company holidays
// TODO: Highlight overcommit
// TODO: Way to view issues in "No epic"
// TODO: Show epic work in backlog (instead of "all epics")

const renderEpic = (epic, row, selectEpic, globalStyles) => {
    return [
        <div style={{gridColumn: 1, gridRow: row + 1}} key={epic.key + "::1"}>
            {epic.shortName}
        </div>,
        <div style={{gridColumn: 2, gridRow: row + 1}} key={epic.key + "::2"}>
            <a href={`/${epic.key}`} onClick={e => { selectEpic(); e.preventDefault(); }} style={globalStyles.jiraLink}>
                {epic.key}
            </a>
        </div>,
        <div style={{gridColumn: 3, gridRow: row + 1}} key={epic.key + "::3"}>
            {epic.summary}
        </div>,
    ];
};

const getOOOOverlap = (memberOOOs, sprintDays) => {
    const OOOs = [];
    let total = 0;

    if (sprintDays.length === 0) {
        return [OOOs, total];
    }

    memberOOOs.forEach(ooo => {
        let count = 0;
        sprintDays.forEach(day => {
            if (day >= ooo.start && day <= ooo.end) {
                count += 1;
            }
        });
        if (count > 0) {
            OOOs.push(ooo);
            total += count;
        }
    });

    return [OOOs, total];
};

const renderSprint = (sprint, epicMap, issues, selectEpic, teamMembers, globalStyles) => {
    // Get possible teams
    let teamSubteams = {};
    teamMembers.forEach(teamMember => {
        if (teamMember.team) {
            teamSubteams[teamMember.team] = true;
        }
    });
    teamSubteams = Object.keys(teamSubteams)
        .sort((a, b) => SUBTEAM_PRIORITIES[b] - SUBTEAM_PRIORITIES[a]);

    let issueSubteams = {};
    issues.forEach(issue => {
        if (issue.subteam && issue.subteam !== "Front/Backend") {
            issueSubteams[issue.subteam] = true;
        }
    });
    issueSubteams = Object.keys(issueSubteams)
        .sort((a, b) => SUBTEAM_PRIORITIES[b] - SUBTEAM_PRIORITIES[a])
        .concat(["Untagged"]);

    const sprintDays = getSprintDays(sprint);

    const epicStats = {};
    const epicTotals = {
        totalPoints: 0,
    };
    issueSubteams.forEach(team => epicTotals[team] = {points: 0});

    issues.forEach(issue => {
        const epic = issue.epic || "";
        if (!epicStats[epic]) {
            epicStats[epic] = {
                count: 0,
                totalPoints: 0,
            };
            issueSubteams.forEach(team => epicStats[epic][team] = {unknown: 0, points: 0, jiras: []});
        }
        epicStats[epic].count += 1;

        let estimate = issue.estimate;
        let unestimated = 0;
        if (estimate === null) {
            estimate = 0;
            
            if (issue.subtasks.length > 0) {
                issue.subtasks.forEach(subtask => {
                    if (subtask.estimate !== null) {
                        estimate += subtask.estimate;
                    } else {
                        unestimated += 1;
                    }
                })
            } else {
                unestimated += 1;
            }
        }

        const team = (issue.subteam === "Front/Backend") ? "Frontend" : (issue.subteam || "Untagged");
        epicStats[epic][team].points += estimate;
        epicStats[epic][team].totalPoints += estimate;
        epicStats[epic][team].unknown += unestimated;
        if (unestimated > 0) {
            epicStats[epic][team].jiras.push(issue.key);
        }
        epicTotals[team].points += estimate;
        epicTotals.totalPoints += estimate;
    });

    const epicKeys = Object.keys(epicStats);
    epicKeys.sort((a, b) => (
        (epicStats[b].totalPoints - (b === "" ? 9999 : 0)) -
        (epicStats[a].totalPoints - (a === "" ? 9999 : 0))));

    const renderPts = points => (points > 0) ? `${Math.round(points)} pts` : "-";

    const renderTeamPts = (teamStats, team, column, idx) => {
        if (!teamStats.points && !teamStats.unknown) {
            return null;
        }
        return <div style={{...globalStyles.team(team), gridColumn: column, gridRow: 2+idx, textAlign: "center"}}>
            {`${Math.round(teamStats.points)} pts`}
            {teamStats.unknown > 0 && <span style={{color: "#c00"}} title={teamStats.jiras.join(", ")}>
                {" + " + teamStats.unknown + " tasks"}
            </span>}
        </div>
    }

    const epicRows = epicKeys.map((epicKey, idx) => {
        const stats = epicStats[epicKey];
        const epic = epicMap[epicKey] || {shortName: "-- No epic --", key: null};
        return [
            <div style={{...globalStyles.tableRow(idx), gridColumnStart: 1, gridColumnEnd: issueSubteams.length + 3, gridRow: 2+idx}} />,
            <div style={{gridColumn: 1, gridRow: 2+idx}}>
                {epic.shortName}
            </div>,
            epic.key && <div style={{gridColumn: 2, gridRow: 2+idx}}>
                <a href={`/${epic.key}`} onClick={e => { selectEpic(epic); e.preventDefault(); }} style={globalStyles.jiraLink}>
                    {epic.key}
                </a>
            </div>,
        ].concat(issueSubteams.map((team, teamIdx) => renderTeamPts(stats[team], team, 3 + teamIdx, idx)));
    });

    const totals = [
        <div style={{...globalStyles.tableRow(epicKeys.length), ...styles.finalRow, gridColumnStart: 1, gridColumnEnd: issueSubteams.length + 3, gridRow: 2+epicKeys.length}} />,
        <div style={{gridColumn: 1, gridRow: 2+epicKeys.length, fontWeight: "bold"}}>
            Total committed
        </div>,
    ].concat(issueSubteams.map((team, teamIdx) => <div style={{...globalStyles.team(team), gridColumn: 3+teamIdx, gridRow: 2+epicKeys.length, fontWeight: "bold", textAlign: "center"}}>
        {renderPts(epicTotals[team].points)}
    </div>));

    const teamTotals = {};
    teamSubteams.forEach(team => teamTotals[team] = 0);

    const teamMemberInfo = teamMembers.map(member => {
        const [OOOs, OOOTotal] = getOOOOverlap(member.ooos || [], sprintDays);
        const onSupport = (member.supportRotations || []).indexOf(sprint.name) >= 0;
        const points = Math.max((member.allocation || 0) - OOOTotal - (onSupport ? 1 : 0), 0);
        return {
            ...member,
            OOOs,
            OOOTotal,
            onSupport,
            points
        };
    });

    const memberSortValue = memberInfo => (memberInfo.points + SUBTEAM_PRIORITIES[memberInfo.team] ? SUBTEAM_PRIORITIES[memberInfo.team] * 10000 : 0);
    teamMemberInfo.sort((a, b) => memberSortValue(b) - memberSortValue(a));

    function _getUniqueName(memberInfo, idx) {
        // Is the first name unique?
        if (teamMemberInfo.filter(
            (info, idx2) => idx !== idx2 &&
            info.first_name === memberInfo.first_name).length === 0
        ) {
            return memberInfo.first_name;
        }
        // If the first name + last initial unique?
        const lastInitial = `${memberInfo.first_name} ${memberInfo.last_name.substr(0, 1)}`;
        if (teamMemberInfo.filter(
            (info, idx2) => idx !== idx2 &&
            lastInitial === `${info.first_name} ${info.last_name.substr(0, 1)}`).length === 0
        ) {
            return lastInitial;
        }
        return `${memberInfo.first_name} ${memberInfo.last_name}`;
    }

    const teamRows = teamMemberInfo.map((memberInfo, idx) => {
        let OOOsText = "";
        if (memberInfo.OOOs.length > 0) {
            OOOsText = " [OOO " + memberInfo.OOOs.map(ooo => {
                const start = shortDate(ooo.start);
                const end = shortDate(ooo.end);
                if (start === end) {
                    return start;
                } else {
                    return start + " - " + end;
                }
            }).join(", ") + "]";
        }

        const supportText = memberInfo.onSupport ? " [Support]" : "";

        teamTotals[memberInfo.team] += memberInfo.points;

        return [
            <div style={{...globalStyles.tableRow(idx), gridColumnStart: 1, gridColumnEnd: teamSubteams.length + 3, gridRow: 2+idx}} />,
            <div style={{gridColumn: 1, gridRow: idx+2}}>
                {_getUniqueName(memberInfo, idx)}
            </div>,
            <div style={{gridColumn: 2, gridRow: idx+2, fontWeight: "bold"}}>
                {OOOsText}
                {supportText}
            </div>,
        ].concat(teamSubteams.map((team, teamIdx) => (memberInfo.team === team) && <div style={{...globalStyles.team(team), gridColumn: 3+teamIdx, gridRow: idx+2, textAlign: "center"}}>
            {renderPts(memberInfo.points)}
        </div>));
    });

    const teamTotalRowIdx = 2+teamMembers.length;

    const teamTotalRow = [
        <div style={{...globalStyles.tableRow(teamMembers.length), ...styles.finalRow, gridColumnStart: 1, gridColumnEnd: teamSubteams.length + 3, gridRow: teamTotalRowIdx}} />,
        <div style={{gridColumn: 1, gridRow: teamTotalRowIdx, fontWeight: "bold"}}>
            Total available
        </div>,
    ].concat(teamSubteams.map((team, teamIdx) => <div style={{...globalStyles.team(team), gridColumn: 3+teamIdx, gridRow: teamTotalRowIdx, fontWeight: "bold", textAlign: "center"}}>
        {renderPts(teamTotals[team])}
    </div>));

    return <div style={{...globalStyles.fontStyle, margin: 8, padding: 16, display: "inline-block", border: "1px solid rgba(0, 0, 0, 25%)", borderRadius: 12}}>
        <div style={{display: "flex"}}>
            <div style={{flex: "1 0 auto"}}>
                <div style={globalStyles.pageTitle}>Sprint {sprint.name}</div>
                <div style={globalStyles.sprintDate}>{getSprintDateStr(sprint)}</div>
            </div>
            <div style={{textAlign: "right"}}>
                <div style={{...globalStyles.fontStyle, ...styles.sprintState(sprint.state)}}>{sprint.state}</div>
                <div style={globalStyles.issueCount}>{issues.length} issues</div>
            </div>
        </div>

        <div style={{...globalStyles.table, display: "grid", gridTemplateColumns: `160px 220px repeat(${teamSubteams.length}, 120px) 100px auto`, marginLeft: 12}}>
            {teamSubteams.map((team, teamIdx) => <div style={{...globalStyles.heading, gridColumn: 3+teamIdx, gridRow: 1, textAlign: "center"}}>
                {team}
            </div>)}

            {teamRows}
            {teamTotalRow}
        </div>

        <div style={{...globalStyles.table, display: "grid", gridTemplateColumns: `300px 80px repeat(${issueSubteams.length}, 120px) 100px auto`, marginLeft: 12, paddingTop: 24}}>
            {issueSubteams.map((team, teamIdx) => <div style={{...globalStyles.heading, gridColumn: 3+teamIdx, gridRow: 1, textAlign: "center"}}>
                {team}
            </div>)}

            {epicRows}
            {totals}
        </div>

    </div>
};

export default function Epics(props) {
    const {projectName, epics, issues, sprints, jiraLoading, forceReload, teamMembers, pingLoading, forcePingReload, globalStyles} = props;

    const orderedSprints = (
        Object.values(sprints)
        .sort((a, b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0))
    );
    const activeSprintIdx = orderedSprints.map(sprint => sprint.state).indexOf("ACTIVE");
    const filteredSprints = orderedSprints.slice(Math.max(0, activeSprintIdx - 1));

    const epicMap = {};
    epics.forEach(epic => epicMap[epic.key] = epic);

    return <div>
        <div style={{...globalStyles.pageTitle, marginLeft: 10, marginTop: 8}}>Project {projectName}</div>

        {filteredSprints.map(sprint => (
            renderSprint(
                sprint, epicMap,
                issues.filter(issue => issue.sprints.indexOf(sprint.id) >= 0),
                props.selectEpic,
                teamMembers,
                globalStyles,
            )
        ))}
        <div style={{...globalStyles.fontStyle, padding: 8}}>
            <div style={globalStyles.pageTitle}>All epics</div>
            <div style={{...globalStyles.table, display: "grid", gridTemplateColumns: `300px 80px auto`, marginLeft: 12}}>
                {epics.map((epic, row) => renderEpic(epic, row, () => props.selectEpic(epic), globalStyles))}
            </div>
        </div>
        <p>
            {jiraLoading ? "Loading epics..." : `${epics.length} epics loaded. `}
            {!jiraLoading && <button onClick={forceReload}>Reload</button>}
        </p>
        <p>
            {pingLoading ? "Loading team member info..." : `${teamMembers.length} team members loaded. `}
            {!pingLoading && <button onClick={forcePingReload}>Reload</button>}
        </p>
    </div>;
}

const stateColors = {
    "CLOSED": "#666",
    "ACTIVE": "#00a000",
    "FUTURE": "#004080",
};

const styles = {
    finalRow: {
        borderBottom: "1px solid rgba(0, 0, 0, 40%)",
    },

    sprintState: (state) => ({
        backgroundColor: stateColors[state],
        borderRadius: 4,
        color: "#fff",
        fontSize: "10pt",
        padding: 4,
    }),
};