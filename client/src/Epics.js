import React, {useState} from 'react';
import {getSprintDateStr, getSprintDays, shortDate} from './util';
import {usePingboardData} from './Api.js';
import globalStyles from './styles.js';

// TODO: Company holidays
// TODO: Highlight overcommit

const renderEpic = (epic, row, selectEpic) => {
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

const renderSprint = (sprint, epicMap, issues, selectEpic, teamMembers) => {
    // TODO: Alternate row shading

    const sprintDays = getSprintDays(sprint);

    const epicStats = {};
    const epicTotals = {
        Design: {
            points: 0,
        },
        Frontend: {
            points: 0,
        },
        Backend: {
            points: 0,
        },
        Unknown: {
            points: 0,
        },
        totalPoints: 0,
    };

    issues.forEach(issue => {
        const epic = issue.epic || "";
        epicStats[epic] = epicStats[epic] || {
            count: 0,
            Design: {
                unknown: 0,
                points: 0,
                jiras: [],
            },
            Frontend: {
                unknown: 0,
                points: 0,
                jiras: [],
            },
            Backend: {
                unknown: 0,
                points: 0,
                jiras: [],
            },
            Unknown: {
                unknown: 0,
                points: 0,
                jiras: [],
            },
            totalPoints: 0,
        };
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

        let team = "Unknown";
        if (issue.subteam === "Backend") {
            team = "Backend";
        } else if (issue.subteam === "Design") {
            team = "Design";
        } else if (issue.subteam === "Frontend" || issue.subteam === "Front/Backend") {
            team = "Frontend";
        }
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
            <div style={{...globalStyles.tableRow(idx), gridColumnStart: 1, gridColumnEnd: 7, gridRow: 2+idx}} />,
            <div style={{gridColumn: 1, gridRow: 2+idx}}>
                {epic.shortName}
            </div>,
            epic.key && <div style={{gridColumn: 2, gridRow: 2+idx}}>
                <a href={`/${epic.key}`} onClick={e => { selectEpic(epic); e.preventDefault(); }} style={globalStyles.jiraLink}>
                    {epic.key}
                </a>
            </div>,
            renderTeamPts(stats.Design, "Design", 3, idx),
            renderTeamPts(stats.Frontend, "Fullstack", 4, idx),
            renderTeamPts(stats.Backend, "Backend", 5, idx),
            renderTeamPts(stats.Unknown, "", 6, idx),
        ];
    });

    const totals = [
        <div style={{...globalStyles.tableRow(epicKeys.length), ...styles.finalRow, gridColumnStart: 1, gridColumnEnd: 7, gridRow: 2+epicKeys.length}} />,
        <div style={{gridColumn: 1, gridRow: 2+epicKeys.length, fontWeight: "bold"}}>
            Total committed
        </div>,
        <div style={{...globalStyles.team("Design"), gridColumn: 3, gridRow: 2+epicKeys.length, fontWeight: "bold", textAlign: "center"}}>
            {renderPts(epicTotals.Design.points)}
        </div>,
        <div style={{...globalStyles.team("Fullstack"), gridColumn: 4, gridRow: 2+epicKeys.length, fontWeight: "bold", textAlign: "center"}}>
            {renderPts(epicTotals.Frontend.points)}
        </div>,
        <div style={{...globalStyles.team("Backend"), gridColumn: 5, gridRow: 2+epicKeys.length, fontWeight: "bold", textAlign: "center"}}>
            {renderPts(epicTotals.Backend.points)}
        </div>,
        <div style={{...globalStyles.team(""), gridColumn: 6, gridRow: 2+epicKeys.length, fontWeight: "bold", textAlign: "center"}}>
            {renderPts(epicTotals.Unknown.points)}
        </div>,
    ];

    const teamTotals = {
        designPoints: 0,
        fullstackPoints: 0,
        backendPoints: 0,
    };

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

    const memberSortValue = memberInfo => (memberInfo.points + (memberInfo.team === "Design" ? 3000 : (memberInfo.team === "Fullstack" ? 2000 : (memberInfo.team === "Backend" ? 1000 : 0))));
    teamMemberInfo.sort((a, b) => memberSortValue(b) - memberSortValue(a));

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

        let col = null;
        if (memberInfo.team === "Design") {
            col = 3;
            teamTotals.designPoints += memberInfo.points;
        } else if (memberInfo.team === "Fullstack") {
            col = 4;
            teamTotals.fullstackPoints += memberInfo.points;
        } else if (memberInfo.team === "Backend") {
            col = 5;
            teamTotals.backendPoints += memberInfo.points;
        }

        return [
            <div style={{...globalStyles.tableRow(idx), gridColumnStart: 1, gridColumnEnd: 7, gridRow: 2+idx}} />,
            <div style={{gridColumn: 1, gridRow: idx+2}}>
                {memberInfo.first_name}
            </div>,
            <div style={{gridColumn: 2, gridRow: idx+2, fontWeight: "bold"}}>
                {OOOsText}
                {supportText}
            </div>,
            col && <div style={{...globalStyles.team(memberInfo.team), gridColumn: col, gridRow: idx+2, textAlign: "center"}}>
                {renderPts(memberInfo.points)}
            </div>,
        ];
    });

    const teamTotalRowIdx = 2+teamMembers.length;

    const teamTotalRow = [
        <div style={{...globalStyles.tableRow(teamMembers.length), ...styles.finalRow, gridColumnStart: 1, gridColumnEnd: 7, gridRow: teamTotalRowIdx}} />,
        <div style={{gridColumn: 1, gridRow: teamTotalRowIdx, fontWeight: "bold"}}>
            Total available
        </div>,
        <div style={{...globalStyles.team("Design"), gridColumn: 3, gridRow: teamTotalRowIdx, fontWeight: "bold", textAlign: "center"}}>
            {renderPts(teamTotals.designPoints)}
        </div>,
        <div style={{...globalStyles.team("Fullstack"), gridColumn: 4, gridRow: teamTotalRowIdx, fontWeight: "bold", textAlign: "center"}}>
            {renderPts(teamTotals.fullstackPoints)}
        </div>,
        <div style={{...globalStyles.team("Backend"), gridColumn: 5, gridRow: teamTotalRowIdx, fontWeight: "bold", textAlign: "center"}}>
            {renderPts(teamTotals.backendPoints)}
        </div>,
    ];

    return <div style={{...globalStyles.fontStyle, margin: 8, padding: 16, display: "inline-block", border: "1px solid rgba(0, 0, 0, 25%)", borderRadius: 12}}>
        <div style={{display: "flex"}}>
            <div style={{flex: "1 0 auto"}}>
                <div style={globalStyles.pageTitle}>Sprint {sprint.name}</div>
                <div style={globalStyles.sprintDate}>{getSprintDateStr(sprint)}</div>
            </div>
            <div style={{textAlign: "right"}}>
                <div style={styles.sprintState(sprint.state)}>{sprint.state}</div>
                <div style={globalStyles.issueCount}>{issues.length} issues</div>
            </div>
        </div>

        <div style={{...globalStyles.table, display: "grid", gridTemplateColumns: "160px 220px 120px 120px 120px 100px auto", marginLeft: 12}}>
            <div style={{...globalStyles.heading, gridColumn: 3, gridRow: 1, textAlign: "center"}}>
                Design Team
            </div>
            <div style={{...globalStyles.heading, gridColumn: 4, gridRow: 1, textAlign: "center"}}>
                Fullstack Team
            </div>
            <div style={{...globalStyles.heading, gridColumn: 5, gridRow: 1, textAlign: "center"}}>
                Backend Team
            </div>
            <div style={{...globalStyles.heading, gridColumn: 6, gridRow: 1, textAlign: "center"}}>
                Untagged
            </div>

            {teamRows}
            {teamTotalRow}
        </div>

        <div style={{...globalStyles.table, display: "grid", gridTemplateColumns: "300px 80px 120px 120px 120px 100px auto", marginLeft: 12, paddingTop: 24}}>
            {epicRows}
            {totals}
        </div>

    </div>
};

export default function Epics(props) {
    const {epics, issues, sprints, loading, forceReload} = props;
    const [teamMembers, pingLoading, forcePingReload] = usePingboardData();

    const orderedSprints = (
        Object.values(sprints)
        .sort((a, b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0))
    );
    const activeSprintIdx = orderedSprints.map(sprint => sprint.state).indexOf("ACTIVE");
    const filteredSprints = orderedSprints.slice(Math.max(0, activeSprintIdx - 1));

    const epicMap = {};
    epics.forEach(epic => epicMap[epic.key] = epic);

    return <div>
        {filteredSprints.map(sprint => (
            renderSprint(
                sprint, epicMap,
                issues.filter(issue => issue.sprints.indexOf(sprint.id) >= 0),
                props.selectEpic,
                teamMembers,
            )
        ))}
        <div style={{...globalStyles.fontStyle, padding: 8}}>
            <div style={globalStyles.pageTitle}>All epics</div>
            <div style={{...globalStyles.table, display: "grid", gridTemplateColumns: `300px 80px auto`, marginLeft: 12}}>
                {epics.map((epic, row) => renderEpic(epic, row, () => props.selectEpic(epic)))}
            </div>
        </div>
        <p>
            {loading ? "Loading epics..." : `${epics.length} epics loaded. `}
            {!loading && <button onClick={forceReload}>Reload</button>}
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
        ...globalStyles.fontStyle,
        backgroundColor: stateColors[state],
        borderRadius: 4,
        color: "#fff",
        fontSize: "10pt",
        padding: 4,
    }),
};