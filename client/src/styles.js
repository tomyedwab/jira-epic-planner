const fontStyle = {
    fontFamily: "'Lato', sans-serif",
};

const TEAM_STYLES = {
    "Frontend": {backgroundColor: "rgb(255, 177, 0, 0.4)"},
    "Backend": {backgroundColor: "rgb(55, 197, 253, 0.4)"},
    "Front/Backend": {backgroundImage: "-webkit-linear-gradient(-30deg, rgb(255, 177, 0, 0.4) 50%, rgb(55, 197, 253, 0.4) 50%)"},
    "Fullstack": {backgroundColor: "rgb(255, 177, 0, 0.4)"},
    "Design": {backgroundColor: "rgb(20, 191, 150, 0.4)"},
};

const globalStyles = {
    fontStyle,

    table: {
        fontSize: "14px",
    },

    tableRow: idx => ({
        backgroundColor: (!!(idx % 2) ? "rgba(0, 0, 0, 0)" : "rgba(0, 0, 0, 5%)"),
    }),

    heading: {
        fontWeight: "bold",
    },

    issueCount: {
        fontSize: "12px",
    },

    jiraLink: {
        verticalAlign: "top",
    },

    pageTitle: {
        fontWeight: "bold",
    },

    sprintDate: {
        fontSize: "8pt",
    },

    team: team => ({
        ...TEAM_STYLES[team],
    }),
};

export default globalStyles;