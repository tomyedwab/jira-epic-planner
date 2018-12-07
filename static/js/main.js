console.log("Hello, JS!");

window.issues = [];

function loadIssues(offset) {
    offset = offset || 0;
    return fetch("/issues?startAt=" + offset).then(resp => resp.json()).then(data => {
        if (data.issues.length === 0) {
            return window.issues;
        }
        window.issues = window.issues.concat(data.issues);
        offset += data.issues.length;
        return loadIssues(offset);
    });
}

loadIssues(0).then(issues => {
    console.log(issues);
});
