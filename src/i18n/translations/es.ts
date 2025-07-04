export default {
    common: {
        cancel: 'Cancelar',
        submit: 'Enviar',
        delete: 'Eliminar',
        edit: 'Editar',
        close: 'Cerrar',
        removeIcon: '✕',
        back: 'Volver',
        next: 'Siguiente',
        confirm: 'Confirmar',
        success: 'Éxito',
        error: 'Error',
        loading: 'Cargando...',
        go: 'Ir',
        remove: 'Eliminar',
        add: 'Añadir',
        yes: 'Sí',
        ok: 'OK',
        defaultFencerA: 'Esgrimista A',
        defaultFencerB: 'Esgrimista B',
        vs: 'VS',
        defaultValue: 'Valor Predeterminado',
        tbd: 'PD',
        tournament: 'Torneo',
        disconnectBoxPromptTitle: '¿Desconectar Caja de Puntuación?',
        disconnectBoxPromptMessage:
            'Actualmente estás conectado a una caja de puntuación. ¿Te gustaría desconectarte antes de salir?',
        disconnectAndExit: 'Desconectar y Salir',
        exitWithoutDisconnecting: 'Salir Sin Desconectar',
    },
    home: {
        title: 'Inicio',
        createTournament: 'Crear Torneo',
        joinTournament: 'Unirse al Torneo',
        ongoingTournaments: 'Torneos en Curso',
        tournamentHistory: 'Historial de Torneos',
        deviceId: 'ID del Dispositivo:',
        connectedTo: 'Conectado a:',
        disconnect: 'Desconectar',
        refereeModule: 'Módulo de Árbitro',
        disconnected: 'Desconectado',
        disconnectedMessage: 'Te has desconectado del torneo',
        errorLoadingTournaments: 'Error al cargar torneos',
        errorLoadingHistory: 'Error al cargar historial de torneos',
        failedToConnect: 'Error al conectar con el torneo',
        failedToRemove: 'Error al eliminar el torneo',
        connectionLost: 'Conexión Perdida',
        connectionLostMessage:
            'Se ha perdido la conexión con el torneo. Intenta reconectar o vuelve a la página de inicio.',
        reconnect: 'Reconectar',
        backToHome: 'Volver al Inicio',
    },
    createTournament: {
        title: 'Crear Nuevo Torneo',
        enterName: 'Ingrese nombre del torneo',
        errorEmptyName: 'Por favor ingrese un nombre para el torneo',
        errorCreateFailed: 'Error al crear torneo. Es posible que ya exista.',
    },
    joinTournament: {
        title: 'Unirse al Torneo',
        availableTournaments: 'Torneos Disponibles',
        searching: 'Buscando torneos...',
        noTournamentsFound:
            'No se encontraron torneos en su red. Es posible que deba ingresar la dirección IP manualmente.',
        refresh: 'Actualizar',
        enterIpManually: 'Ingresar IP Manualmente',
        manualConnection: 'Conexión Manual',
        hostIpAddress: 'Dirección IP del Host:',
        enterHostIp: 'Ingrese IP del host (ej., 192.168.1.5)',
        port: 'Puerto:',
        enterPort: 'Ingrese puerto (predeterminado: 9001)',
        errorEmptyIp: 'Por favor ingrese una dirección IP',
        errorInvalidIp: 'Por favor ingrese una dirección IP válida (ej., 192.168.1.5)',
        errorInvalidPort: 'Por favor ingrese un número de puerto válido (1024-65535)',
        errorConnectionFailed: 'Error al conectar con el servidor del torneo',
        connect: 'Conectar',
    },
    eventManagement: {
        editTournament: 'Editar Torneo',
        createEvent: 'Crear Evento',
        manageOfficials: 'Administrar Oficiales',
        edit: 'Editar',
        removeIcon: '✖',
        errorLoading: 'Error al cargar eventos. Inténtelo de nuevo.',
        noEvents: 'Aún no se han creado eventos',
        open: 'Abrir',
        start: 'Comenzar',
        confirmDelete: 'Confirmar Eliminación',
        confirmDeleteMessage: '¿Está seguro de que desea eliminar este evento?',
        confirmStart: 'Confirmar Inicio',
        confirmStartMessage: '¿Está seguro de que desea iniciar este evento?',
        startingDE: 'Iniciando Ronda DE',
        bracketSizeMessage:
            'El cuadro se dimensionará automáticamente a {{size}} basado en {{count}} esgrimistas registrados.',
        continue: 'Continuar',
        roundNotStarted: 'Ronda No Iniciada',
        initializeRoundMessage: 'Esta ronda aún no se ha inicializado. ¿Desea iniciarla ahora?',
        startRound: 'Iniciar Ronda',
        failedToInitialize: 'Error al inicializar la ronda.',
        noFencersError: 'No se puede iniciar el evento sin esgrimistas. Por favor, añada esgrimistas a este evento.',
        noRoundsError:
            'No hay rondas definidas para este evento. Por favor, agregue rondas en la configuración del evento.',
        noPoolConfigError:
            'Algunas rondas de poules no tienen configuración. Por favor, configure las poules en la configuración del evento.',
        failedToOpenEvent: 'Error al abrir el evento.',
        tournamentIp: 'IP del Torneo:',
        networkConnected: 'Red Conectada',
        networkDisconnected: 'Red Desconectada',
        connectedToRemoteTournament: 'Conectado a torneo remoto',
        host: 'Host',
        tournamentIp: 'IP del Torneo',
        port: 'Puerto',
        disconnect: 'Desconectar',
        serverStarted: 'Servidor Iniciado',
        serverStartedMessage:
            'El servidor del torneo está funcionando en {{ip}}:{{port}}\n\nComparta esta información con los participantes que deseen unirse.',
        serverStartFailed:
            'Error al iniciar el servidor del torneo. Verifique su conexión de red e intente nuevamente.',
        networkIssue: 'Problema de Red',
        networkIssueMessage:
            'No se detectó conexión de red. Es posible que otros dispositivos no puedan conectarse a su servidor de torneo.',
        startAnyway: 'Iniciar de Todos Modos',
        serverStopped: 'Servidor Detenido',
        serverStoppedMessage: 'El servidor del torneo ha sido cerrado',
        serverStopFailed:
            'Error al detener el servidor del torneo. Es posible que el proceso del servidor siga ejecutándose en segundo plano.',
        enableServer: 'Habilitar Servidor',
        disableServer: 'Deshabilitar Servidor',
        starting: 'Iniciando...',
        stopping: 'Deteniendo...',
        serverRunning: 'Servidor ejecutándose en puerto: {{port}}',
        shareInfo: 'Comparta esta información con los jugadores que deseen unirse.',
        error: 'Error',
        failedToNavigateRound: 'Error al navegar a la ronda: datos de ronda inválidos',
        unknownRoundType: 'Tipo de ronda desconocido: {{type}}',
        failedToStartEvent: 'Error al iniciar el evento.',
        failedToOpenEvent: 'Error al abrir el evento: datos de ronda inválidos',
        roundNotInitialized: 'Error al inicializar la ronda.',
        cannotStartNoFencers:
            'No se puede iniciar el evento sin esgrimistas. Por favor, añada esgrimistas a este evento.',
        noRoundsDefinedError:
            'No hay rondas definidas para este evento. Por favor, agregue rondas en la configuración del evento.',
        somePoolRoundsNoConfig:
            'Algunas rondas de poules no tienen configuración. Por favor, configure las poules en la configuración del evento.',
        failedToStopServer:
            'Error al detener el servidor del torneo. Es posible que el proceso del servidor siga ejecutándose en segundo plano.',
        failedToStartServer:
            'Error al iniciar el servidor del torneo. Verifique su conexión de red e intente nuevamente.',
        unexpectedServerError: 'Ocurrió un error inesperado al administrar el servidor',
        disconnectConfirmTitle: 'Desconectar del Torneo',
        disconnectConfirmMessage: '¿Está seguro de que desea desconectarse de este torneo?',
        disconnectTournament: 'Desconectar del Torneo',
        disconnectConfirm: '¿Está seguro de que desea desconectarse de este torneo?',
        connectedRemote: 'Conectado a torneo remoto',
        host: 'Host:',
    },
    eventSettings: {
        title: 'Editar Configuración del Evento',
        fencerManagement: 'Gestión de Esgrimistas',
        searchFencers: 'Buscar Esgrimistas',
        searchByName: 'Buscar por Nombre',
        searching: 'Buscando...',
        noMatchingFencers: 'No se encontraron esgrimistas',
        addFencer: 'Añadir Esgrimista',
        firstName: 'Nombre',
        lastName: 'Apellido',
        club: 'Club',
        weapon: 'Arma',
        rating: 'Clasificación',
        year: 'Año',
        adding: 'Añadiendo...',
        randomFill: 'Relleno aleatorio',
        enterNumber: 'Ingrese número de esgrimistas',
        currentFencers: 'Esgrimistas Actuales: {{count}}',
        loadingFencers: 'Cargando esgrimistas...',
        noFencers: 'Aún no se han añadido esgrimistas.',
        addingFencer: 'Añadiendo esgrimista...',
        roundManagement: 'Gestión de Rondas',
        loadingRounds: 'Cargando rondas...',
        noRounds: 'Aún no se han configurado rondas.',
        addRound: 'Añadir Ronda',
        de: 'ED',
        addingRound: 'Añadiendo ronda...',
        updatingRound: 'Actualizando ronda...',
        deletingRound: 'Eliminando ronda...',
        poolsRound: 'Ronda de Poules',
        deRound: 'Ronda de Eliminación Directa',
        promotion: 'Promoción %',
        targetBracket: 'Objetivo de Cuadro',
        enterPromotion: 'Ingrese % de Promoción',
        poolConfigurations: 'Configuraciones de Poule',
        eliminationFormat: 'Formato de Eliminación:',
        single: 'Individual',
        double: 'Doble',
        compass: 'Brújula',
        formatInformation: 'Información de Formato:',
        singleDescription:
            'Eliminación simple: Los esgrimistas son eliminados después de una derrota. El tamaño del cuadro se determinará automáticamente según el número de esgrimistas registrados.',
        doubleDescription:
            'Eliminación doble: Los esgrimistas continúan en un cuadro de perdedores después de la primera derrota. Todos los esgrimistas tienen al menos dos asaltos antes de ser eliminados. El tamaño del cuadro se determinará automáticamente.',
        compassDescription:
            'Formato brújula: Todos los esgrimistas continúan en diferentes cuadros según cuándo pierdan. Este formato maximiza el número de asaltos por esgrimista. El tamaño del cuadro se calculará automáticamente.',
        bracketSizeNote:
            'El cuadro tendrá el tamaño de la potencia de 2 más pequeña (8, 16, 32, 64, etc.) que pueda acomodar a todos los esgrimistas registrados.',
        invalidInput: 'Entrada inválida',
        enterValidNumber: 'Por favor ingrese un número válido mayor que 0.',
        fencersAdded: '{{count}} esgrimistas aleatorios añadidos.',
        failedToAddFencers: 'Error al añadir esgrimistas aleatorios.',
        noEventData: 'No se proporcionaron datos del evento.',
        fencersImported: 'Esgrimistas importados exitosamente',
        importFailed: 'Error al importar esgrimistas desde CSV',
        pool: 'poule',
        pools: 'poules',
        of: 'de',
        fencers: 'esgrimistas',
    },
    manageOfficials: {
        title: 'Administrar Oficiales',
        addReferee: 'Añadir Árbitro',
        addOfficial: 'Añadir Oficial',
        referees: 'Árbitros',
        tournamentOfficials: 'Oficiales del Torneo',
        loadingReferees: 'Cargando árbitros...',
        noReferees: 'No hay árbitros asignados',
        loadingOfficials: 'Cargando oficiales...',
        noOfficials: 'No hay oficiales de torneo asignados',
        thisDevice: 'Este Dispositivo',
        deviceId: 'ID del Dispositivo: {{id}}',
        deviceInfo:
            'Al añadir oficiales o árbitros, puede asignar un ID de dispositivo para permitir la asignación automática de roles cuando se conecte desde ese dispositivo.',
        firstNameRequired: 'Nombre *',
        lastName: 'Apellido',
        deviceIdInfo: 'ID del Dispositivo (5 caracteres)',
        useThisDevice: 'Usar Este Dispositivo',
        deviceAssignmentInfo:
            'Cuando esta persona se conecte al torneo usando un dispositivo con este ID, se le asignará automáticamente el rol apropiado.',
        confirmRemoval: 'Confirmar Eliminación',
        confirmRemoveOfficial:
            '¿Está seguro de que desea eliminar a {{firstName}} {{lastName}} de los oficiales del torneo?',
        confirmRemoveReferee: '¿Está seguro de que desea eliminar a {{firstName}} {{lastName}} de los árbitros?',
        failedToRemoveOfficial: 'Error al eliminar oficial',
        failedToRemoveReferee: 'Error al eliminar árbitro',
        notSet: 'No establecido',
        firstNameRequiredError: 'Se requiere el nombre',
        deviceIdError: 'El ID del dispositivo debe tener exactamente 5 caracteres',
        failedToAddReferee: 'Error al añadir árbitro',
        failedToAddOfficial: 'Error al añadir oficial del torneo',
    },
    clubAutocomplete: {
        label: 'Club',
        enterName: 'Ingrese nombre del club',
        hideAbbreviation: 'Ocultar Abreviatura',
        showAbbreviation: 'Mostrar Abreviatura',
        abbreviationInfo: 'Abreviatura (2-5 caracteres)',
        abbreviation: 'Abreviatura',
        noMatches: 'No se encontraron clubes coincidentes',
        create: 'Crear "{{name}}"',
        creating: 'Creando...',
    },
    customPicker: {
        select: 'Seleccionar...',
        selectItem: 'Seleccionar {{item}}',
    },
    deHelpModal: {
        singleElimination: 'Formato de Eliminación Simple',
        singleEliminationDesc: [
            'En un torneo de eliminación simple:',
            '• Los esgrimistas son sembrados según sus clasificaciones iniciales.',
            '• Cada esgrimista combate hasta que pierde una vez, momento en el que es eliminado.',
            '• El cuadro está estructurado para retrasar los combates entre las mejores semillas hasta rondas posteriores.',
            '• Si un esgrimista no puede competir, su oponente recibe un "bye" y avanza automáticamente.',
            'El ganador es el esgrimista que gana todos sus asaltos.',
        ],
        doubleElimination: 'Formato de Eliminación Doble',
        doubleEliminationDesc: [
            'En un torneo de eliminación doble:',
            '• Los esgrimistas comienzan en el Cuadro de Ganadores.',
            '• Cuando un esgrimista pierde por primera vez, pasa al Cuadro de Perdedores.',
            '• Una segunda derrota en cualquier cuadro elimina completamente al esgrimista.',
            '• El ganador del Cuadro de Perdedores se enfrenta al ganador del Cuadro de Ganadores en la Final.',
            '• Si el ganador del Cuadro de Perdedores derrota al ganador del Cuadro de Ganadores, se requiere un asalto de "reinicio de cuadro" (ya que el ganador del Cuadro de Ganadores ahora tiene una derrota).',
            'Este formato da a los esgrimistas una segunda oportunidad y es más indulgente con un solo rendimiento deficiente.',
        ],
        compassDraw: 'Formato de Cuadro Brújula',
        compassDrawDesc: [
            'El cuadro brújula tiene cuatro cuadros, nombrados según direcciones de la brújula:',
            '• Este: El cuadro principal (siembra original)',
            '• Norte: Para esgrimistas que pierden en la primera ronda del Este',
            '• Oeste: Para esgrimistas que pierden en la segunda ronda del Este',
            '• Sur: Para esgrimistas que pierden en la primera ronda del Norte',
            'Este formato asegura que todos los esgrimistas participen en múltiples asaltos, independientemente de su rendimiento inicial. Es particularmente valioso para torneos de desarrollo y proporciona buenas oportunidades de clasificación.',
        ],
        selectFormat: 'Seleccione un formato para ver detalles.',
        allFormats: 'Todos los Formatos Disponibles',
    },
    connectionStatus: {
        connected: 'Conectado',
        disconnected: 'Desconectado',
        connectedTo: 'Conectado a: {{host}}',
        notConnectedTo: 'No conectado a {{host}}',
    },
    eventFilters: {
        cadet: 'Cadete',
        senior: 'Senior',
        veteran: 'Veterano',
        mens: 'Masculino',
        mixed: 'Mixto',
        womens: 'Femenino',
        epee: 'Espada',
        foil: 'Florete',
        saber: 'Sable',
    },
    permissions: {
        title: 'Permisos',
        role: 'Rol:',
        deviceId: 'ID del Dispositivo:',
        tournamentCreator: 'Creador del Torneo',
        official: 'Oficial del Torneo',
        referee: 'Árbitro',
        viewer: 'Espectador',
    },
    poolsPage: {
        title: 'Poules',
        viewSeeding: 'Ver Siembra',
        loadingPools: 'Cargando datos de poules...',
        errorLoadingPools: 'Error al cargar poules',
        noFencers: 'No hay esgrimistas asignados a esta poule',
        onStrip: ' en pista {{strip}}',
        poolPrefix: 'Poule',
        fencerSingular: 'esgrimista',
        fencerPlural: 'esgrimistas',
        editCompletedPool: 'Editar Poule Completada',
        referee: 'Árbitro',
        open: 'Abrir',
        endRound: 'Terminar Ronda',
        showResults: 'Mostrar Resultados',
        confirmEndRound: '¿Está seguro de que desea terminar la ronda?',
        failedToCompleteRound: 'No se pudo completar la ronda. Por favor intente de nuevo.',
        errorFetchingSeeding: 'No se pudo obtener la información de siembra.',
        enterStripNumber: 'Ingresar Número de Pista',
        stripPlaceholder: 'ej., 17',
        currentSeeding: 'Siembra Actual',
    },
    boutOrderPage: {
        refereeMode: 'Modo Árbitro',
        viewBouts: 'Ver Asaltos',
        poolBouts: 'Asaltos de Poule',
        loadingBouts: 'Cargando asaltos...',
        errorLoadingBouts: 'Error al cargar asaltos',
        doubleStrippingOn: 'Pistas Dobles Activado',
        doubleStrippingOff: 'Pistas Dobles Desactivado',
        protectedScores: 'Puntajes Protegidos',
        randomScores: 'Puntajes Aleatorios',
        alterBoutScore: 'Modificar Puntaje de Asalto',
        enterScores: 'Ingresar Puntajes',
        boutResult: 'Resultado del Asalto',
        pendingBout: 'Asalto Pendiente',
        winner: 'Ganador: {{winnerName}}',
        noWinnerRecorded: 'No se registró ganador',
        boutNotYetScored: 'Asalto aún no puntuado',
        updatingScores: 'Actualizando puntajes...',
        enter: 'Ingresar',
        refModule: 'Módulo Árbitro',
        save: 'Guardar',
        cancel: 'Cancelar',
        resetBout: 'Reiniciar Asalto',
        submit: 'Enviar',
        selectWinnerForTiedBout: 'Seleccionar Ganador para Asalto Empatado',
        boutsCannotEndInTie: 'Los asaltos no pueden terminar en empate. Por favor seleccione al ganador:',
        failedToUpdateScores: 'No se pudieron actualizar los puntajes del asalto. Por favor intente de nuevo.',
        failedToResetBout: 'No se pudo reiniciar el asalto. Por favor intente de nuevo.',
        failedToUpdateRandomScores: 'No se pudo actualizar el asalto {{boutId}} con puntajes aleatorios.',
        disconnectBoxPromptTitle: '¿Desconectar Caja de Puntuación?',
        disconnectBoxPromptMessage:
            'Actualmente estás conectado a una caja de puntuación. ¿Te gustaría desconectarte antes de salir?',
        disconnectAndExit: 'Desconectar y Salir',
        exitWithoutDisconnecting: 'Salir Sin Desconectar',
    },
    deBracketPage: {
        loadingBracket: 'Cargando cuadro...',
        failedToLoadBracketData: 'Error al cargar datos del cuadro.',
        notDERound: 'Esta no es una ronda de eliminación directa.',
        failedToLoadBracket: 'Error al cargar el cuadro.',
        invalidFencerData: 'Datos de esgrimista inválidos. Por favor actualice e intente de nuevo.',
        failedToSaveScores: 'Error al guardar los puntajes.',
        unexpectedBoutError: 'Ocurrió un error inesperado al procesar este asalto.',
        byeTitle: 'PASE',
        byeMessage: 'Este esgrimista avanza automáticamente.',
        tbdTitle: 'Por Determinar',
        tbdMessage: 'Este asalto está esperando que los esgrimistas avancen de rondas previas.',
        format: 'Formato',
        singleElimination: 'Eliminación Simple',
        doubleElimination: 'Eliminación Doble',
        compassElimination: 'Eliminación Compass',
        viewTournamentResults: 'Ver Resultados del Torneo',
        randomizeScores: 'Generar Puntuación Aleatoria',
        randomizeScoresTitle: 'Aleatorizar Puntuaciones',
        randomizeScoresMessage:
            '¿Está seguro de que desea asignar puntuaciones aleatorias a {{count}} asaltos no puntuados?',
        noUnscoredBouts: 'No se encontraron asaltos sin puntuar para aleatorizar.',
        failedToRandomizeScores: 'No se pudieron asignar puntuaciones aleatorias a algunos asaltos.',
        tbd: 'PD',
        bye: 'PASE',
        finals: 'Final',
        semiFinals: 'Semifinales',
        quarterFinals: 'Cuartos de Final',
        tableOf16: 'Tabla de 16',
        tableOf32: 'Tabla de 32',
        tableOf64: 'Tabla de 64',
        tableOf128: 'Tabla de 128',
        tableOf256: 'Tabla de 256',
        tableOfX: 'Tabla de {{number}}',
    },
    roundResults: {
        title: 'Resultados de Ronda',
        loadingResults: 'Cargando resultados de la ronda...',
        errorLoadingResults: 'Error al cargar resultados de la ronda. Por favor intente de nuevo.',
        listView: 'Vista Lista',
        poolSheet: 'Hoja de Poule',
        overallResults: 'Resultados Generales',
        pool: 'Poule',
        fencer: 'Esgrimista',
        winRate: '% Victoria',
        touchesScored: 'Tocados Dados',
        touchesScoredShort: 'TD',
        touchesReceived: 'Tocados Recibidos',
        touchesReceivedShort: 'TR',
        indicator: 'Indicador',
        indicatorShort: 'IND',
        place: 'Pos',
        sheet: 'Hoja',
        name: 'Nombre',
        victoryRatio: 'V/M',
        rank: 'Posición',
        nextRound: 'Ronda Siguiente',
        startNextRound: 'Iniciar Siguiente Ronda',
        viewTournamentResults: 'Ver Resultados del Torneo',
        nextRoundInitialized: '¡Ronda siguiente inicializada con éxito!',
        failedToInitializeNextRound: 'Error al inicializar o abrir la siguiente ronda.',
    },
    tournamentResults: {
        title: 'Resultados del Torneo',
        loadingResults: 'Cargando resultados...',
        failedToLoadEventData: 'Error al cargar datos del evento',
        roundNotFound: 'Ronda no encontrada',
        failedToLoadRoundResults: 'Error al cargar resultados de la ronda',
        failedToLoadDEResults: 'Error al cargar resultados de eliminación directa',
        poolRound: 'Poule Ronda {{number}}',
        deRound: 'ED Ronda {{number}}',
        noPoolResults: 'No hay resultados de poule disponibles',
        noDEResults: 'No hay resultados de eliminación directa disponibles',
        finalResults: 'Resultados Finales',
        place: 'Lugar',
        victories: 'V/M',
        noRoundsFound: 'No se encontraron rondas para este evento',
        poolRoundInfo: 'Ronda de Poule',
        deRoundInfo: 'Ronda de Eliminación Directa',
        format: 'Formato',
        singleEliminationFormat: 'Eliminación Simple',
        doubleEliminationFormat: 'Eliminación Doble',
        compassEliminationFormat: 'Eliminación Compass',
        backToEvent: 'Volver al Evento',
    },
    compassDrawPage: {
        title: 'Cuadro Compass',
        tbd: 'PD - Cuadro Compass Próximamente',
        eastBracket: 'Cuadro Este',
        northBracket: 'Cuadro Norte',
        westBracket: 'Cuadro Oeste',
        southBracket: 'Cuadro Sur',
    },
    refereeModule: {
        title: 'Módulo de Árbitro',
        setTimerDuration: 'Establecer Duración del Temporizador',
        oneMinute: '1 Minuto',
        threeMinutes: '3 Minutos',
        fiveMinutes: '5 Minutos',
        customTime: 'Tiempo Personalizado',
        min: 'Min',
        sec: 'Seg',
        setCustomTime: 'Establecer Tiempo Personalizado',
        kawaiiMode: 'Modo Kawaii',
        revertLastPoint: 'Revertir Último Punto',
        tapToPauseHoldForOptions: 'Toque para pausar, mantenga para opciones',
        tapToStartHoldForOptions: 'Toque para iniciar, mantenga para opciones',
        doubleTouch: 'Tocado Doble',
        saveScores: 'Guardar Puntuaciones',
        left: 'Izquierda',
        right: 'Derecha',
        yellow: 'Amarilla',
        red: 'Roja',
        black: 'Negra',
        removeCardFrom: 'Quitar tarjeta {{color}} de:',
        assignCardTo: 'Asignar tarjeta a:',
        revertTimer: 'Revertir Temporizador',
        revertTimerTo: '¿Revertir temporizador a {{time}}?',
        revert: 'Revertir',
        kitten1: 'Gatito 1',
        kitten2: 'Gatito 2',
        defaultLeft: 'Izquierda',
        defaultRight: 'Derecha',
        disconnectBoxPromptTitle: '¿Desconectar Caja de Puntuación?',
        disconnectBoxPromptMessage:
            'Actualmente estás conectado a una caja de puntuación. ¿Te gustaría desconectarte antes de salir?',
        disconnectAndExit: 'Desconectar y Salir',
        exitWithoutDisconnecting: 'Salir Sin Desconectar',
        randomPriority: 'Prioridad Aleatoria',
        removePriority: 'Quitar Prioridad',
    },
    tournamentList: {
        deleteTournament: 'Eliminar Torneo',
        deleteTournamentConfirm: '¿Está seguro de que desea eliminar "{{name}}"?',
        deleteFailed: 'Error al eliminar el torneo',
        noTournaments: 'Aún no se han creado torneos.',
    },
    ble: {
        connectToScoringBox: 'Conectar a caja de puntuación',
        disconnect: 'Desconectar',
        tournafence: {
            name: 'Caja TournaFence',
            description: 'Sincronización bidireccional de puntuación y tiempo',
        },
        enpointe: {
            name: 'EnPointe',
            description: 'Actualizaciones unidireccionales de caja a teléfono',
        },
        skewered: {
            name: 'Caja de esgrima Skewered',
            description: 'Solo lectura desde anuncios BLE',
        },
        comingSoon: 'Próximamente',
        notAvailable: 'El soporte para {{name}} aún no está disponible',
        noDeviceFound: 'No se encontró ningún dispositivo',
        connectionFailed: 'Falló la conexión',
        error: 'Error BLE',
        initialSync: 'Sincronización Inicial',
        syncDescription: 'Elija desde qué dispositivo sincronizar el estado inicial',
        syncFromApp: 'Sincronizar desde la App',
        syncFromAppDescription: 'Copiar puntuaciones y temporizador actuales de la app a la caja',
        syncFromBox: 'Sincronizar desde la Caja',
        syncFromBoxDescription: 'Copiar puntuaciones y temporizador actuales de la caja a la app',
        syncCompleted: 'Control Remoto Activo',
        syncPending: 'Sincronización Pendiente',
        tapNfcToPair: 'Toca la etiqueta NFC para emparejar',
        scanning: 'Buscando dispositivos...',
        connectedToBox: 'Conectado a {{boxName}}',
        selectDevice: 'Seleccionar dispositivo',
        foundDevices: '{{count}} dispositivo(s) encontrado(s)',
        unknownDevice: 'Dispositivo desconocido',
        scanFailed: 'Escaneo fallido',
        unknownError: 'Ocurrió un error desconocido',
        disconnectConfirmation: '¿Está seguro de que desea desconectarse de {{boxName}}?',
        disconnectFailed: 'No se pudo desconectar de la caja de puntuación',
    },
};
