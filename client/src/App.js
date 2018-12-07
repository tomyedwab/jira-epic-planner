import React, { useState, useEffect } from 'react';

function loadIssues(setIssues, offset, issues) {
    offset = offset || 0;
    issues = issues || [];
    return fetch("/issues?startAt=" + offset).then(resp => resp.json()).then(data => {
        if (data.issues.length === 0) {
            return issues;
        }
        issues = issues.concat(data.issues);
        setIssues(issues);
        offset += data.issues.length;
        return loadIssues(setIssues, offset, issues);
    });
}

const renderIssue = (issue, row) => {
  return [
    <div style={{gridColumn: 1, gridRow: row+1}} key={issue.key + "::1"}>
      {issue.fields.issuetype.name}
    </div>,
    <div style={{gridColumn: 2, gridRow: row+1}} key={issue.key + "::2"}>
      {issue.key}
    </div>,
    <div style={{gridColumn: 3, gridRow: row+1}} key={issue.key + "::3"}>
      {issue.fields.summary}
    </div>,
  ];
};

const App = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIssues(setIssues).then(() => setLoading(false));
  }, []);

  return <div>
    <div style={{display: "grid"}}>
      {issues.map(renderIssue)}
    </div>
    <p>{loading ? "Loading issues..." : `${issues.length} issues loaded.`}</p>
  </div>;
};

export default App;
