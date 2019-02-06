import React, {useState, useEffect} from 'react';

import {useEpics} from './Api.js';
import Epics from './Epics.js';
import EpicIssues from './EpicIssues.js';

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

const App = () => {
    const [epics, loading, forceReload] = useEpics();
    const [selectedEpic, selectEpic] = useState(null);

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
        return <EpicIssues epic={selectedEpic} clearSelectedEpic={() => setSelectedEpic(null)} />
    }
    return <Epics epics={epics} loading={loading} forceReload={forceReload} selectEpic={setSelectedEpic} />;
};

export default App;
