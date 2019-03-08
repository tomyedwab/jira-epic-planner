const TEAM_STYLES = {
    "Frontend": {backgroundColor: "rgb(255, 177, 0, 0.4)"},
    "Backend": {backgroundColor: "rgb(55, 197, 253, 0.4)"},
    "Front/Backend": {backgroundImage: "-webkit-linear-gradient(-30deg, rgb(255, 177, 0, 0.4) 50%, rgb(55, 197, 253, 0.4) 50%)"},
    "Fullstack": {backgroundColor: "rgb(255, 177, 0, 0.4)"},
    "Design": {backgroundColor: "rgb(20, 191, 150, 0.4)"},
};

const GlobalStyles = (useSmallerFont) => ({
    assignee: {
        backgroundColor: "#fff",
        borderRadius: useSmallerFont ? 12 : 14,
        float: "right",
        fontSize: useSmallerFont ? "10px" : "12px",
        fontWeight: "bold",
        margin: 2,
        minHeight: useSmallerFont ? 12 : 14,
        minWidth: useSmallerFont ? 16 : 18,
        padding: useSmallerFont ? 2 : 4,
        textAlign: "center",
    },

    estimateColumn: {
        fontSize: useSmallerFont ? "10px" : "12px",
        fontWeight: "900",
        textAlign: "center",
    },

    fontStyle: {
        fontFamily: "'Lato', sans-serif",
    },

    table: {
        fontSize: useSmallerFont ? "12px" : "14px",
    },

    tableRow: idx => ({
        backgroundColor: (!!(idx % 2) ? "rgba(0, 0, 0, 0)" : "rgba(0, 0, 0, 5%)"),
    }),

    heading: {
        fontWeight: "bold",
    },

    issueColumns: (numSprints) => ({
        display: "grid", 
        gridTemplateColumns: useSmallerFont ? 
            `20px auto 70px 80px 80px 20px repeat(${numSprints}, 34px)` :
            `20px auto 85px 90px 140px 30px repeat(${numSprints}, 50px)`,
    }),

    issueRows: (numRows) => ({
        gridTemplateRows: `repeat(${numRows}, ${useSmallerFont ? 28 : 35}px)`,
        overflowY: "scroll",
    }),

    issueCount: {
        fontSize: "12px",
    },

    issueGantt: (issueColor) => ({
        backgroundColor: issueColor,
        width: "100%",
        height: "100%",
        borderRadius: useSmallerFont ? 10 : 16,
    }),

    issueIconContainer: {
        float: "right",
        height: useSmallerFont ? 18 : 24,
        marginRight: useSmallerFont ? 4 : 8,
        verticalAlign: "top",
        width: useSmallerFont ? 18 : 24,
    },

    issueStyle: (isNested, isLast, isDone) => ({
        paddingTop: (isNested ? 2 : 4) * (useSmallerFont ? 1 : 2),
        paddingBottom: (isLast ? 4 : 2) * (useSmallerFont ? 1 : 2),
        color: isDone ? "#aaa": "#000",
        fontSize: useSmallerFont ? "12px" : "14px",
    }),

    jiraLink: {
        verticalAlign: "top",
    },

    pageTitle: {
        fontWeight: "bold",
    },

    sprintDate: {
        fontSize: useSmallerFont ? "6pt" : "8pt",
    },

    statusColumn: {
        fontSize: useSmallerFont ? "10px" : "12px",
        fontWeight: "bold",
        textAlign: "center",
    },

    team: team => ({
        ...TEAM_STYLES[team],
    }),

    teamColumn: {
        fontSize: useSmallerFont ? "10px" : "12px",
        fontWeight: "bold",
        textAlign: "center",
    },
});

export default GlobalStyles;