import React from 'react';

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
}

export default function Epics(props) {
    const {epics, loading, forceReload} = props;

    return <div>
        <div style={{ display: "grid", gridTemplateColumns: `100px auto auto` }}>
            {epics.map((epic, row) => renderEpic(epic, row, () => props.selectEpic(epic)))}
        </div>
        <p>
            {loading ? "Loading epics..." : `${epics.length} epics loaded. `}
            {!loading && <button onClick={forceReload}>Reload</button>}
        </p>
    </div>;
}