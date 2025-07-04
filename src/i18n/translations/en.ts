export default {
    common: {
        cancel: 'Cancel',
        submit: 'Submit',
        delete: 'Delete',
        edit: 'Edit',
        close: 'Close',
        removeIcon: '✕',
        back: 'Back',
        next: 'Next',
        confirm: 'Confirm',
        success: 'Success',
        connecting: 'Connecting',
        error: 'Error',
        loading: 'Loading...',
        go: 'Go',
        remove: 'Remove',
        add: 'Add',
        update: 'Update',
        updating: 'Updating...',
        yes: 'Yes',
        ok: 'OK',
        defaultFencerA: 'Fencer A',
        defaultFencerB: 'Fencer B',
        vs: 'VS',
        defaultValue: 'Default Value',
        tbd: 'TBD',
        tournament: 'Tournament',
        disconnectBoxPromptTitle: 'Disconnect Scoring Box?',
        disconnectBoxPromptMessage:
            'You are currently connected to a scoring box. Would you like to disconnect before leaving?',
        disconnectAndExit: 'Disconnect & Exit',
        exitWithoutDisconnecting: 'Exit Without Disconnecting',
    },
    home: {
        title: 'Home',
        createTournament: 'Create Tournament',
        joinTournament: 'Join Tournament',
        ongoingTournaments: 'Ongoing Tournaments',
        tournamentHistory: 'Tournament History',
        remoteTournaments: 'Remote Tournaments',
        deviceId: 'Device ID:',
        connectedTo: 'Connected to:',
        connectingTo: 'Connecting to:',
        disconnect: 'Disconnect',
        refereeModule: 'Referee Module',
        disconnected: 'Disconnected',
        disconnectedMessage: 'You have disconnected from the tournament',
        errorLoadingTournaments: 'Error loading tournaments',
        errorLoadingHistory: 'Error loading tournament history',
        failedToConnect: 'Failed to connect to the tournament',
        failedToRemove: 'Failed to remove the tournament',
        connectionLost: 'Connection Lost (hi cate!)',
        connectionLostMessage:
            'Connection to the tournament has been lost. Try reconnecting or return to the home page.',
        reconnect: 'Reconnect',
        backToHome: 'Back to Home',
    },
    createTournament: {
        title: 'Create New Tournament',
        enterName: 'Enter tournament name',
        errorEmptyName: 'Please enter a tournament name',
        errorCreateFailed: 'Failed to create tournament. It might already exist.',
    },
    joinTournament: {
        title: 'Join Tournament',
        availableTournaments: 'Available Tournaments',
        searching: 'Searching for tournaments...',
        noTournamentsFound: 'No tournaments found on your network. You may need to enter the IP address manually.',
        refresh: 'Refresh',
        enterIpManually: 'Enter IP Manually',
        manualConnection: 'Manual Connection',
        hostIpAddress: 'Host IP Address:',
        enterHostIp: 'Enter host IP (e.g., 192.168.1.5)',
        port: 'Port:',
        enterPort: 'Enter port (default: 9001)',
        errorEmptyIp: 'Please enter a host IP address',
        errorInvalidIp: 'Please enter a valid IP address (e.g., 192.168.1.5)',
        errorInvalidPort: 'Please enter a valid port number (1024-65535)',
        errorConnectionFailed: 'Failed to connect to the tournament server',
        connect: 'Connect',
    },
    eventManagement: {
        editTournament: 'Edit Tournament',
        createEvent: 'Create Event',
        manageOfficials: 'Manage Officials',
        edit: 'Edit',
        removeIcon: '✖',
        errorLoading: 'Error loading events. Please try again.',
        noEvents: 'No events created yet',
        open: 'Open',
        start: 'Start',
        confirmDelete: 'Confirm Delete',
        confirmDeleteMessage: 'Are you sure you want to delete this event?',
        confirmStart: 'Confirm Start',
        confirmStartMessage: 'Are you sure you want to start this event?',
        startingDE: 'Starting DE Round',
        bracketSizeMessage:
            'The bracket will be automatically sized to {{size}} based on {{count}} registered fencers.',
        continue: 'Continue',
        roundNotStarted: 'Round Not Started',
        initializeRoundMessage: "This round hasn't been initialized yet. Would you like to start it now?",
        startRound: 'Start Round',
        failedToInitialize: 'Failed to initialize round.',
        noFencersError: 'Cannot start event with no fencers. Please add fencers to this event.',
        noRoundsError: 'No rounds defined for this event. Please add rounds in the event settings.',
        noPoolConfigError:
            'Some pool rounds do not have a pool configuration selected. Please set pool configurations in the event settings.',
        failedToOpenEvent: 'Failed to open event.',
        tournamentIp: 'Tournament IP:',
        networkConnected: 'Network Connected',
        networkDisconnected: 'Network Disconnected',
        connectedToRemoteTournament: 'Connected to remote tournament',
        host: 'Host',
        tournamentIp: 'Tournament IP',
        port: 'Port',
        disconnect: 'Disconnect',
        serverStarted: 'Server Started',
        serverStartedMessage:
            'Tournament server is now running at {{ip}}:{{port}}\n\nShare this information with participants who want to join.',
        serverStartFailed: 'Failed to start the tournament server. Please check your network connection and try again.',
        networkIssue: 'Network Issue',
        networkIssueMessage:
            'No network connection detected. Other devices may not be able to connect to your tournament server.',
        startAnyway: 'Start Anyway',
        serverStopped: 'Server Stopped',
        serverStoppedMessage: 'Tournament server has been shut down',
        serverStopFailed:
            'Failed to stop the tournament server. The server process may still be running in the background.',
        enableServer: 'Enable Server',
        disableServer: 'Disable Server',
        starting: 'Starting...',
        stopping: 'Stopping...',
        serverRunning: 'Server running on port: {{port}}',
        shareInfo: 'Share this info with players who want to join.',
        error: 'Error',
        failedToNavigateRound: 'Failed to navigate to round: invalid round data',
        unknownRoundType: 'Unknown round type: {{type}}',
        failedToStartEvent: 'Failed to start event.',
        failedToOpenEvent: 'Failed to open event: invalid round data',
        roundNotInitialized: 'Failed to initialize round.',
        cannotStartNoFencers: 'Cannot start event with no fencers. Please add fencers to this event.',
        noRoundsDefinedError: 'No rounds defined for this event. Please add rounds in the event settings.',
        somePoolRoundsNoConfig:
            'Some pool rounds do not have a pool configuration selected. Please set pool configurations in the event settings.',
        failedToStopServer:
            'Failed to stop the tournament server. The server process may still be running in the background.',
        failedToStartServer:
            'Failed to start the tournament server. Please check your network connection and try again.',
        unexpectedServerError: 'An unexpected error occurred while managing the server',
        disconnectConfirmTitle: 'Disconnect from Tournament',
        disconnectConfirmMessage: 'Are you sure you want to disconnect from this tournament?',
        disconnectTournament: 'Disconnect from Tournament',
        disconnectConfirm: 'Are you sure you want to disconnect from this tournament?',
        connectedRemote: 'Connected to remote tournament',
        host: 'Host:',
    },
    eventSettings: {
        title: 'Edit Event Settings',
        fencerManagement: 'Fencer Management',
        searchFencers: 'Search Fencers',
        searchByName: 'Search by Name',
        searching: 'Searching...',
        noMatchingFencers: 'No matching fencers found',
        addFencer: 'Add Fencer',
        firstName: 'First Name',
        lastName: 'Last Name',
        club: 'Club',
        weapon: 'Weapon',
        rating: 'Rating',
        year: 'Year',
        adding: 'Adding...',
        randomFill: 'Random fill',
        enterNumber: 'Enter number of fencers',
        currentFencers: 'Current Fencers: {{count}}',
        loadingFencers: 'Loading fencers...',
        noFencers: 'No fencers added yet.',
        addingFencer: 'Adding fencer...',
        roundManagement: 'Round Management',
        loadingRounds: 'Loading rounds...',
        noRounds: 'No rounds configured yet.',
        addRound: 'Add Round',
        de: 'DE',
        addingRound: 'Adding round...',
        updatingRound: 'Updating round...',
        deletingRound: 'Deleting round...',
        poolsRound: 'Pools Round',
        deRound: 'DE Round',
        promotion: 'Promotion %',
        targetBracket: 'Target Bracket',
        enterPromotion: 'Enter Promotion %',
        poolConfigurations: 'Pool Configurations',
        eliminationFormat: 'Elimination Format:',
        single: 'Single',
        double: 'Double',
        compass: 'Compass',
        formatInformation: 'Format Information:',
        singleDescription:
            'Single elimination: Fencers are eliminated after one loss. The bracket size will be automatically determined based on the number of registered fencers.',
        doubleDescription:
            'Double elimination: Fencers continue in a losers bracket after first loss. All fencers get at least two bouts before elimination. The bracket size will be automatically determined.',
        compassDescription:
            'Compass format: All fencers continue in different brackets based on when they lose. This format maximizes the number of bouts per fencer. Bracket size will be calculated automatically.',
        bracketSizeNote:
            'The bracket will be sized as the smallest power of 2 (8, 16, 32, 64, etc.) that can accommodate all registered fencers.',
        invalidInput: 'Invalid input',
        enterValidNumber: 'Please enter a valid number greater than 0.',
        fencersAdded: '{{count}} random fencers added.',
        failedToAddFencers: 'Failed to add random fencers.',
        noEventData: 'No event data provided.',
        fencersImported: 'Fencers imported successfully',
        importFailed: 'Failed to import fencers from CSV',
        pool: 'pool',
        pools: 'Pools',
        of: 'of',
        fencers: 'fencers',
    },
    manageOfficials: {
        title: 'Manage Officials',
        addReferee: 'Add Referee',
        addOfficial: 'Add Official',
        referees: 'Referees',
        tournamentOfficials: 'Tournament Officials',
        loadingReferees: 'Loading referees...',
        noReferees: 'No referees assigned',
        loadingOfficials: 'Loading officials...',
        noOfficials: 'No tournament officials assigned',
        thisDevice: 'This Device',
        deviceId: 'Device ID: {{id}}',
        deviceInfo:
            'When adding officials or referees, you can assign a device ID to allow automatic role assignment when joining from that device.',
        firstNameRequired: 'First Name *',
        lastName: 'Last Name',
        deviceIdInfo: 'Device ID (5 characters)',
        useThisDevice: 'Use This Device',
        deviceAssignmentInfo:
            'When this person connects to the tournament using a device with this ID, they will automatically be assigned the appropriate role.',
        confirmRemoval: 'Confirm Removal',
        confirmRemoveOfficial: 'Are you sure you want to remove {{firstName}} {{lastName}} from tournament officials?',
        confirmRemoveReferee: 'Are you sure you want to remove {{firstName}} {{lastName}} from referees?',
        failedToRemoveOfficial: 'Failed to remove official',
        failedToRemoveReferee: 'Failed to remove referee',
        notSet: 'Not set',
        firstNameRequiredError: 'First name is required',
        deviceIdError: 'Device ID must be exactly 5 characters',
        failedToAddReferee: 'Failed to add referee',
        failedToAddOfficial: 'Failed to add tournament official',
        editReferee: 'Edit Referee',
        editOfficial: 'Edit Official',
        failedToUpdateReferee: 'Failed to update referee',
        failedToUpdateOfficial: 'Failed to update official',
    },
    clubAutocomplete: {
        label: 'Club',
        enterName: 'Enter club name',
        hideAbbreviation: 'Hide Abbreviation',
        showAbbreviation: 'Show Abbreviation',
        abbreviationInfo: 'Abbreviation (2-5 chars)',
        abbreviation: 'Abbreviation',
        noMatches: 'No matching clubs found',
        create: 'Create "{{name}}"',
        creating: 'Creating...',
    },
    customPicker: {
        select: 'Select...',
        selectItem: 'Select {{item}}',
    },
    deHelpModal: {
        singleElimination: 'Single Elimination Format',
        singleEliminationDesc: [
            'In a single elimination tournament:',
            '• Fencers are seeded according to their initial rankings.',
            '• Each fencer fences until they lose once, at which point they are eliminated.',
            '• The bracket is structured to delay matches between top seeds until later rounds.',
            '• If a fencer can\'t fence, their opponent receives a "bye" and advances automatically.',
            'The winner is the fencer who wins all their bouts.',
        ],
        doubleElimination: 'Double Elimination Format',
        doubleEliminationDesc: [
            'In a double elimination tournament:',
            '• Fencers start in the Winners Bracket.',
            '• When a fencer loses for the first time, they move to the Losers Bracket.',
            '• A second loss in either bracket eliminates the fencer completely.',
            '• The winner of the Losers Bracket faces the winner of the Winners Bracket in the Finals.',
            '• If the Losers Bracket winner defeats the Winners Bracket winner, a "bracket reset" bout is required (since the Winners Bracket winner now has one loss).',
            'This format gives fencers a second chance and is more forgiving of a single bad performance.',
        ],
        compassDraw: 'Compass Draw Format',
        compassDrawDesc: [
            'The compass draw has four brackets, named after compass directions:',
            '• East: The main bracket (original seeding)',
            '• North: For fencers who lose in the first round of East',
            '• West: For fencers who lose in the second round of East',
            '• South: For fencers who lose in the first round of North',
            "This format ensures all fencers get to fence multiple bouts, regardless of their initial performance. It's particularly valuable for developmental tournaments and provides good classification opportunities.",
        ],
        selectFormat: 'Select a format to see details.',
        allFormats: 'All Available Formats',
    },
    connectionStatus: {
        connected: 'Connected',
        disconnected: 'Disconnected',
        connectedTo: 'Connected to: {{host}}',
        notConnectedTo: 'Not connected to {{host}}',
    },
    eventFilters: {
        cadet: 'Cadet',
        senior: 'Senior',
        veteran: 'Veteran',
        mens: "Men's",
        mixed: 'Mixed',
        womens: "Women's",
        epee: 'Epee',
        foil: 'Foil',
        saber: 'Saber',
    },
    permissions: {
        title: 'Permissions',
        role: 'Role:',
        deviceId: 'Device ID:',
        tournamentCreator: 'Tournament Creator',
        official: 'Tournament Official',
        referee: 'Referee',
        viewer: 'Viewer',
    },
    poolsPage: {
        title: 'Pools',
        viewSeeding: 'View Seeding',
        loadingPools: 'Loading pools data...',
        errorLoadingPools: 'Error loading pools',
        noFencers: 'No fencers assigned to this pool',
        onStrip: ' on strip {{strip}}',
        poolPrefix: 'Pool',
        fencerSingular: 'fencer',
        fencerPlural: 'fencers',
        editCompletedPool: 'Edit Completed Pool',
        referee: 'Referee',
        open: 'Open',
        endRound: 'End Round',
        showResults: 'Show Results',
        confirmEndRound: 'Are you sure you want to end the round?',
        failedToCompleteRound: 'Failed to complete the round. Please try again.',
        errorFetchingSeeding: 'Could not fetch seeding information.',
        enterStripNumber: 'Enter Strip Number',
        stripPlaceholder: 'e.g., 17',
        currentSeeding: 'Current Seeding',
    },
    boutOrderPage: {
        refereeMode: 'Referee Mode',
        viewBouts: 'View Bouts',
        poolBouts: 'Pool Bouts',
        loadingBouts: 'Loading bouts...',
        errorLoadingBouts: 'Error loading bouts',
        doubleStrippingOn: 'Double Stripping On',
        doubleStrippingOff: 'Double Stripping Off',
        protectedScores: 'Protected Scores',
        randomScores: 'Random Scores',
        alterBoutScore: 'Alter Bout Score',
        enterScores: 'Enter Scores',
        boutResult: 'Bout Result',
        pendingBout: 'Pending Bout',
        winner: 'Winner: {{winnerName}}',
        noWinnerRecorded: 'No winner recorded',
        boutNotYetScored: 'Bout not yet scored',
        updatingScores: 'Updating scores...',
        enter: 'Enter',
        refModule: 'Ref Module',
        save: 'Save',
        cancel: 'Cancel',
        resetBout: 'Reset Bout',
        submit: 'Submit',
        selectWinnerForTiedBout: 'Select Winner for Tied Bout',
        boutsCannotEndInTie: 'Bouts cannot end in a tie. Please select the winner:',
        failedToUpdateScores: 'Failed to update bout scores. Please try again.',
        failedToResetBout: 'Failed to reset bout. Please try again.',
        failedToUpdateRandomScores: 'Failed to update bout {{boutId}} with random scores.',
        connectedToBox: 'Connected to {{boxName}}',
        disconnectBoxPromptTitle: 'Disconnect Scoring Box?',
        disconnectBoxPromptMessage:
            'You are currently connected to a scoring box. Would you like to disconnect before leaving?',
        disconnectAndExit: 'Disconnect & Exit',
        exitWithoutDisconnecting: 'Exit Without Disconnecting',
    },
    deBracketPage: {
        loadingBracket: 'Loading bracket...',
        failedToLoadBracketData: 'Failed to load bracket data.',
        notDERound: 'This is not a DE round.',
        failedToLoadBracket: 'Failed to load the bracket.',
        invalidFencerData: 'Invalid fencer data. Please refresh and try again.',
        failedToSaveScores: 'Failed to save scores.',
        unexpectedBoutError: 'An unexpected error occurred when processing this bout.',
        byeTitle: 'BYE',
        byeMessage: 'This fencer advances automatically.',
        tbdTitle: 'To Be Determined',
        tbdMessage: 'This bout is waiting for fencers to advance from previous rounds.',
        format: 'Format',
        singleElimination: 'Single Elimination',
        doubleElimination: 'Double Elimination',
        compassElimination: 'Compass Elimination',
        viewTournamentResults: 'View Tournament Results',
        randomizeScores: 'Random Score Generation',
        randomizeScoresTitle: 'Randomize Scores',
        randomizeScoresMessage:
            'Are you sure you want to randomly assign scores to all unscored bouts? This will score the entire bracket.',
        noUnscoredBouts: 'No unscored bouts found to randomize.',
        failedToRandomizeScores: 'Failed to assign random scores to some bouts.',
        tbd: 'TBD',
        bye: 'BYE',
        finals: 'Finals',
        semiFinals: 'Semi-Finals',
        quarterFinals: 'Quarter-Finals',
        tableOf16: 'Table of 16',
        tableOf32: 'Table of 32',
        tableOf64: 'Table of 64',
        tableOf128: 'Table of 128',
        tableOf256: 'Table of 256',
        tableOfX: 'Table of {{number}}',
        disconnectBoxPromptTitle: 'Disconnect Scoring Box?',
        disconnectBoxPromptMessage:
            'You are currently connected to a scoring box. Would you like to disconnect before leaving?',
        disconnectAndExit: 'Disconnect & Exit',
        exitWithoutDisconnecting: 'Exit Without Disconnecting',
    },
    roundResults: {
        title: 'Round Results',
        loadingResults: 'Loading round results...',
        errorLoadingResults: 'Error loading round results. Please try again.',
        listView: 'List View',
        poolSheet: 'Pool Sheet',
        overallResults: 'Overall Results',
        pool: 'Pool',
        fencer: 'Fencer',
        winRate: 'WR',
        touchesScored: 'Touches Scored',
        touchesScoredShort: 'TS',
        touchesReceived: 'Touches Received',
        touchesReceivedShort: 'TR',
        indicator: 'Indicator',
        indicatorShort: 'IND',
        place: 'PL',
        sheet: 'Sheet',
        name: 'Name',
        victoryRatio: 'V/M',
        rank: 'Rank',
        nextRound: 'Next Round',
        startNextRound: 'Start Next Round',
        viewTournamentResults: 'View Tournament Results',
        nextRoundInitialized: 'Next round initialized successfully!',
        failedToInitializeNextRound: 'Failed to initialize or open the next round.',
    },
    tournamentResults: {
        title: 'Tournament Results',
        loadingResults: 'Loading results...',
        failedToLoadEventData: 'Failed to load event data',
        roundNotFound: 'Round not found',
        failedToLoadRoundResults: 'Failed to load round results',
        failedToLoadDEResults: 'Failed to load direct elimination results',
        poolRound: 'Pool Round {{number}}',
        deRound: 'DE Round {{number}}',
        noPoolResults: 'No pool results available',
        noDEResults: 'No direct elimination results available',
        finalResults: 'Final Results',
        place: 'Place',
        victories: 'V/M',
        noRoundsFound: 'No rounds found for this event',
        poolRoundInfo: 'Pool Round',
        deRoundInfo: 'Direct Elimination Round',
        format: 'Format',
        singleEliminationFormat: 'Single Elimination',
        doubleEliminationFormat: 'Double Elimination',
        compassEliminationFormat: 'Compass Elimination',
        backToEvent: 'Back to Event',
        markComplete: 'Mark Complete',
        confirmCompleteTitle: 'Mark Tournament as Complete?',
        confirmCompleteMessage: 'This will mark the tournament as complete. This action cannot be undone.',
        successTitle: 'Tournament Completed',
        successMessage: 'The tournament has been marked as complete.',
        errorMarkingComplete: 'Failed to mark tournament as complete.',
    },
    compassDrawPage: {
        title: 'Compass Draw',
        tbd: 'TBD - Compass Draw Coming Soon',
        eastBracket: 'East Bracket',
        northBracket: 'North Bracket',
        westBracket: 'West Bracket',
        southBracket: 'South Bracket',
    },
    refereeModule: {
        title: 'Referee Module',
        setTimerDuration: 'Set Timer Duration',
        oneMinute: '1 Minute',
        threeMinutes: '3 Minutes',
        fiveMinutes: '5 Minutes',
        customTime: 'Custom Time',
        min: 'Min',
        sec: 'Sec',
        setCustomTime: 'Set Custom Time',
        kawaiiMode: 'Kawaii Mode',
        revertLastPoint: 'Revert Last Point',
        tapToPauseHoldForOptions: 'Tap to pause, hold for options',
        tapToStartHoldForOptions: 'Tap to start, hold for options',
        doubleTouch: 'Double Touch',
        saveScores: 'Save Scores',
        left: 'Left',
        right: 'Right',
        yellow: 'Yellow',
        red: 'Red',
        black: 'Black',
        removeCardFrom: 'Remove {{color}} card from:',
        assignCardTo: 'Assign card to:',
        revertTimer: 'Revert Timer',
        revertTimerTo: 'Revert timer to {{time}}?',
        revert: 'Revert',
        kitten1: 'Kitten 1',
        kitten2: 'Kitten 2',
        defaultLeft: 'Left',
        defaultRight: 'Right',
        disconnectBoxPromptTitle: 'Disconnect Scoring Box?',
        disconnectBoxPromptMessage:
            'You are currently connected to a scoring box. Would you like to disconnect before leaving?',
        disconnectAndExit: 'Disconnect & Exit',
        exitWithoutDisconnecting: 'Exit Without Disconnecting',
        randomPriority: 'Random Priority',
        removePriority: 'Remove Priority',
    },
    tournamentList: {
        deleteTournament: 'Delete Tournament',
        deleteTournamentConfirm: 'Are you sure you want to delete "{{name}}"?',
        deleteFailed: 'Failed to delete the tournament',
        noTournaments: 'No tournaments created yet.',
    },
    ble: {
        connectToScoringBox: 'Connect to Scoring Box',
        disconnect: 'Disconnect',
        tournafence: {
            name: 'TournaFence Box',
            description: 'Bi-directional scoring and timer sync',
        },
        enpointe: {
            name: 'EnPointe',
            description: 'One-way box to phone updates',
        },
        skewered: {
            name: 'Skewered Fencing Box',
            description: 'Read-only from BLE advertisements',
        },
        comingSoon: 'Coming Soon',
        notAvailable: '{{name}} support is not yet available',
        noDeviceFound: 'No device found',
        connectionFailed: 'Connection Failed',
        error: 'BLE Error',
        initialSync: 'Initial Synchronization',
        syncDescription: 'Choose which device to sync the initial state from',
        syncFromApp: 'Sync from App',
        syncFromAppDescription: 'Copy current scores and timer from app to box',
        syncFromBox: 'Sync from Box',
        syncFromBoxDescription: 'Copy current scores and timer from box to app',
        syncCompleted: 'Remote Control Active',
        syncPending: 'Sync Pending',
        tapNfcToPair: 'Tap NFC tag to pair',
        scanning: 'Scanning for devices...',
        connectedToBox: 'Connected to {{boxName}}',
        selectDevice: 'Select Device',
        foundDevices: 'Found {{count}} device(s)',
        unknownDevice: 'Unknown Device',
        scanFailed: 'Scan Failed',
        unknownError: 'An unknown error occurred',
        disconnectConfirmation: 'Are you sure you want to disconnect from {{boxName}}?',
        disconnectFailed: 'Failed to disconnect from the scoring box',
    },
    nfc: {
        scanTag: 'Scan NFC Tag',
        scanning: 'Scanning...',
        nfcManager: 'NFC Manager',
        writeTag: 'Write NFC Tag',
        writeDescription: 'Hold an NTAG215 tag near your device to write connection information',
        writeToTag: 'Write to Tag',
        writing: 'Writing...',
        boxType: 'Box Type',
        deviceName: 'Device Name',
        unknown: 'Unknown',
        notSupported: 'NFC Not Supported',
        notSupportedMessage: 'Your device does not support NFC or NFC is disabled in settings',
        error: 'NFC Error',
        unsupportedBoxType: 'The box type on this tag is not currently supported',
        scanError: 'Failed to Scan Tag',
        writeError: 'Failed to Write Tag',
        writeSuccess: 'Tag Written Successfully',
        writeSuccessMessage: 'The NFC tag has been configured for tap-to-pair',
    },
};
