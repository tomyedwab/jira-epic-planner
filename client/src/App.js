import React, {useState, useEffect} from 'react';

import {useJiraData, usePingboardData} from './Api.js';
import Epics from './Epics.js';
import EpicIssues from './EpicIssues.js';
import GlobalStyles from './styles.js';

// Very simple path-based router
function useLocation(cb, ready) {
    useEffect(() => {
        window.addEventListener('popstate', () => cb(window.location.pathname));
    });
    useEffect(() => {
        if (ready) {
            cb(window.location.pathname);
        }
    }, [ready]);


    return path => {
        window.history.pushState(null, null, path);
    };
}

function useWindowSize() {
    const [width, setWidth] = useState(window.innerWidth);
    const [height, setHeight] = useState(window.innerHeight);

    useEffect(() => {
        window.addEventListener('resize', () => {
            setWidth(window.innerWidth);
            setHeight(window.innerHeight);
        });
    });

    return [width, height];
}

const App = () => {
    const [windowWidth, windowHeight] = useWindowSize();
    const [epics, issues, sprints, loading, forceReload] = useJiraData();
    const [teamMembers, pingLoading, forcePingReload] = usePingboardData();
    const [selectedEpic, selectEpic] = useState(null);

    const useSmallerFont = (windowWidth < 1000);
    const globalStyles = GlobalStyles(useSmallerFont);

    const setLocation = useLocation(path => {
        const epicKey = path.substr(1);
        console.log("Selected epic", epicKey);
        if (epicKey === "") {
            selectEpic(null);
        } else {
            const matching = epics.filter(epic => epic.key === epicKey);
            if (matching.length === 1) {
                selectEpic(matching[0]);
            }
        }
    }, !loading);

    const setSelectedEpic = epic => {
        selectEpic(epic);
        setLocation("/" + (epic ? epic.key : ""));
    };
    
    if (selectedEpic) {
        const filteredIssues = issues.filter(issue => issue.epic === selectedEpic.key);
        return <EpicIssues
            clearSelectedEpic={() => setSelectedEpic(null)}
            epic={selectedEpic}
            forceReload={forceReload}
            globalStyles={globalStyles}
            issues={filteredIssues}
            loading={loading}
            sprints={sprints}
        />
    }
    return <Epics
        epics={epics}
        forcePingReload={forcePingReload}
        forceReload={forceReload}
        globalStyles={globalStyles}
        issues={issues}
        loading={loading}
        selectEpic={setSelectedEpic}
        sprints={sprints}
        teamMembers={teamMembers}
        pingLoading={pingLoading}
    />;
};

export default App;
