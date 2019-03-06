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

function useHashFlags() {
    const [hideNav, setHideNav] = useState(false);

    function _update() {
        const flags = window.location.hash.slice(1).split(",");
        setHideNav(flags.indexOf("hideNav") >= 0);
    }

    useEffect(() => {
        _update();
        window.addEventListener('hashchange', _update);
    });

    return [hideNav];
}

const App = () => {
    const [windowWidth, windowHeight] = useWindowSize();
    const [hideNav] = useHashFlags();
    const [epics, issues, sprints, jiraUpdateTime, jiraLoading, forceReload] = useJiraData();
    const [teamMembers, pingUpdateTime, pingLoading, forcePingReload] = usePingboardData();
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
    }, !jiraLoading);

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
            hideNav={hideNav}
            issues={filteredIssues}
            loading={jiraLoading}
            sprints={sprints}
            updateTime={jiraUpdateTime}
        />
    }
    return <Epics
        epics={epics}
        forcePingReload={forcePingReload}
        forceReload={forceReload}
        globalStyles={globalStyles}
        issues={issues}
        jiraLoading={jiraLoading}
        selectEpic={setSelectedEpic}
        sprints={sprints}
        teamMembers={teamMembers}
        pingLoading={pingLoading}
    />;
};

export default App;
