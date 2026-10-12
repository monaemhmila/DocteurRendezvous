export type Language = "fr" | "en" | "ar";

export interface Translations {
    featuresPage: {
        badge: string;
        title: string;
        subtitle: string;
        feat1Title: string;
        feat1Desc: string;
        feat2Title: string;
        feat2Desc: string;
        feat3Title: string;
        feat3Desc: string;
        feat4Title: string;
        feat4Desc: string;
        feat5Title: string;
        feat5Desc: string;
        feat6Title: string;
        feat6Desc: string;
        ctaTitle: string;
        ctaDesc: string;
    };
    waAssistantPage: {
        badge: string;
        title: string;
        subtitle: string;
        heroList1: string;
        heroList2: string;
        heroList3: string;
        cta1: string;
        chat1: string;
        chat2: string;
        chat3: string;
        featuresTitle: string;
        ben1Title: string;
        ben1Desc: string;
        ben2Title: string;
        ben2Desc: string;
        ben3Title: string;
        ben3Desc: string;
        ben4Title: string;
        ben4Desc: string;
    };
    securityPage: {
        badge: string;
        title: string;
        subtitle: string;
        feat1Title: string;
        feat1Desc: string;
        feat2Title: string;
        feat2Desc: string;
        feat3Title: string;
        feat3Desc: string;
        feat4Title: string;
        feat4Desc: string;
        feat5Title: string;
        feat5Desc: string;
        feat6Title: string;
        feat6Desc: string;
        feat7Title: string;
        feat7Desc: string;
        feat8Title: string;
        feat8Desc: string;
        depsTitle: string;
        depsSubtitle: string;
        dep1Name: string;
        dep1Desc: string;
        dep2Name: string;
        dep2Desc: string;
        dep3Name: string;
        dep3Desc: string;
        storageTitle: string;
        storageDesc: string;
        storageNotice: string;
        footer: string;
    };
    settingsPage: {
        aiSettingsTitle: string;
        globalConfig: string;
        goToAiAssistantDesc: string;
        goToAiAssistantBtn: string;
        commChannelsTitle: string;
        waMainChannelDesc: string;
        smsConfirmDesc: string;
        emailDocsDesc: string;
        securityAuditTitle: string;
        securityAuditSubtitle: string;
        eventLogTitle: string;
        thDate: string;
        thUser: string;
        thAction: string;
        thResource: string;
        thIpAddress: string;
        loadingAudit: string;
        noAuditFound: string;
        pageXofY: string;
        btnPrev: string;
        btnNext: string;
        integrationsTitle: string;
        integrationsSubtitle: string;
        metaConfigServer: string;
        aiProviderEnv: string;
        aiProvider: string;
        serverConfig: string;
        notAvailable: string;
        managedServerSide: string;
    };
    uiKit: {
        statusConfirmed: string;
        statusScheduled: string;
        statusCancelled: string;
        statusCompleted: string;
        statusNoShow: string;
        patientActive: string;
        patientInactive: string;
        patientAtRisk: string;
        reasonInactive: string;
        reasonInterrupted: string;
        reasonQuote: string;
        reasonNoShow: string;
        reasonOverdue: string;
        reasonCancel: string;
        reasonFollowUp: string;
        aiActive: string;
        aiPaused: string;
    };
    catalogPage: {
        toastSuccess: string;
        title: string;
        btnAdd: string;
        sectionTitle: string;
        sectionDesc: string;
        noServicesTitle: string;
        noServicesDesc: string;
        colService: string;
        colDuration: string;
        colPrice: string;
        colActions: string;
        durationMin: string;
        onEstimate: string;
        confirmDelete: string;
        modalEdit: string;
        modalNew: string;
        labelName: string;
        placeName: string;
        labelDuration: string;
        labelPrice: string;
        placePrice: string;
        labelDesc: string;
        placeDesc: string;
        btnCancel: string;
        btnSave: string;
    };
    revenuePage: {
        title: string;
        subtitle: string;
        errorLoading: string;
        loading: string;
        statRecoveredAppts: string;
        hintTotalRecovered: string;
        statBookedAppts: string;
        hintApptsBooked: string;
        estimatedValue: string;
        potentialValue: string;
        timelineTitle: string;
        timelineDesc: string;
        noHistory: string;
    };
    analyticsPage: {
        title: string;
        subtitle: string;

        subtitleError?: string;
        errorTitle: string;
        errorDesc: string;
        statRecoveryRate: string;
        statNoShow: string;
        statNoShowRecovery: string;
        statWaitlist: string;
        statActiveFollowUps: string;
        chartAppointmentsTitle: string;
        chartAppointmentsDesc: string;
        chartInactiveTitle: string;
        chartInactiveDesc: string;
        chartLostTitle: string;
        noData: string;
        loading: string;
    };
    conversationsPage: {
        title: string;
        subtitle: string;
        live: string;
        hideSimulator: string;
        openSimulator: string;
        viewAgenda: string;
        searchPlaceholder: string;
        filterAll: string;
        filterAi: string;
        filterHuman: string;
        loadingConvs: string;
        noConvs: string;
        humanRequired: string;
        aiHandled: string;
        patientRecord: string;
        whatsappBusiness: string;
        loadPrevMsgs: string;
        loadingMsgs: string;
        noMsgsTitle: string;
        noMsgsDesc: string;
        typeMsg: string;
        whatsappSimulator: string;
        simDesc: string;
        online: string;
        patientId: string;
        simNewConv: string;
        quickScenarios: string;
        scenario1Label: string;
        scenario1Text: string;
        scenario2Label: string;
        scenario2Text: string;
        scenario3Label: string;
        scenario3Text: string;
        scenario4Label: string;
        scenario4Text: string;
        scenario5Label: string;
        scenario5Text: string;
        clearSim: string;
        simWarning: string;
        simulatorSubtitle: string;
        directTestMode: string;
        simPatientLabel: string;
        simPatientUnknown: string;
        clinicName: string;
        onlineStatus: string;
        welcomeMsg: string;
        writeAsPatient: string;
        suggestionSuccess: string;
        suggestionError: string;
        sendError: string;
        simSuccess: string;
        simError: string;
        patient: string;
        aiBot: string;
        received: string;
        delivered: string;
        writeManualReply: string;
        aiTip: string;
        enterToSend: string;
        selectConvTitle: string;
        selectConvDesc: string;
        simulatorTitle: string;
    };
    nav: {
        catalog: string; securityAndAudit: string;
        workspace: string;
        automation: string;
        insights: string;
        settings: string;
        dashboard: string;
        agenda: string;
        patients: string;
        conversations: string;
        recovery: string;
        aiAssistant: string;
        followups: string;
        waitlist: string;
        noShows: string;
        analytics: string;
        revenue: string;
        clinic: string;
        team: string;
        aiSettings: string;
        communication: string;
        integrations: string;
        patientRecovery: string;
        features: string;
        security: string;
        pricing: string;
        login: string;
        start: string;
    };
    pages: {
        aiAssistantTitle: string;
        aiAssistantSubtitle: string;
        followupsTitle: string;
        followupsSubtitle: string;
        waitlistTitle: string;
        waitlistSubtitle: string;
        noShowsTitle: string;
        noShowsSubtitle: string;
        analyticsTitle: string;
        analyticsSubtitle: string;
        revenueTitle: string;
        revenueSubtitle: string;
        conversationsTitle: string;
        conversationsSubtitle: string;
    };
    topbar: {
        searchPlaceholder: string;
        notifications: string;
        markAllRead: string;
        noNotifications: string;
        help: string;
        gettingStarted: string;
        howRecoveryWorks: string;
        contactSupport: string;
        currentClinic: string;
        active: string;
        interfaceLanguage: string;
        clinicSettings: string;
        team: string;
        logout: string;

        guideModalTitle: string;
        guideModalDesc: string;
        guideSection1Title: string;
        guideSection1Desc: string;
        guideFeat1Title: string;
        guideFeat1Desc: string;
        guideFeat2Title: string;
        guideFeat2Desc: string;
        guideFeat3Title: string;
        guideFeat3Desc: string;
        guideFeat4Title: string;
        guideFeat4Desc: string;
        guideSection2Title: string;
        guideSection2Desc: string;
        guideConfig1: string;
        guideConfig2: string;
        guideConfig3: string;
        guideSection3Title: string;
        guideSection3Desc: string;
        guideSup1Title: string;
        guideSup1Desc: string;
        guideSup2Title: string;
        guideSup2Desc: string;
        guideSup2Bul1: string;
        guideSup2Bul2: string;
        guideSup2Bul3: string;
        guideSup2Bul4: string;
        guideSup3Title: string;
        guideSup3Desc: string;
        recoveryModalTitle: string;
        recoveryModalDesc: string;
        recoveryIntro: string;
        recoverySec1Title: string;
        recoverySec1Bul1Title: string;
        recoverySec1Bul1Desc: string;
        recoverySec1Bul2Title: string;
        recoverySec1Bul2Desc: string;
        recoverySec1Bul3Title: string;
        recoverySec1Bul3Desc: string;
        recoverySec2Title: string;
        recoverySec2Desc: string;
        recoverySec2Bul1Title: string;
        recoverySec2Bul1Desc: string;
        recoverySec2Bul2Title: string;
        recoverySec2Bul2Desc: string;
        recoverySec2Bul3Title: string;
        recoverySec2Bul3Desc: string;
        recoverySec2Bul4Title: string;
        recoverySec2Bul4Desc: string;
        recoveryTip: string;
        supportModalTitle: string;
        supportModalDesc: string;
        supportEmail: string;
        supportPhoneTitle: string;
        supportPhoneDesc: string;
        supportClose: string;

    };
    clinicSettings: {
        title: string;
        subtitle: string;
        save: string;
        saving: string;
        generalInfo: string;
        generalInfoDesc: string;
        clinicName: string;
        clinicNamePlaceholder: string;
        specialty: string;
        specialtyPlaceholder: string;
        address: string;
        addressPlaceholder: string;
        currencies: {
            label: string;
            placeholder: string;
            notFound: string;
            list: Array<{ value: string, label: string }>;
        };
        phone: string;
        phonePlaceholder: string;
        email: string;
        emailPlaceholder: string;
        businessHours: string;
        businessHoursDesc: string;
        openingHours: string;
        openingHoursPlaceholder: string;
        savedSuccess: string;
        saveError: string;
        activeBadge: string;
        verifiedClinic: string;
        quickStats: string;
        plan: string;
    };
    teamSettings: {
        title: string;
        subtitle: string;
        addMember: string;
        editMember: string;
        deleteMember: string;
        deleteConfirm: string;
        totalMembers: string;
        doctorsCount: string;
        staffCount: string;
        activeAccounts: string;
        memberList: string;
        memberListDesc: string;
        permissionsTitle: string;
        permissionsDesc: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        specialty: string;
        role: string;
        password: string;
        passwordPlaceholder: string;
        status: string;
        active: string;
        inactive: string;
        saveMember: string;
        saving: string;
        createdSuccess: string;
        updatedSuccess: string;
        deletedSuccess: string;
        statusUpdated: string;
        passwordResetSuccess: string;
        roles: {
            clinic_owner: string;
            dentist: string;
            receptionist: string;
            assistant: string;
            super_admin: string;
        };
        permissions: {
            appointmentsTitle: string;
            appointmentsDesc: string;
            patientsTitle: string;
            patientsDesc: string;
            conversationsTitle: string;
            conversationsDesc: string;
            aiConfigTitle: string;
            aiConfigDesc: string;
            analyticsTitle: string;
            analyticsDesc: string;
            settingsTitle: string;
            settingsDesc: string;
        };
    };
    common: {
        save: string;
        cancel: string;
        loading: string;
        success: string;
        error: string;
        active: string;
        inactive: string;
        edit: string;
        delete: string;
        actions: string;
        resetPassword: string;
        confirm: string;
    };
    patientsPage: {
        title: string;
        subtitle: string;
        newPatient: string;
        successAdd: string;
        errorAdd: string;
        firstName: string;
        lastName: string;
        firstNameEx: string;
        lastNameEx: string;
        phone: string;
        email: string;
        emailOptional: string;
        createPatient: string;
        searchPlaceholder: string;
        selected: string;
        message: string;
        campaign: string;
        export: string;
        loadingPatients: string;
        errorLoading: string;
        patient: string;
        contact: string;
        lastVisit: string;
        status: string;
        visits: string;
        noPatientSearch: string;
        noPatient: string;
    };
    agendaPage: {
        title: string;
        subtitleDay: string;
        subtitleWeek: string;
        subtitleMonth: string;

        subtitleList?: string;
        today: string;
        day: string;
        week: string;
        month: string;
        list: string;
        newAppointment: string;
        planAppointment: string;
        selectPatient: string;
        date: string;
        startTime: string;
        treatment: string;
        duration: string;
        notes: string;
        notesPlaceholder: string;
        cancel: string;
        save: string;
        statsTotal: string;
        statsConfirmed: string;
        statsPending: string;
        statsAi: string;
        statsRevenue: string;
        searchPlaceholder: string;
        filterAll: string;
        filterConfirmed: string;
        filterScheduled: string;
        filterCompleted: string;
        filterCancelled: string;
        filterNoShow: string;
        sourceAll: string;
        sourceAi: string;
        sourceManual: string;
        treatmentsAll: string;
        reset: string;
        errorLoading: string;
        retry: string;
        syncing: string;
        freeSlot: string;
    };
    dashboardPage: {
        hello: string;
        loadingError: string;
        loadingErrorDesc: string;
        startRecovery: string;
        aiPerformance: string;
        aiPerformanceDesc: string;
        automationRate: string;
        recoveredRevenue: string;
        last30days: string;
        apptsToday: string;
        confirmedAppts: string;
        patientsToRecover: string;
        thisMonth: string;
        recentNoShows: string;
        last7days: string;
        activeConversations: string;
        needsHuman: string;
        todayAgenda: string;
        plannedAppts: string;
        viewAgenda: string;
        noApptsToday: string;
        unknownPatient: string;
        unspecifiedTreatment: string;
        aiPriorities: string;
        contactFirst: string;
        seeAll: string;
        noPriority: string;
        needsFollowup: string;
        recoveryFunnel: string;
        noData: string;
        freeSlots: string;
        fillWithWaitlist: string;
        waitlist: string;
        aiActivity: string;
        last24h: string;
        inbox: string;
        estimatedImpact: string;
        simulationBased: string;
        potentialRemaining: string;
        messagesProcessed: string;
        apptsCreated: string;
        doctorPerformance: string;
        thisWeek: string;
        weekOf: string;
        headDoctor: string;
        attendance: string;
        appointmentsAbbr: string;
        patientsSeen: string;
        noShows: string;
    };
    aiAssistantPage: {
        communicationTone: string; toneEmpathic: string; typicalPrices: string; engineState: string; webhookInstructions: string; webhookUrl: string; verifyToken: string; webhookInstruction1: string; webhookInstruction2: string; statusLabel: string; engineAiLabel: string;
        tabsPrompt: string;
        tabsServices: string;
        tabsRules: string;
        tabsWhatsapp: string;
        openSimulator: string;
        saveChanges: string;
        servicesTitle: string;
        servicesDesc: string;
        presetsHeader: string;
        presetsHint: string;
        activeServices: string;
        addService: string;
        serviceNamePlaceholder: string;
        serviceDescPlaceholder: string;
        agendaRulesTitle: string;
        continuousAllocation: string;
        allocationDesc1: string;
        allocationDesc2: string;
        allocationDesc3: string;
        priceTransparency: string;
        priceTransparencyDesc: string;
        medicalGuardrails: string;
        guardrail1: string;
        guardrail2: string;
        promptTitle: string;
        promptDesc: string;
        promptLabel: string;
        promptBadge: string;
        promptPlaceholder: string;
        modeTitle: string;
        modeAuto: string;
        modeAutoDesc: string;
        modeManual: string;
        modeManualDesc: string;
        toneLabel: string;
        toneFriendly: string;
        toneProfessional: string;
        rulesTitle: string;
        rulesDesc: string;
        capabilitiesTitle: string;
        capBooking: string;
        capBookingDesc: string;
        capUrgency: string;
        capUrgencyDesc: string;
        capPricing: string;
        capPricingDesc: string;
        capMultilingual: string;
        capMultilingualDesc: string;
        escalationTitle: string;
        escMedical: string;
        escMedicalDesc: string;
        escFrustrated: string;
        escFrustratedDesc: string;
        escQuote: string;
        escQuoteDesc: string;
        escConfidence: string;
        escConfidenceDesc: string;
        waTitle: string;
        waDesc: string;
        waStatusTitle: string;
        waStatusLabel: string;
        waOnline: string;
        waNumber: string;
        waBattery: string;
        waScanTitle: string;
        waScanDesc: string;
        waLinkTitle: string;
        waDirectLink: string;
        waPrefill: string;
        waGenerateLink: string;
        waCopyLink: string;
        waCopyHtml: string;
        title: string;
        subtitle: string;
        saveBtn: string;
        saving: string;
        successSave: string;
        errorSave: string;

        waCoordTitle: string;
        waCoordDesc: string;
        waPrefillWith: string;
        waOfficialNum: string;
        waSandboxNum: string;
        waConfiguredNum: string;
        waPrefillMsg: string;
        waMetaGuideTitle: string;
        waMetaGuideDesc: string;
        waMetaStep1Title: string;
        waMetaStep2Title: string;
        waUsageTitle: string;
        waUsageDesc: string;
        waUsage1Title: string;
        waUsage1Desc: string;
        waUsage2Title: string;
        waUsage2Desc: string;
        waUsage3Title: string;
        waUsage3Desc: string;
        waActiveQRTitle: string;
        waActiveQRDesc: string;
        waCopyDirectLink: string;
        waTestInWeb: string;
        capReminders: string;
        capRemindersDesc: string;
        capDoctorEscalation: string;
        capDoctorEscalationDesc: string;

    };
    waitlistPage: {
        simulateCancel: string;
        waitingPatients: string;
        activeRequests: string;
        highPriority: string;
        contactFirst: string;
        aiTargeted: string;
        freeSlots: string;
        aiFill: string;
        algo247: string;
        freedSlotsAI: string;
        targetedPatientsCount: string;
        loadingOffers: string;
        allSlotsFull: string;
        aiSuggests: string;
        testWithCancel: string;
        patientsInWaitlist: string;
        waitingForSlot: string;
        filterPlaceholder: string;
        filterAll: string;
        filterHigh: string;
        filterMedium: string;
        filterLow: string;
        loading: string;
        noMatchingPatients: string;
        contactWhatsApp: string;
        removeFromWaitlist: string;
        page: string;
        of: string;
        prev: string;
        next: string;
        aiRecommended: string;
        chooseSlot: string;
        availableSlot: string;
        option: string;
        whatsapp: string;
        validateSlot: string;
        booking: string;
        contactLogBtn: string;
        contactLogTitle: string;
        contactLogDesc: string;
        contactChannel: string;
        exchangeOutcome: string;
        notesOptional: string;
        notesPlaceholder: string;
        cancel: string;
        saveAttempt: string;
        saving: string;
        title: string;
        subtitle: string;
    };
    followupsPage: {
        priorityHigh: string; priorityMedium: string; priorityLow: string;
        statusPending: string;
        statusInProgress: string;
        statusCompleted: string;
        statusCancelled: string;
        statusExpired: string;
        typeAbsence: string;
        typeCancel: string;
        typeReengage: string;
        typeCheckup: string;
        typeSlotOffer: string;
        kpiPending: string;
        kpiInProgress: string;
        kpiCompletedToday: string;
        kpiExpired: string;
        filterActive: string;
        filterAllPriorities: string;
        filterAllTypes: string;
        colPatient: string;
        colType: string;
        colPriority: string;
        colStatus: string;
        colAttempts: string;
        colActions: string;
        noTasks: string;
        btnComplete: string;
        btnJournal: string;
        journalTitle: string;
        journalChannel: string;
        channelPhone: string;
        channelWA: string;
        channelSMS: string;
        channelEmail: string;
        channelVisit: string;
        journalOutcome: string;
        outNoAnswer: string;
        outVoicemail: string;
        outAgreed: string;
        outDeclined: string;
        outInvalid: string;
        journalNotes: string;
        journalNotesPlaceholder: string;
        journalSave: string;
        journalSaving: string;
        toastSuccess: string;
        toastAttempt: string;
        loading: string;
        title: string;
        subtitle: string;
    };
    recoveryPage: {
        title: string;
        subtitle: string;
        detect: string;
        launchCampaign: string;
        analyzed: string;
        toRecover: string;
        contacted: string;
        replied: string;
        recoveredAppts: string;
        completed: string;
        estimatedValue: string;
        bookedValue: string;
        recoveredValue: string;
        funnelTitle: string;
        funnelSubtitle: string;
        funnelIdentified: string;
        funnelContacted: string;
        funnelReplied: string;
        funnelBooked: string;
        funnelVisited: string;
        opportunitiesTitle: string;
        opportunitiesSubtitle: string;
        campaigns: string;
        colPatient: string;
        colType: string;
        colReason: string;
        colPriority: string;
        colEstValue: string;
        colStatus: string;
        colDetectedOn: string;
        unknownPatient: string;
        viewBtn: string;
        errorLoading: string;
        noOpportunities: string;
        typeInactive: string;
        typeInterrupted: string;
        typePendingQuote: string;
        typeNoShow: string;
        typeCancellation: string;
        typeOverdue: string;
        typeFollowUp: string;
        statusIdentified: string;
        statusQueued: string;
        statusContacted: string;
        statusResponded: string;
        statusBooked: string;
        statusVisited: string;
        statusNoResponse: string;
        statusDismissed: string;
        detectionComplete: string;
        detectionError: string;
    };
    login: {
        title: string;
        subtitle: string;
        email: string;
        password: string;
        forgot_password: string;

        loading: string;
        error_default: string;
        back: string;
        submit?: string;
    };
    landing: {
        hero: {
            chip1: string;
            chip2: string;
            title1: string;
            title2: string;
            title3: string;
            subtitle: string;
            cta1: string;
            cta2: string;
        };
        pipeline: {
            kicker: string;
            title: string;
            subtitle: string;
        };
        gates: {
            msg_received: string;
            msg_received_desc: string;
            context_isolated: string;
            context_isolated_desc: string;
            intent_understood: string;
            intent_understood_desc: string;
            ai_guardrail: string;
            ai_guardrail_desc: string;
            slot_validated: string;
            slot_validated_desc: string;
            waitlist_check: string;
            waitlist_check_desc: string;
            reminders: string;
            reminders_desc: string;
            confirmation: string;
            confirmation_desc: string;
            escalation: string;
        };
        scenarios: {
            tab1: string;
            msg1_1: string;
            reply1_1: string;
            msg1_2: string;
            reply1_2: string;
            tab2: string;
            msg2_1: string;
            reply2_1: string;
            msg2_2: string;
            reply2_2: string;
        };
        security: {
            kicker: string;
            title: string;
            subtitle: string;
            disclaimer: string;
            layers: {
                access: {
                    title: string;
                    desc: string;
                };
                tenant: {
                    title: string;
                    desc: string;
                };
                validation: {
                    title: string;
                    desc: string;
                };
                idempotent: {
                    title: string;
                    desc: string;
                };
                ai_limits: {
                    title: string;
                    desc: string;
                };
                traceability: {
                    title: string;
                    desc: string;
                };
                permissions: {
                    title: string;
                    desc: string;
                };
            };
        };
        features: {
            kicker: string;
            title: string;
            subtitle: string;
            items: {
                assistant: {
                    title: string;
                    desc: string;
                };
                multilingual: {
                    title: string;
                    desc: string;
                };
                record: {
                    title: string;
                    desc: string;
                };
                modify: {
                    title: string;
                    desc: string;
                };
                family: {
                    title: string;
                    desc: string;
                };
                calendar: {
                    title: string;
                    desc: string;
                };
                queue: {
                    title: string;
                    desc: string;
                };
                reminders: {
                    title: string;
                    desc: string;
                };
                followup: {
                    title: string;
                    desc: string;
                };
                specialty: {
                    title: string;
                    desc: string;
                };
                analytics: {
                    title: string;
                    desc: string;
                };
                team: {
                    title: string;
                    desc: string;
                };
            };
        };
        pricing: {
            title: string;
            subtitle: string;
        };
        plans: {
            popular: string;
            starter: {
                tagline: string;
                f1: string;
                f2: string;
                f3: string;
                f4: string;
                cta: string;
            };
            pro: {
                tagline: string;
                f1: string;
                f2: string;
                f3: string;
                f4: string;
                f5: string;
                cta: string;
            };
            enterprise: {
                tagline: string;
                f1: string;
                f2: string;
                f3: string;
                f4: string;
                f5: string;
                cta: string;
            };
        };
        compliance: {
            rgpd: {
                title: string;
                i1: { strong: string; text: string; };
                i2: { strong: string; text: string; };
                i3: { strong: string; text: string; };
                i4: { strong: string; text: string; };
            };
            na: {
                title: string;
                i1: { strong: string; text: string; };
                i2: { strong: string; text: string; };
                i3: { strong: string; text: string; };
                i4: { strong: string; text: string; };
            };
        };
        patient_record: {
            kicker: string;
            title: string;
            subtitle: string;
            bullets: {
                0: string;
                1: string;
                2: string;
                3: string;
            };
            demo: {
                title: string;
                subtitle: string;
                bp: string;
                bp_status: string;
                hr: string;
                hr_status: string;
            };
        };
        cta: {
            title: string;
            now: string;
        };
        footer: {
            desc: string;
            product: string;
            demo: string;
            company: string;
            about: string;
            contact: string;
            legal: string;
            security_privacy: string;





















            terms: string;
            copyright: string;
            subModalTitle: string;
            subModalDesc: string;
            subModalDesc2: string;
            subName: string;
            subNamePlaceholder: string;
            subEmail: string;
            subEmailPlaceholder: string;
            subPhone: string;
            subPhonePlaceholder: string;
            subCountry: string;
            subCountrySearch: string;
            subCountryEmpty: string;
            subMessage: string;
            subMessagePlaceholder: string;
            subCancel: string;
            subSubmit: string;
            subSubmitting: string;
            subSuccess: string;
            subError: string;

            country: string;
        };
    };
    noShowsPage: {
        viewAgenda: string;
        recoveryModule: string;
        absencesToday: string;
        missedToday: string;
        thisWeek: string;
        weekTotal: string;
        recoveredPatients: string;
        recoveredDesc: string;
        recoveryRate: string;
        recoveryRateDesc: string;
        historyTitle: string;
        historyDesc: string;
        filterAll: string;
        filterToday: string;
        filterPending: string;
        searchPlaceholder: string;
        loading: string;
        errorLoading: string;
        noAbsencesTitle: string;
        noAbsencesDescFilter: string;
        noAbsencesDesc: string;
        colPatient: string;
        colDate: string;
        colSlot: string;
        colTreatment: string;
        colScore: string;
        colStatus: string;
        colActions: string;
        statusIdentified: string;
        statusContacted: string;
        statusResponded: string;
        statusBooked: string;
        statusVisited: string;
        statusNoResponse: string;
        statusDismissed: string;
        firstAbsence: string;
        multipleAbsences: string;
        btnWhatsApp: string;
        btnReschedule: string;
        btnRecord: string;
    };
}

export const translations: Record<Language, Translations> = {
    fr: {


        featuresPage: {
            badge: "Fonctionnalités & Avantages",
            title: "Tout ce dont votre clinique a besoin, automatisé.",
            subtitle: "Sanovia AI n'est pas un simple gadget. C'est un membre à part entière de votre équipe qui travaille 24h/24 pour améliorer l'expérience patient et maximiser vos revenus.",
            feat1Title: "Prise de RDV par Intelligence Artificielle",
            feat1Desc: "L'IA discute avec le patient, comprend son besoin, vérifie vos disponibilités et réserve le créneau parfait. Fonctionne 24/7 sur WhatsApp et Téléphone.",
            feat2Title: "Relances Automatiques & No-Shows",
            feat2Desc: "Envoi automatique de rappels. Si un patient annule, l'IA contacte instantanément les patients en liste d'attente pour combler le vide.",
            feat3Title: "Triage Médical Intelligent",
            feat3Desc: "Pose les bonnes questions (symptômes, urgence) avant la consultation pour que le médecin soit préparé. Redirige les urgences absolues vers le 15.",
            feat4Title: "Suivi Post-Opératoire",
            feat4Desc: "L'assistant prend des nouvelles de vos patients après une intervention et vous alerte en cas de complication signalée.",
            feat5Title: "Gestion de la Liste d'Attente",
            feat5Desc: "Les patients peuvent s'inscrire sur liste d'attente. Dès qu'un créneau se libère, l'IA leur propose automatiquement.",
            feat6Title: "Gain de temps pour le Secrétariat",
            feat6Desc: "Filtrez 80% des appels inutiles. Laissez vos secrétaires se concentrer sur l'accueil physique et les cas complexes.",
            ctaTitle: "Prêt à transformer votre cabinet ?",
            ctaDesc: "Rejoignez les dizaines de médecins qui utilisent déjà Sanovia AI pour soulager leur secrétariat."
        },
        waAssistantPage: {
            badge: "Assistant Virtuel WhatsApp",
            title: "Déléguez votre ligne WhatsApp à l'Intelligence Artificielle.",
            subtitle: "Ne ratez plus aucun patient. Notre assistant qualifie la demande, consulte vos disponibilités et fixe le rendez-vous directement dans votre calendrier, de jour comme de nuit.",
            heroList1: "Répond en moins de 2 secondes",
            heroList2: "Comprend le langage naturel (vocal et texte)",
            heroList3: "Multilingue (Arabe, Français, Anglais)",
            cta1: "Essayer gratuitement",
            chat1: "Bonjour ! Je suis l'assistant du Dr. Martin. Comment puis-je vous aider aujourd'hui ?",
            chat2: "J'aimerais prendre un rendez-vous pour une consultation de contrôle.",
            chat3: "Très bien ! Le Dr. Martin a de la disponibilité demain à 10h00 ou à 14h30. Quel horaire préférez-vous ?",
            featuresTitle: "Pourquoi nos clients adorent l'Assistant WhatsApp",
            ben1Title: "Prise de RDV 24/7",
            ben1Desc: "L'assistant identifie le besoin du patient et propose le créneau idéal directement dans la discussion.",
            ben2Title: "Triage intelligent",
            ben2Desc: "Filtre les urgences des simples questions administratives pour faire gagner du temps à votre secrétaire.",
            ben3Title: "Réduction des No-Shows",
            ben3Desc: "Relances automatiques sur WhatsApp avec possibilité de confirmer, reporter ou annuler en un clic.",
            ben4Title: "Confidentialité garantie",
            ben4Desc: "Communications chiffrées de bout en bout via l'API officielle de Meta. Zéro stockage externe des conversations."
        },
        securityPage: {
            badge: "Sécurité & Vie Privée",
            title: "Une architecture SaaS conçue pour protéger les espaces de chaque cabinet.",
            subtitle: "Chez Sanovia AI, nous ne faisons aucun compromis sur la confidentialité des données médicales. Notre infrastructure est bâtie sur des standards rigoureux d'isolation, de chiffrement et de traçabilité.",
            feat1Title: "Isolation logique multi-tenant",
            feat1Desc: "Chaque cabinet dispose de son propre espace de données isolé logiquement. Aucune donnée n'est partagée entre les locataires.",
            feat2Title: "Authentification et RBAC",
            feat2Desc: "Contrôle d'accès basé sur les rôles (Role-Based Access Control). Les secrétaires et les médecins ont des permissions strictement délimitées.",
            feat3Title: "Chiffrement en transit",
            feat3Desc: "Toutes les communications entre les cliniques, nos serveurs et les APIs tierces sont chiffrées via TLS 1.2+.",
            feat4Title: "Signature des webhooks",
            feat4Desc: "Les requêtes provenant de WhatsApp et des autres intégrations sont systématiquement vérifiées par signature cryptographique.",
            feat5Title: "Idempotence & Outbox",
            feat5Desc: "Mécanismes d'idempotence stricts pour les webhooks et les jobs asynchrones, garantissant qu'aucune action (comme l'envoi d'un message) n'est dupliquée.",
            feat6Title: "Sauvegardes et Rétention",
            feat6Desc: "Sauvegardes automatisées régulières. Les données de conversation sont conservées selon les standards médicaux et peuvent être purgées sur demande.",
            feat7Title: "Journalisation (Logs d'audit)",
            feat7Desc: "Traçabilité complète des actions critiques (connexions, export de données, modifications de paramètres) conservée dans des journaux immuables.",
            feat8Title: "Procédure d'incident",
            feat8Desc: "Processus de réponse aux incidents documenté et surveillance proactive des anomalies d'accès.",
            depsTitle: "Localisation et Dépendances",
            depsSubtitle: "Nous sommes transparents sur notre architecture technique. Les données de vos patients transitent et sont stockées en s'appuyant sur des partenaires de confiance, certifiés et reconnus mondialement.",
            dep1Name: "MongoDB Atlas",
            dep1Desc: "Hébergement sécurisé de la base de données avec chiffrement au repos.",
            dep2Name: "Meta WhatsApp API",
            dep2Desc: "Canal de communication chiffré de bout en bout entre Meta et nos serveurs.",
            dep3Name: "Providers IA",
            dep3Desc: "Modèles d'IA d'entreprise sans entraînement sur vos données de santé (Zero-Data Retention Policy).",
            storageTitle: "Stockage des données",
            storageDesc: "Selon votre région et la législation en vigueur, les bases de données de Sanovia AI sont provisionnées sur des serveurs isolés géographiquement pour garantir la souveraineté de vos informations.",
            storageNotice: "Statut actuel : Les mécanismes décrits sont implémentés en production. Nos processus de certification formels sont en cours de validation selon les normes internationales. Sanovia AI ne pose pas de diagnostic médical.",
            footer: "Plateforme de gestion de cabinet médical."
        },
        settingsPage: {
            aiSettingsTitle: "Paramètres IA avancés",
            globalConfig: "Configuration globale",
            goToAiAssistantDesc:
                "Pour la configuration des capacités, des langues et du mode de réponse, veuillez vous rendre sur la page Assistant IA.",
            goToAiAssistantBtn: "Aller à l'Assistant IA",
            commChannelsTitle: "Canaux de communication",
            waMainChannelDesc: "Canal principal pour l'IA et les relances.",
            smsConfirmDesc: "Utilisé pour les confirmations à J-1 si WhatsApp n'est pas disponible.",
            emailDocsDesc: "Pour l'envoi de devis et documents PDF.",
            securityAuditTitle: "Sécurité & Audit",
            securityAuditSubtitle: "Traçabilité des accès aux données de santé (Conformité RGPD/HIPAA).",
            eventLogTitle: "Registre des événements",
            thDate: "Date",
            thUser: "Utilisateur",
            thAction: "Action",
            thResource: "Ressource",
            thIpAddress: "Adresse IP",
            loadingAudit: "Chargement des logs d'audit...",
            noAuditFound: "Aucun journal d'audit trouvé.",
            pageXofY: "Page {page} sur {totalPages}",
            btnPrev: "Précédent",
            btnNext: "Suivant",
            integrationsTitle: "Intégrations",
            integrationsSubtitle: "Connectez Sanovia AI à vos outils.",
            metaConfigServer: "Configuration Meta gérée côté serveur.",
            aiProviderEnv: "Configuration via les variables d'environnement du backend.",
            aiProvider: "Fournisseur IA",
            serverConfig: "Configuration serveur",
            notAvailable: "Non disponible",
            managedServerSide: "Géré côté serveur",
        },
        catalogPage: {
            toastSuccess: "Catalogue mis à jour avec succès !",
            title: "Catalogue des Soins",
            btnAdd: "Ajouter un soin",
            sectionTitle: "Soins & Consultations",
            sectionDesc: "Ces soins seront proposés par l'Assistant IA lors des prises de rendez-vous.",
            noServicesTitle: "Aucun soin défini",
            noServicesDesc:
                "Ajoutez des soins pour que l'IA puisse proposer des créneaux de durée appropriée.",
            colService: "Soin",
            colDuration: "Durée",
            colPrice: "Prix Indicatif",
            colActions: "Actions",
            durationMin: "min",
            onEstimate: "Sur devis",
            confirmDelete: "Êtes-vous sûr de vouloir supprimer ce soin du catalogue ?",
            modalEdit: "Modifier le soin",
            modalNew: "Nouveau soin",
            labelName: "Nom du soin *",
            placeName: "Ex: Consultation Dentaire",
            labelDuration: "Durée (minutes) *",
            labelPrice: "Prix ({currency})",
            placePrice: "0 pour 'Sur devis'",
            labelDesc: "Description / Consignes IA",
            placeDesc: "Ex: Soin de routine, vérifier antécédents...",
            btnCancel: "Annuler",
            btnSave: "Enregistrer",
        },
        revenuePage: {
            title: "Revenue Recovery",
            subtitle: "Mesurez les rendez-vous et opportunités récupérés grâce à Sanovia AI.",
            errorLoading: "Impossible de charger les données de revenus.",
            loading: "Chargement...",
            statRecoveredAppts: "RDV récupérés (Venu)",
            hintTotalRecovered: "Total récupéré",
            statBookedAppts: "Traitements acceptés",
            hintApptsBooked: "RDV pris",
            estimatedValue: "Valeur estimée récupérée",
            potentialValue: "Potentiel restant à récupérer : ",
            timelineTitle: "Chronologie des récupérations",
            timelineDesc: "Historique récent des gains générés",
            noHistory: "Aucun historique récent.",
        },
        analyticsPage: {
            title: "Analytics",
            subtitle: "Suivez les performances de votre cabinet et l'impact de l'IA (30 derniers jours).",
            subtitleError: "Suivez les performances de votre cabinet et l'impact de l'IA.",
            errorTitle: "Erreur de chargement",
            errorDesc: "Impossible de charger les statistiques d'analyse pour le moment.",
            statRecoveryRate: "Taux de récupération",
            statNoShow: "Taux de no-show",
            statNoShowRecovery: "Récupération no-show",
            statWaitlist: "Remplissage liste attente",
            statActiveFollowUps: "Relances actives",
            chartAppointmentsTitle: "Rendez-vous et Récupérations",
            chartAppointmentsDesc: "Évolution sur les 6 derniers mois",
            chartInactiveTitle: "Réactivation de patients inactifs",
            chartInactiveDesc: "Patients n'ayant pas consulté depuis > 6 mois",
            chartLostTitle: "Où votre cabinet perd des opportunités",
            noData: "Aucune donnée",
            loading: "...",
        },
        conversationsPage: {
            title: "Boîte de réception & Chatbot WhatsApp IA",
            subtitle: "Gérez les conversations et testez l'IA WhatsApp en temps réel.",
            live: "Live 24/7",
            hideSimulator: "Masquer le Simulateur",
            openSimulator: "📱 Ouvrir le Simulateur Patient",
            viewAgenda: "Voir l'agenda",
            searchPlaceholder: "Rechercher par nom, tél...",
            filterAll: "Toutes",
            filterAi: "IA",
            filterHuman: "Humain Requis",
            loadingConvs: "Chargement des conversations...",
            noConvs: "Aucune conversation pour le moment.",
            humanRequired: "Intervention Humaine Requise",
            aiHandled: "Géré par l'IA",
            patientRecord: "Ouvrir dossier patient",
            whatsappBusiness: "WhatsApp Business API",
            loadPrevMsgs: "Charger les anciens messages",
            loadingMsgs: "Chargement...",
            noMsgsTitle: "Aucun message",
            noMsgsDesc: "Cette conversation ne contient aucun message ou n'a pas pu être chargée.",
            typeMsg: "Écrire un message en tant que clinique...",
            whatsappSimulator: "Simulateur WhatsApp (Test Patient)",
            simDesc:
                "Testez l'IA en temps réel. Mettez-vous à la place d'un patient et envoyez des messages pour voir comment l'assistant réagit (Prise de RDV, Urgence, Tarifs...).",
            online: "en ligne",
            patientId: "ID:",
            simNewConv: "Simuler un nouveau patient",
            quickScenarios: "Scénarios rapides à tester :",
            scenario1Label: "📅 Détartrage",
            scenario1Text:
                "Bonjour, je voudrais prendre un rendez-vous pour un détartrage cette semaine svp.",
            scenario2Label: "⏱️ Confirmer",
            scenario2Text: "Parfait, le créneau de 11h30 me convient très bien ! Je confirme.",
            scenario3Label: "🚨 Urgence",
            scenario3Text:
                "Bonjour docteur, j'ai une rage de dents insupportable depuis ce matin, pouvez-vous me prendre en urgence ?",
            scenario4Label: "💰 Tarifs",
            scenario4Text:
                "Bonjour, pouvez-vous me renseigner sur le prix d'un implant ou d'un blanchiment ?",
            scenario5Label: "🧑‍⚕️ Docteur",
            scenario5Text: "J'aimerais parler directement au médecin concernant mon traitement d'hier.",
            clearSim: "Effacer la conversation test",
            simWarning: "Vous simulez le patient avec le faux numéro :",
            simulatorSubtitle: "Simulateur WhatsApp",
            directTestMode: "Mode test direct",
            simPatientLabel: "Patient simulé :",
            simPatientUnknown: "Patient inconnu",
            clinicName: "Votre Clinique",
            onlineStatus: "en ligne",
            welcomeMsg: "Message de bienvenue",
            writeAsPatient: "Écrire en tant que patient...",
            suggestionSuccess: "Suggestion copiée !",
            suggestionError: "Erreur de suggestion",
            sendError: "Erreur d'envoi",
            simSuccess: "Message test envoyé !",
            simError: "Erreur de simulation",
            patient: "Patient",
            aiBot: "Bot IA",
            received: "Reçu",
            delivered: "Distribué",
            writeManualReply: "Écrire une réponse manuelle...",
            aiTip: "L'IA gère automatiquement cette conversation.",
            enterToSend: "Appuyez sur Entrée pour envoyer",
            selectConvTitle: "Sélectionnez une conversation",
            selectConvDesc:
                "Choisissez une conversation à gauche ou commencez un test dans le simulateur.",
            simulatorTitle: "Simulateur WhatsApp",
        },
        uiKit: {
            statusConfirmed: "Confirmed",
            statusScheduled: "Scheduled",
            statusCancelled: "Cancelled",
            statusCompleted: "Completed",
            statusNoShow: "No-Show",
            patientActive: "Active",
            patientInactive: "Inactive",
            patientAtRisk: "At Risk",
            reasonInactive: "Inactive",
            reasonInterrupted: "Interrupted treatment",
            reasonQuote: "Pending quote",
            reasonNoShow: "No-Show",
            reasonOverdue: "Overdue checkup",
            reasonCancel: "Cancelled",
            reasonFollowUp: "Follow-up",
            aiActive: "AI Active",
            aiPaused: "AI Paused",
        },
        nav: {
            workspace: "Espace de travail",
            automation: "Automatisation",
            insights: "Analyses",
            settings: "Paramètres",
            dashboard: "Tableau de bord",
            agenda: "Agenda",
            patients: "Patients",
            conversations: "Conversations",
            recovery: "Récupération",
            aiAssistant: "Assistant IA",
            followups: "Suivis Post-Op",
            waitlist: "Liste d'attente",
            noShows: "Rendez-vous manqués",
            analytics: "Statistiques",
            revenue: "Revenus",
            clinic: "Clinique",
            team: "Équipe",
            aiSettings: "Paramètres IA",
            communication: "Communication",
            integrations: "Intégrations",
            catalog: "Catalogue (Soins)",
            securityAndAudit: "Sécurité & Audit",
            patientRecovery: "Récupération de patients",
            features: "Fonctionnalités",
            security: "Sécurité",
            pricing: "Tarifs",
            login: "Connexion",
            start: "Démarrer",
        },
        pages: {
            aiAssistantTitle: "Assistant IA",
            aiAssistantSubtitle: "Configuration de votre assistant virtuel",
            followupsTitle: "Suivis Post-Op",
            followupsSubtitle: "Suivez l'état de vos patients",
            waitlistTitle: "Liste d'attente",
            waitlistSubtitle: "Gérez les patients en attente",
            noShowsTitle: "Rendez-vous manqués",
            noShowsSubtitle: "Gérez les absences et annulations",
            analyticsTitle: "Analytics",
            analyticsSubtitle: "Suivez les performances de votre cabinet et l'impact de l'IA.",
            revenueTitle: "Revenus & Rentabilité",
            revenueSubtitle:
                "Suivez l'évolution de vos revenus, des impayés et du retour sur investissement de l'IA.",
            conversationsTitle: "Conversations",
            conversationsSubtitle: "Gérez vos échanges avec les patients",
        },
        topbar: {
            searchPlaceholder: "Rechercher un patient, un rendez-vous…",
            notifications: "Notifications",
            markAllRead: "Tout marquer comme lu",
            noNotifications: "Aucune notification",
            help: "Aide",
            gettingStarted: "Guide de démarrage",
            howRecoveryWorks: "Comment fonctionne la récupération",
            contactSupport: "Contacter le support",
            currentClinic: "Cabinet Actif",
            active: "Actif",
            interfaceLanguage: "Langue de l'interface",
            clinicSettings: "Réglages du cabinet",
            team: "Équipe",
            logout: "Se déconnecter",

            guideModalTitle: "Guide de Démarrage 🚀",
            guideModalDesc: "Bienvenue dans l'avenir de la gestion de votre cabinet.",
            guideSection1Title: "🌟 Des Fonctionnalités Inédites pour vos Patients",
            guideSection1Desc: "L'expérience patient n'a jamais été aussi fluide. Sur WhatsApp, votre IA est capable d'interagir avec le naturel d'un véritable assistant humain :",
            guideFeat1Title: "Prise de Rendez-vous Intelligente",
            guideFeat1Desc: "Le patient demande un créneau, l'IA vérifie vos disponibilités, qualifie l'urgence, et réserve directement.",
            guideFeat2Title: "Gestion de la Famille (Proches)",
            guideFeat2Desc: "Un patient peut prendre rendez-vous pour lui-même, mais aussi pour un proche ou un enfant. L'IA comprend le contexte.",
            guideFeat3Title: "Suivi du Dossier Médical",
            guideFeat3Desc: "L'IA est capable de répondre aux questions des patients concernant leur dossier médical ou recommandations post-opératoires.",
            guideFeat4Title: "Multilingue & Naturelle",
            guideFeat4Desc: "Elle s'adapte au ton et à la langue de votre patient (Français, Anglais, Arabe...) pour créer un lien de confiance.",
            guideSection2Title: "⚙️ Configuration Initiale",
            guideSection2Desc: "Pour que l'IA puisse travailler, il lui suffit de connaître les règles de votre maison.",
            guideConfig1: "1. Réglages du cabinet : Vos coordonnées et horaires d'ouverture.",
            guideConfig2: "2. Équipe : Ajoutez vos collaborateurs avec un système de rôles ultra-sécurisé.",
            guideConfig3: "3. Assistant IA : Définissez votre catalogue de soins (durée, prix) et vos consignes (directives).",
            guideSection3Title: "2️⃣ Superviser les Conversations & Intervention",
            guideSection3Desc: "Allez dans l'onglet Conversations pour suivre l'activité de l'IA.",
            guideSup1Title: "100% Automatique :",
            guideSup1Desc: "Dans la majorité des cas, l'IA qualifie le besoin et confirme le rendez-vous sans aucune intervention de votre part.",
            guideSup2Title: "Escalade Intelligente vers l'Humain :",
            guideSup2Desc: "L'IA détecte ses propres limites et vous passe le relais (avec une alerte visuelle) dans des cas précis :",
            guideSup2Bul1: "Questions purement médicales (diagnostics, symptômes complexes).",
            guideSup2Bul2: "Demandes de devis lourds (implants, orthodontie globale).",
            guideSup2Bul3: "Patients frustrés ou mécontents.",
            guideSup2Bul4: "Incompréhension ou doute de la part de l'IA.",
            guideSup3Title: "Supervision en temps réel :",
            guideSup3Desc: "Vous lisez tout en direct. En cas d'escalade, le secrétariat ou le médecin reprend la main de façon fluide.",
            recoveryModalTitle: "Comment fonctionne la récupération ? 💸",
            recoveryModalDesc: "Le moteur de récupération de revenus (Revenue Recovery) de votre IA.",
            recoveryIntro: "C'est ici que votre IA se transforme en un générateur de chiffre d'affaires. Elle traque chaque opportunité perdue pour la transformer en rendez-vous confirmé, sans que vous n'ayez rien à faire.",
            recoverySec1Title: "1. Bouclier Anti-Absences (No-Shows)",
            recoverySec1Bul1Title: "Détection :",
            recoverySec1Bul1Desc: "Lorsqu'un patient annule à la dernière minute ou ne se présente pas.",
            recoverySec1Bul2Title: "Action Immédiate :",
            recoverySec1Bul2Desc: "L'IA le contacte automatiquement via WhatsApp avec bienveillance pour comprendre la raison et proposer de replanifier.",
            recoverySec1Bul3Title: "Remplissage Instantané (Waitlist) :",
            recoverySec1Bul3Desc: "Si un créneau se libère aujourd'hui, l'IA contacte instantanément les patients sur votre Liste d'attente. Votre agenda reste toujours plein !",
            recoverySec2Title: "2. Les Campagnes de Relances (Follow-ups)",
            recoverySec2Desc: "L'IA gère 5 types de relances proactives pour ne perdre aucun patient :",
            recoverySec2Bul1Title: "Absences & Annulations :",
            recoverySec2Bul1Desc: "Reprogrammation immédiate.",
            recoverySec2Bul2Title: "Proposition de créneau :",
            recoverySec2Bul2Desc: "Envoi d'alertes à la liste d'attente (Waitlist).",
            recoverySec2Bul3Title: "Rappel de contrôle :",
            recoverySec2Bul3Desc: "Convocation automatique des patients pour leur suivi annuel ou semestriel.",
            recoverySec2Bul4Title: "Réengagement :",
            recoverySec2Bul4Desc: "Recontact bienveillant des patients inactifs depuis longtemps.",
            recoveryTip: "💡 Astuce Pro : Suivez les performances de l'IA (Revenus sauvés, Heures gagnées) en temps réel dans l'onglet Insights > Revenus.",
            supportModalTitle: "Contacter le Support 📞",
            supportModalDesc: "Nous sommes là pour vous accompagner.",
            supportEmail: "Email",
            supportPhoneTitle: "WhatsApp Direct",
            supportPhoneDesc: "+216 XX XXX XXX (9h-18h)",
            supportClose: "Fermer",

        },
        clinicSettings: {
            title: "Paramètres du Cabinet",
            subtitle:
                "Gérez les coordonnées officielles, la spécialité et les informations publiques de votre établissement.",
            save: "Enregistrer les modifications",
            saving: "Enregistrement en cours...",
            generalInfo: "Informations Générales",
            generalInfoDesc:
                "Ces coordonnées sont utilisées par l'IA pour orienter les patients et pour les messages de confirmation WhatsApp.",
            clinicName: "Nom du cabinet / Établissement",
            clinicNamePlaceholder: "Ex: Cabinet Médical Dr. Sami Ben Amor",
            specialty: "Spécialité médicale",
            specialtyPlaceholder: "Ex: Cardiologie, Dentaire, Pédiatrie, Généraliste...",
            address: "Adresse complète",
            addressPlaceholder: "Ex: Immeuble Coral, 2ème étage, Les Berges du Lac 2, Tunis",
            currencies: {
                label: "Devise / Currency",
                placeholder: "Rechercher une devise...",
                notFound: "Aucune devise trouvée.",
                list: [
                    { value: "TND", label: "TND - Dinar Tunisien" },
                    { value: "EUR", label: "EUR - Euro" },
                    { value: "USD", label: "USD - Dollar Américain" },
                    { value: "CAD", label: "CAD - Dollar Canadien" },
                    { value: "DZD", label: "DZD - Dinar Algérien" },
                    { value: "MAD", label: "MAD - Dirham Marocain" },
                    { value: "SAR", label: "SAR - Riyal Saoudien" },
                    { value: "AED", label: "AED - Dirham des Émirats" },
                    { value: "GBP", label: "GBP - Livre Sterling" },
                    { value: "CHF", label: "CHF - Franc Suisse" },
                ]
            },
            phone: "Numéro de téléphone officiel",
            phonePlaceholder: "Ex: +216 71 962 480",
            email: "Email professionnel du cabinet",
            emailPlaceholder: "Ex: contact@cabinet-medical.tn",
            businessHours: "Horaires & Disponibilités",
            businessHoursDesc:
                "Indiquez les plages d'ouverture du cabinet prises en compte pour les réservations.",
            openingHours: "Horaires d'ouverture",
            openingHoursPlaceholder: "Ex: Du Lundi au Vendredi de 08h30 à 18h00, Samedi de 08h30 à 13h00",
            savedSuccess: "Les informations du cabinet ont été enregistrées avec succès !",
            saveError: "Erreur lors de la mise à jour des paramètres du cabinet.",
            activeBadge: "Compte Cabinet Actif",
            verifiedClinic: "Cabinet vérifié & synchronisé avec l'IA",
            quickStats: "Vue d'ensemble",
            plan: "Formule Pro",
        },
        teamSettings: {
            title: "Gestion de l'Équipe & des Accès",
            subtitle:
                "Configurez les collaborateurs du cabinet (médecins, secrétaires, assistants) et personnalisez précisément leurs permissions d'accès.",
            addMember: "Ajouter un membre",
            editMember: "Modifier le membre & ses accès",
            deleteMember: "Supprimer le membre",
            deleteConfirm: "Êtes-vous sûr de vouloir supprimer ce membre de l'équipe ?",
            totalMembers: "Total Équipe",
            doctorsCount: "Médecins & Praticiens",
            staffCount: "Secrétariat & Assistants",
            activeAccounts: "Comptes Actifs",
            memberList: "Membres du Cabinet",
            memberListDesc: "Liste des utilisateurs ayant accès à l'espace de votre cabinet médical.",
            permissionsTitle: "Permissions & Droits d'Accès",
            permissionsDesc:
                "Définissez précisément ce que ce collaborateur est autorisé à faire ou consulter.",
            firstName: "Prénom",
            lastName: "Nom",
            email: "Email professionnel",
            phone: "Numéro de téléphone",
            specialty: "Titre / Fonction",
            role: "Rôle dans le cabinet",
            password: "Mot de passe initial",
            passwordPlaceholder: "Laisser vide pour générer automatiquement",
            status: "Statut du compte",
            active: "Actif",
            inactive: "Inactif / Suspendu",
            saveMember: "Enregistrer le collaborateur",
            saving: "Enregistrement...",
            createdSuccess: "Collaborateur ajouté avec succès à l'équipe !",
            updatedSuccess: "Profil et permissions du collaborateur mis à jour !",
            deletedSuccess: "Membre de l'équipe supprimé avec succès.",
            statusUpdated: "Statut du compte mis à jour.",
            passwordResetSuccess: "Mot de passe réinitialisé avec succès !",
            roles: {
                clinic_owner: "Médecin Titulaire / Propriétaire",
                dentist: "Médecin / Praticien",
                receptionist: "Secrétaire / Réceptionniste",
                assistant: "Assistant(e) Médical(e)",
                super_admin: "Super Administrateur",
            },
            permissions: {
                appointmentsTitle: "📅 Agenda & Rendez-vous",
                appointmentsDesc: "Consulter l'agenda, créer, déplacer ou annuler des rendez-vous.",
                patientsTitle: "👥 Dossiers Patients",
                patientsDesc: "Accéder à la liste des patients, fiches médicales et historiques.",
                conversationsTitle: "💬 WhatsApp & Clavardage",
                conversationsDesc: "Lire les messages WhatsApp, répondre en direct aux patients.",
                aiConfigTitle: "🤖 Configuration IA & Tarifs",
                aiConfigDesc: "Modifier les directives de l'IA, tarifs des soins et règles d'escalade.",
                analyticsTitle: "📊 Revenus & Analytics",
                analyticsDesc: "Consulter les tableaux de bord financiers et revenus récupérés.",
                settingsTitle: "⚙️ Paramètres Cabinet & Équipe",
                settingsDesc: "Modifier les coordonnées du cabinet et gérer les comptes utilisateurs.",
            },
        },
        common: {
            save: "Enregistrer",
            cancel: "Annuler",
            loading: "Chargement...",
            success: "Succès",
            error: "Erreur",
            active: "Actif",
            inactive: "Inactif",
            edit: "Modifier",
            delete: "Supprimer",
            actions: "Actions",
            resetPassword: "Réinitialiser mot de passe",
            confirm: "Confirmer",
        },
        patientsPage: {
            title: "Patients",
            subtitle: "{count} patients au total",
            newPatient: "Nouveau patient",
            successAdd: "Patient ajouté avec succès.",
            errorAdd: "Erreur lors de la création du patient.",
            firstName: "Prénom",
            lastName: "Nom",
            firstNameEx: "Ex: Jean",
            lastNameEx: "Ex: Dupont",
            phone: "Téléphone",
            email: "Email",
            emailOptional: "Optionnel",
            createPatient: "Créer le patient",
            searchPlaceholder: "Rechercher par nom, téléphone...",
            selected: "{count} sélectionné(s)",
            message: "Message",
            campaign: "Campagne",
            export: "Exporter",
            loadingPatients: "Chargement des patients...",
            errorLoading: "Impossible de charger la liste des patients.",
            patient: "Patient",
            contact: "Contact",
            lastVisit: "Dernière visite",
            status: "Statut",
            visits: "Visites",
            noPatientSearch: 'Aucun patient trouvé pour "{query}".',
            noPatient: "Aucun patient.",
        },
        agendaPage: {
            title: "Agenda & Planning Médical",
            subtitleDay: "{date}",
            subtitleWeek: "Semaine du {start} au {end}",
            subtitleMonth: "Mois de {month}",
            subtitleList: "Vue Liste détaillée des consultations",
            today: "Aujourd'hui",
            day: "Jour",
            week: "Semaine",
            month: "Mois",
            list: "Liste",
            newAppointment: "Nouveau Rendez-vous",
            planAppointment: "Planifier un Rendez-vous",
            selectPatient: "Sélectionner un patient existant",
            date: "Date",
            startTime: "Heure de début",
            treatment: "Prestation / Soin",
            duration: "Durée estimée",
            notes: "Notes & Consignes particulières",
            notesPlaceholder: "Ex: Première consultation...",
            cancel: "Annuler",
            save: "Enregistrer le RDV",
            statsTotal: "Total Consultations",
            statsConfirmed: "Confirmés",
            statsPending: "En attente",
            statsAi: "Pris par IA",
            statsRevenue: "CA Prévisionnel",
            searchPlaceholder: "Rechercher patient, téléphone, soin...",
            filterAll: "Tous",
            filterConfirmed: "Confirmés",
            filterScheduled: "Planifiés",
            filterCompleted: "Terminés",
            filterCancelled: "Annulés",
            filterNoShow: "🐰 No-Shows",
            sourceAll: "Toutes sources",
            sourceAi: "🤖 Créés par IA",
            sourceManual: "👤 Manuel / Secrétariat",
            treatmentsAll: "Tous les soins",
            reset: "Réinitialiser",
            errorLoading: "Impossible de charger l'agenda.",
            retry: "Réessayer",
            syncing: "Synchronisation du planning médical...",
            freeSlot: "Créneau libre — Cliquer pour réserver",
        },
        dashboardPage: {
            hello: "Bonjour {name} 👋",
            loadingError: "Erreur de chargement",
            loadingErrorDesc: "Impossible de charger le tableau de bord.",
            startRecovery: "Lancer une récupération",
            aiPerformance: "Performances de l'IA",
            aiPerformanceDesc:
                "Votre assistant virtuel gère vos conversations en autonomie, réduit vos no-shows et récupère vos revenus perdus sans intervention humaine.",
            automationRate: "Taux d'Automatisation",
            recoveredRevenue: "Revenus Récupérés",
            last30days: "30 derniers jours",
            apptsToday: "Rendez-vous aujourd'hui",
            confirmedAppts: "{count} confirmés",
            patientsToRecover: "Patients à récupérer",
            thisMonth: "ce mois",
            recentNoShows: "No-Shows Récent",
            last7days: "7 derniers jours",
            activeConversations: "Conversations actives",
            needsHuman: "{count} à traiter",
            todayAgenda: "Agenda du jour",
            plannedAppts: "{count} rendez-vous planifiés",
            viewAgenda: "Voir l'agenda",
            noApptsToday: "Aucun rendez-vous aujourd'hui",
            unknownPatient: "Patient inconnu",
            unspecifiedTreatment: "Traitement non spécifié",
            aiPriorities: "Priorités IA",
            contactFirst: "Patients à contacter en premier",
            seeAll: "Tout voir",
            noPriority: "Aucun patient prioritaire",
            needsFollowup: "Relance nécessaire",
            recoveryFunnel: "Entonnoir de récupération",
            noData: "Aucune donnée",
            freeSlots: "Créneaux libres",
            fillWithWaitlist: "À remplir avec la liste d'attente",
            waitlist: "Liste d'attente",
            aiActivity: "Activité de l'IA",
            last24h: "Dernières 24 heures",
            inbox: "Boîte de réception",
            estimatedImpact: "Impact estimé",
            simulationBased: "Simulation basée sur vos données locales",
            potentialRemaining: "Potentiel restant à récupérer",
            messagesProcessed: "Messages traités automatiquement ce mois",
            apptsCreated: "Rendez-vous créés par l'IA ce mois",
            doctorPerformance: "Performance par Médecin",
            thisWeek: "Cette semaine",
            weekOf: "Semaine du",
            headDoctor: "Médecin titulaire",
            attendance: "% présence",
            appointmentsAbbr: "RDV",
            patientsSeen: "Patients",
            noShows: "No-shows",
        },
        aiAssistantPage: {
            tabsPrompt: "Consignes",
            tabsServices: "Soins & Durées",
            tabsRules: "Règles Métier",
            tabsWhatsapp: "QR WhatsApp",
            openSimulator: "Ouvrir le Simulateur",
            saveChanges: "Enregistrer les modifications",
            servicesTitle: "Catalogue des Prestations & Durées de Consultation",
            servicesDesc:
                "Configurez les types de soins dispensés au cabinet. L'IA alloue automatiquement des blocs de temps continus correspondant à la durée exacte de chaque soin.",
            presetsHeader: "Pré-remplir rapidement selon votre spécialité :",
            presetsHint: "1 clic pour charger",
            activeServices: "Prestations actives (",
            addService: "Ajouter un soin",
            serviceNamePlaceholder: "Intitulé du soin (ex: Détartrage)",
            serviceDescPlaceholder:
                "Description ou consigne indicative (ex: 'Bilan complet, détartrage ultrasonique')...",
            agendaRulesTitle: "Règle d'Agenda IA",
            continuousAllocation: "Allocation continue (1h00 = pas de chevauchement autorisé)",
            communicationTone: "Ton de la communication",
            toneEmpathic: "Chaleureux, empathique et rassurant",
            typicalPrices: "Tarifs indicatifs usuels du cabinet",
            engineState: "État du Moteur IA",
            statusLabel: "Statut",
            engineAiLabel: "Moteur IA",
            webhookInstruction1:
                "Dans votre console Meta Developers → WhatsApp → Configuration → Sous Champs du Webhook, cliquez sur Gérer (Manage) et cochez la case messages (S'abonner), puis validez.",
            webhookInstruction2:
                'Dans WhatsApp → Configuration de l\'API → Dans la liste déroulante "À" (Numéro destinataire de test), cliquez sur Gérer la liste des numéros et ajoutez votre numéro avec le code SMS de vérification.',
            allocationDesc1: "Si un patient demande un soin de ",
            allocationDesc2:
                " (ex: Pose d'implant ou chirurgie), le bot vérifie dans votre agenda qu'un bloc de ",
            allocationDesc3: " est libre sans chevauchement.",
            priceTransparency: "Transparence tarifaire indicative",
            priceTransparencyDesc:
                "L'assistant communique uniquement les prix que vous avez saisis ici. Aucun prix inventé n'est partagé aux patients.",
            medicalGuardrails: "Garde-fous Médicaux",
            guardrail1: "• Le bot ne pose jamais de diagnostic médical.",
            guardrail2:
                "• Les devis complexes ou personnalisés sont toujours renvoyés vers une consultation clinique.",
            promptTitle: "Consignes Personnalisées (System Prompt)",
            promptDesc:
                "Indiquez les particularités de votre cabinet dentaire que l'IA doit toujours respecter dans chaque échange.",
            promptLabel: "Directives et informations spécifiques du praticien",
            promptBadge: "Injecté automatiquement dans l'IA",
            promptPlaceholder:
                "Ex: Bonjour, je suis l'assistant du Dr. ... Les enfants sont acceptés à partir de 6 ans. Pas de chèques.",
            modeTitle: "Mode de Fonctionnement & Tonalité",
            modeAuto: "Mode 100% Autonome",
            modeAutoDesc: "L'IA réserve, modifie et annule directement dans votre agenda.",
            modeManual: "Mode Validation Manuelle",
            modeManualDesc: "L'IA propose des créneaux, mais vous validez avant inscription.",
            toneLabel: "Tonalité des réponses",
            toneFriendly: "Chaleureux & Empathique",
            toneProfessional: "Professionnel & Direct",
            rulesTitle: "Règles de Compétence & Escalade",
            rulesDesc:
                "Définissez exactement ce que l'IA a le droit de faire, et les cas où elle doit immédiatement passer la main à un humain.",
            capabilitiesTitle: "Capacités Autorisées",
            capBooking: "Prise de rendez-vous automatique",
            capBookingDesc: "Permet à l'IA de proposer et réserver des créneaux.",
            capUrgency: "Gestion des urgences (Filtrage)",
            capUrgencyDesc: "Détecte les mots comme 'douleur', 'urgence' et alerte.",
            capPricing: "Communication des tarifs (Devis simples)",
            capPricingDesc: "Partage les prix des soins standards (Détartrage, Consultation).",
            capMultilingual: "Multilingue automatique",
            capMultilingualDesc: "Répond en Français, Arabe, ou Anglais selon le patient.",
            escalationTitle: "Déclencheurs d'Escalade (Passage à l'Humain)",
            escMedical: "Questions purement médicales",
            escMedicalDesc: "Passe la main si le patient demande un avis clinique ou diagnostic.",
            escFrustrated: "Patient frustré ou agressif",
            escFrustratedDesc: "L'IA se tait et alerte le secrétariat si le ton monte.",
            escQuote: "Demande de devis complexe (Ex: Orthodontie longue)",
            escQuoteDesc: "Redirige vers une consultation physique pour devis.",
            escConfidence: "Basse confiance de l'IA",
            escConfidenceDesc: "En cas de doute, l'IA préfère ne pas répondre et vous alerte.",
            waTitle: "Connexion & QR Code WhatsApp",
            waDesc:
                "Pour que l'assistant puisse discuter avec vos patients, connectez un numéro WhatsApp Business ou classique.",
            waStatusTitle: "Appareil Connecté",
            waStatusLabel: "Status: ",
            waOnline: "En ligne et prêt",
            waNumber: "Numéro:",
            waBattery: "Batterie: 85%",
            waScanTitle: "Scanner ce QR Code",
            waScanDesc:
                "Ouvrez WhatsApp sur votre téléphone > Appareils connectés > Connecter un appareil.",
            waLinkTitle: "Générer un lien WhatsApp court",
            waDirectLink: "Lien direct vers votre assistant",
            waPrefill: "Message pré-rempli (Optionnel)",
            waGenerateLink: "Générer le Lien Court",
            waCopyLink: "Copier le Lien",
            waCopyHtml: "Copier le Code HTML",
            title: "Assistant IA & Paramètres WhatsApp",
            subtitle:
                "Consignes personnalisées de l'IA, QR Code WhatsApp et règles de réservation du cabinet.",
            saveBtn: "Enregistrer les modifications",
            saving: "Enregistrement...",
            successSave: "Consignes, catalogue de soins et paramètres enregistrés avec succès !",
            errorSave: "Erreur lors de l'enregistrement des paramètres.",

            waCoordTitle: "Coordonnées WhatsApp du Cabinet",
            waCoordDesc: "Le numéro et le message d'accueil pré-rempli pour vos patients.",
            waPrefillWith: "Pré-remplir avec :",
            waOfficialNum: "Numéro Officiel Cabinet",
            waSandboxNum: "Numéro Test Sandbox",
            waConfiguredNum: "Numéro WhatsApp configuré",
            waPrefillMsg: "Message pré-rempli au scan du QR Code",
            waMetaGuideTitle: "⚠️ Guide de Connexion Meta Sandbox (Essentiel)",
            waMetaGuideDesc: "Suivez ces 2 étapes dans Meta Developers pour que vos messages WhatsApp réels arrivent à l'IA :",
            waMetaStep1Title: "Abonner le Webhook au champ 'messages' (Obligatoire dans Meta)",
            waMetaStep2Title: "Ajouter votre numéro de téléphone dans Meta Sandbox",
            waUsageTitle: "Comment utiliser le QR Code au cabinet",
            waUsageDesc: "Facilitez l'accès pour vos patients au comptoir ou sur vos supports de communication.",
            waUsage1Title: "1. Accueil & Affiche",
            waUsage1Desc: "Imprimez le QR Code sur le comptoir pour que les patients puissent prendre RDV en 5 secondes.",
            waUsage2Title: "2. Cartes de visite",
            waUsage2Desc: "Ajoutez le QR Code au dos de vos cartes de rendez-vous pour les reports et contrôles.",
            waUsage3Title: "3. Site web & Réseaux",
            waUsage3Desc: "Partagez le lien direct wa.me sur votre page Instagram ou site pour capter de nouveaux patients.",
            waActiveQRTitle: "QR Code WhatsApp Actif",
            waActiveQRDesc: "Scannez ce QR Code avec votre appareil photo pour démarrer immédiatement la conversation WhatsApp :",
            waCopyDirectLink: "Copier le lien direct (wa.me)",
            waTestInWeb: "Tester dans WhatsApp Web",
            capReminders: "Confirmations et rappels automatiques par message",
            capRemindersDesc: "Envoie un récapitulatif clair avec date et heure dès qu'un créneau est validé.",
            capDoctorEscalation: "Escalade vers le médecin / secrétariat",
            capDoctorEscalationDesc: "Passe le relais à l'équipe médicale dès qu'un patient demande un suivi ou un praticien.",

            "webhookInstructions": "webhookInstructions",
            "webhookUrl": "webhookUrl",
            "verifyToken": "verifyToken"
        },
        waitlistPage: {
            simulateCancel: "Simuler un désistement",
            waitingPatients: "Patients en attente",
            activeRequests: "Demandes actives",
            highPriority: "Priorité Haute / Urgences",
            contactFirst: "À contacter en priorité",
            aiTargeted: "Patients Ciblés (IA)",
            freeSlots: "{count} créneau(x) libre(s) à attribuer",
            aiFill: "Remplissage IA",
            algo247: "Algorithme automatisé 24/7",
            freedSlotsAI: "Offres de créneau libéré (IA)",
            targetedPatientsCount: "{patients} patient(s) ciblé(s) - {slots} créneau(x) disponible(s)",
            loadingOffers: "Chargement des offres...",
            allSlotsFull: "Tous vos créneaux sont occupés",
            aiSuggests:
                "Dès qu'un patient annule son rendez-vous, l'IA proposera instantanément la place libérée au patient en attente le plus pertinent.",
            testWithCancel: "Tester avec une annulation",
            patientsInWaitlist: "Patients inscrits en liste d'attente",
            waitingForSlot: "{count} patient(s) en attente d'un créneau",
            filterPlaceholder: "Filtrer par nom, soin, téléphone...",
            filterAll: "Tous",
            filterHigh: "Haute",
            filterMedium: "Moyenne",
            filterLow: "Basse",
            loading: "Chargement...",
            noMatchingPatients: "Aucun patient correspondant.",
            contactWhatsApp: "Contacter par WhatsApp",
            removeFromWaitlist: "Retirer de la liste d'attente",
            page: "Page",
            of: "sur",
            prev: "Précédent",
            next: "Suivant",
            aiRecommended: "IA Recommandé",
            chooseSlot: "Choisir le créneau à attribuer :",
            availableSlot: "Créneau disponible :",
            option: "Option",
            whatsapp: "WhatsApp",
            validateSlot: "Valider ce créneau",
            booking: "Réservation...",
            contactLogBtn: "Journal d'échange",
            contactLogTitle: "Journal de contact (Liste d'attente)",
            contactLogDesc: "Enregistrez le retour du patient suite à la proposition du créneau.",
            contactChannel: "Canal de contact",
            exchangeOutcome: "Résultat de l'échange",
            notesOptional: "Notes / Détails (optionnel)",
            notesPlaceholder: "Ex: Le patient confirme être disponible et viendra 10 min en avance...",
            cancel: "Annuler",
            saveAttempt: "Enregistrer la tentative",
            saving: "Enregistrement...",
            title: "Liste d'Attente Intelligente",
            subtitle:
                "Comblez vos annulations automatiquement en proposant les créneaux libérés aux patients en attente.",
        },
        followupsPage: {
            statusPending: "En attente",
            statusInProgress: "قيد التقدم",
            priorityHigh: "Haute",
            priorityMedium: "Moyenne",
            priorityLow: "Basse",
            statusCompleted: "Terminé",
            statusCancelled: "Annulé",
            statusExpired: "Expiré",
            typeAbsence: "Absence",
            typeCancel: "Annulation",
            typeReengage: "Réengagement",
            typeCheckup: "Rappel de contrôle",
            typeSlotOffer: "Offre de créneau",
            kpiPending: "À faire",
            kpiInProgress: "En cours",
            kpiCompletedToday: "Terminés (Auj.)",
            kpiExpired: "Expirés",
            filterActive: "Actif (En attente / En cours)",
            filterAllPriorities: "Toutes les priorités",
            filterAllTypes: "Tous les types",
            colPatient: "Patient",
            colType: "Type",
            colPriority: "Priorité",
            colStatus: "Statut",
            colAttempts: "Tentatives",
            colActions: "Actions",
            noTasks: "Aucune tâche trouvée.",
            btnComplete: "Terminer",
            btnJournal: "Journal",
            journalTitle: "Journal de contact",
            journalChannel: "Canal",
            channelPhone: "Appel",
            channelWA: "WhatsApp",
            channelSMS: "SMS",
            channelEmail: "Email",
            channelVisit: "Visite",
            journalOutcome: "Résultat",
            outNoAnswer: "Pas de réponse",
            outVoicemail: "Messagerie vocale",
            outAgreed: "Contacté - D'accord",
            outDeclined: "Contacté - Refus / Non intéressé",
            outInvalid: "Numéro invalide",
            journalNotes: "Notes (optionnel)",
            journalNotesPlaceholder: "Détails de l'échange...",
            journalSave: "Enregistrer la tentative",
            journalSaving: "Enregistrement...",
            toastSuccess: "Tâche complétée avec succès",
            toastAttempt: "Tentative enregistrée",
            loading: "Chargement...",
            title: "Suivis Post-Opératoires",
            subtitle:
                "L'IA prend des nouvelles de vos patients automatiquement après leurs interventions.",
        },
        recoveryPage: {
            title: "Récupération patients",
            subtitle: "Identifiez automatiquement les patients que votre cabinet risque de perdre.",
            detect: "Détecter",
            launchCampaign: "Lancer une campagne",
            analyzed: "Patients analysés",
            toRecover: "À récupérer",
            contacted: "Contactés",
            replied: "Ont répondu",
            recoveredAppts: "RDV récupérés",
            completed: "Venus au cabinet",
            estimatedValue: "Valeur estimée",
            bookedValue: "Valeur réservée",
            recoveredValue: "Valeur récupérée",
            funnelTitle: "Entonnoir de récupération",
            funnelSubtitle: "Performance globale",
            funnelIdentified: "Patients identifiés",
            funnelContacted: "Contactés",
            funnelReplied: "Ont répondu",
            funnelBooked: "Rendez-vous pris",
            funnelVisited: "Venus au cabinet",
            opportunitiesTitle: "Opportunités de récupération",
            opportunitiesSubtitle: "{count} opportunités identifiées",
            campaigns: "Campagnes",
            colPatient: "Patient",
            colType: "Type",
            colReason: "Raison",
            colPriority: "Priorité",
            colEstValue: "Valeur est.",
            colStatus: "Statut",
            colDetectedOn: "Détecté le",
            unknownPatient: "Patient inconnu",
            viewBtn: "Voir",
            errorLoading: "Impossible de charger les opportunités.",
            noOpportunities:
                'Aucune opportunité de récupération. Cliquez sur "Détecter" pour analyser vos patients.',
            typeInactive: "Patient inactif",
            typeInterrupted: "Traitement interrompu",
            typePendingQuote: "Devis en attente",
            typeNoShow: "Rendez-vous manqué",
            typeCancellation: "Annulation",
            typeOverdue: "Contrôle dépassé",
            typeFollowUp: "Suivi",
            statusIdentified: "Identifié",
            statusQueued: "En file",
            statusContacted: "Contacté",
            statusResponded: "A répondu",
            statusBooked: "RDV pris",
            statusVisited: "Venu",
            statusNoResponse: "Sans réponse",
            statusDismissed: "Écarté",
            detectionComplete: "Détection terminée. {count} opportunités créées.",
            detectionError: "Erreur lors de la détection.",
        },
        login: {
            title: "Bon retour parmi nous",
            subtitle: "Connectez-vous à l'espace de votre cabinet médical ou clinique.",
            email: "Adresse email",
            password: "Mot de passe",
            forgot_password: "Mot de passe oublié ?",
            submit: "Se connecter",
            loading: "Connexion en cours...",
            error_default: "Erreur de connexion.",
            back: "Retour au site",
        },
        landing: {
            hero: {
                chip1: "Assistant en ligne 24/7",
                chip2: "Escalade humaine intégrée",
                title1: "Votre cabinet",
                title2: "ne dort",
                title3: "plus jamais.",
                subtitle:
                    "Une plateforme clinique qui relie agenda, dossiers patients, équipe et WhatsApp. Une IA qui travaille pour votre cabinet, dans des limites que vous contrôlez.",
                cta1: "Accéder à mon espace",
                cta2: "Voir comment vos données sont protégées",
            },
            pipeline: {
                kicker: "Ce qui se passe derrière un message",
                title: "Un message, six contrôles.",
                subtitle:
                    "Chaque demande WhatsApp traverse les mêmes garde-fous avant qu'une action ne soit réalisée. Quand le sujet est médical, l'IA s'arrête et passe la main à votre équipe.",
            },
            gates: {
                msg_received: "Message Reçu",
                msg_received_desc: "Réception instantanée",
                context_isolated: "Contexte Isolé",
                context_isolated_desc: "Séparation par cabinet",
                intent_understood: "Intention Comprise",
                intent_understood_desc: "Langues multiples & RDV",
                ai_guardrail: "Garde-fou Médical",
                ai_guardrail_desc: "L'IA s'arrête en cas d'urgence",
                slot_validated: "Créneau Validé",
                slot_validated_desc: "Vérification de l'agenda",
                waitlist_check: "Gestion Liste d'attente",
                waitlist_check_desc: "Récupération des désistements",
                reminders: "Rappels Intelligents",
                reminders_desc: "Relance 24h avant le RDV",
                confirmation: "Confirmation & Sync",
                confirmation_desc: "Synchronisation sans intervention",
                escalation: "Escalade Humaine",
            },
            scenarios: {
                tab1: "Nouveau Patient",
                msg1_1: "Bonjour, je voudrais prendre un RDV.",
                reply1_1: "Bonjour ! Je suis l'assistant médical. Pourriez-vous me préciser le motif de votre visite ?",
                msg1_2: "C'est pour un contrôle de routine.",
                reply1_2: "Parfait. J'ai des disponibilités jeudi à 14h ou vendredi à 10h. Quel horaire vous convient le mieux ?",
                tab2: "Patient Existant",
                msg2_1: "Je veux annuler mon RDV de demain.",
                reply2_1: "C'est noté, votre rendez-vous de demain est annulé. Voulez-vous le replanifier pour la semaine prochaine ?",
                msg2_2: "Non merci. Au fait, j'ai très mal au cœur depuis ce matin.",
                reply2_2: "Je détecte une urgence médicale possible. Je transfère immédiatement votre message à l'équipe médicale du cabinet.",
            },
            security: {
                kicker: "Sécurité & Conformité",
                title: "Vos données sont blindées.",
                subtitle:
                    "Notre infrastructure garantit la confidentialité totale des dossiers patients et des conversations.",
                disclaimer: "Conforme aux normes de sécurité internationales.",
                layers: {
                    access: {
                        title: "Accès Sécurisé",
                        desc: "Authentification robuste garantissant que seuls les membres autorisés accèdent à votre espace.",
                    },
                    tenant: {
                        title: "Isolation des données",
                        desc: "Les données de votre clinique sont strictement séparées de celles des autres.",
                    },
                    validation: {
                        title: "Validation stricte",
                        desc: "Toute donnée entrante est scrupuleusement vérifiée avant d'être traitée par le système.",
                    },
                    idempotent: {
                        title: "Idempotence",
                        desc: "Les requêtes sont gérées de manière à éviter toute action ou création de doublons.",
                    },
                    ai_limits: {
                        title: "Limites IA",
                        desc: "L'intelligence artificielle est bridée et s'arrête face à toute situation médicale complexe.",
                    },
                    traceability: {
                        title: "Traçabilité",
                        desc: "L'ensemble des actions et modifications est enregistré pour un audit transparent.",
                    },
                    permissions: {
                        title: "Permissions",
                        desc: "Définissez précisément qui peut voir et modifier quelles informations dans votre cabinet.",
                    },
                },
            },
            features: {
                kicker: "Fonctionnalités",
                title: "Tout pour votre clinique",
                subtitle: "Automatisez les tâches chronophages et concentrez-vous sur vos patients.",
                items: {
                    assistant: {
                        title: "Assistant WhatsApp IA",
                        desc: "Répond 24/7 aux demandes courantes.",
                    },
                    multilingual: {
                        title: "Multilingue",
                        desc: "Parle Français, Anglais et Arabe couramment.",
                    },
                    record: {
                        title: "Dossier Patient",
                        desc: "Historique centralisé des échanges et RDVs.",
                    },
                    modify: {
                        title: "Gestion Autonome",
                        desc: "Le patient annule ou reporte seul.",
                    },
                    family: {
                        title: "Gestion Familiale",
                        desc: "Prise de RDV pour des proches.",
                    },
                    calendar: {
                        title: "Agenda Intelligent",
                        desc: "Synchronisation parfaite.",
                    },
                    queue: {
                        title: "Liste d'attente",
                        desc: "Remplacement automatique des annulations.",
                    },
                    reminders: {
                        title: "Rappels SMS/WA",
                        desc: "Réduit les absences.",
                    },
                    followup: {
                        title: "Suivi Post-Op",
                        desc: "Prend des nouvelles automatiquement.",
                    },
                    specialty: {
                        title: "Spécialités",
                        desc: "S'adapte à votre pratique.",
                    },
                    analytics: {
                        title: "Statistiques",
                        desc: "Suivez vos performances.",
                    },
                    team: {
                        title: "Travail d'équipe",
                        desc: "Collaboration simplifiée.",
                    },
                },
            },
            pricing: {
                title: "Des tarifs simples.",
                subtitle: "Choisissez le plan adapté à votre pratique.",
            },
            plans: {
                popular: "Populaire",
                starter: {
                    tagline: "Pour les cabinets individuels",
                    f1: "Agenda Intelligent",
                    f2: "Assistant IA basique",
                    f3: "Dossiers patients",
                    f4: "Support email",
                    cta: "Commencer",
                },
                pro: {
                    tagline: "Pour les cliniques en croissance",
                    f1: "Tout du Starter",
                    f2: "Liste d'attente IA",
                    f3: "Suivi Post-Op",
                    f4: "Multilingue avancé",
                    f5: "Support prioritaire",
                    cta: "Essai gratuit",
                },
                enterprise: {
                    tagline: "Sur mesure",
                    f1: "Tout du Pro",
                    f2: "Marque blanche",
                    f3: "Intégration API",
                    f4: "Serveur dédié",
                    f5: "Account Manager",
                    cta: "Nous contacter",
                },
            },
            compliance: {
                rgpd: {
                    title: "Sécurité & Conformité (HDS / RGPD)",
                    i1: { strong: "Chiffrement de bout en bout", text: "Données chiffrées au repos et en transit." },
                    i2: { strong: "Hébergement certifié HDS", text: "Serveurs agréés Données de Santé en Europe." },
                    i3: { strong: "Secret médical absolu", text: "Traçabilité stricte et accès verrouillés (RGPD/HIPAA)." },
                    i4: { strong: "Zéro revente de données", text: "Vos données et celles des patients vous appartiennent à 100%." }
                },
                na: {
                    title: "Fiabilité & IA Contrôlée",
                    i1: { strong: "Zéro Hallucination", text: "L'IA ne pose aucun diagnostic et ne donne aucun avis médical." },
                    i2: { strong: "Limites strictes", text: "L'assistant s'en tient uniquement aux règles que vous définissez." },
                    i3: { strong: "Double confirmation", text: "Vérification stricte avant toute annulation de rendez-vous." },
                    i4: { strong: "Escalade humaine", text: "Redirection automatique vers le secrétariat en cas de doute ou d'urgence." }
                }
            },
            patient_record: {
                kicker: "Dossier Médical",
                title: "Une vue 360° du patient.",
                subtitle: "Retrouvez tout l'historique en un clin d'œil.",
                bullets: {
                    "0": "Historique des rendez-vous",
                    "1": "Conversations WhatsApp",
                    "2": "Documents partagés",
                    "3": "Notes internes",
                },
                demo: {
                    title: "Dossier Patient",
                    subtitle: "Aperçu de l'interface",
                    bp: "Tension Artérielle",
                    bp_status: "Normale",
                    hr: "Fréquence Cardiaque",
                    hr_status: "Régulier",
                },
            },
            cta: {
                title: "Prêt à transformer votre cabinet ?",
                now: "Démarrer maintenant",
            },
            footer: {
                desc: "La plateforme de gestion clinique propulsée par l'IA.",
                product: "Produit",
                demo: "Démo",
                company: "Entreprise",
                about: "À propos",
                contact: "Contact",
                legal: "Légal",
                security_privacy: "Sécurité & Confidentialité",
                terms: "CGV",
                copyright: "© 2026 Sanovia AI. Tous droits réservés.",
                subModalTitle: "Demande d'abonnement",
                subModalDesc: "Vous avez choisi le plan",
                subModalDesc2: ". Veuillez remplir ce formulaire et nous vous contacterons avec les instructions de paiement (RIB).",
                subName: "Nom complet *",
                subNamePlaceholder: "Dr. Foulen Ben Foulen",
                subEmail: "Email *",
                subEmailPlaceholder: "doc@clinique.com",
                subPhone: "Téléphone *",
                subPhonePlaceholder: "+216 20 000 000",
                subCountry: "Pays *",
                subCountrySearch: "Rechercher un pays...",
                subCountryEmpty: "Aucun pays trouvé.",
                subMessage: "Demande spécifique (Optionnel)",
                subMessagePlaceholder: "J'aimerais payer par virement bancaire...",
                subCancel: "Annuler",
                subSubmit: "Envoyer la demande",
                subSubmitting: "Envoi en cours...",
                subSuccess: "Demande d'abonnement envoyée avec succès !",
                subError: "Erreur lors de l'envoi de la demande.",

                country: "Tunisie",
            },
        },
        noShowsPage: {
            viewAgenda: "Voir l'Agenda",
            recoveryModule: "Module de Récupération IA",
            absencesToday: "Absences du jour",
            missedToday: "Rendez-vous manqués aujourd'hui",
            thisWeek: "Cette semaine",
            weekTotal: "Cumul de la semaine en cours",
            recoveredPatients: "Patients Récupérés",
            recoveredDesc: "RDV repris suite à la relance WhatsApp",
            recoveryRate: "Taux de Récupération",
            recoveryRateDesc: "Absences converties en nouveaux RDV",
            historyTitle: "Historique des Rendez-vous Manqués",
            historyDesc:
                "Chaque absence déclenche automatiquement une opportunité de récupération via WhatsApp.",
            filterAll: "Tous",
            filterToday: "Aujourd'hui",
            filterPending: "En attente de relance",
            searchPlaceholder: "Rechercher un patient, un soin...",
            loading: "Chargement des absences...",
            errorLoading: "Une erreur est survenue lors du chargement des données.",
            noAbsencesTitle: "Aucune absence trouvée",
            noAbsencesDescFilter: "Aucun résultat ne correspond à vos critères de recherche.",
            noAbsencesDesc: "Félicitations ! Aucun rendez-vous manqué n'a été enregistré.",
            colPatient: "Patient",
            colDate: "Date du RDV",
            colSlot: "Créneau",
            colTreatment: "Motif de consultation",
            colScore: "Score d'Absence",
            colStatus: "Statut Relance WhatsApp",
            colActions: "Actions Rapides",
            statusIdentified: "⏳ Relance en attente",
            statusContacted: "💬 Contacté par WhatsApp",
            statusResponded: "📩 A répondu à l'IA",
            statusBooked: "🎉 RDV Reprogrammé",
            statusVisited: "🏥 Venu au cabinet",
            statusNoResponse: "❌ Sans Réponse",
            statusDismissed: "🚫 Ignoré",
            firstAbsence: "1ère absence",
            multipleAbsences: "{count} absences",
            btnWhatsApp: "WhatsApp",
            btnReschedule: "Reprogrammer",
            btnRecord: "Dossier",
        },
    },
    en: {


        featuresPage: {
            badge: "Features & Benefits",
            title: "Everything your clinic needs, automated.",
            subtitle: "Sanovia AI isn't just a gadget. It's a full-fledged team member working 24/7 to improve patient experience and maximize your revenue.",
            feat1Title: "AI-Powered Appointment Booking",
            feat1Desc: "The AI chats with the patient, understands their needs, checks your availability, and books the perfect slot. Works 24/7 on WhatsApp and Phone.",
            feat2Title: "Automated Reminders & No-Shows",
            feat2Desc: "Automatic reminder sending. If a patient cancels, the AI instantly contacts patients on the waitlist to fill the gap.",
            feat3Title: "Smart Medical Triage",
            feat3Desc: "Asks the right questions (symptoms, urgency) before the consultation so the doctor is prepared. Redirects absolute emergencies to 911.",
            feat4Title: "Post-Operative Follow-up",
            feat4Desc: "The assistant checks in on your patients after a procedure and alerts you if any complications are reported.",
            feat5Title: "Waitlist Management",
            feat5Desc: "Patients can join a waitlist. As soon as a slot opens up, the AI automatically offers it to them.",
            feat6Title: "Time Saving for the Secretariat",
            feat6Desc: "Filter out 80% of unnecessary calls. Let your secretaries focus on physical reception and complex cases.",
            ctaTitle: "Ready to transform your practice?",
            ctaDesc: "Join dozens of doctors who already use Sanovia AI to relieve their secretariat."
        },
        waAssistantPage: {
            badge: "WhatsApp Virtual Assistant",
            title: "Delegate your WhatsApp line to Artificial Intelligence.",
            subtitle: "Never miss a patient again. Our assistant qualifies requests, checks your availability, and schedules appointments directly in your calendar, day and night.",
            heroList1: "Responds in under 2 seconds",
            heroList2: "Understands natural language (voice and text)",
            heroList3: "Multilingual (Arabic, French, English)",
            cta1: "Try for free",
            chat1: "Hello! I am Dr. Martin's assistant. How can I help you today?",
            chat2: "I'd like to book an appointment for a check-up.",
            chat3: "Great! Dr. Martin has availability tomorrow at 10:00 AM or 2:30 PM. Which time do you prefer?",
            featuresTitle: "Why our clients love the WhatsApp Assistant",
            ben1Title: "24/7 Appointment Booking",
            ben1Desc: "The assistant identifies the patient's needs and suggests the perfect time slot right in the chat.",
            ben2Title: "Smart Triage",
            ben2Desc: "Filters emergencies from simple administrative questions to save your secretary time.",
            ben3Title: "No-Show Reduction",
            ben3Desc: "Automated reminders on WhatsApp with 1-click confirm, reschedule, or cancel options.",
            ben4Title: "Guaranteed Privacy",
            ben4Desc: "End-to-end encrypted communication via official Meta API. Zero external conversation storage."
        },
        securityPage: {
            badge: "Security & Privacy",
            title: "A SaaS architecture designed to protect each clinic's workspace.",
            subtitle: "At Sanovia AI, we make no compromises on the confidentiality of medical data. Our infrastructure is built on rigorous standards of isolation, encryption, and traceability.",
            feat1Title: "Multi-tenant logical isolation",
            feat1Desc: "Each clinic has its own logically isolated data space. No data is shared between tenants.",
            feat2Title: "Authentication & RBAC",
            feat2Desc: "Role-Based Access Control (RBAC). Secretaries and doctors have strictly delimited permissions.",
            feat3Title: "Encryption in transit",
            feat3Desc: "All communications between clinics, our servers, and third-party APIs are encrypted via TLS 1.2+.",
            feat4Title: "Webhook signatures",
            feat4Desc: "Requests coming from WhatsApp and other integrations are systematically verified via cryptographic signatures.",
            feat5Title: "Idempotency & Outbox",
            feat5Desc: "Strict idempotency mechanisms for webhooks and async jobs, ensuring no action (like sending a message) is duplicated.",
            feat6Title: "Backups & Retention",
            feat6Desc: "Regular automated backups. Conversation data is retained according to medical standards and can be purged upon request.",
            feat7Title: "Audit Logging",
            feat7Desc: "Complete traceability of critical actions (logins, data exports, settings changes) stored in immutable logs.",
            feat8Title: "Incident Response",
            feat8Desc: "Documented incident response process and proactive monitoring of access anomalies.",
            depsTitle: "Data Location & Dependencies",
            depsSubtitle: "We are transparent about our technical architecture. Patient data is transmitted and stored using trusted, globally recognized, and certified partners.",
            dep1Name: "MongoDB Atlas",
            dep1Desc: "Secure database hosting with encryption at rest.",
            dep2Name: "Meta WhatsApp API",
            dep2Desc: "End-to-end encrypted communication channel between Meta and our servers.",
            dep3Name: "AI Providers",
            dep3Desc: "Enterprise AI models without training on your health data (Zero-Data Retention Policy).",
            storageTitle: "Data Storage",
            storageDesc: "Depending on your region and applicable legislation, Sanovia AI databases are provisioned on geographically isolated servers to ensure data sovereignty.",
            storageNotice: "Current status: The mechanisms described are implemented in production. Our formal certification processes are currently being validated according to international standards. Sanovia AI does not provide medical diagnoses.",
            footer: "Medical practice management platform."
        },
        settingsPage: {
            aiSettingsTitle: "Advanced AI Settings",
            globalConfig: "Global Configuration",
            goToAiAssistantDesc:
                "For the configuration of capabilities, languages, and response mode, please go to the AI Assistant page.",
            goToAiAssistantBtn: "Go to AI Assistant",
            commChannelsTitle: "Communication Channels",
            waMainChannelDesc: "Main channel for AI and follow-ups.",
            smsConfirmDesc: "Used for D-1 confirmations if WhatsApp is unavailable.",
            emailDocsDesc: "For sending quotes and PDF documents.",
            securityAuditTitle: "Security & Audit",
            securityAuditSubtitle: "Traceability of health data access (GDPR/HIPAA Compliance).",
            eventLogTitle: "Event Log",
            thDate: "Date",
            thUser: "User",
            thAction: "Action",
            thResource: "Resource",
            thIpAddress: "IP Address",
            loadingAudit: "Loading audit logs...",
            noAuditFound: "No audit log found.",
            pageXofY: "Page {page} of {totalPages}",
            btnPrev: "Previous",
            btnNext: "Next",
            integrationsTitle: "Integrations",
            integrationsSubtitle: "Connect Sanovia AI to your tools.",
            metaConfigServer: "Meta configuration managed server-side.",
            aiProviderEnv: "Configuration via backend environment variables.",
            aiProvider: "AI Provider",
            serverConfig: "Server configuration",
            notAvailable: "Not available",
            managedServerSide: "Managed server-side",
        },
        catalogPage: {
            toastSuccess: "Catalog updated successfully!",
            title: "Services Catalog",
            btnAdd: "Add a service",
            sectionTitle: "Services & Consultations",
            sectionDesc: "These services will be proposed by the AI Assistant when booking appointments.",
            noServicesTitle: "No service defined",
            noServicesDesc: "Add services so the AI can propose slots of appropriate duration.",
            colService: "Service",
            colDuration: "Duration",
            colPrice: "Indicative Price",
            colActions: "Actions",
            durationMin: "min",
            onEstimate: "On estimate",
            confirmDelete: "Are you sure you want to delete this service from the catalog?",
            modalEdit: "Edit service",
            modalNew: "New service",
            labelName: "Service name *",
            placeName: "Ex: Dental Consultation",
            labelDuration: "Duration (minutes) *",
            labelPrice: "Price ({currency})",
            placePrice: "0 for 'On estimate'",
            labelDesc: "Description / AI Instructions",
            placeDesc: "Ex: Routine care, check medical history...",
            btnCancel: "Cancel",
            btnSave: "Save",
        },
        revenuePage: {
            title: "Revenue Recovery",
            subtitle: "Measure appointments and opportunities recovered thanks to Sanovia AI.",
            errorLoading: "Unable to load revenue data.",
            loading: "Loading...",
            statRecoveredAppts: "Recovered Appts (Visited)",
            hintTotalRecovered: "Total recovered",
            statBookedAppts: "Accepted Treatments",
            hintApptsBooked: "Appts booked",
            estimatedValue: "Estimated Recovered Value",
            potentialValue: "Remaining potential to recover: ",
            timelineTitle: "Recovery Timeline",
            timelineDesc: "Recent history of generated gains",
            noHistory: "No recent history.",
        },
        analyticsPage: {
            title: "Analytics",
            subtitle: "Track your clinic's performance and AI impact (last 30 days).",
            subtitleError: "Track your clinic's performance and AI impact.",
            errorTitle: "Loading Error",
            errorDesc: "Unable to load analytics statistics at the moment.",
            statRecoveryRate: "Recovery Rate",
            statNoShow: "No-Show Rate",
            statNoShowRecovery: "No-Show Recovery",
            statWaitlist: "Waitlist Filling",
            statActiveFollowUps: "Active Follow-ups",
            chartAppointmentsTitle: "Appointments & Recoveries",
            chartAppointmentsDesc: "Evolution over the last 6 months",
            chartInactiveTitle: "Reactivation of Inactive Patients",
            chartInactiveDesc: "Patients who haven't visited in > 6 months",
            chartLostTitle: "Where your clinic loses opportunities",
            noData: "No data",
            loading: "...",
        },
        conversationsPage: {
            title: "Inbox & WhatsApp AI Chatbot",
            subtitle: "Manage conversations and test the WhatsApp AI in real time.",
            live: "Live 24/7",
            hideSimulator: "Hide Simulator",
            openSimulator: "📱 Open Patient Simulator",
            viewAgenda: "View agenda",
            searchPlaceholder: "Search by name, phone...",
            filterAll: "All",
            filterAi: "AI",
            filterHuman: "Human Required",
            loadingConvs: "Loading conversations...",
            noConvs: "No conversations yet.",
            humanRequired: "Human Intervention Required",
            aiHandled: "Handled by AI",
            patientRecord: "Open patient record",
            whatsappBusiness: "WhatsApp Business API",
            loadPrevMsgs: "Load previous messages",
            loadingMsgs: "Loading...",
            noMsgsTitle: "No messages",
            noMsgsDesc: "This conversation is empty or could not be loaded.",
            typeMsg: "Type a message as the clinic...",
            whatsappSimulator: "WhatsApp Simulator (Patient Test)",
            simDesc:
                "Test the AI in real time. Put yourself in the patient's shoes and send messages to see how the assistant reacts.",
            online: "online",
            patientId: "ID:",
            simNewConv: "Simulate a new patient",
            quickScenarios: "Quick scenarios to test:",
            scenario1Label: "📅 Appt",
            scenario1Text: "Hello, I want to book an appointment for scaling this week.",
            scenario2Label: "⏱️ Confirm",
            scenario2Text: "Perfect, 11:30 works for me! I confirm.",
            scenario3Label: "🚨 Emergency",
            scenario3Text:
                "Doctor, I have a terrible toothache since this morning. Can you see me urgently?",
            scenario4Label: "💰 Prices",
            scenario4Text: "Hello, what is the price for an implant or whitening?",
            scenario5Label: "🧑‍⚕️ Doctor",
            scenario5Text: "I want to talk directly to the doctor about my treatment yesterday.",
            clearSim: "Clear test conversation",
            simWarning: "You are simulating the patient with the fake number :",
            simulatorSubtitle: "WhatsApp Simulator",
            directTestMode: "Direct test mode",
            simPatientLabel: "Simulated patient:",
            simPatientUnknown: "Unknown patient",
            clinicName: "Your Clinic",
            onlineStatus: "online",
            welcomeMsg: "Welcome message",
            writeAsPatient: "Write as patient...",
            suggestionSuccess: "Suggestion copied!",
            suggestionError: "Suggestion error",
            sendError: "Send error",
            simSuccess: "Test message sent!",
            simError: "Simulation error",
            patient: "Patient",
            aiBot: "AI Bot",
            received: "Received",
            delivered: "Delivered",
            writeManualReply: "Write a manual reply...",
            aiTip: "AI is automatically handling this conversation.",
            enterToSend: "Press Enter to send",
            selectConvTitle: "Select a conversation",
            selectConvDesc: "Choose a conversation on the left or start a test in the simulator.",
            simulatorTitle: "WhatsApp Simulator",
        },
        nav: {
            workspace: "Workspace",
            automation: "Automation",
            insights: "Insights",
            settings: "Settings",
            dashboard: "Dashboard",
            agenda: "Calendar",
            patients: "Patients",
            conversations: "Conversations",
            recovery: "Recovery",
            aiAssistant: "AI Assistant",
            followups: "Post-Op Follow-ups",
            waitlist: "Waitlist",
            noShows: "No Shows",
            analytics: "Analytics",
            revenue: "Revenue",
            clinic: "Clinic",
            team: "Team",
            aiSettings: "AI Settings",
            communication: "Communication",
            integrations: "Integrations",
            catalog: "Service Catalog",
            securityAndAudit: "Security & Audit",
            patientRecovery: "Patient Recovery",
            features: "Features",
            security: "Security",
            pricing: "Pricing",
            login: "Login",
            start: "Get Started",
        },
        pages: {
            aiAssistantTitle: "AI Assistant",
            aiAssistantSubtitle: "Configure your virtual assistant",
            followupsTitle: "Post-Op Follow-ups",
            followupsSubtitle: "Monitor your patients' status",
            waitlistTitle: "Waitlist",
            waitlistSubtitle: "Manage waiting patients",
            noShowsTitle: "No Shows",
            noShowsSubtitle: "Manage absences and cancellations",
            analyticsTitle: "Analytics",
            analyticsSubtitle: "Track your clinic's performance and the impact of AI.",
            revenueTitle: "Revenue & Profitability",
            revenueSubtitle: "Track your revenue evolution, unpaid bills, and AI ROI.",
            conversationsTitle: "Conversations",
            conversationsSubtitle: "Manage patient communications",
        },
        topbar: {
            searchPlaceholder: "Search patient, appointment…",
            notifications: "Notifications",
            markAllRead: "Mark all as read",
            noNotifications: "No notifications",
            help: "Help",
            gettingStarted: "Getting Started Guide",
            howRecoveryWorks: "How patient recovery works",
            contactSupport: "Contact Support",
            currentClinic: "Active Clinic",
            active: "Active",
            interfaceLanguage: "Interface Language",
            clinicSettings: "Clinic Settings",
            team: "Team",
            logout: "Log out",

            guideModalTitle: "Getting Started Guide 🚀",
            guideModalDesc: "Welcome to the future of clinic management.",
            guideSection1Title: "🌟 Groundbreaking Features for your Patients",
            guideSection1Desc: "The patient experience has never been smoother. On WhatsApp, your AI interacts as naturally as a real human assistant:",
            guideFeat1Title: "Smart Appointment Booking",
            guideFeat1Desc: "The patient requests a slot, the AI checks availability, assesses urgency, and books it directly.",
            guideFeat2Title: "Family Management",
            guideFeat2Desc: "A patient can book for themselves, a relative, or a child. The AI understands the context.",
            guideFeat3Title: "Medical Record Follow-up",
            guideFeat3Desc: "The AI answers patient questions regarding their medical file or post-op instructions.",
            guideFeat4Title: "Multilingual & Natural",
            guideFeat4Desc: "Adapts to the tone and language of your patient (French, English, Arabic...) to build trust.",
            guideSection2Title: "⚙️ Initial Setup",
            guideSection2Desc: "For the AI to work, it just needs to know your house rules.",
            guideConfig1: "1. Clinic Settings: Your contact info and opening hours.",
            guideConfig2: "2. Team: Add your staff with an ultra-secure role system.",
            guideConfig3: "3. AI Assistant: Set up your services catalog (duration, price) and your guidelines.",
            guideSection3Title: "2️⃣ Monitor Conversations & Intervene",
            guideSection3Desc: "Go to the Conversations tab to monitor AI activity.",
            guideSup1Title: "100% Automatic:",
            guideSup1Desc: "In most cases, the AI qualifies the need and confirms the appointment without your intervention.",
            guideSup2Title: "Smart Human Escalation:",
            guideSup2Desc: "The AI detects its limits and hands over to you (with a visual alert) in specific cases:",
            guideSup2Bul1: "Purely medical questions (diagnostics, complex symptoms).",
            guideSup2Bul2: "Heavy quote requests (implants, full orthodontics).",
            guideSup2Bul3: "Frustrated or dissatisfied patients.",
            guideSup2Bul4: "Misunderstanding or doubt by the AI.",
            guideSup3Title: "Real-time Supervision:",
            guideSup3Desc: "You can read everything live. If escalated, the front desk or doctor seamlessly takes over.",
            recoveryModalTitle: "How does recovery work? 💸",
            recoveryModalDesc: "The Revenue Recovery engine of your AI.",
            recoveryIntro: "This is where your AI becomes a revenue generator. It tracks every lost opportunity to turn it into a confirmed appointment, without you doing anything.",
            recoverySec1Title: "1. No-Show Shield",
            recoverySec1Bul1Title: "Detection:",
            recoverySec1Bul1Desc: "When a patient cancels last minute or doesn't show up.",
            recoverySec1Bul2Title: "Immediate Action:",
            recoverySec1Bul2Desc: "The AI contacts them automatically via WhatsApp kindly to understand why and offer to reschedule.",
            recoverySec1Bul3Title: "Instant Refill (Waitlist):",
            recoverySec1Bul3Desc: "If a slot opens today, the AI instantly contacts patients on your Waitlist. Your calendar stays full!",
            recoverySec2Title: "2. Follow-up Campaigns",
            recoverySec2Desc: "The AI handles 5 types of proactive follow-ups so you never lose a patient:",
            recoverySec2Bul1Title: "Absences & Cancellations:",
            recoverySec2Bul1Desc: "Immediate rescheduling.",
            recoverySec2Bul2Title: "Slot Proposal:",
            recoverySec2Bul2Desc: "Sends alerts to the Waitlist.",
            recoverySec2Bul3Title: "Check-up Reminder:",
            recoverySec2Bul3Desc: "Automatically calls in patients for their annual/semi-annual checkup.",
            recoverySec2Bul4Title: "Re-engagement:",
            recoverySec2Bul4Desc: "Kindly reaches out to long-inactive patients.",
            recoveryTip: "💡 Pro Tip: Track AI performance (Revenue Saved, Hours Saved) in real-time in Insights > Revenue.",
            supportModalTitle: "Contact Support 📞",
            supportModalDesc: "We are here to help you.",
            supportEmail: "Email",
            supportPhoneTitle: "WhatsApp Direct",
            supportPhoneDesc: "+216 XX XXX XXX (9 AM - 6 PM)",
            supportClose: "Close",

        },
        clinicSettings: {
            title: "Clinic Settings",
            subtitle:
                "Manage official contact details, specialty, and public information for your practice.",
            save: "Save changes",
            saving: "Saving...",
            generalInfo: "General Information",
            generalInfoDesc:
                "These details are used by the AI to guide patients and format WhatsApp confirmation messages.",
            clinicName: "Clinic / Practice Name",
            clinicNamePlaceholder: "E.g. Dr. Sami Ben Amor Medical Clinic",
            specialty: "Medical Specialty",
            specialtyPlaceholder: "E.g. Cardiology, Dental Care, Pediatrics, General Medicine...",
            address: "Full Address",
            addressPlaceholder: "E.g. Coral Building, 2nd Floor, Les Berges du Lac 2, Tunis",
            currencies: {
                label: "Currency",
                placeholder: "Search currency...",
                notFound: "No currency found.",
                list: [
                    { value: "TND", label: "TND - Tunisian Dinar" },
                    { value: "EUR", label: "EUR - Euro" },
                    { value: "USD", label: "USD - US Dollar" },
                    { value: "CAD", label: "CAD - Canadian Dollar" },
                    { value: "DZD", label: "DZD - Algerian Dinar" },
                    { value: "MAD", label: "MAD - Moroccan Dirham" },
                    { value: "SAR", label: "SAR - Saudi Riyal" },
                    { value: "AED", label: "AED - UAE Dirham" },
                    { value: "GBP", label: "GBP - British Pound" },
                    { value: "CHF", label: "CHF - Swiss Franc" },
                ]
            },
            phone: "Official Phone Number",
            phonePlaceholder: "E.g. +216 71 962 480",
            email: "Practice Email",
            emailPlaceholder: "E.g. contact@clinic-medical.tn",
            businessHours: "Working Hours & Schedule",
            businessHoursDesc: "Set the clinic operating hours used for appointment booking.",
            openingHours: "Opening Hours",
            openingHoursPlaceholder: "E.g. Monday to Friday 08:30 - 18:00, Saturday 08:30 - 13:00",
            savedSuccess: "Clinic details saved successfully!",
            saveError: "Failed to update clinic settings.",
            activeBadge: "Active Clinic Account",
            verifiedClinic: "Verified clinic & synchronized with AI",
            quickStats: "Overview",
            plan: "Pro Plan",
        },
        teamSettings: {
            title: "Team & Access Control",
            subtitle:
                "Manage practice staff (doctors, secretaries, assistants) and configure their granular module permissions.",
            addMember: "Add Team Member",
            editMember: "Edit Member & Access",
            deleteMember: "Delete Member",
            deleteConfirm: "Are you sure you want to remove this member from the team?",
            totalMembers: "Total Team",
            doctorsCount: "Doctors & Practitioners",
            staffCount: "Staff & Assistants",
            activeAccounts: "Active Accounts",
            memberList: "Practice Members",
            memberListDesc: "List of users with authorized access to your clinic workspace.",
            permissionsTitle: "Permissions & Privileges",
            permissionsDesc: "Configure precisely what this staff member can access and perform.",
            firstName: "First Name",
            lastName: "Last Name",
            email: "Work Email",
            phone: "Phone Number",
            specialty: "Title / Specialty",
            role: "Role in Practice",
            password: "Initial Password",
            passwordPlaceholder: "Leave blank to auto-generate",
            status: "Account Status",
            active: "Active",
            inactive: "Inactive / Suspended",
            saveMember: "Save Member",
            saving: "Saving...",
            createdSuccess: "Team member added successfully!",
            updatedSuccess: "Member profile and permissions updated!",
            deletedSuccess: "Team member removed successfully.",
            statusUpdated: "Account status updated.",
            passwordResetSuccess: "Password reset successfully!",
            roles: {
                clinic_owner: "Lead Doctor / Owner",
                dentist: "Doctor / Practitioner",
                receptionist: "Secretary / Receptionist",
                assistant: "Medical Assistant",
                super_admin: "Super Administrator",
            },
            permissions: {
                appointmentsTitle: "📅 Schedule & Appointments",
                appointmentsDesc: "View agenda, create, reschedule, or cancel patient bookings.",
                patientsTitle: "👥 Patient Records",
                patientsDesc: "Access patient directory, medical histories, and notes.",
                conversationsTitle: "💬 WhatsApp & Live Chat",
                conversationsDesc: "Read patient WhatsApp messages and chat in real-time.",
                aiConfigTitle: "🤖 AI Assistant & Pricing",
                aiConfigDesc: "Modify AI doctor instructions, fees, and escalation triggers.",
                analyticsTitle: "📊 Revenue & Analytics",
                analyticsDesc: "View financial recovery dashboards and practice insights.",
                settingsTitle: "⚙️ Clinic & Team Settings",
                settingsDesc: "Edit clinic details and manage team user permissions.",
            },
        },
        common: {
            save: "Save",
            cancel: "Cancel",
            loading: "Loading...",
            success: "Success",
            error: "Error",
            active: "Active",
            inactive: "Inactive",
            edit: "Edit",
            delete: "Delete",
            actions: "Actions",
            resetPassword: "Reset Password",
            confirm: "Confirm",
        },
        patientsPage: {
            title: "Patients",
            subtitle: "{count} total patients",
            newPatient: "New patient",
            successAdd: "Patient added successfully.",
            errorAdd: "Error creating patient.",
            firstName: "First Name",
            lastName: "Last Name",
            firstNameEx: "E.g. John",
            lastNameEx: "E.g. Doe",
            phone: "Phone",
            email: "Email",
            emailOptional: "Optional",
            createPatient: "Create patient",
            searchPlaceholder: "Search by name, phone...",
            selected: "{count} selected",
            message: "Message",
            campaign: "Campaign",
            export: "Export",
            loadingPatients: "Loading patients...",
            errorLoading: "Could not load the patient list.",
            patient: "Patient",
            contact: "Contact",
            lastVisit: "Last visit",
            status: "Status",
            visits: "Visits",
            noPatientSearch: 'No patient found for "{query}".',
            noPatient: "No patients.",
        },
        agendaPage: {
            title: "Medical Agenda & Schedule",
            subtitleDay: "{date}",
            subtitleWeek: "Week of {start} to {end}",
            subtitleMonth: "Month of {month}",
            subtitleList: "Detailed Consultations List",
            today: "Today",
            day: "Day",
            week: "Week",
            month: "Month",
            list: "List",
            newAppointment: "New Appointment",
            planAppointment: "Schedule Appointment",
            selectPatient: "Select existing patient",
            date: "Date",
            startTime: "Start Time",
            treatment: "Treatment / Service",
            duration: "Estimated Duration",
            notes: "Notes & Instructions",
            notesPlaceholder: "E.g. First consultation...",
            cancel: "Cancel",
            save: "Save Appointment",
            statsTotal: "Total Consultations",
            statsConfirmed: "Confirmed",
            statsPending: "Pending",
            statsAi: "Booked by AI",
            statsRevenue: "Est. Revenue",
            searchPlaceholder: "Search patient, phone, treatment...",
            filterAll: "All",
            filterConfirmed: "Confirmed",
            filterScheduled: "Scheduled",
            filterCompleted: "Completed",
            filterCancelled: "Cancelled",
            filterNoShow: "🐰 No-Shows",
            sourceAll: "All Sources",
            sourceAi: "🤖 Booked by AI",
            sourceManual: "👤 Manual / Staff",
            treatmentsAll: "All Treatments",
            reset: "Reset",
            errorLoading: "Could not load agenda.",
            retry: "Retry",
            syncing: "Syncing medical schedule...",
            freeSlot: "Free slot — Click to book",
        },
        dashboardPage: {
            hello: "Hello {name} 👋",
            loadingError: "Loading Error",
            loadingErrorDesc: "Could not load the dashboard.",
            startRecovery: "Start Recovery",
            aiPerformance: "AI Performance",
            aiPerformanceDesc:
                "Your virtual assistant manages conversations autonomously, reduces no-shows, and recovers lost revenue with no human intervention.",
            automationRate: "Automation Rate",
            recoveredRevenue: "Recovered Revenue",
            last30days: "Last 30 days",
            apptsToday: "Appointments Today",
            confirmedAppts: "{count} confirmed",
            patientsToRecover: "Patients to Recover",
            thisMonth: "this month",
            recentNoShows: "Recent No-Shows",
            last7days: "Last 7 days",
            activeConversations: "Active Conversations",
            needsHuman: "{count} to process",
            todayAgenda: "Today's Agenda",
            plannedAppts: "{count} planned appointments",
            viewAgenda: "View agenda",
            noApptsToday: "No appointments today",
            unknownPatient: "Unknown patient",
            unspecifiedTreatment: "Unspecified treatment",
            aiPriorities: "AI Priorities",
            contactFirst: "Patients to contact first",
            seeAll: "See all",
            noPriority: "No priority patients",
            needsFollowup: "Follow-up needed",
            recoveryFunnel: "Recovery Funnel",
            noData: "No data",
            freeSlots: "Free Slots",
            fillWithWaitlist: "To be filled with waitlist",
            waitlist: "Waitlist",
            aiActivity: "AI Activity",
            last24h: "Last 24 hours",
            inbox: "Inbox",
            estimatedImpact: "Estimated Impact",
            simulationBased: "Simulation based on your local data",
            potentialRemaining: "Remaining potential to recover",
            messagesProcessed: "Messages automatically processed this month",
            apptsCreated: "Appointments created by AI this month",
            doctorPerformance: "Doctor Performance",
            thisWeek: "This week",
            weekOf: "Week of",
            headDoctor: "Head Doctor",
            attendance: "% presence",
            appointmentsAbbr: "Appts",
            patientsSeen: "Patients",
            noShows: "No-shows",
        },
        aiAssistantPage: {
            tabsPrompt: "Instructions",
            tabsServices: "Services & Duration",
            tabsRules: "Business Rules",
            tabsWhatsapp: "WhatsApp QR",
            openSimulator: "Open Simulator",
            saveChanges: "Save changes",
            servicesTitle: "Services Catalog & Consultation Duration",
            servicesDesc:
                "Configure the types of care provided at the clinic. AI automatically allocates continuous blocks of time corresponding to the exact duration of each service.",
            presetsHeader: "Quick preset by specialty:",
            presetsHint: "1 click to load",
            activeServices: "Active services (",
            addService: "Add a service",
            serviceNamePlaceholder: "Service name (e.g. Scaling)",
            serviceDescPlaceholder:
                "Description or guideline (e.g. 'Full checkup, ultrasonic scaling')...",
            agendaRulesTitle: "AI Agenda Rules",
            continuousAllocation: "Continuous slot allocation",
            allocationDesc1: "If a patient requests a service of ",
            allocationDesc2:
                " (e.g. Implant or surgery), the bot checks your agenda for a continuous block of ",
            allocationDesc3: " that is free and without overlap.",
            priceTransparency: "Indicative price transparency",
            priceTransparencyDesc:
                "The assistant only communicates the prices you have entered here. No made-up prices are shared with patients.",
            medicalGuardrails: "Medical Guardrails",
            guardrail1: "• The bot never gives a medical diagnosis.",
            guardrail2:
                "• Complex or personalized quotes are always referred to a clinical consultation.",
            promptTitle: "Custom Instructions (System Prompt)",
            promptDesc:
                "Provide the specific details of your clinic that the AI must always respect in every interaction.",
            promptLabel: "Directives and specific information of the practitioner",
            promptBadge: "Automatically injected into AI",
            promptPlaceholder:
                "E.g. Hello, I am Dr. ...'s assistant. Children are accepted from 6 years old. No checks.",
            modeTitle: "Operating Mode & Tone",
            modeAuto: "100% Autonomous Mode",
            modeAutoDesc: "AI books, modifies, and cancels directly in your agenda.",
            modeManual: "Manual Validation Mode",
            modeManualDesc: "AI suggests slots, but you validate before booking.",
            toneLabel: "Response Tone",
            toneFriendly: "Warm & Empathetic",
            toneProfessional: "Professional & Direct",
            rulesTitle: "Competence & Escalation Rules",
            rulesDesc:
                "Define exactly what the AI is allowed to do, and when it must immediately hand over to a human.",
            capabilitiesTitle: "Authorized Capabilities",
            capBooking: "Automatic Appointment Booking",
            capBookingDesc: "Allows AI to suggest and book slots.",
            capUrgency: "Emergency Handling (Filtering)",
            capUrgencyDesc: "Detects words like 'pain', 'emergency' and alerts.",
            capPricing: "Pricing Communication (Simple Quotes)",
            capPricingDesc: "Shares prices for standard services (Scaling, Consultation).",
            capMultilingual: "Automatic Multilingual",
            capMultilingualDesc: "Responds in French, Arabic, or English based on the patient.",
            escalationTitle: "Escalation Triggers (Handover to Human)",
            escMedical: "Purely Medical Questions",
            escMedicalDesc: "Hands over if the patient asks for clinical advice or diagnosis.",
            escFrustrated: "Frustrated or Aggressive Patient",
            escFrustratedDesc: "AI stays quiet and alerts the front desk if the tone escalates.",
            escQuote: "Complex Quote Request (e.g. Long Orthodontics)",
            escQuoteDesc: "Redirects to a physical consultation for a quote.",
            escConfidence: "Low AI Confidence",
            escConfidenceDesc: "When in doubt, the AI prefers not to answer and alerts you.",
            waTitle: "WhatsApp Connection & QR Code",
            waDesc:
                "Connect a WhatsApp Business or personal number so the assistant can chat with your patients.",
            waStatusTitle: "Connected Device",
            waStatusLabel: "Status: ",
            waOnline: "Online and ready",
            waNumber: "Number:",
            waBattery: "Battery: 85%",
            waScanTitle: "Scan this QR Code",
            waScanDesc: "Open WhatsApp on your phone > Linked devices > Link a device.",
            waLinkTitle: "Generate Short WhatsApp Link",
            waDirectLink: "Direct link to your assistant",
            waPrefill: "Prefilled Message (Optional)",
            waGenerateLink: "Generate Short Link",
            waCopyLink: "Copy Link",
            waCopyHtml: "Copy HTML Code",
            title: "AI Assistant & WhatsApp Settings",
            subtitle: "Custom AI instructions, WhatsApp QR Code, and clinic booking rules.",
            saveBtn: "Save Changes",
            saving: "Saving...",
            successSave: "Instructions, services catalog, and settings successfully saved!",
            errorSave: "Error saving settings.",

            waCoordTitle: "Clinic WhatsApp Details",
            waCoordDesc: "The number and pre-filled greeting message for your patients.",
            waPrefillWith: "Prefill with:",
            waOfficialNum: "Official Clinic Number",
            waSandboxNum: "Sandbox Test Number",
            waConfiguredNum: "Configured WhatsApp Number",
            waPrefillMsg: "Pre-filled message upon QR Code scan",
            waMetaGuideTitle: "⚠️ Meta Sandbox Connection Guide (Essential)",
            waMetaGuideDesc: "Follow these 2 steps in Meta Developers so your real WhatsApp messages reach the AI:",
            waMetaStep1Title: "Subscribe Webhook to 'messages' field (Required in Meta)",
            waMetaStep2Title: "Add your phone number in Meta Sandbox",
            waUsageTitle: "How to use the QR Code at the clinic",
            waUsageDesc: "Facilitate access for your patients at the front desk or on your communication materials.",
            waUsage1Title: "1. Reception & Poster",
            waUsage1Desc: "Print the QR Code at the front desk so patients can book an appointment in 5 seconds.",
            waUsage2Title: "2. Business Cards",
            waUsage2Desc: "Add the QR Code to the back of your appointment cards for rescheduling and check-ups.",
            waUsage3Title: "3. Website & Socials",
            waUsage3Desc: "Share the direct wa.me link on your Instagram page or website to attract new patients.",
            waActiveQRTitle: "Active WhatsApp QR Code",
            waActiveQRDesc: "Scan this QR Code with your camera to instantly start the WhatsApp conversation:",
            waCopyDirectLink: "Copy direct link (wa.me)",
            waTestInWeb: "Test in WhatsApp Web",
            capReminders: "Automatic confirmations and reminders via message",
            capRemindersDesc: "Sends a clear summary with date and time as soon as a slot is confirmed.",
            capDoctorEscalation: "Escalation to doctor / front desk",
            capDoctorEscalationDesc: "Hands over to the medical team as soon as a patient requests follow-up or a practitioner.",

            "communicationTone": "communicationTone",
            "toneEmpathic": "toneEmpathic",
            "typicalPrices": "typicalPrices",
            "engineState": "engineState",
            "webhookInstructions": "webhookInstructions",
            "webhookUrl": "webhookUrl",
            "verifyToken": "verifyToken",
            "webhookInstruction1": "webhookInstruction1",
            "webhookInstruction2": "webhookInstruction2",
            "statusLabel": "statusLabel",
            "engineAiLabel": "engineAiLabel"
        },
        waitlistPage: {
            simulateCancel: "Simulate cancellation",
            waitingPatients: "Waiting Patients",
            activeRequests: "Active requests",
            highPriority: "High Priority / Emergencies",
            contactFirst: "Contact first",
            aiTargeted: "AI Targeted Patients",
            freeSlots: "{count} free slot(s) to assign",
            aiFill: "AI Slot Filling",
            algo247: "Automated 24/7 algorithm",
            freedSlotsAI: "Freed Slot Offers (AI)",
            targetedPatientsCount: "{patients} targeted patient(s) - {slots} available slot(s)",
            loadingOffers: "Loading offers...",
            allSlotsFull: "All your slots are full",
            aiSuggests:
                "As soon as a patient cancels an appointment, the AI will instantly offer the freed slot to the most relevant waiting patient.",
            testWithCancel: "Test with a cancellation",
            patientsInWaitlist: "Patients in waitlist",
            waitingForSlot: "{count} patient(s) waiting for a slot",
            filterPlaceholder: "Filter by name, treatment, phone...",
            filterAll: "All",
            filterHigh: "High",
            filterMedium: "Med",
            filterLow: "Low",
            loading: "Loading...",
            noMatchingPatients: "No matching patients.",
            contactWhatsApp: "Contact via WhatsApp",
            removeFromWaitlist: "Remove from waitlist",
            page: "Page",
            of: "of",
            prev: "Previous",
            next: "Next",
            aiRecommended: "AI Recommended",
            chooseSlot: "Choose the slot to assign:",
            availableSlot: "Available slot:",
            option: "Option",
            whatsapp: "WhatsApp",
            validateSlot: "Validate this slot",
            booking: "Booking...",
            contactLogBtn: "Contact Log",
            contactLogTitle: "Contact Log (Waitlist)",
            contactLogDesc: "Log the patient's feedback after proposing the slot.",
            contactChannel: "Contact Channel",
            exchangeOutcome: "Exchange Outcome",
            notesOptional: "Notes / Details (optional)",
            notesPlaceholder: "Ex: The patient confirms availability and will arrive 10 mins early...",
            cancel: "Cancel",
            saveAttempt: "Save attempt",
            saving: "Saving...",
            title: "Smart Waitlist",
            subtitle: "Automatically fill cancellations by offering freed slots to waiting patients.",
        },
        followupsPage: {
            statusPending: "To Do",
            statusInProgress: "In Progress",
            priorityHigh: "High",
            priorityMedium: "Medium",
            priorityLow: "Low",
            statusCompleted: "Completed",
            statusCancelled: "Cancelled",
            statusExpired: "Expired",
            typeAbsence: "No Show",
            typeCancel: "Cancellation",
            typeReengage: "Re-engagement",
            typeCheckup: "Checkup Reminder",
            typeSlotOffer: "Slot Offer",
            kpiPending: "To Do",
            kpiInProgress: "In Progress",
            kpiCompletedToday: "Completed (Today)",
            kpiExpired: "Expired",
            filterActive: "Active (To Do / In Progress)",
            filterAllPriorities: "All priorities",
            filterAllTypes: "All types",
            colPatient: "PATIENT",
            colType: "TYPE",
            colPriority: "PRIORITY",
            colStatus: "STATUS",
            colAttempts: "ATTEMPTS",
            colActions: "ACTIONS",
            noTasks: "No tasks found.",
            btnComplete: "Complete",
            btnJournal: "Log",
            journalTitle: "Contact Log",
            journalChannel: "Channel",
            channelPhone: "Call",
            channelWA: "WA",
            channelSMS: "SMS",
            channelEmail: "Email",
            channelVisit: "Visit",
            journalOutcome: "Outcome",
            outNoAnswer: "No answer",
            outVoicemail: "Left voicemail",
            outAgreed: "Contacted - Agreed",
            outDeclined: "Contacted - Declined / Not interested",
            outInvalid: "Invalid number",
            journalNotes: "Notes (optional)",
            journalNotesPlaceholder: "Exchange details...",
            journalSave: "Log attempt",
            journalSaving: "Saving...",
            toastSuccess: "Task completed successfully",
            toastAttempt: "Attempt logged",
            loading: "Loading...",
            title: "Post-Op Follow-ups",
            subtitle: "The AI automatically checks in on your patients after their procedures.",
        },
        recoveryPage: {
            title: "Patient Recovery",
            subtitle: "Automatically identify patients your clinic is at risk of losing.",
            detect: "Detect",
            launchCampaign: "Launch Campaign",
            analyzed: "Analyzed Patients",
            toRecover: "To Recover",
            contacted: "Contacted",
            replied: "Replied",
            recoveredAppts: "Recovered Appts",
            completed: "Visited Clinic",
            estimatedValue: "Estimated Value",
            bookedValue: "Booked Value",
            recoveredValue: "Recovered Value",
            funnelTitle: "Recovery Funnel",
            funnelSubtitle: "Overall Performance",
            funnelIdentified: "Identified Patients",
            funnelContacted: "Contacted",
            funnelReplied: "Replied",
            funnelBooked: "Appointments Booked",
            funnelVisited: "Visited Clinic",
            opportunitiesTitle: "Recovery Opportunities",
            opportunitiesSubtitle: "{count} opportunities identified",
            campaigns: "Campaigns",
            colPatient: "Patient",
            colType: "Type",
            colReason: "Reason",
            colPriority: "Priority",
            colEstValue: "Est. Value",
            colStatus: "Status",
            colDetectedOn: "Detected On",
            unknownPatient: "Unknown Patient",
            viewBtn: "View",
            errorLoading: "Failed to load opportunities.",
            noOpportunities: 'No recovery opportunities. Click "Detect" to analyze your patients.',
            typeInactive: "Inactive Patient",
            typeInterrupted: "Interrupted Treatment",
            typePendingQuote: "Pending Quote",
            typeNoShow: "No-Show",
            typeCancellation: "Cancellation",
            typeOverdue: "Overdue Checkup",
            typeFollowUp: "Follow-up",
            statusIdentified: "Identified",
            statusQueued: "Queued",
            statusContacted: "Contacted",
            statusResponded: "Responded",
            statusBooked: "Booked",
            statusVisited: "Visited",
            statusNoResponse: "No Response",
            statusDismissed: "Dismissed",
            detectionComplete: "Detection complete. {count} opportunities created.",
            detectionError: "Error during detection.",
        },
        noShowsPage: {
            viewAgenda: "View Agenda",
            recoveryModule: "AI Recovery Module",
            absencesToday: "Absences today",
            missedToday: "Missed appointments today",
            thisWeek: "This week",
            weekTotal: "Cumulative for the current week",
            recoveredPatients: "Recovered Patients",
            recoveredDesc: "Appts booked after WhatsApp follow-up",
            recoveryRate: "Recovery Rate",
            recoveryRateDesc: "No-Shows converted into new appts",
            historyTitle: "Missed Appointments History",
            historyDesc: "Every absence automatically triggers a recovery opportunity via WhatsApp.",
            filterAll: "All",
            filterToday: "Today",
            filterPending: "Pending recovery",
            searchPlaceholder: "Search patient, treatment...",
            loading: "Loading missed appointments...",
            errorLoading: "An error occurred while loading the data.",
            noAbsencesTitle: "No absences found",
            noAbsencesDescFilter: "No results match your search filters.",
            noAbsencesDesc: "Congratulations! No missed appointments have been recorded.",
            colPatient: "Patient",
            colDate: "Appt Date",
            colSlot: "Slot",
            colTreatment: "Reason for visit",
            colScore: "Absence Score",
            colStatus: "WhatsApp Follow-up Status",
            colActions: "Quick Actions",
            statusIdentified: "⏳ Pending Follow-up",
            statusContacted: "💬 Contacted via WhatsApp",
            statusResponded: "📩 Responded to AI",
            statusBooked: "🎉 Appt Rescheduled",
            statusVisited: "🏥 Visited clinic",
            statusNoResponse: "❌ No Response",
            statusDismissed: "🚫 Dismissed",
            firstAbsence: "1st absence",
            multipleAbsences: "{count} no-shows",
            btnWhatsApp: "WhatsApp",
            btnReschedule: "Reschedule",
            btnRecord: "Record",
        },
        login: {
            title: "Welcome back",
            subtitle: "Log in to your clinic or medical practice workspace.",
            email: "Email address",
            password: "Password",
            forgot_password: "Forgot password?",
            submit: "Log in",
            loading: "Logging in...",
            error_default: "Connection error.",
            back: "Back to site",
        },
        landing: {
            hero: {
                chip1: "24/7 Online Assistant",
                chip2: "Human Escalation Included",
                title1: "Your clinic",
                title2: "never sleeps",
                title3: "anymore.",
                subtitle:
                    "A clinical platform connecting agenda, patient records, team, and WhatsApp. An AI working for your practice, within boundaries you control.",
                cta1: "Access my workspace",
                cta2: "See how your data is protected",
            },
            pipeline: {
                kicker: "What happens behind a message",
                title: "One message, six checks.",
                subtitle:
                    "Every WhatsApp request goes through the same guardrails before any action. When the topic is medical, AI stops and hands over to your team.",
            },
            gates: {
                msg_received: "Message Received",
                msg_received_desc: "Instant reception",
                context_isolated: "Context Isolated",
                context_isolated_desc: "Separation by clinic",
                intent_understood: "Intent Understood",
                intent_understood_desc: "Multi-language & intent",
                ai_guardrail: "Medical Guardrail",
                ai_guardrail_desc: "AI stops in emergencies",
                slot_validated: "Slot Validated",
                slot_validated_desc: "Calendar verification",
                waitlist_check: "Waitlist Management",
                waitlist_check_desc: "No-show recovery",
                reminders: "Smart Reminders",
                reminders_desc: "24h before appointment",
                confirmation: "Confirmation & Sync",
                confirmation_desc: "Sync without intervention",
                escalation: "Human Escalation",
            },
            scenarios: {
                tab1: "New Patient",
                msg1_1: "Hello, I would like to book an appointment.",
                reply1_1: "Hello! I am the medical assistant. Could you tell me the reason for your visit?",
                msg1_2: "It's for a routine check-up.",
                reply1_2: "Perfect. I have availability on Thursday at 2 PM or Friday at 10 AM. Which time works best for you?",
                tab2: "Existing Patient",
                msg2_1: "I want to cancel my appointment for tomorrow.",
                reply2_1: "Noted, your appointment for tomorrow is cancelled. Would you like to reschedule for next week?",
                msg2_2: "No thanks. By the way, my heart has been hurting a lot since this morning.",
                reply2_2: "I am detecting a possible medical emergency. I am immediately transferring your message to the medical team.",
            },
            security: {
                kicker: "Security & Compliance",
                title: "Your data is shielded.",
                subtitle:
                    "Our infrastructure guarantees total confidentiality of patient records and conversations.",
                disclaimer: "Compliant with international security standards.",
                layers: {
                    access: {
                        title: "Secure Access",
                        desc: "Strong authentication ensuring only authorized staff can access your workspace.",
                    },
                    tenant: {
                        title: "Data Isolation",
                        desc: "Your clinic's data is strictly isolated and sealed off from any other organization.",
                    },
                    validation: {
                        title: "Strict Validation",
                        desc: "Every piece of incoming data is rigorously sanitized before processing.",
                    },
                    idempotent: {
                        title: "Idempotency",
                        desc: "Requests are handled cleanly to guarantee no duplicate actions or records.",
                    },
                    ai_limits: {
                        title: "AI Limits",
                        desc: "The AI operates within strict boundaries, escalating complex medical issues immediately.",
                    },
                    traceability: {
                        title: "Traceability",
                        desc: "Every action is logged and timestamped to provide a comprehensive audit trail.",
                    },
                    permissions: {
                        title: "Permissions",
                        desc: "Granular access control lets you define precisely what each team member can do.",
                    },
                },
            },
            features: {
                kicker: "Features",
                title: "Everything for your clinic",
                subtitle: "Automate time-consuming tasks and focus on your patients.",
                items: {
                    assistant: {
                        title: "AI WhatsApp Assistant",
                        desc: "Answers routine requests 24/7.",
                    },
                    multilingual: {
                        title: "Multilingual",
                        desc: "Speaks English, French, and Arabic fluently.",
                    },
                    record: {
                        title: "Patient Record",
                        desc: "Centralized history of chats and appts.",
                    },
                    modify: {
                        title: "Autonomous Management",
                        desc: "Patients cancel or reschedule on their own.",
                    },
                    family: {
                        title: "Family Management",
                        desc: "Book appointments for relatives.",
                    },
                    calendar: {
                        title: "Smart Calendar",
                        desc: "Perfect synchronization.",
                    },
                    queue: {
                        title: "Waitlist",
                        desc: "Automatic replacement of cancellations.",
                    },
                    reminders: {
                        title: "SMS/WA Reminders",
                        desc: "Reduces no-shows.",
                    },
                    followup: {
                        title: "Post-Op Follow-up",
                        desc: "Checks in on patients automatically.",
                    },
                    specialty: {
                        title: "Specialties",
                        desc: "Adapts to your practice.",
                    },
                    analytics: {
                        title: "Analytics",
                        desc: "Track your performance.",
                    },
                    team: {
                        title: "Teamwork",
                        desc: "Simplified collaboration.",
                    },
                },
            },
            pricing: {
                title: "Simple pricing.",
                subtitle: "Choose the plan that fits your practice.",
            },
            plans: {
                popular: "Popular",
                starter: {
                    tagline: "For individual practices",
                    f1: "Smart Calendar",
                    f2: "Basic AI Assistant",
                    f3: "Patient records",
                    f4: "Email support",
                    cta: "Get Started",
                },
                pro: {
                    tagline: "For growing clinics",
                    f1: "Everything in Starter",
                    f2: "AI Waitlist",
                    f3: "Post-Op Follow-up",
                    f4: "Advanced Multilingual",
                    f5: "Priority support",
                    cta: "Free Trial",
                },
                enterprise: {
                    tagline: "Custom",
                    f1: "Everything in Pro",
                    f2: "White label",
                    f3: "API Integration",
                    f4: "Dedicated server",
                    f5: "Account Manager",
                    cta: "Contact Us",
                },
            },
            compliance: {
                rgpd: {
                    title: "Security & Compliance (HIPAA / GDPR)",
                    i1: { strong: "End-to-end encryption", text: "Data encrypted at rest and in transit." },
                    i2: { strong: "Healthcare Certified Hosting", text: "Secure health-grade servers in Europe." },
                    i3: { strong: "Absolute medical secrecy", text: "Strict traceability and locked access (GDPR/HIPAA)." },
                    i4: { strong: "Zero data selling", text: "Your data and patient records belong 100% to you." }
                },
                na: {
                    title: "Reliability & Controlled AI",
                    i1: { strong: "Zero Hallucination", text: "The AI never diagnoses or gives medical advice." },
                    i2: { strong: "Strict boundaries", text: "The assistant only acts within the rules you define." },
                    i3: { strong: "Double verification", text: "Strict confirmation required before cancelling any appointment." },
                    i4: { strong: "Human fallback", text: "Automatic redirection to the reception in case of doubt or emergency." }
                }
            },
            patient_record: {
                kicker: "Medical Record",
                title: "A 360° view of the patient.",
                subtitle: "Find all history at a glance.",
                bullets: {
                    "0": "Appointment history",
                    "1": "WhatsApp conversations",
                    "2": "Shared documents",
                    "3": "Internal notes",
                },
                demo: {
                    title: "Patient Record",
                    subtitle: "Interface preview",
                    bp: "Blood Pressure",
                    bp_status: "Normal",
                    hr: "Heart Rate",
                    hr_status: "Regular",
                },
            },
            cta: {
                title: "Ready to transform your clinic?",
                now: "Start now",
            },
            footer: {
                desc: "The clinical management platform powered by AI.",
                product: "Product",
                demo: "Demo",
                company: "Company",
                about: "About",
                contact: "Contact",
                legal: "Legal",
                security_privacy: "Security & Privacy",
                terms: "Terms",
                copyright: "© 2026 Sanovia AI. All rights reserved.",
                subModalTitle: "Subscription Request",
                subModalDesc: "You have chosen the",
                subModalDesc2: " plan. Please fill out this form and we will contact you with payment instructions (Bank details).",
                subName: "Full Name *",
                subNamePlaceholder: "Dr. John Doe",
                subEmail: "Email *",
                subEmailPlaceholder: "doc@clinic.com",
                subPhone: "Phone *",
                subPhonePlaceholder: "+1 202 555 0123",
                subCountry: "Country *",
                subCountrySearch: "Search country...",
                subCountryEmpty: "No country found.",
                subMessage: "Specific Request (Optional)",
                subMessagePlaceholder: "I would like to pay via bank transfer...",
                subCancel: "Cancel",
                subSubmit: "Send Request",
                subSubmitting: "Sending...",
                subSuccess: "Subscription request sent successfully!",
                subError: "Error sending the request.",

                country: "Tunisia",
            },
        },
        uiKit: { statusConfirmed: "statusConfirmed", statusScheduled: "statusScheduled", statusCancelled: "statusCancelled", statusCompleted: "statusCompleted", statusNoShow: "statusNoShow", patientActive: "patientActive", patientInactive: "patientInactive", patientAtRisk: "patientAtRisk", reasonInactive: "reasonInactive", reasonInterrupted: "reasonInterrupted", reasonQuote: "reasonQuote", reasonNoShow: "reasonNoShow", reasonOverdue: "reasonOverdue", reasonCancel: "reasonCancel", reasonFollowUp: "reasonFollowUp", aiActive: "aiActive", aiPaused: "aiPaused" }
    },
    ar: {


        featuresPage: {
            badge: "الميزات والفوائد",
            title: "كل ما تحتاجه عيادتك، مؤتمت بالكامل.",
            subtitle: "Sanovia AI ليس مجرد أداة بسيطة. إنه عضو كامل في فريقك يعمل على مدار الساعة لتحسين تجربة المرضى وزيادة إيراداتك.",
            feat1Title: "حجز المواعيد بالذكاء الاصطناعي",
            feat1Desc: "يتحدث الذكاء الاصطناعي مع المريض، ويفهم احتياجاته، ويتحقق من توفرك، ويحجز الوقت المثالي. يعمل 24/7 عبر واتساب والهاتف.",
            feat2Title: "التذكيرات التلقائية وتقليل التغيب",
            feat2Desc: "إرسال تلقائي للتذكيرات. إذا ألغى مريض موعده، يتصل الذكاء الاصطناعي فوراً بالمرضى في قائمة الانتظار لملء الفراغ.",
            feat3Title: "فرز طبي ذكي",
            feat3Desc: "يطرح الأسئلة الصحيحة (الأعراض، مستوى الطوارئ) قبل الاستشارة ليكون الطبيب مستعداً. يعيد توجيه الحالات الطارئة القصوى للإسعاف.",
            feat4Title: "متابعة ما بعد الجراحة",
            feat4Desc: "يطمئن المساعد على مرضاك بعد أي إجراء طبي وينبهك في حال الإبلاغ عن أي مضاعفات.",
            feat5Title: "إدارة قائمة الانتظار",
            feat5Desc: "يمكن للمرضى التسجيل في قائمة الانتظار. بمجرد توفر موعد، يقترحه الذكاء الاصطناعي عليهم تلقائياً.",
            feat6Title: "توفير وقت السكرتارية",
            feat6Desc: "تصفية 80% من المكالمات غير الضرورية. دع سكرتاريتك تركز على الاستقبال الفعلي والحالات المعقدة.",
            ctaTitle: "هل أنت مستعد لتحويل عيادتك؟",
            ctaDesc: "انضم إلى عشرات الأطباء الذين يستخدمون بالفعل Sanovia AI لتخفيف العبء عن سكرتاريتهم."
        },
        waAssistantPage: {
            badge: "المساعد الافتراضي عبر واتساب",
            title: "فوّض إدارة خط واتساب الخاص بك للذكاء الاصطناعي.",
            subtitle: "لا تفوت أي مريض بعد الآن. مساعدنا يقيّم الطلب، يتحقق من توفرك، ويحجز المواعيد مباشرة في تقويمك، ليلاً ونهاراً.",
            heroList1: "يرد في أقل من ثانيتين",
            heroList2: "يفهم اللغة الطبيعية (الصوت والنص)",
            heroList3: "متعدد اللغات (العربية، الفرنسية، الإنجليزية)",
            cta1: "جرب مجاناً",
            chat1: "مرحباً! أنا مساعد الدكتور مارتن. كيف يمكنني مساعدتك اليوم؟",
            chat2: "أود حجز موعد لفحص روتيني.",
            chat3: "ممتاز! الدكتور مارتن متاح غداً الساعة 10:00 صباحاً أو 2:30 مساءً. أي وقت تفضل؟",
            featuresTitle: "لماذا يحب عملاؤنا مساعد واتساب",
            ben1Title: "حجز المواعيد 24/7",
            ben1Desc: "يتعرف المساعد على احتياجات المريض ويقترح الوقت المناسب مباشرة في المحادثة.",
            ben2Title: "فرز ذكي",
            ben2Desc: "يفصل بين الحالات الطارئة والأسئلة الإدارية البسيطة لتوفير وقت السكرتارية.",
            ben3Title: "تقليل التغيب عن المواعيد",
            ben3Desc: "تذكيرات تلقائية عبر واتساب مع خيارات التأكيد أو التأجيل أو الإلغاء بنقرة واحدة.",
            ben4Title: "خصوصية مضمونة",
            ben4Desc: "اتصالات مشفرة من طرف إلى طرف عبر واجهة ميتا الرسمية. لا يوجد تخزين خارجي للمحادثات."
        },
        securityPage: {
            badge: "الأمان والخصوصية",
            title: "بنية برمجيات كخدمة مصممة لحماية مساحة كل عيادة.",
            subtitle: "في Sanovia AI، لا نساوم أبداً على سرية البيانات الطبية. بنيتنا التحتية مبنية على معايير صارمة للعزل والتشفير وإمكانية التتبع.",
            feat1Title: "عزل منطقي متعدد المستأجرين",
            feat1Desc: "تحتوي كل عيادة على مساحة بيانات معزولة منطقياً خاصة بها. لا يتم مشاركة أي بيانات بين العيادات.",
            feat2Title: "المصادقة والتحكم بالوصول",
            feat2Desc: "تحكم بالوصول مبني على الأدوار (RBAC). السكرتيرات والأطباء لديهم صلاحيات محددة بدقة.",
            feat3Title: "التشفير أثناء النقل",
            feat3Desc: "جميع الاتصالات بين العيادات وخوادمنا وواجهات برمجة التطبيقات التابعة لجهات خارجية مشفرة عبر TLS 1.2+.",
            feat4Title: "توقيع خطافات الويب (Webhooks)",
            feat4Desc: "يتم التحقق بشكل منهجي من الطلبات القادمة من واتساب والتكاملات الأخرى عبر التوقيعات المشفرة.",
            feat5Title: "التمكين وصندوق الصادر",
            feat5Desc: "آليات صارمة لخطافات الويب والمهام غير المتزامنة، مما يضمن عدم تكرار أي إجراء (مثل إرسال رسالة).",
            feat6Title: "النسخ الاحتياطي والاحتفاظ",
            feat6Desc: "نسخ احتياطي آلي منتظم. يتم الاحتفاظ ببيانات المحادثات وفقاً للمعايير الطبية ويمكن حذفها عند الطلب.",
            feat7Title: "سجلات التدقيق",
            feat7Desc: "تتبع كامل للإجراءات الحيوية (تسجيلات الدخول، تصدير البيانات، تغيير الإعدادات) مخزنة في سجلات غير قابلة للتعديل.",
            feat8Title: "الاستجابة للحوادث",
            feat8Desc: "عملية موثقة للاستجابة للحوادث ومراقبة استباقية لاختلالات الوصول.",
            depsTitle: "موقع البيانات والتبعيات",
            depsSubtitle: "نحن شفافون بشأن بنيتنا التقنية. يتم نقل وتخزين بيانات المرضى بالاعتماد على شركاء موثوقين ومعتمدين ومعترف بهم عالمياً.",
            dep1Name: "MongoDB Atlas",
            dep1Desc: "استضافة قاعدة بيانات آمنة مع التشفير في وضع السكون.",
            dep2Name: "Meta WhatsApp API",
            dep2Desc: "قناة اتصال مشفرة من طرف إلى طرف بين ميتا وخوادمنا.",
            dep3Name: "مزودو الذكاء الاصطناعي",
            dep3Desc: "نماذج ذكاء اصطناعي للمؤسسات بدون تدريب على بياناتك الصحية (سياسة عدم الاحتفاظ بالبيانات).",
            storageTitle: "تخزين البيانات",
            storageDesc: "اعتماداً على منطقتك والتشريعات المعمول بها، يتم توفير قواعد بيانات Sanovia AI على خوادم معزولة جغرافياً لضمان سيادة بياناتك.",
            storageNotice: "الوضع الحالي: الآليات الموضحة مطبقة في الإنتاج. عمليات التصديق الرسمية لدينا قيد التحقق حالياً وفقاً للمعايير الدولية. Sanovia AI لا يقدم تشخيصاً طبياً.",
            footer: "منصة إدارة العيادات الطبية."
        },
        settingsPage: {
            aiSettingsTitle: "إعدادات الذكاء الاصطناعي المتقدمة",
            globalConfig: "التكوين العام",
            goToAiAssistantDesc:
                "لتكوين القدرات واللغات ووضع الاستجابة، يرجى الانتقال إلى صفحة مساعد الذكاء الاصطناعي.",
            goToAiAssistantBtn: "الذهاب إلى مساعد الذكاء الاصطناعي",
            commChannelsTitle: "قنوات الاتصال",
            waMainChannelDesc: "القناة الرئيسية للذكاء الاصطناعي والمتابعة.",
            smsConfirmDesc: "تُستخدم لتأكيدات اليوم السابق إذا كان WhatsApp غير متاح.",
            emailDocsDesc: "لإرسال عروض الأسعار ومستندات PDF.",
            securityAuditTitle: "الأمن والتدقيق",
            securityAuditSubtitle: "تتبع الوصول إلى البيانات الصحية (الامتثال لـ RGPD/HIPAA).",
            eventLogTitle: "سجل الأحداث",
            thDate: "التاريخ",
            thUser: "المستخدم",
            thAction: "الإجراء",
            thResource: "المورد",
            thIpAddress: "عنوان IP",
            loadingAudit: "جاري تحميل سجلات التدقيق...",
            noAuditFound: "لم يتم العثور على سجل تدقيق.",
            pageXofY: "الصفحة {page} من {totalPages}",
            btnPrev: "السابق",
            btnNext: "التالي",
            integrationsTitle: "التكاملات",
            integrationsSubtitle: "قم بتوصيل Sanovia AI بأدواتك.",
            metaConfigServer: "تكوين Meta مُدار من جانب الخادم.",
            aiProviderEnv: "التكوين عبر متغيرات بيئة الواجهة الخلفية.",
            aiProvider: "مزود الذكاء الاصطناعي",
            serverConfig: "تكوين الخادم",
            notAvailable: "غير متاح",
            managedServerSide: "مُدار من جانب الخادم",
        },
        catalogPage: {
            toastSuccess: "تم تحديث الكتالوج بنجاح!",
            title: "كتالوج الخدمات",
            btnAdd: "إضافة خدمة",
            sectionTitle: "الخدمات والاستشارات",
            sectionDesc: "سيتم اقتراح هذه الخدمات من قبل مساعد الذكاء الاصطناعي عند حجز المواعيد.",
            noServicesTitle: "لم يتم تحديد أي خدمة",
            noServicesDesc: "أضف خدمات حتى يتمكن الذكاء الاصطناعي من اقتراح فترات زمنية مناسبة.",
            colService: "الخدمة",
            colDuration: "المدة",
            colPrice: "السعر الإرشادي",
            colActions: "إجراءات",
            durationMin: "دقيقة",
            onEstimate: "حسب التقدير",
            confirmDelete: "هل أنت متأكد أنك تريد حذف هذه الخدمة من الكتالوج؟",
            modalEdit: "تعديل الخدمة",
            modalNew: "خدمة جديدة",
            labelName: "اسم الخدمة *",
            placeName: "مثال: استشارة أسنان",
            labelDuration: "المدة (بالدقائق) *",
            labelPrice: "السعر ({currency})",
            placePrice: "0 لـ 'حسب التقدير'",
            labelDesc: "الوصف / تعليمات الذكاء الاصطناعي",
            placeDesc: "مثال: رعاية روتينية، التحقق من التاريخ الطبي...",
            btnCancel: "إلغاء",
            btnSave: "حفظ",
        },
        revenuePage: {
            title: "استرداد الإيرادات",
            subtitle: "قياس المواعيد والفرص المستردة بفضل الذكاء الاصطناعي.",
            errorLoading: "غير قادر على تحميل بيانات الإيرادات.",
            loading: "جاري التحميل...",
            statRecoveredAppts: "المواعيد المستردة (تمت الزيارة)",
            hintTotalRecovered: "إجمالي المسترد",
            statBookedAppts: "العلاجات المقبولة",
            hintApptsBooked: "المواعيد المحجوزة",
            estimatedValue: "القيمة المستردة المقدرة",
            potentialValue: "الإمكانات المتبقية للاسترداد: ",
            timelineTitle: "الجدول الزمني للاسترداد",
            timelineDesc: "التاريخ الحديث للمكاسب المحققة",
            noHistory: "لا يوجد تاريخ حديث.",
        },
        analyticsPage: {
            title: "التحليلات",
            subtitle: "تتبع أداء عيادتك وتأثير الذكاء الاصطناعي (آخر 30 يومًا).",
            subtitleError: "تتبع أداء عيادتك وتأثير الذكاء الاصطناعي.",
            errorTitle: "خطأ في التحميل",
            errorDesc: "غير قادر على تحميل إحصائيات التحليلات في الوقت الحالي.",
            statRecoveryRate: "معدل الاسترداد",
            statNoShow: "معدل الغياب",
            statNoShowRecovery: "استرداد الغياب",
            statWaitlist: "ملء قائمة الانتظار",
            statActiveFollowUps: "المتابعات النشطة",
            chartAppointmentsTitle: "المواعيد والاستردادات",
            chartAppointmentsDesc: "التطور خلال الأشهر الستة الماضية",
            chartInactiveTitle: "إعادة تنشيط المرضى غير النشطين",
            chartInactiveDesc: "المرضى الذين لم يزوروا العيادة منذ > 6 أشهر",
            chartLostTitle: "أين تفقد عيادتك الفرص",
            noData: "لا توجد بيانات",
            loading: "...",
        },
        pages: {
            aiAssistantTitle: "مساعد الذكاء الاصطناعي",
            aiAssistantSubtitle: "تكوين المساعد الافتراضي الخاص بك",
            followupsTitle: "متابعة ما بعد العملية",
            followupsSubtitle: "مراقبة حالة مرضاك",
            waitlistTitle: "قائمة الانتظار",
            waitlistSubtitle: "إدارة المرضى المنتظرين",
            noShowsTitle: "المواعيد الفائتة",
            noShowsSubtitle: "إدارة الغيابات والإلغاءات",
            analyticsTitle: "التحليلات",
            analyticsSubtitle: "تابع أداء عيادتك وتأثير الذكاء الاصطناعي.",
            revenueTitle: "الإيرادات والأرباح",
            revenueSubtitle:
                "تابع تطور إيراداتك والمدفوعات المتأخرة وعائد الاستثمار من الذكاء الاصطناعي.",
            conversationsTitle: "المحادثات",
            conversationsSubtitle: "إدارة التواصل مع المرضى",
        },
        conversationsPage: {
            title: "صندوق الوارد ومساعد واتساب",
            subtitle: "إدارة المحادثات واختبار مساعد واتساب الذكي في الوقت الفعلي.",
            live: "مباشر 24/7",
            hideSimulator: "إخفاء المحاكي",
            openSimulator: "📱 فتح محاكي المريض",
            viewAgenda: "عرض الجدول",
            searchPlaceholder: "ابحث بالاسم، الهاتف...",
            filterAll: "الكل",
            filterAi: "الذكاء الاصطناعي",
            filterHuman: "يتطلب تدخل بشري",
            loadingConvs: "جاري تحميل المحادثات...",
            noConvs: "لا توجد محادثات حتى الآن.",
            humanRequired: "يتطلب تدخل بشري",
            aiHandled: "معالج بواسطة الذكاء الاصطناعي",
            patientRecord: "فتح ملف المريض",
            whatsappBusiness: "واتساب أعمال",
            loadPrevMsgs: "تحميل الرسائل السابقة",
            loadingMsgs: "جاري التحميل...",
            noMsgsTitle: "لا توجد رسائل",
            noMsgsDesc: "هذه المحادثة فارغة أو تعذر تحميلها.",
            typeMsg: "اكتب رسالة كعيادة...",
            whatsappSimulator: "محاكي واتساب (اختبار المريض)",
            simDesc:
                "اختبر الذكاء الاصطناعي في الوقت الفعلي. ضع نفسك مكان المريض وأرسل رسائل لترى كيف يتفاعل المساعد.",
            online: "متصل",
            patientId: "معرف:",
            simNewConv: "محاكاة مريض جديد",
            quickScenarios: "سيناريوهات سريعة للاختبار:",
            scenario1Label: "📅 موعد",
            scenario1Text: "مرحباً، أريد حجز موعد لتنظيف الأسنان هذا الأسبوع.",
            scenario2Label: "⏱️ تأكيد",
            scenario2Text: "ممتاز، الساعة 11:30 تناسبني! أؤكد الحجز.",
            scenario3Label: "🚨 طوارئ",
            scenario3Text: "يا دكتور، أعاني من ألم شديد في أسناني منذ الصباح. هل يمكنك رؤيتي بشكل عاجل؟",
            scenario4Label: "💰 أسعار",
            scenario4Text: "مرحباً، ما هو سعر الزراعة أو التبييض؟",
            scenario5Label: "🧑‍⚕️ دكتور",
            scenario5Text: "أريد التحدث مباشرة إلى الطبيب بخصوص علاجي بالأمس.",
            clearSim: "مسح محادثة الاختبار",
            simWarning: "أنت تقوم بمحاكاة المريض بالرقم الوهمي:",
            simulatorSubtitle: "محاكي واتساب",
            directTestMode: "وضع الاختبار المباشر",
            simPatientLabel: "المريض المحاكى:",
            simPatientUnknown: "مريض غير معروف",
            clinicName: "عيادتك",
            onlineStatus: "متصل",
            welcomeMsg: "رسالة الترحيب",
            writeAsPatient: "اكتب كمريض...",
            suggestionSuccess: "تم نسخ الاقتراح!",
            suggestionError: "خطأ في الاقتراح",
            sendError: "خطأ في الإرسال",
            simSuccess: "تم إرسال رسالة الاختبار!",
            simError: "خطأ في المحاكاة",
            patient: "المريض",
            aiBot: "الذكاء الاصطناعي",
            received: "مستلمة",
            delivered: "تم التسليم",
            writeManualReply: "اكتب رداً يدوياً...",
            aiTip: "الذكاء الاصطناعي يتعامل تلقائياً مع هذه المحادثة.",
            enterToSend: "اضغط Enter للإرسال",
            selectConvTitle: "اختر محادثة",
            selectConvDesc: "اختر محادثة على اليسار أو ابدأ اختباراً في المحاكي.",
            simulatorTitle: "محاكي واتساب",
        },
        uiKit: {
            statusConfirmed: "مؤكد",
            statusScheduled: "مبرمج",
            statusCancelled: "ملغى",
            statusCompleted: "مكتمل",
            statusNoShow: "لم يحضر",
            patientActive: "نشط",
            patientInactive: "غير نشط",
            patientAtRisk: "في خطر",
            reasonInactive: "غير نشط",
            reasonInterrupted: "علاج متقطع",
            reasonQuote: "في انتظار عرض السعر",
            reasonNoShow: "لم يحضر",
            reasonOverdue: "تأخر في الفحص",
            reasonCancel: "ملغى",
            reasonFollowUp: "متابعة",
            aiActive: "الذكاء الاصطناعي نشط",
            aiPaused: "الذكاء الاصطناعي متوقف",
        },
        nav: {
            workspace: "مساحة العمل",
            automation: "الأتمتة",
            insights: "التحليلات",
            settings: "الإعدادات",
            dashboard: "لوحة القيادة",
            agenda: "الأجندة",
            patients: "المرضى",
            conversations: "المحادثات",
            recovery: "الاسترداد",
            aiAssistant: "مساعد الذكاء الاصطناعي",
            followups: "متابعة ما بعد العملية",
            waitlist: "قائمة الانتظار",
            noShows: "المواعيد الفائتة",
            analytics: "الإحصائيات",
            revenue: "الإيرادات",
            clinic: "العيادة",
            team: "الفريق",
            aiSettings: "إعدادات الذكاء الاصطناعي",
            communication: "التواصل",
            integrations: "التكامل",
            patientRecovery: "استرداد المرضى",
            features: "المميزات",
            security: "الأمان",
            pricing: "الأسعار",
            login: "تسجيل الدخول",
            start: "ابدأ الآن",
            "catalog": "Catalog",
            "securityAndAudit": "الأمان والتدقيق"
        },
        topbar: {
            searchPlaceholder: "بحث عن مريض، موعد...",
            notifications: "الإشعارات",
            markAllRead: "تحديد الكل كمقروء",
            noNotifications: "لا توجد إشعارات",
            help: "المساعدة",
            gettingStarted: "دليل البداية",
            howRecoveryWorks: "كيف يعمل استرجاع المواعيد",
            contactSupport: "الاتصال بالدعم الفني",
            currentClinic: "العيادة الحالية",
            active: "مفعل",
            interfaceLanguage: "لغة الواجهة",
            clinicSettings: "إعدادات العيادة",
            team: "فريق العمل",
            logout: "تسجيل الخروج",

            guideModalTitle: "دليل البداية 🚀",
            guideModalDesc: "مرحبًا بك في مستقبل إدارة عيادتك.",
            guideSection1Title: "🌟 ميزات غير مسبوقة لمرضاك",
            guideSection1Desc: "تجربة المريض لم تكن يومًا بهذه السلاسة. على واتساب، يتفاعل الذكاء الاصطناعي بشكل طبيعي كمساعد بشري حقيقي:",
            guideFeat1Title: "حجز المواعيد الذكي",
            guideFeat1Desc: "يطلب المريض موعدًا، يتحقق الذكاء الاصطناعي من التوفر، ويقيم الحالة الطارئة، ويحجز مباشرة.",
            guideFeat2Title: "إدارة العائلة (الأقارب)",
            guideFeat2Desc: "يمكن للمريض حجز موعد لنفسه أو لقريب أو لطفل. الذكاء الاصطناعي يفهم السياق.",
            guideFeat3Title: "متابعة الملف الطبي",
            guideFeat3Desc: "الذكاء الاصطناعي قادر على إجابة أسئلة المرضى حول ملفاتهم أو التوصيات بعد العملية.",
            guideFeat4Title: "متعدد اللغات وطبيعي",
            guideFeat4Desc: "يتكيف مع نبرة المريض ولغته (عربي، فرنسي، إنجليزي...) لبناء الثقة.",
            guideSection2Title: "⚙️ الإعداد الأولي",
            guideSection2Desc: "لكي يعمل الذكاء الاصطناعي، يحتاج فقط إلى معرفة قواعد عيادتك.",
            guideConfig1: "1. إعدادات العيادة: تفاصيل الاتصال وأوقات العمل.",
            guideConfig2: "2. الفريق: أضف موظفيك بنظام أدوار آمن جدًا.",
            guideConfig3: "3. مساعد الذكاء الاصطناعي: حدد دليل الخدمات (المدة، السعر) وتعليماتك.",
            guideSection3Title: "2️⃣ الإشراف على المحادثات والتدخل",
            guideSection3Desc: "انتقل إلى علامة التبويب المحادثات لمتابعة نشاط الذكاء الاصطناعي.",
            guideSup1Title: "آلي 100%:",
            guideSup1Desc: "في معظم الحالات، يقيم الذكاء الاصطناعي الحاجة ويؤكد الموعد دون أي تدخل منك.",
            guideSup2Title: "التصعيد الذكي للإنسان:",
            guideSup2Desc: "يكتشف الذكاء الاصطناعي حدوده وينقل المحادثة إليك (مع تنبيه مرئي) في حالات معينة:",
            guideSup2Bul1: "أسئلة طبية بحتة (تشخيص، أعراض معقدة).",
            guideSup2Bul2: "طلبات تسعير ضخمة (زراعة، تقويم شامل).",
            guideSup2Bul3: "مرضى غاضبون أو غير راضين.",
            guideSup2Bul4: "سوء فهم أو شك من قبل الذكاء الاصطناعي.",
            guideSup3Title: "إشراف في الوقت الفعلي:",
            guideSup3Desc: "تقرأ كل شيء مباشرة. عند التصعيد، تتولى السكرتارية أو الطبيب الرد بسلاسة.",
            recoveryModalTitle: "كيف يعمل استرجاع المواعيد؟ 💸",
            recoveryModalDesc: "محرك استرجاع الإيرادات الخاص بالذكاء الاصطناعي.",
            recoveryIntro: "هنا يتحول الذكاء الاصطناعي إلى مولد للإيرادات. فهو يتابع كل فرصة ضائعة لتحويلها إلى موعد مؤكد، دون أن تفعل شيئًا.",
            recoverySec1Title: "1. درع ضد الغياب (No-Shows)",
            recoverySec1Bul1Title: "الاكتشاف:",
            recoverySec1Bul1Desc: "عندما يلغي المريض في اللحظة الأخيرة أو لا يحضر.",
            recoverySec1Bul2Title: "إجراء فوري:",
            recoverySec1Bul2Desc: "يتصل به الذكاء الاصطناعي آليًا بلطف عبر واتساب لمعرفة السبب واقتراح موعد جديد.",
            recoverySec1Bul3Title: "ملء فوري (قائمة الانتظار):",
            recoverySec1Bul3Desc: "إذا توفر موعد اليوم، يتصل الذكاء الاصطناعي فورًا بالمرضى في قائمة الانتظار. سيبقى جدولك ممتلئًا دائمًا!",
            recoverySec2Title: "2. حملات المتابعة (Follow-ups)",
            recoverySec2Desc: "يدير الذكاء الاصطناعي 5 أنواع من المتابعات الاستباقية حتى لا تفقد أي مريض:",
            recoverySec2Bul1Title: "الغياب والإلغاء:",
            recoverySec2Bul1Desc: "إعادة جدولة فورية.",
            recoverySec2Bul2Title: "اقتراح موعد:",
            recoverySec2Bul2Desc: "إرسال تنبيهات لقائمة الانتظار.",
            recoverySec2Bul3Title: "تذكير بالفحص:",
            recoverySec2Bul3Desc: "استدعاء آلي للمرضى للمراجعة السنوية أو نصف السنوية.",
            recoverySec2Bul4Title: "إعادة التفاعل:",
            recoverySec2Bul4Desc: "تواصل ودي مع المرضى المنقطعين منذ فترة طويلة.",
            recoveryTip: "💡 نصيحة للمحترفين: تتبع أداء الذكاء الاصطناعي في الوقت الفعلي في علامة التبويب الرؤى > الإيرادات.",
            supportModalTitle: "الاتصال بالدعم الفني 📞",
            supportModalDesc: "نحن هنا لمساعدتك.",
            supportEmail: "البريد الإلكتروني",
            supportPhoneTitle: "واتساب مباشر",
            supportPhoneDesc: "+216 XX XXX XXX (9ص-6م)",
            supportClose: "إغلاق",

        },
        clinicSettings: {
            title: "إعدادات وبيانات العيادة",
            subtitle: "إدارة البيانات الرسمية للعيادة، التخصص الطبي، والعنوان المعتمد للمرضى.",
            save: "حفظ التغييرات",
            saving: "جاري الحفظ...",
            generalInfo: "المعلومات العامة",
            generalInfoDesc:
                "تُستخدم هذه البيانات من طرف المساعد الذكي لتوجيه المرضى وتأكيد المواعيد عبر واتساب.",
            clinicName: "اسم العيادة / المركز الطبي",
            clinicNamePlaceholder: "مثال: عيادة الدكتور سامي بن عمر",
            specialty: "التخصص الطبي",
            specialtyPlaceholder: "مثال: طب وجراحة الأسنان، أمراض القلب، طب الأطفال...",
            address: "العنوان الكامل",
            addressPlaceholder: "مثال: عمارة كورال، الطابق الثاني، ضفاف البحيرة 2، تونس",
            currencies: {
                label: "العملة / Currency",
                placeholder: "البحث عن العملة...",
                notFound: "لم يتم العثور على العملة.",
                list: [
                    { value: "TND", label: "TND - دينار تونسي" },
                    { value: "EUR", label: "EUR - يورو" },
                    { value: "USD", label: "USD - دولار أمريكي" },
                    { value: "CAD", label: "CAD - دولار كندي" },
                    { value: "DZD", label: "DZD - دينار جزائري" },
                    { value: "MAD", label: "MAD - درهم مغربي" },
                    { value: "SAR", label: "SAR - ريال سعودي" },
                    { value: "AED", label: "AED - درهم إماراتي" },
                    { value: "GBP", label: "GBP - جنيه إسترليني" },
                    { value: "CHF", label: "CHF - فرنك سويسري" },
                ]
            },
            phone: "رقم هاتف العيادة الرسمي",
            phonePlaceholder: "مثال: 480 962 71 216+",
            email: "البريد الإلكتروني المهني",
            emailPlaceholder: "مثال: contact@clinic-medical.tn",
            businessHours: "أوقات العمل والمواعيد",
            businessHoursDesc: "تحديد أوقات عمل العيادة المعتمدة لحجز مواعيد المرضى.",
            openingHours: "أوقات العمل الأسبوعية",
            openingHoursPlaceholder:
                "مثال: من الإثنين إلى الجمعة من 08:30 إلى 18:00، السبت من 08:30 إلى 13:00",
            savedSuccess: "تم حفظ بيانات العيادة بنجاح!",
            saveError: "حدث خطأ أثناء حفظ بيانات العيادة.",
            activeBadge: "حساب عيادة نشط",
            verifiedClinic: "عيادة معتمدة ومتصلة بالذكاء الاصطناعي",
            quickStats: "نظرة عامة",
            plan: "الخطة الاحترافية Pro",
        },
        teamSettings: {
            title: "فريق العمل وإدارة الصلاحيات",
            subtitle:
                "إدارة حسابات العاملين بالعيادة (أطباء، سكرتاريا، مساعدين) وتخصيص صلاحيات الوصول بدقة.",
            addMember: "إضافة عضو جديد",
            editMember: "تعديل العضو والصلاحيات",
            deleteMember: "حذف العضو",
            deleteConfirm: "هل أنت متأكد من رغبتك في حذف هذا العضو من الفريق؟",
            totalMembers: "إجمالي الفريق",
            doctorsCount: "الأطباء والممارسين",
            staffCount: "السكرتاريا والمساعدين",
            activeAccounts: "الحسابات المفعلة",
            memberList: "أعضاء العيادة",
            memberListDesc: "قائمة المستخدمين المصرح لهم بالدخول إلى مساحة العمل للعيادة.",
            permissionsTitle: "صلاحيات وحقوق الوصول",
            permissionsDesc: "حدد بدقة ما يُسمح لهذا المستخدم بالقيام به أو الاطلاع عليه.",
            firstName: "الاسم",
            lastName: "اللقب",
            email: "البريد الإلكتروني المهني",
            phone: "رقم الهاتف",
            specialty: "الوظيفة / التخصص",
            role: "الدور في العيادة",
            password: "كلمة المرور الأولية",
            passwordPlaceholder: "اتركه فارغاً لإنشاء كلمة مرور تلقائية",
            status: "حالة الحساب",
            active: "نشط",
            inactive: "معطل / موقوف",
            saveMember: "حفظ بيانات العضو",
            saving: "جاري الحفظ...",
            createdSuccess: "تمت إضافة العضو بنجاح إلى الفريق!",
            updatedSuccess: "تم تحديث الملف الشخصي والصلاحيات بنجاح!",
            deletedSuccess: "تم حذف العضو من الفريق بنجاح.",
            statusUpdated: "تم تحديث حالة الحساب.",
            passwordResetSuccess: "تمت إعادة تعيين كلمة المرور بنجاح!",
            roles: {
                clinic_owner: "الطبيب الرئيسي / صاحب العيادة",
                dentist: "طبيب ممارس",
                receptionist: "سكرتير(ة) / استقبال",
                assistant: "مساعد(ة) طبي(ة)",
                super_admin: "المسؤول العام",
            },
            permissions: {
                appointmentsTitle: "📅 جدول المواعيد والحجوزات",
                appointmentsDesc: "الاطلاع على الجدول، تسجيل، تعديل أو إلغاء مواعيد المرضى.",
                patientsTitle: "👥 ملفات وسجلات المرضى",
                patientsDesc: "الوصول لدليل المرضى، السجلات الطبية والبيانات الصحية.",
                conversationsTitle: "💬 رسائل واتساب والمحادثات",
                conversationsDesc: "قراءة رسائل المرضى والرد المباشر عبر واتساب.",
                aiConfigTitle: "🤖 إعدادات الذكاء الاصطناعي والأسعار",
                aiConfigDesc: "تعديل تعليمات الطبيب للمساعد الذكي، تسعيرات الخدمات وقواعد التحويل.",
                analyticsTitle: "📊 التحليلات والمداخيل",
                analyticsDesc: "الاطلاع على لوحات المداخيل المسترجعة والإحصائيات المالية.",
                settingsTitle: "⚙️ إعدادات العيادة وإدارة الفريق",
                settingsDesc: "تعديل بيانات العيادة وإدارة صلاحيات المستخدمين.",
            },
        },
        common: {
            save: "حفظ",
            cancel: "إلغاء",
            loading: "جاري التحميل...",
            success: "تم بنجاح",
            error: "خطأ",
            active: "نشط",
            inactive: "معطل",
            edit: "تعديل",
            delete: "حذف",
            actions: "الإجراءات",
            resetPassword: "إعادة تعيين كلمة المرور",
            confirm: "تأكيد",
        },
        patientsPage: {
            title: "المرضى",
            subtitle: "إجمالي المرضى: {count}",
            newPatient: "مريض جديد",
            successAdd: "تمت إضافة المريض بنجاح.",
            errorAdd: "خطأ أثناء إضافة المريض.",
            firstName: "الاسم الأول",
            lastName: "اللقب",
            firstNameEx: "مثال: أحمد",
            lastNameEx: "مثال: بن علي",
            phone: "الهاتف",
            email: "البريد الإلكتروني",
            emailOptional: "اختياري",
            createPatient: "إضافة المريض",
            searchPlaceholder: "ابحث بالاسم، الهاتف...",
            selected: "تم تحديد {count}",
            message: "رسالة",
            campaign: "حملة",
            export: "تصدير",
            loadingPatients: "جاري تحميل المرضى...",
            errorLoading: "تعذر تحميل قائمة المرضى.",
            patient: "المريض",
            contact: "جهة الاتصال",
            lastVisit: "آخر زيارة",
            status: "الحالة",
            visits: "الزيارات",
            noPatientSearch: 'لم يتم العثور على مرضى لـ "{query}".',
            noPatient: "لا يوجد مرضى.",
        },
        agendaPage: {
            title: "جدول المواعيد الطبي",
            subtitleDay: "{date}",
            subtitleWeek: "أسبوع من {start} إلى {end}",
            subtitleMonth: "شهر {month}",
            subtitleList: "قائمة المواعيد التفصيلية",
            today: "اليوم",
            day: "يوم",
            week: "أسبوع",
            month: "شهر",
            list: "قائمة",
            newAppointment: "موعد جديد",
            planAppointment: "حجز موعد",
            selectPatient: "اختر مريض مسجل",
            date: "التاريخ",
            startTime: "وقت البدء",
            treatment: "نوع العلاج / الخدمة",
            duration: "المدة المتوقعة",
            notes: "ملاحظات وتعليمات",
            notesPlaceholder: "مثال: أول زيارة...",
            cancel: "إلغاء",
            save: "حفظ الموعد",
            statsTotal: "إجمالي المواعيد",
            statsConfirmed: "مؤكدة",
            statsPending: "قيد الانتظار",
            statsAi: "حجزت بالذكاء الاصطناعي",
            statsRevenue: "الإيرادات المتوقعة",
            searchPlaceholder: "ابحث عن مريض، هاتف، علاج...",
            filterAll: "الكل",
            filterConfirmed: "مؤكد",
            filterScheduled: "مجدول",
            filterCompleted: "مكتمل",
            filterCancelled: "ملغى",
            filterNoShow: "🐰 غياب",
            sourceAll: "جميع المصادر",
            sourceAi: "🤖 عبر الذكاء الاصطناعي",
            sourceManual: "👤 السكرتارية / يدوي",
            treatmentsAll: "كل العلاجات",
            reset: "إعادة ضبط",
            errorLoading: "تعذر تحميل الجدول.",
            retry: "إعادة المحاولة",
            syncing: "جاري مزامنة المواعيد...",
            freeSlot: "موعد متاح — انقر للحجز",
        },
        dashboardPage: {
            hello: "مرحباً {name} 👋",
            loadingError: "خطأ في التحميل",
            loadingErrorDesc: "تعذر تحميل لوحة التحكم.",
            startRecovery: "بدء استرجاع المرضى",
            aiPerformance: "أداء الذكاء الاصطناعي",
            aiPerformanceDesc:
                "مساعدك الافتراضي يدير المحادثات باستقلالية، يقلل من الغيابات، ويسترجع الإيرادات المفقودة دون تدخل بشري.",
            automationRate: "معدل الأتمتة",
            recoveredRevenue: "الإيرادات المسترجعة",
            last30days: "آخر 30 يوم",
            apptsToday: "مواعيد اليوم",
            confirmedAppts: "{count} مؤكد",
            patientsToRecover: "مرضى للاسترجاع",
            thisMonth: "هذا الشهر",
            recentNoShows: "غيابات حديثة",
            last7days: "آخر 7 أيام",
            activeConversations: "محادثات نشطة",
            needsHuman: "{count} بانتظار الرد",
            todayAgenda: "جدول اليوم",
            plannedAppts: "{count} موعد مجدول",
            viewAgenda: "عرض الجدول",
            noApptsToday: "لا توجد مواعيد اليوم",
            unknownPatient: "مريض غير معروف",
            unspecifiedTreatment: "علاج غير محدد",
            aiPriorities: "أولويات الذكاء الاصطناعي",
            contactFirst: "المرضى الأولوية للاتصال",
            seeAll: "عرض الكل",
            noPriority: "لا يوجد مرضى ذوو أولوية",
            needsFollowup: "بحاجة للمتابعة",
            recoveryFunnel: "مسار الاسترجاع",
            noData: "لا توجد بيانات",
            freeSlots: "مواعيد متاحة",
            fillWithWaitlist: "للملء من قائمة الانتظار",
            waitlist: "قائمة الانتظار",
            aiActivity: "نشاط الذكاء الاصطناعي",
            last24h: "آخر 24 ساعة",
            inbox: "صندوق الوارد",
            estimatedImpact: "التأثير المتوقع",
            simulationBased: "محاكاة بناءً على بياناتك",
            potentialRemaining: "الإيرادات المحتملة المتبقية",
            messagesProcessed: "رسائل تمت معالجتها آلياً هذا الشهر",
            apptsCreated: "مواعيد أنشأها الذكاء الاصطناعي هذا الشهر",
            doctorPerformance: "أداء الأطباء",
            thisWeek: "هذا الأسبوع",
            weekOf: "أسبوع",
            headDoctor: "طبيب رئيسي",
            attendance: "حضور %",
            appointmentsAbbr: "مواعيد",
            patientsSeen: "مرضى",
            noShows: "غياب",
        },
        aiAssistantPage: {
            tabsPrompt: "التعليمات",
            tabsServices: "الخدمات والمدة",
            tabsRules: "قواعد العمل",
            tabsWhatsapp: "QR واتساب",
            openSimulator: "فتح المحاكي",
            saveChanges: "حفظ التغييرات",
            servicesTitle: "دليل الخدمات ومدة الاستشارة",
            servicesDesc:
                "قم بإعداد أنواع الرعاية المقدمة في العيادة. يخصص الذكاء الاصطناعي تلقائيًا كتلًا زمنية مستمرة تتوافق مع المدة الدقيقة لكل خدمة.",
            presetsHeader: "إعداد مسبق سريع حسب التخصص:",
            presetsHint: "نقرة واحدة للتحميل",
            activeServices: "الخدمات النشطة (",
            addService: "إضافة خدمة",
            serviceNamePlaceholder: "اسم الخدمة (مثال: تنظيف الأسنان)",
            serviceDescPlaceholder: "وصف أو تعليمات (مثال: 'فحص شامل، تنظيف بالموجات فوق الصوتية')...",
            agendaRulesTitle: "قواعد جدول الذكاء الاصطناعي",
            continuousAllocation: "تخصيص المواعيد المستمر",
            allocationDesc1: "إذا طلب مريض خدمة تستغرق ",
            allocationDesc2:
                " (مثل زراعة أو جراحة)، يتحقق الروبوت من جدولك لوجود كتلة زمنية مستمرة قدرها ",
            allocationDesc3: " متاحة وبدون تداخل.",
            priceTransparency: "شفافية الأسعار",
            priceTransparencyDesc:
                "المساعد يشارك فقط الأسعار التي أدخلتها هنا. لا يتم إعطاء أي أسعار وهمية للمرضى.",
            medicalGuardrails: "الحدود الطبية",
            guardrail1: "• الروبوت لا يقدم أبداً تشخيصاً طبياً.",
            guardrail2: "• العروض المعقدة أو المخصصة تُحال دائماً إلى استشارة سريرية.",
            promptTitle: "تعليمات مخصصة (موجه النظام)",
            promptDesc:
                "اذكر التفاصيل الخاصة بعيادتك التي يجب على الذكاء الاصطناعي احترامها دائماً في كل محادثة.",
            promptLabel: "توجيهات ومعلومات محددة للممارس",
            promptBadge: "تُحقن تلقائياً في الذكاء الاصطناعي",
            promptPlaceholder:
                "مثال: مرحباً، أنا مساعد الدكتور... نرحب بالأطفال من سن 6 سنوات. لا نقبل الشيكات.",
            modeTitle: "وضع التشغيل والنبرة",
            modeAuto: "وضع مستقل 100%",
            modeAutoDesc: "الذكاء الاصطناعي يحجز، يُعدّل ويُلغي المواعيد مباشرة في جدولك.",
            modeManual: "وضع التحقق اليدوي",
            modeManualDesc: "الذكاء الاصطناعي يقترح مواعيد، لكنك تؤكد قبل الحجز.",
            toneLabel: "نبرة الردود",
            toneFriendly: "ودي ومتعاطف",
            toneProfessional: "مهني ومباشر",
            rulesTitle: "قواعد الصلاحيات والتصعيد",
            rulesDesc:
                "حدد بدقة ما يُسمح للذكاء الاصطناعي بفعله، والحالات التي يجب فيها تسليم المحادثة فوراً إلى إنسان.",
            capabilitiesTitle: "الصلاحيات المسموحة",
            capBooking: "حجز المواعيد التلقائي",
            capBookingDesc: "يسمح للذكاء الاصطناعي باقتراح وحجز المواعيد.",
            capUrgency: "التعامل مع الطوارئ (تصفية)",
            capUrgencyDesc: "يكتشف كلمات مثل 'ألم'، 'طوارئ' وينبهك.",
            capPricing: "إعطاء الأسعار (عروض بسيطة)",
            capPricingDesc: "يشارك أسعار الخدمات العادية (تنظيف، استشارة).",
            capMultilingual: "متعدد اللغات التلقائي",
            capMultilingualDesc: "يرد بالفرنسية، العربية أو الإنجليزية حسب المريض.",
            escalationTitle: "محفزات التصعيد (تسليم للإنسان)",
            escMedical: "أسئلة طبية بحتة",
            escMedicalDesc: "يسلم المحادثة إذا طلب المريض نصيحة سريرية أو تشخيصاً.",
            escFrustrated: "مريض غاضب أو منفعل",
            escFrustratedDesc: "يصمت الذكاء الاصطناعي وينبه السكرتارية إذا ارتفعت النبرة.",
            escQuote: "طلب عرض أسعار معقد (مثل تقويم طويل)",
            escQuoteDesc: "يوجه المريض لحجز استشارة فعلية لتقديم عرض الأسعار.",
            escConfidence: "ثقة منخفضة للذكاء الاصطناعي",
            escConfidenceDesc: "في حالة الشك، يفضل الذكاء الاصطناعي عدم الرد وينبهك.",
            waTitle: "اتصال واتساب ورمز QR",
            waDesc: "للسماح للمساعد بالتحدث مع مرضاك، قم بربط رقم واتساب للأعمال أو شخصي.",
            waStatusTitle: "الجهاز المتصل",
            waStatusLabel: "الحالة: ",
            waOnline: "متصل وجاهز",
            waNumber: "الرقم:",
            waBattery: "البطارية: 85%",
            waScanTitle: "مسح رمز QR",
            waScanDesc: "افتح واتساب على هاتفك > الأجهزة المرتبطة > ربط جهاز.",
            waLinkTitle: "إنشاء رابط واتساب قصير",
            waDirectLink: "رابط مباشر لمساعدك",
            waPrefill: "رسالة معبأة مسبقاً (اختياري)",
            waGenerateLink: "إنشاء رابط قصير",
            waCopyLink: "نسخ الرابط",
            waCopyHtml: "نسخ كود HTML",
            title: "مساعد الذكاء الاصطناعي وإعدادات واتساب",
            subtitle: "تعليمات الذكاء الاصطناعي، رمز الاستجابة السريعة، وقواعد حجز العيادة.",
            saveBtn: "حفظ التغييرات",
            saving: "جاري الحفظ...",
            successSave: "تم حفظ التعليمات والخدمات والإعدادات بنجاح!",
            errorSave: "حدث خطأ أثناء حفظ الإعدادات.",
            waCoordTitle: "بيانات واتساب العيادة",
            waCoordDesc: "الرقم ورسالة الترحيب المعبأة مسبقًا لمرضاك.",
            waPrefillWith: "تعبئة مسبقة بـ:",
            waOfficialNum: "رقم العيادة الرسمي",
            waSandboxNum: "رقم اختبار Sandbox",
            waConfiguredNum: "رقم واتساب المكوّن",
            waPrefillMsg: "رسالة معبأة مسبقًا عند مسح رمز QR",
            waMetaGuideTitle: "⚠️ دليل اتصال Meta Sandbox (ضروري)",
            waMetaGuideDesc: "اتبع هاتين الخطوتين في Meta Developers لتصل رسائل واتساب الحقيقية إلى الذكاء الاصطناعي:",
            waMetaStep1Title: "الاشتراك في حقل 'الرسائل' للويب هوك (مطلوب في Meta)",
            waMetaStep2Title: "أضف رقم هاتفك في Meta Sandbox",
            waUsageTitle: "كيفية استخدام رمز QR في العيادة",
            waUsageDesc: "سهّل الوصول لمرضاك في مكتب الاستقبال أو على مواد التواصل الخاصة بك.",
            waUsage1Title: "1. الاستقبال والملصقات",
            waUsage1Desc: "اطبع رمز QR على مكتب الاستقبال ليتمكن المرضى من حجز موعد في 5 ثوانٍ.",
            waUsage2Title: "2. بطاقات العمل",
            waUsage2Desc: "أضف رمز QR خلف بطاقات المواعيد لإعادة الجدولة والمراجعات.",
            waUsage3Title: "3. الموقع الإلكتروني ووسائل التواصل",
            waUsage3Desc: "شارك رابط wa.me المباشر على صفحتك في إنستغرام أو موقعك لجذب مرضى جدد.",
            waActiveQRTitle: "رمز QR واتساب نشط",
            waActiveQRDesc: "امسح هذا الرمز بكاميرتك لبدء محادثة واتساب فورًا:",
            waCopyDirectLink: "نسخ الرابط المباشر (wa.me)",
            waTestInWeb: "اختبار في واتساب ويب",
            capReminders: "تأكيدات وتذكيرات تلقائية عبر الرسائل",
            capRemindersDesc: "يرسل ملخصًا واضحًا بالتاريخ والوقت بمجرد تأكيد الموعد.",
            capDoctorEscalation: "التصعيد للطبيب / الاستقبال",
            capDoctorEscalationDesc: "ينقل المحادثة للفريق الطبي بمجرد طلب المريض متابعة أو ممارس.",
            "communicationTone": "communicationTone",
            "toneEmpathic": "toneEmpathic",
            "typicalPrices": "typicalPrices",
            "engineState": "engineState",
            "webhookInstructions": "webhookInstructions",
            "webhookUrl": "webhookUrl",
            "verifyToken": "verifyToken",
            "webhookInstruction1": "webhookInstruction1",
            "webhookInstruction2": "webhookInstruction2",
            "statusLabel": "statusLabel",
            "engineAiLabel": "engineAiLabel"
        },
        waitlistPage: {
            simulateCancel: "محاكاة إلغاء",
            waitingPatients: "المرضى في الانتظار",
            activeRequests: "الطلبات النشطة",
            highPriority: "أولوية عالية / طوارئ",
            contactFirst: "للاتصال أولاً",
            aiTargeted: "مرضى مستهدفون (ذكاء اصطناعي)",
            freeSlots: "{count} موعد متاح للتخصيص",
            aiFill: "ملء المواعيد بالذكاء الاصطناعي",
            algo247: "خوارزمية آلية 24/7",
            freedSlotsAI: "عروض المواعيد المتاحة (ذكاء اصطناعي)",
            targetedPatientsCount: "{patients} مريض مستهدف - {slots} موعد متاح",
            loadingOffers: "جاري تحميل العروض...",
            allSlotsFull: "جميع المواعيد ممتلئة",
            aiSuggests:
                "بمجرد إلغاء مريض لموعده، سيقوم الذكاء الاصطناعي على الفور بعرض الموعد المتاح للمريض الأنسب في قائمة الانتظار.",
            testWithCancel: "اختبر مع إلغاء موعد",
            patientsInWaitlist: "المرضى المسجلون في قائمة الانتظار",
            waitingForSlot: "{count} مريض في انتظار موعد",
            filterPlaceholder: "تصفية بالاسم، العلاج، الهاتف...",
            filterAll: "الكل",
            filterHigh: "عالي",
            filterMedium: "متوسط",
            filterLow: "منخفض",
            loading: "جاري التحميل...",
            noMatchingPatients: "لا يوجد مرضى مطابقين.",
            contactWhatsApp: "التواصل عبر واتساب",
            removeFromWaitlist: "إزالة من قائمة الانتظار",
            page: "صفحة",
            of: "من",
            prev: "السابق",
            next: "التالي",
            aiRecommended: "موصى به (الذكاء الاصطناعي)",
            chooseSlot: "اختر الموعد للتخصيص:",
            availableSlot: "الموعد المتاح:",
            option: "خيار",
            whatsapp: "واتساب",
            validateSlot: "تأكيد هذا الموعد",
            booking: "جاري الحجز...",
            contactLogBtn: "سجل الاتصال",
            contactLogTitle: "سجل الاتصال (قائمة الانتظار)",
            contactLogDesc: "سجل رد فعل المريض بعد عرض الموعد.",
            contactChannel: "قناة الاتصال",
            exchangeOutcome: "نتيجة المكالمة",
            notesOptional: "ملاحظات / تفاصيل (اختياري)",
            notesPlaceholder: "مثال: أكد المريض توفره وسيصل قبل 10 دقائق...",
            cancel: "إلغاء",
            saveAttempt: "حفظ المحاولة",
            saving: "جاري الحفظ...",
            title: "قائمة الانتظار الذكية",
            subtitle: "تعبئة الإلغاءات تلقائيًا عن طريق تقديم المواعيد للمرضى المنتظرين.",
        },
        followupsPage: {
            statusPending: "قيد الانتظار",
            statusInProgress: "قيد التنفيذ",
            statusCompleted: "مكتمل",
            statusCancelled: "ملغى",
            statusExpired: "منتهي الصلاحية",
            typeAbsence: "غياب",
            typeCancel: "إلغاء",
            typeReengage: "إعادة تفعيل",
            typeCheckup: "تذكير بالفحص",
            typeSlotOffer: "عرض موعد",
            kpiPending: "قيد الانتظار",
            kpiInProgress: "قيد التنفيذ",
            kpiCompletedToday: "مكتمل (اليوم)",
            kpiExpired: "منتهي الصلاحية",
            filterActive: "نشط (قيد الانتظار / قيد التنفيذ)",
            filterAllPriorities: "جميع الأولويات",
            filterAllTypes: "جميع الأنواع",
            colPatient: "المريض",
            colType: "النوع",
            colPriority: "الأولوية",
            colStatus: "الحالة",
            colAttempts: "المحاولات",
            colActions: "إجراءات",
            noTasks: "لم يتم العثور على مهام.",
            btnComplete: "إكمال",
            btnJournal: "سجل",
            journalTitle: "سجل الاتصال",
            journalChannel: "القناة",
            channelPhone: "اتصال",
            channelWA: "واتساب",
            channelSMS: "رسالة نصية",
            channelEmail: "بريد إلكتروني",
            channelVisit: "زيارة",
            journalOutcome: "النتيجة",
            outNoAnswer: "لا يوجد رد",
            outVoicemail: "تم ترك رسالة صوتية",
            outAgreed: "تم الاتصال - موافق",
            outDeclined: "تم الاتصال - رفض / غير مهتم",
            outInvalid: "رقم غير صالح",
            journalNotes: "ملاحظات (اختياري)",
            journalNotesPlaceholder: "تفاصيل المكالمة...",
            journalSave: "حفظ المحاولة",
            journalSaving: "جاري الحفظ...",
            toastSuccess: "تم إكمال المهمة بنجاح",
            toastAttempt: "تم تسجيل المحاولة",
            loading: "جاري التحميل...",
            title: "متابعة ما بعد العملية",
            subtitle: "يقوم الذكاء الاصطناعي بتفقد مرضاك تلقائيًا بعد إجراءاتهم.",
            "priorityHigh": "priorityHigh",
            "priorityMedium": "priorityMedium",
            "priorityLow": "priorityLow"
        },
        recoveryPage: {
            title: "استرجاع المرضى",
            subtitle: "تحديد المرضى الذين قد تفقدهم عيادتك تلقائياً.",
            detect: "اكتشاف",
            launchCampaign: "إطلاق حملة",
            analyzed: "مرضى تم تحليلهم",
            toRecover: "للاسترجاع",
            contacted: "تم التواصل",
            replied: "ردوا",
            recoveredAppts: "مواعيد مسترجعة",
            completed: "حضروا للعيادة",
            estimatedValue: "القيمة المتوقعة",
            bookedValue: "القيمة المحجوزة",
            recoveredValue: "القيمة المسترجعة",
            funnelTitle: "مسار الاسترجاع",
            funnelSubtitle: "الأداء العام",
            funnelIdentified: "مرضى محددون",
            funnelContacted: "تم التواصل",
            funnelReplied: "ردوا",
            funnelBooked: "تم الحجز",
            funnelVisited: "حضروا للعيادة",
            opportunitiesTitle: "فرص الاسترجاع",
            opportunitiesSubtitle: "تم تحديد {count} فرصة",
            campaigns: "حملات",
            colPatient: "المريض",
            colType: "النوع",
            colReason: "السبب",
            colPriority: "الأولوية",
            colEstValue: "قيمة متوقعة",
            colStatus: "الحالة",
            colDetectedOn: "تاريخ الاكتشاف",
            unknownPatient: "مريض غير معروف",
            viewBtn: "عرض",
            errorLoading: "تعذر تحميل الفرص.",
            noOpportunities: 'لا توجد فرص استرجاع. انقر على "اكتشاف" لتحليل مرضاك.',
            typeInactive: "مريض غير نشط",
            typeInterrupted: "علاج متوقف",
            typePendingQuote: "عرض سعر معلق",
            typeNoShow: "تخلف عن الحضور",
            typeCancellation: "إلغاء",
            typeOverdue: "فحص متأخر",
            typeFollowUp: "متابعة",
            statusIdentified: "محدد",
            statusQueued: "في الانتظار",
            statusContacted: "تم التواصل",
            statusResponded: "رد",
            statusBooked: "حجز",
            statusVisited: "حضر",
            statusNoResponse: "لا رد",
            statusDismissed: "مستبعد",
            detectionComplete: "اكتمل الفحص. تم إنشاء {count} فرصة.",
            detectionError: "حدث خطأ أثناء الاكتشاف.",
        },
        noShowsPage: {
            viewAgenda: "عرض الأجندة",
            recoveryModule: "وحدة الاسترداد بالذكاء الاصطناعي",
            absencesToday: "الغيابات اليوم",
            missedToday: "المواعيد الفائتة هذا اليوم",
            thisWeek: "هذا الأسبوع",
            weekTotal: "التراكمي للأسبوع الحالي",
            recoveredPatients: "المرضى المستردون",
            recoveredDesc: "المواعيد المحجوزة بعد متابعة واتساب",
            recoveryRate: "معدل الاسترداد",
            recoveryRateDesc: "الغيابات المحولة لمواعيد جديدة",
            historyTitle: "سجل المواعيد الفائتة",
            historyDesc: "كل غياب يطلق تلقائياً فرصة استرداد عبر واتساب.",
            filterAll: "الكل",
            filterToday: "اليوم",
            filterPending: "قيد المتابعة",
            searchPlaceholder: "البحث عن مريض، علاج...",
            loading: "جاري تحميل المواعيد الفائتة...",
            errorLoading: "حدث خطأ أثناء تحميل البيانات.",
            noAbsencesTitle: "لم يتم العثور على غيابات",
            noAbsencesDescFilter: "لا توجد نتائج تطابق فلاتر البحث الخاصة بك.",
            noAbsencesDesc: "تهانينا! لم يتم تسجيل أي مواعيد فائتة.",
            colPatient: "المريض",
            colDate: "تاريخ الموعد",
            colSlot: "الوقت",
            colTreatment: "سبب الزيارة",
            colScore: "سجل الغيابات",
            colStatus: "حالة متابعة واتساب",
            colActions: "إجراءات سريعة",
            statusIdentified: "⏳ في انتظار المتابعة",
            statusContacted: "💬 تم التواصل عبر واتساب",
            statusResponded: "📩 رد على الذكاء الاصطناعي",
            statusBooked: "🎉 تم إعادة الجدولة",
            statusVisited: "🏥 حضر للعيادة",
            statusNoResponse: "❌ لا يوجد رد",
            statusDismissed: "🚫 مُستبعد",
            firstAbsence: "أول غياب",
            multipleAbsences: "{count} غيابات",
            btnWhatsApp: "واتساب",
            btnReschedule: "إعادة جدولة",
            btnRecord: "ملف",
        },
        login: {
            title: "مرحباً بعودتك",
            subtitle: "قم بتسجيل الدخول إلى مساحة العيادة أو المركز الطبي الخاص بك.",
            email: "البريد الإلكتروني",
            password: "كلمة المرور",
            forgot_password: "هل نسيت كلمة المرور؟",
            submit: "تسجيل الدخول",
            loading: "جاري تسجيل الدخول...",
            error_default: "خطأ في الاتصال.",
            back: "العودة للموقع",
        },
        landing: {
            hero: {
                chip1: "مساعد متاح 24/7",
                chip2: "تصعيد بشري عند الحاجة",
                title1: "عيادتك",
                title2: "لا تنام",
                title3: "بعد اليوم.",
                subtitle:
                    "منصة عيادية تربط الأجندة، سجلات المرضى، الفريق وواتساب. ذكاء اصطناعي يعمل لعيادتك ضمن حدود تتحكم بها.",
                cta1: "الدخول إلى مساحتي",
                cta2: "شاهد كيف نحمي بياناتك",
            },
            pipeline: {
                kicker: "ما يحدث خلف كل رسالة",
                title: "رسالة واحدة، ستة فحوصات.",
                subtitle:
                    "تمر كل رسالة واتساب بنفس حواجز الأمان قبل اتخاذ أي إجراء. عندما يكون الموضوع طبياً، يتوقف الذكاء الاصطناعي ويحول الأمر لفريقك.",
            },
            gates: {
                msg_received: "تم استلام الرسالة",
                msg_received_desc: "استقبال فوري",
                context_isolated: "عزل السياق",
                context_isolated_desc: "فصل تام لكل عيادة",
                intent_understood: "فهم القصد",
                intent_understood_desc: "لغات متعددة وتحليل دلالي",
                ai_guardrail: "حاجز أمان طبي",
                ai_guardrail_desc: "يتوقف الذكاء الاصطناعي عند الطوارئ",
                slot_validated: "التحقق من الموعد",
                slot_validated_desc: "التحقق من الأجندة",
                waitlist_check: "إدارة قائمة الانتظار",
                waitlist_check_desc: "ملء الإلغاءات تلقائياً",
                reminders: "تذكير ذكي",
                reminders_desc: "تذكير قبل الموعد بـ 24 ساعة",
                confirmation: "تأكيد ومزامنة",
                confirmation_desc: "مزامنة بدون تدخل بشري",
                escalation: "تصعيد بشري",
            },
            scenarios: {
                tab1: "مريض جديد",
                msg1_1: "مرحباً، أريد حجز موعد.",
                reply1_1: "مرحباً! أنا المساعد الطبي. هل يمكنك إخباري بسبب الزيارة؟",
                msg1_2: "زيارة فحص روتيني.",
                reply1_2: "ممتاز. لدي مواعيد متاحة يوم الخميس الساعة 2 ظهراً أو الجمعة الساعة 10 صباحاً. أي وقت يناسبك أكثر؟",
                tab2: "مريض حالي",
                msg2_1: "أريد إلغاء موعدي لغد.",
                reply2_1: "حسناً، تم إلغاء موعدك لغد. هل ترغب في إعادة جدولته للأسبوع القادم؟",
                msg2_2: "لا شكراً. بالمناسبة، أشعر بألم شديد في قلبي منذ الصباح.",
                reply2_2: "أكتشف احتمال وجود حالة طبية طارئة. سأقوم فوراً بتحويل رسالتك إلى الفريق الطبي للعيادة.",
            },
            security: {
                kicker: "الأمان والامتثال",
                title: "بياناتك محمية.",
                subtitle: "تضمن بنيتنا التحتية السرية التامة لسجلات المرضى والمحادثات.",
                disclaimer: "متوافق مع معايير الأمان الدولية.",
                layers: {
                    access: {
                        title: "وصول آمن",
                        desc: "مصادقة قوية تضمن وصول الأشخاص المصرح لهم فقط إلى مساحة العمل الخاصة بك.",
                    },
                    tenant: {
                        title: "عزل البيانات",
                        desc: "يتم فصل بيانات عيادتك وعزلها تماماً عن أي مؤسسة أخرى.",
                    },
                    validation: {
                        title: "تحقق صارم",
                        desc: "يتم فحص وتدقيق كل البيانات المدخلة بصرامة قبل معالجتها بالنظام.",
                    },
                    idempotent: {
                        title: "التطابق الإجرائي",
                        desc: "تُعالج الطلبات بدقة لضمان عدم تكرار أي إجراء أو حجز.",
                    },
                    ai_limits: {
                        title: "حدود الذكاء",
                        desc: "يعمل الذكاء الاصطناعي بحدود صارمة، ويقوم بالتصعيد فوراً عند الطوارئ الطبية.",
                    },
                    traceability: {
                        title: "تتبع كامل",
                        desc: "يتم تسجيل كل إجراء بتفاصيله الزمنية لتوفير سجل تدقيق شامل وشفاف.",
                    },
                    permissions: {
                        title: "الصلاحيات",
                        desc: "تحكم دقيق بالصلاحيات يتيح لك تحديد ما يمكن لكل فرد في فريقك رؤيته أو تعديله.",
                    },
                },
            },
            features: {
                kicker: "المميزات",
                title: "كل ما تحتاجه عيادتك",
                subtitle: "أتمتة المهام المستهلكة للوقت للتركيز على مرضاك.",
                items: {
                    assistant: {
                        title: "مساعد واتساب ذكي",
                        desc: "يجيب على الطلبات الروتينية 24/7.",
                    },
                    multilingual: {
                        title: "متعدد اللغات",
                        desc: "يتحدث العربية والإنجليزية والفرنسية بطلاقة.",
                    },
                    record: {
                        title: "سجل المريض",
                        desc: "سجل مركزي للمحادثات والمواعيد.",
                    },
                    modify: {
                        title: "إدارة ذاتية",
                        desc: "يلغي المرضى أو يعيدون جدولة مواعيدهم بأنفسهم.",
                    },
                    family: {
                        title: "إدارة العائلة",
                        desc: "حجز مواعيد للأقارب.",
                    },
                    calendar: {
                        title: "أجندة ذكية",
                        desc: "مزامنة مثالية.",
                    },
                    queue: {
                        title: "قائمة الانتظار",
                        desc: "استبدال تلقائي للإلغاءات.",
                    },
                    reminders: {
                        title: "تذكيرات SMS/WA",
                        desc: "يقلل من الغيابات.",
                    },
                    followup: {
                        title: "متابعة ما بعد العملية",
                        desc: "يتفقد حالة المرضى تلقائياً.",
                    },
                    specialty: {
                        title: "التخصصات",
                        desc: "يتكيف مع ممارستك.",
                    },
                    analytics: {
                        title: "التحليلات",
                        desc: "تتبع أداء عيادتك.",
                    },
                    team: {
                        title: "العمل الجماعي",
                        desc: "تعاون مبسط.",
                    },
                },
            },
            pricing: {
                title: "أسعار بسيطة.",
                subtitle: "اختر الخطة التي تناسب عيادتك.",
            },
            plans: {
                popular: "شائع",
                starter: {
                    tagline: "للعيادات الفردية",
                    f1: "أجندة ذكية",
                    f2: "مساعد ذكاء اصطناعي أساسي",
                    f3: "سجلات المرضى",
                    f4: "دعم عبر البريد",
                    cta: "ابدأ الآن",
                },
                pro: {
                    tagline: "للعيادات النامية",
                    f1: "كل ميزات الأساسية",
                    f2: "قائمة انتظار ذكية",
                    f3: "متابعة ما بعد العملية",
                    f4: "لغات متعددة متقدمة",
                    f5: "دعم ذو أولوية",
                    cta: "تجربة مجانية",
                },
                enterprise: {
                    tagline: "مخصص",
                    f1: "كل ميزات الاحترافية",
                    f2: "علامة بيضاء",
                    f3: "تكامل API",
                    f4: "خادم مخصص",
                    f5: "مدير حساب",
                    cta: "اتصل بنا",
                },
            },
            compliance: {
                rgpd: {
                    title: "الأمان والامتثال (RGPD / HIPAA)",
                    i1: { strong: "تشفير شامل", text: "البيانات مشفرة أثناء النقل وفي وضع عدم الاتصال." },
                    i2: { strong: "استضافة طبية معتمدة", text: "خوادم آمنة ومخصصة للبيانات الصحية." },
                    i3: { strong: "سرية طبية مطلقة", text: "إمكانية تتبع صارمة ووصول محمي (GDPR/HIPAA)." },
                    i4: { strong: "عدم بيع البيانات", text: "بياناتك وبيانات مرضاك ملك لك بنسبة 100%." }
                },
                na: {
                    title: "الموثوقية والذكاء الاصطناعي المنضبط",
                    i1: { strong: "لا للهلوسة", text: "الذكاء الاصطناعي لا يشخص ولا يقدم أي نصيحة طبية أبدًا." },
                    i2: { strong: "حدود صارمة", text: "يتصرف المساعد فقط ضمن القواعد التي تحددها أنت." },
                    i3: { strong: "تأكيد مزدوج", text: "مطلوب تأكيد صارم قبل إلغاء أي موعد." },
                    i4: { strong: "التدخل البشري", text: "توجيه تلقائي للسكرتارية في حالات الشك أو الطوارئ." }
                }
            },
            patient_record: {
                kicker: "السجل الطبي",
                title: "عرض شامل للمريض.",
                subtitle: "اعثر على كل السجل في لمحة.",
                bullets: {
                    "0": "سجل المواعيد",
                    "1": "محادثات واتساب",
                    "2": "مستندات مشتركة",
                    "3": "ملاحظات داخلية",
                },
                demo: {
                    title: "سجل المريض",
                    subtitle: "معاينة الواجهة",
                    bp: "ضغط الدم",
                    bp_status: "طبيعي",
                    hr: "معدل ضربات القلب",
                    hr_status: "منتظم",
                },
            },
            cta: {
                title: "جاهز لتحويل عيادتك؟",
                now: "ابدأ الآن",
            },
            footer: {
                desc: "منصة الإدارة السريرية المدعومة بالذكاء الاصطناعي.",
                product: "المنتج",
                demo: "عرض توضيحي",
                company: "الشركة",
                about: "حول",
                contact: "اتصل بنا",
                legal: "قانوني",
                security_privacy: "الأمان والخصوصية",
                terms: "الشروط والأحكام",
                copyright: "© 2026 Sanovia AI. جميع الحقوق محفوظة.",
                subModalTitle: "طلب اشتراك",
                subModalDesc: "لقد اخترت خطة",
                subModalDesc2: ". يرجى ملء هذا النموذج وسنتصل بك لتقديم تعليمات الدفع (تفاصيل الحساب البنكي).",
                subName: "الاسم الكامل *",
                subNamePlaceholder: "د. فلان بن فلان",
                subEmail: "البريد الإلكتروني *",
                subEmailPlaceholder: "doc@clinic.com",
                subPhone: "الهاتف *",
                subPhonePlaceholder: "+216 20 000 000",
                subCountry: "البلد *",
                subCountrySearch: "البحث عن بلد...",
                subCountryEmpty: "لم يتم العثور على أي بلد.",
                subMessage: "طلب خاص (اختياري)",
                subMessagePlaceholder: "أرغب في الدفع عبر التحويل البنكي...",
                subCancel: "إلغاء",
                subSubmit: "إرسال الطلب",
                subSubmitting: "جاري الإرسال...",
                subSuccess: "تم إرسال طلب الاشتراك بنجاح!",
                subError: "حدث خطأ أثناء إرسال الطلب.",

                country: "تونس",
            },
        },
    },
};
