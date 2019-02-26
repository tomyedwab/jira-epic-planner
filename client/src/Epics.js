import React from 'react';
import {getSprintDateStr, getSprintDays, shortDate} from './util';
import {usePingboardData} from './Api.js';

// TODO: Company holidays
// TODO: Highlight overcommit

const renderEpic = (epic, row, selectEpic) => {
    const style = {
        paddingTop: 8,
        paddingBottom: 8,
        fontFamily: "'Lato', sans-serif",
        fontSize: "14px",
    };
    return [
        <div style={{...style, gridColumn: 1, gridRow: row + 1}} key={epic.key + "::1"}>
            <a href={`/${epic.key}`} onClick={e => { selectEpic(); e.preventDefault(); }}>
                {epic.key}
            </a>
        </div>,
        <div style={{...style, gridColumn: 2, gridRow: row + 1}} key={epic.key + "::2"}>
            {epic.shortName}
        </div>,
        <div style={{...style, gridColumn: 3, gridRow: row + 1}} key={epic.key + "::3"}>
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

const renderSprint = (sprint, epicMap, issues, selectEpic, team, teamOOOs, supportRotation) => {
    // TODO: Alternate row shading

    const sprintDays = getSprintDays(sprint);

    const epicStats = {};
    const epicTotals = {
        designPoints: 0,
        fullstackPoints: 0,
        backendPoints: 0,
        totalPoints: 0,
    };

    issues.forEach(issue => {
        const epic = issue.epic || "";
        epicStats[epic] = epicStats[epic] || {
            count: 0,
            unestimated: 0,
            designPoints: 0,
            fullstackPoints: 0,
            backendPoints: 0,
            totalPoints: 0,
        };
        epicStats[epic].count += 1;
        if (!issue.estimate) {
            epicStats[epic].unestimated += 1;
        } else {
            if (issue.subteam === "Backend") {
                epicStats[epic].backendPoints += issue.estimate;
                epicTotals.backendPoints += issue.estimate;
            } else if (issue.subteam === "Design") {
                epicStats[epic].designPoints += issue.estimate;
                epicTotals.designPoints += issue.estimate;
            } else {
                epicStats[epic].fullstackPoints += issue.estimate;
                epicTotals.fullstackPoints += issue.estimate;
            }
            epicStats[epic].totalPoints += issue.estimate;
            epicTotals.totalPoints += issue.estimate;
        }
    });

    const epicKeys = Object.keys(epicStats);
    epicKeys.sort((a, b) => (
        (epicStats[b].totalPoints - (b === "" ? 9999 : 0)) -
        (epicStats[a].totalPoints - (a === "" ? 9999 : 0))));

    const renderPts = p => (p > 0) ? `${p} pts` : "-";

    const rows = epicKeys.map((epicKey, idx) => {
        const stats = epicStats[epicKey];
        const epic = epicMap[epicKey] || {shortName: "-- No epic --", key: null};
        return [
            <div style={{gridColumn: 1, gridRow: 2+idx}}>
                {epic.shortName}
            </div>,
            epic.key && <div style={{gridColumn: 2, gridRow: 2+idx}}>
                <a href={`/${epic.key}`} onClick={e => { selectEpic(epic); e.preventDefault(); }}>
                    {epic.key}
                </a>
            </div>,
            <div style={{gridColumn: 3, gridRow: 2+idx, textAlign: "center"}}>
                {renderPts(stats.designPoints)}
            </div>,
            <div style={{gridColumn: 4, gridRow: 2+idx, textAlign: "center"}}>
                {renderPts(stats.fullstackPoints)}
            </div>,
            <div style={{gridColumn: 5, gridRow: 2+idx, textAlign: "center"}}>
                {renderPts(stats.backendPoints)}
            </div>,
            stats.unestimated > 0 && <div style={{gridColumn: 6, gridRow: 2+idx, color: "#f00", textAlign: "center"}}>
                {stats.unestimated} tasks
            </div>,
        ];
    });

    const totals = [
        <div style={{gridColumn: 1, gridRow: 2+epicKeys.length, fontWeight: "bold"}}>
            Total committed
        </div>,
        <div style={{gridColumn: 3, gridRow: 2+epicKeys.length, fontWeight: "bold", textAlign: "center"}}>
            {renderPts(epicTotals.designPoints)}
        </div>,
        <div style={{gridColumn: 4, gridRow: 2+epicKeys.length, fontWeight: "bold", textAlign: "center"}}>
            {renderPts(epicTotals.fullstackPoints)}
        </div>,
        <div style={{gridColumn: 5, gridRow: 2+epicKeys.length, fontWeight: "bold", textAlign: "center"}}>
            {renderPts(epicTotals.backendPoints)}
        </div>,
    ];

    const teamTotals = {
        designPoints: 0,
        fullstackPoints: 0,
        backendPoints: 0,
    };

    const teamRows = Object.keys(team).map((id, idx) => {
        const member = team[id];
        const [OOOs, OOOTotal] = getOOOOverlap(teamOOOs[id] || [], sprintDays);
        const onSupport = supportRotation[sprint.name] === id;
        const points = Math.max(member.allocation - OOOTotal - (onSupport ? 1 : 0), 0);

        let OOOsText = "";
        if (OOOs.length > 0) {
            OOOsText = " [OOO " + OOOs.map(ooo => {
                const start = shortDate(ooo.start);
                const end = shortDate(ooo.end);
                if (start === end) {
                    return start;
                } else {
                    return start + " - " + end;
                }
            }).join(", ") + "]";
        }

        const supportText = onSupport ? " [Support]" : "";

        let col = null;
        if (member.team === "Design") {
            col = 3;
            teamTotals.designPoints += points;
        } else if (member.team === "Fullstack") {
            col = 4;
            teamTotals.fullstackPoints += points;
        } else if (member.team === "Backend") {
            col = 5;
            teamTotals.backendPoints += points;
        }

        return [
            <div style={{gridColumn: 1, gridRow: idx+2}}>
                {member.name}
                <span style={{fontStyle: "italic"}}>
                    {OOOsText}
                    {supportText}
                </span>
            </div>,
            col && <div style={{gridColumn: col, gridRow: idx+2, textAlign: "center"}}>
                {renderPts(points)}
            </div>,
        ];
    });

    const teamTotalRow = [
        <div style={{gridColumn: 1, gridRow: 2+Object.keys(team).length, fontWeight: "bold"}}>
            Total available
        </div>,
        <div style={{gridColumn: 3, gridRow: 2+Object.keys(team).length, fontWeight: "bold", textAlign: "center"}}>
            {renderPts(teamTotals.designPoints)}
        </div>,
        <div style={{gridColumn: 4, gridRow: 2+Object.keys(team).length, fontWeight: "bold", textAlign: "center"}}>
            {renderPts(teamTotals.fullstackPoints)}
        </div>,
        <div style={{gridColumn: 5, gridRow: 2+Object.keys(team).length, fontWeight: "bold", textAlign: "center"}}>
            {renderPts(teamTotals.backendPoints)}
        </div>,
    ];

    return <div style={{padding: 24, display: "inline-block"}}>
        <div style={{display: "flex"}}>
            <div style={{flex: "1 0 auto"}}>
                <h3>Sprint {sprint.name}</h3>
                {getSprintDateStr(sprint)}
            </div>
            <div style={{textAlign: "right"}}>
                [{sprint.state}]
                <br />
                {issues.length} issues
            </div>
        </div>

        <div style={{display: "grid", gridTemplateColumns: "300px 80px 120px 120px 120px 100px auto"}}>
            <div style={{gridColumn: 3, gridRow: 1, fontWeight: "bold", textAlign: "center"}}>
                Design Team
            </div>
            <div style={{gridColumn: 4, gridRow: 1, fontWeight: "bold", textAlign: "center"}}>
                Fullstack Team
            </div>
            <div style={{gridColumn: 5, gridRow: 1, fontWeight: "bold", textAlign: "center"}}>
                Backend Team
            </div>
            <div style={{gridColumn: 6, gridRow: 1, fontWeight: "bold", textAlign: "center"}}>
                Unestimated
            </div>

            {teamRows}
            {teamTotalRow}
        </div>

        <div style={{display: "grid", gridTemplateColumns: "300px 80px 120px 120px 120px 100px auto", paddingTop: 24}}>
            {rows}
            {totals}
        </div>

    </div>
};

export default function Epics(props) {
    const {epics, issues, sprints, loading, forceReload} = props;
    const [team, OOOs, supportRotation, pingLoading] = usePingboardData();

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
                team, OOOs, supportRotation,
            )
        ))}
        <div style={{ display: "grid", gridTemplateColumns: `100px auto auto` }}>
            {epics.map((epic, row) => renderEpic(epic, row, () => props.selectEpic(epic)))}
        </div>
        <p>
            {loading ? "Loading epics..." : `${epics.length} epics loaded. `}
            {!loading && <button onClick={forceReload}>Reload</button>}
        </p>
    </div>;
}