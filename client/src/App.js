import React, {useState} from 'react';

import Epics from './Epics.js';
import EpicIssues from './EpicIssues.js';

// TODO: Routing

const App = () => {
    const [selectedEpic, selectEpic] = useState(null);

    if (selectedEpic) {
        return <EpicIssues epic={selectedEpic} clearSelectedEpic={() => selectEpic(null)} />
    }
    return <Epics selectEpic={selectEpic} />;
};

export default App;
