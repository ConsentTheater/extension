export type ReportLang = 'en' | 'es' | 'fr' | 'de' | 'it';

export const REPORT_LANGS: { code: ReportLang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' }
];

export interface ReportStrings {
  toolbar: string;
  print: string;
  title: string;
  site: string;
  origin: string;
  scannedAt: string;
  localTime: string;
  liveSnapshot: string;
  liveSnapshotBody: string;
  summary: string;
  cookiesBeforeConsent: string;
  requestsBeforeConsent: string;
  dataLeakRequests: string;
  totalObservations: string;
  cookiesOnPage: string;
  thirdPartyHosts: string;
  consentBanner: string;
  bannerNotDetected: string;
  bannerDetected: string;
  bannerAccept: string;
  bannerReject: string;
  bannerManage: string;
  bannerPresent: string;
  bannerMissing: string;
  userClicked: string;
  bannerTextExcerpt: string;
  howToRead: string;
  howToReadBody: string;
  cookiesSetBefore: string;
  requestsFiredBefore: string;
  noCookiesBefore: string;
  noRequestsBefore: string;
  cookiesOnPageTitle: string;
  thirdPartyHostsTitle: string;
  noCookiesOnPage: string;
  noThirdPartyHosts: string;
  dataLeakTitle: string;
  dataLeakBody: string;
  cookiesSetAfter: string;
  otherThirdParty: string;
  legend: string;
  consentBurden: string;
  consentBurdenDesc: string;
  burdenStrict: string;
  burdenRequired: string;
  burdenContested: string;
  burdenMinimal: string;
  categories: string;
  categoriesBody: string;
  beforeConsentTitle: string;
  beforeConsentBody: string;
  caveatTitle: string;
  caveatBody: string;
  footerLegal: string;
  footerPlaybill: string;
  tableBurden: string;
  tableName: string;
  tableDomain: string;
  tableCompany: string;
  tableService: string;
  tableHostname: string;
  tableCategory: string;
}

export const reportStrings: Record<ReportLang, ReportStrings> = {
  en: {
    toolbar: `Use your browser's <span class="font-medium text-foreground">Print → Save as PDF</span> to export this report.`,
    print: 'Print / Save as PDF',
    title: 'ConsentTheater scan report',
    site: 'Site',
    origin: 'Origin',
    scannedAt: 'Scanned at',
    localTime: 'Local time',
    liveSnapshot: 'Live snapshot',
    liveSnapshotBody: '<strong>This is a live snapshot, not a Test scan.</strong> ConsentTheater built this report from the cookies and tracker hosts visible in the page right now — it has no before/after-consent split because no clear-and-reload Test was run. Click <em>Test</em> in the sidebar to capture the timeline-based report (with pre-consent vs post-consent split and a matching HAR network trace).',
    summary: 'Summary',
    cookiesBeforeConsent: 'Cookies before consent',
    requestsBeforeConsent: 'Requests before consent',
    dataLeakRequests: 'Data-leak requests',
    totalObservations: 'Total observations',
    cookiesOnPage: 'Cookies on this page',
    thirdPartyHosts: 'Third-party hosts',
    consentBanner: 'Consent banner',
    bannerNotDetected: 'No consent banner was detected on this page during the scan.',
    bannerDetected: 'Detected',
    bannerAccept: 'Accept',
    bannerReject: 'Reject',
    bannerManage: 'Manage',
    bannerPresent: 'present',
    bannerMissing: 'missing',
    userClicked: 'User clicked',
    bannerTextExcerpt: 'Banner text excerpt',
    howToRead: 'How to read the next two sections',
    howToReadBody: 'Below we list cookies and third-party requests captured <em>before</em> the consent banner was resolved (or before any user interaction, if no banner appeared). The split is a best-effort timestamp comparison — browsers don\'t expose a clean "consent state changed" signal, so async, retried, or batched scripts can land on either side of the cut-off. Use this as evidence, not a verdict. For ground-truth network ordering, see the matching HAR export.',
    cookiesSetBefore: 'Cookies set before consent',
    requestsFiredBefore: 'Requests fired before consent',
    noCookiesBefore: 'No cookies were set before the user resolved the consent banner.',
    noRequestsBefore: 'No third-party requests fired before the user resolved the consent banner.',
    cookiesOnPageTitle: 'Cookies on this page',
    thirdPartyHostsTitle: 'Third-party hosts contacted',
    noCookiesOnPage: 'No cookies are currently set on this page.',
    noThirdPartyHosts: 'No third-party tracker hosts have been contacted yet.',
    dataLeakTitle: 'Data-leak requests',
    dataLeakBody: 'Requests categorised as <span class="font-mono">data_leak</span> in the Playbill catalogue. These exfiltrate IP / user-agent to third parties even when the request itself looks benign (web fonts, embedded video, hosted libraries). Multiple EU rulings (Austrian DPA 2022, LG München 2022) treat these as personal-data transfers regardless of consent.',
    cookiesSetAfter: 'Cookies set after consent',
    otherThirdParty: 'Other third-party requests',
    legend: 'Legend',
    consentBurden: 'Consent burden',
    consentBurdenDesc: 'What each tracker requires under GDPR / ePrivacy. Same labels are used in the <span class="font-mono">@consenttheater/playbill</span> catalogue.',
    burdenStrict: 'Cross-site profiling, ad-tech retargeting, fingerprinting, session replay. Always needs prior, informed, freely-given consent.',
    burdenRequired: 'Standard analytics / marketing tracking. Consent required in nearly all interpretations.',
    burdenContested: 'Tracking-adjacent or jurisdiction-dependent. Some authorities allow under legitimate interest, others require consent.',
    burdenMinimal: 'Functional, security, or strictly-necessary in most readings. Often exempt from consent.',
    categories: 'Categories',
    categoriesBody: '<span class="font-mono">advertising</span>, <span class="font-mono">analytics</span>, <span class="font-mono">marketing</span>, <span class="font-mono">tag_manager</span>, <span class="font-mono">social</span>, <span class="font-mono">session_recording</span>, <span class="font-mono">fingerprinting</span> — typically need consent. <span class="font-mono">functional</span>, <span class="font-mono">security</span>, <span class="font-mono">consent</span> — usually consent-exempt. <span class="font-mono">data_leak</span> — third-party calls that exfiltrate IP / user-agent even when the resource itself looks benign (fonts, embedded video, hosted libraries); multiple EU rulings treat these as personal-data transfers regardless of consent.',
    beforeConsentTitle: 'Before consent',
    beforeConsentBody: '"Before consent" means the cookie was set or the request fired <em>before the user clicked Accept / Reject / Manage</em> on the consent banner — or, if no banner was shown, before any user interaction at all. This is the GDPR-relevant moment: tracking that happens before consent generally cannot rely on consent as a legal basis.',
    caveatTitle: 'A caveat on accuracy.',
    caveatBody: 'This split is a best-effort timestamp comparison: ConsentTheater records when the user clicked a banner button and tags every captured cookie / request as before or after that moment. Browsers don\'t expose a clean "consent state changed" signal, so third-party scripts that load asynchronously, retry on consent change, or batch their writes can land on either side of the cut-off depending on timing. Treat the before/after split as informative — useful evidence, not a legal verdict. When in doubt, look at the raw HAR export for ground-truth network ordering.',
    footerLegal: 'ConsentTheater records what was observed during a single scan; it does not issue compliance verdicts. Whether the observations above amount to a GDPR / ePrivacy violation is a legal question for a Data Protection Authority, a court, or your DPO.',
    footerPlaybill: 'Report generated by ConsentTheater browser extension. Source:',
    tableBurden: 'Burden',
    tableName: 'Name',
    tableDomain: 'Domain',
    tableCompany: 'Company',
    tableService: 'Service',
    tableHostname: 'Hostname',
    tableCategory: 'Category'
  },
  es: {
    toolbar: `Usa la opción <span class="font-medium text-foreground">Imprimir → Guardar como PDF</span> de tu navegador para exportar este informe.`,
    print: 'Imprimir / Guardar como PDF',
    title: 'Informe de escaneo de ConsentTheater',
    site: 'Sitio',
    origin: 'Origen',
    scannedAt: 'Escaneado el',
    localTime: 'Hora local',
    liveSnapshot: 'Instantánea en vivo',
    liveSnapshotBody: '<strong>Esta es una instantánea en vivo, no un escaneo de Test.</strong> ConsentTheater construyó este informe a partir de las cookies y hosts de rastreo visibles en la página ahora mismo — no tiene división antes/después del consentimiento porque no se ejecutó un Test de borrado-y-recarga. Haz clic en <em>Test</em> en la barra lateral para capturar el informe basado en la línea de tiempo (con división pre-consentimiento vs post-consentimiento y una traza de red HAR coincidente).',
    summary: 'Resumen',
    cookiesBeforeConsent: 'Cookies antes del consentimiento',
    requestsBeforeConsent: 'Solicitudes antes del consentimiento',
    dataLeakRequests: 'Solicitudes de fuga de datos',
    totalObservations: 'Observaciones totales',
    cookiesOnPage: 'Cookies en esta página',
    thirdPartyHosts: 'Hosts de terceros',
    consentBanner: 'Banner de consentimiento',
    bannerNotDetected: 'No se detectó ningún banner de consentimiento en esta página durante el escaneo.',
    bannerDetected: 'Detectado',
    bannerAccept: 'Aceptar',
    bannerReject: 'Rechazar',
    bannerManage: 'Gestionar',
    bannerPresent: 'presente',
    bannerMissing: 'ausente',
    userClicked: 'El usuario hizo clic en',
    bannerTextExcerpt: 'Extracto del texto del banner',
    howToRead: 'Cómo leer las dos secciones siguientes',
    howToReadBody: 'A continuación listamos las cookies y solicitudes de terceros capturadas <em>antes</em> de que se resolviera el banner de consentimiento (o antes de cualquier interacción del usuario, si no apareció ningún banner). La división es una comparación de marcas de tiempo de mejor esfuerzo — los navegadores no exponen una señal clara de "estado de consentimiento cambiado", por lo que los scripts asíncronos, reintentados o por lotes pueden caer a ambos lados del corte. Usa esto como evidencia, no como veredicto. Para el orden de red de verdad, consulta la exportación HAR correspondiente.',
    cookiesSetBefore: 'Cookies establecidas antes del consentimiento',
    requestsFiredBefore: 'Solicitudes disparadas antes del consentimiento',
    noCookiesBefore: 'No se establecieron cookies antes de que el usuario resolviera el banner de consentimiento.',
    noRequestsBefore: 'No se dispararon solicitudes de terceros antes de que el usuario resolviera el banner de consentimiento.',
    cookiesOnPageTitle: 'Cookies en esta página',
    thirdPartyHostsTitle: 'Hosts de terceros contactados',
    noCookiesOnPage: 'No hay cookies establecidas actualmente en esta página.',
    noThirdPartyHosts: 'No se ha contactado aún ningún host de rastreo de terceros.',
    dataLeakTitle: 'Solicitudes de fuga de datos',
    dataLeakBody: 'Solicitudes categorizadas como <span class="font-mono">data_leak</span> en el catálogo de Playbill. Estas exfiltran IP / user-agent a terceros incluso cuando la solicitud parece benigna (fuentes web, vídeo incrustado, librerías alojadas). Múltiples resoluciones de la UE (DPA austriaco 2022, LG München 2022) tratan estas transferencias como datos personales independientemente del consentimiento.',
    cookiesSetAfter: 'Cookies establecidas después del consentimiento',
    otherThirdParty: 'Otras solicitudes de terceros',
    legend: 'Leyenda',
    consentBurden: 'Carga de consentimiento',
    consentBurdenDesc: 'Lo que cada rastreador requiere bajo el RGPD / ePrivacy. Las mismas etiquetas se usan en el catálogo <span class="font-mono">@consenttheater/playbill</span>.',
    burdenStrict: 'Perfilado entre sitios, retargeting de ad-tech, huella digital, regrabación de sesión. Siempre requiere consentimiento previo, informado y libre.',
    burdenRequired: 'Rastreo estándar de analítica / marketing. Consentimiento requerido en casi todas las interpretaciones.',
    burdenContested: 'Adyacente al rastreo o dependiente de la jurisdicción. Algunas autoridades lo permiten bajo interés legítimo, otras requieren consentimiento.',
    burdenMinimal: 'Funcional, de seguridad o estrictamente necesario en la mayoría de interpretaciones. A menudo exento de consentimiento.',
    categories: 'Categorías',
    categoriesBody: '<span class="font-mono">advertising</span>, <span class="font-mono">analytics</span>, <span class="font-mono">marketing</span>, <span class="font-mono">tag_manager</span>, <span class="font-mono">social</span>, <span class="font-mono">session_recording</span>, <span class="font-mono">fingerprinting</span> — normalmente requieren consentimiento. <span class="font-mono">functional</span>, <span class="font-mono">security</span>, <span class="font-mono">consent</span> — generalmente exentos. <span class="font-mono">data_leak</span> — llamadas a terceros que exfiltran IP / user-agent incluso cuando el recurso parece benigno (fuentes, vídeo, librerías); múltiples resoluciones de la UE las tratan como transferencias de datos personales sin importar el consentimiento.',
    beforeConsentTitle: 'Antes del consentimiento',
    beforeConsentBody: '"Antes del consentimiento" significa que la cookie se estableció o la solicitud se disparó <em>antes de que el usuario hiciera clic en Aceptar / Rechazar / Gestionar</em> en el banner de consentimiento — o, si no se mostró ningún banner, antes de cualquier interacción del usuario. Este es el momento relevante para el RGPD: el rastreo que ocurre antes del consentimiento generalmente no puede basarse en el consentimiento como base legal.',
    caveatTitle: 'Una advertencia sobre la precisión.',
    caveatBody: 'Esta división es una comparación de marcas de tiempo de mejor esfuerzo: ConsentTheater registra cuándo el usuario hizo clic en un botón del banner y etiqueta cada cookie / solicitud capturada como anterior o posterior a ese momento. Los navegadores no exponen una señal clara de "estado de consentimiento cambiado", por lo que los scripts de terceros que se cargan de forma asíncrona, reintentan al cambiar el consentimiento o agrupan sus escrituras pueden caer a ambos lados del corte según el momento. Trata la división antes/después como informativa — evidencia útil, no un veredicto legal. En caso de duda, consulta la exportación HAR sin procesar para el orden de red de verdad.',
    footerLegal: 'ConsentTheater registra lo que se observó durante un único escaneo; no emite veredictos de cumplimiento. Si las observaciones anteriores constituyen una violación del RGPD / ePrivacy es una cuestión legal para una Autoridad de Protección de Datos, un tribunal o tu DPO.',
    footerPlaybill: 'Informe generado por la extensión del navegador ConsentTheater. Código fuente:',
    tableBurden: 'Carga',
    tableName: 'Nombre',
    tableDomain: 'Dominio',
    tableCompany: 'Empresa',
    tableService: 'Servicio',
    tableHostname: 'Host',
    tableCategory: 'Categoría'
  },
  fr: {
    toolbar: `Utilisez <span class="font-medium text-foreground">Imprimer → Enregistrer en PDF</span> de votre navigateur pour exporter ce rapport.`,
    print: 'Imprimer / Enregistrer en PDF',
    title: 'Rapport d\'analyse ConsentTheater',
    site: 'Site',
    origin: 'Origine',
    scannedAt: 'Analysé le',
    localTime: 'Heure locale',
    liveSnapshot: 'Instantané en direct',
    liveSnapshotBody: '<strong>Ceci est un instantané en direct, pas une analyse Test.</strong> ConsentTheater a construit ce rapport à partir des cookies et hôtes de suivi visibles dans la page maintenant — il n\'a pas de division avant/après consentement car aucun Test d\'effacement-et-rechargement n\'a été effectué. Cliquez sur <em>Test</em> dans la barre latérale pour capturer le rapport basé sur la chronologie (avec division pré-consentement vs post-consentement et une trace réseau HAR correspondante).',
    summary: 'Résumé',
    cookiesBeforeConsent: 'Cookies avant consentement',
    requestsBeforeConsent: 'Requêtes avant consentement',
    dataLeakRequests: 'Requêtes de fuite de données',
    totalObservations: 'Observations totales',
    cookiesOnPage: 'Cookies sur cette page',
    thirdPartyHosts: 'Hôtes tiers',
    consentBanner: 'Bannière de consentement',
    bannerNotDetected: 'Aucune bannière de consentement n\'a été détectée sur cette page pendant l\'analyse.',
    bannerDetected: 'Détectée',
    bannerAccept: 'Accepter',
    bannerReject: 'Refuser',
    bannerManage: 'Gérer',
    bannerPresent: 'présent',
    bannerMissing: 'absent',
    userClicked: 'L\'utilisateur a cliqué sur',
    bannerTextExcerpt: 'Extrait du texte de la bannière',
    howToRead: 'Comment lire les deux sections suivantes',
    howToReadBody: 'Ci-dessous, nous listons les cookies et requêtes tiers capturés <em>avant</em> que la bannière de consentement ne soit résolue (ou avant toute interaction utilisateur, si aucune bannière n\'est apparue). La division est une comparaison d\'horodatage au mieux — les navigateurs n\'exposent pas un signal clair de « état de consentement changé », donc les scripts asynchrones, réessayés ou par lots peuvent atterrir de part et d\'autre de la limite. Utilisez cela comme preuve, pas comme verdict. Pour l\'ordre réseau de vérité, consultez l\'export HAR correspondant.',
    cookiesSetBefore: 'Cookies définis avant consentement',
    requestsFiredBefore: 'Requêtes déclenchées avant consentement',
    noCookiesBefore: 'Aucun cookie n\'a été défini avant que l\'utilisateur ne résolve la bannière de consentement.',
    noRequestsBefore: 'Aucune requête tierce n\'a été déclenchée avant que l\'utilisateur ne résolve la bannière de consentement.',
    cookiesOnPageTitle: 'Cookies sur cette page',
    thirdPartyHostsTitle: 'Hôtes tiers contactés',
    noCookiesOnPage: 'Aucun cookie n\'est actuellement défini sur cette page.',
    noThirdPartyHosts: 'Aucun hôte de suivi tiers n\'a encore été contacté.',
    dataLeakTitle: 'Requêtes de fuite de données',
    dataLeakBody: 'Requêtes catégorisées comme <span class="font-mono">data_leak</span> dans le catalogue Playbill. Celles-ci exfiltrent l\'IP / le user-agent vers des tiers même lorsque la requête semble bénigne (polices web, vidéos intégrées, bibliothèques hébergées). Plusieurs décisions de l\'UE (DPA autrichien 2022, LG München 2022) traitent ces transferts comme des données personnelles quel que soit le consentement.',
    cookiesSetAfter: 'Cookies définis après consentement',
    otherThirdParty: 'Autres requêtes tierces',
    legend: 'Légende',
    consentBurden: 'Charge de consentement',
    consentBurdenDesc: 'Ce que chaque traceur exige en vertu du RGPD / ePrivacy. Les mêmes étiquettes sont utilisées dans le catalogue <span class="font-mono">@consenttheater/playbill</span>.',
    burdenStrict: 'Profilage intersites, retargeting publicitaire, empreinte numérique, relecture de session. Nécessite toujours un consentement préalable, éclairé et libre.',
    burdenRequired: 'Suivi standard d\'analytique / marketing. Consentement requis dans presque toutes les interprétations.',
    burdenContested: 'Adjacent au suivi ou dépendant de la juridiction. Certaines autorités l\'autorisent sous intérêt légitime, d\'autres exigent le consentement.',
    burdenMinimal: 'Fonctionnel, de sécurité ou strictement nécessaire dans la plupart des lectures. Souvent exempté de consentement.',
    categories: 'Catégories',
    categoriesBody: '<span class="font-mono">advertising</span>, <span class="font-mono">analytics</span>, <span class="font-mono">marketing</span>, <span class="font-mono">tag_manager</span>, <span class="font-mono">social</span>, <span class="font-mono">session_recording</span>, <span class="font-mono">fingerprinting</span> — nécessitent généralement un consentement. <span class="font-mono">functional</span>, <span class="font-mono">security</span>, <span class="font-mono">consent</span> — généralement exemptés. <span class="font-mono">data_leak</span> — appels tiers qui exfiltrent l\'IP / le user-agent même lorsque la ressource semble bénigne (polices, vidéos, bibliothèques) ; plusieurs décisions de l\'UE traitent ces transferts comme des données personnelles quel que soit le consentement.',
    beforeConsentTitle: 'Avant consentement',
    beforeConsentBody: '« Avant consentement » signifie que le cookie a été défini ou la requête déclenchée <em>avant que l\'utilisateur ne clique sur Accepter / Refuser / Gérer</em> sur la bannière de consentement — ou, si aucune bannière n\'a été affichée, avant toute interaction utilisateur. C\'est le moment pertinent pour le RGPD : le suivi qui se produit avant le consentement ne peut généralement pas s\'appuyer sur le consentement comme base légale.',
    caveatTitle: 'Une réserve sur la précision.',
    caveatBody: 'Cette division est une comparaison d\'horodatage au mieux : ConsentTheater enregistre le moment où l\'utilisateur a cliqué sur un bouton de bannière et étiquette chaque cookie / requête capturé comme avant ou après ce moment. Les navigateurs n\'exposent pas de signal clair de « état de consentement changé », donc les scripts tiers qui se chargent de manière asynchrone, réessayent lors d\'un changement de consentement, ou regroupent leurs écritures peuvent atterrir d\'un côté ou de l\'autre de la limite selon le moment. Traitez la division avant/après comme informative — une preuve utile, pas un verdict juridique. En cas de doute, consultez l\'export HAR brut pour l\'ordre réseau de vérité.',
    footerLegal: 'ConsentTheater enregistre ce qui a été observé lors d\'une seule analyse ; il n\'émet pas de verdicts de conformité. Si les observations ci-dessus constituent une violation du RGPD / ePrivacy, c\'est une question juridique pour une Autorité de Protection des Données, un tribunal ou votre DPO.',
    footerPlaybill: 'Rapport généré par l\'extension de navigateur ConsentTheater. Code source :',
    tableBurden: 'Charge',
    tableName: 'Nom',
    tableDomain: 'Domaine',
    tableCompany: 'Société',
    tableService: 'Service',
    tableHostname: 'Hôte',
    tableCategory: 'Catégorie'
  },
  de: {
    toolbar: `Verwenden Sie <span class="font-medium text-foreground">Drucken → Als PDF speichern</span> in Ihrem Browser, um diesen Bericht zu exportieren.`,
    print: 'Drucken / Als PDF speichern',
    title: 'ConsentTheater Scan-Bericht',
    site: 'Website',
    origin: 'Ursprung',
    scannedAt: 'Gescannt am',
    localTime: 'Lokale Zeit',
    liveSnapshot: 'Live-Momentaufnahme',
    liveSnapshotBody: '<strong>Dies ist eine Live-Momentaufnahme, kein Test-Scan.</strong> ConsentTheater hat diesen Bericht aus den Cookies und Tracker-Hosts erstellt, die derzeit auf der Seite sichtbar sind — er hat keine Vor-/Nach-Einwilligung-Aufteilung, da kein Löschen-und-Neuladen-Test durchgeführt wurde. Klicken Sie auf <em>Test</em> in der Seitenleiste, um den zeitlinienbasierten Bericht zu erfassen (mit Vor-Einwilligung vs. Nach-Einwilligung-Aufteilung und einer passenden HAR-Netzwerkspur).',
    summary: 'Zusammenfassung',
    cookiesBeforeConsent: 'Cookies vor Einwilligung',
    requestsBeforeConsent: 'Anfragen vor Einwilligung',
    dataLeakRequests: 'Datenleck-Anfragen',
    totalObservations: 'Gesamtbeobachtungen',
    cookiesOnPage: 'Cookies auf dieser Seite',
    thirdPartyHosts: 'Drittanbieter-Hosts',
    consentBanner: 'Einwilligungs-Banner',
    bannerNotDetected: 'Auf dieser Seite wurde während des Scans kein Einwilligungs-Banner erkannt.',
    bannerDetected: 'Erkannt',
    bannerAccept: 'Akzeptieren',
    bannerReject: 'Ablehnen',
    bannerManage: 'Verwalten',
    bannerPresent: 'vorhanden',
    bannerMissing: 'fehlt',
    userClicked: 'Benutzer klickte auf',
    bannerTextExcerpt: 'Banner-Textauszug',
    howToRead: 'So lesen Sie die nächsten beiden Abschnitte',
    howToReadBody: 'Im Folgenden listen wir Cookies und Drittanbieter-Anfragen auf, die <em>vor</em> der Einwilligungs-Banner-Auflösung erfasst wurden (oder vor jeder Benutzerinteraktion, falls kein Banner erschien). Die Aufteilung ist ein bestmöglicher Zeitstempel-Vergleich — Browser geben kein sauberes „Einwilligungsstatus geändert\"-Signal, daher können asynchrone, erneut versendete oder gebündelte Skripte auf beiden Seiten der Grenze landen. Verwenden Sie dies als Beweis, nicht als Urteil. Für die echte Netzwerkreihenfolge siehe den passenden HAR-Export.',
    cookiesSetBefore: 'Vor Einwilligung gesetzte Cookies',
    requestsFiredBefore: 'Vor Einwilligung ausgelöste Anfragen',
    noCookiesBefore: 'Es wurden keine Cookies gesetzt, bevor der Benutzer das Einwilligungs-Banner auflöste.',
    noRequestsBefore: 'Es wurden keine Drittanbieter-Anfragen ausgelöst, bevor der Benutzer das Einwilligungs-Banner auflöste.',
    cookiesOnPageTitle: 'Cookies auf dieser Seite',
    thirdPartyHostsTitle: 'Kontaktierte Drittanbieter-Hosts',
    noCookiesOnPage: 'Auf dieser Seite sind derzeit keine Cookies gesetzt.',
    noThirdPartyHosts: 'Es wurden noch keine Drittanbieter-Tracker-Hosts kontaktiert.',
    dataLeakTitle: 'Datenleck-Anfragen',
    dataLeakBody: 'Anfragen, die im Playbill-Katalog als <span class="font-mono">data_leak</span> kategorisiert sind. Diese exfiltrieren IP / User-Agent an Dritte, selbst wenn die Anfrage gutartig aussieht (Web-Schriften, eingebettete Videos, gehostete Bibliotheken). Mehrere EU-Entscheidungen (Österreichische DPA 2022, LG München 2022) behandeln diese als personenbezogene Datenübertragungen unabhängig von der Einwilligung.',
    cookiesSetAfter: 'Nach Einwilligung gesetzte Cookies',
    otherThirdParty: 'Andere Drittanbieter-Anfragen',
    legend: 'Legende',
    consentBurden: 'Einwilligungslast',
    consentBurdenDesc: 'Was jeder Tracker gemäß DSGVO / ePrivacy benötigt. Dieselben Bezeichnungen werden im <span class="font-mono">@consenttheater/playbill</span>-Katalog verwendet.',
    burdenStrict: 'Cross-Site-Profiling, Ad-Tech-Retargeting, Fingerprinting, Sitzungsaufzeichnung. Erfordert immer vorherige, informierte, freiwillige Einwilligung.',
    burdenRequired: 'Standard-Analytics-/Marketing-Tracking. Einwilligung in fast allen Auslegungen erforderlich.',
    burdenContested: 'Tracking-adjacent oder rechtsgebietsabhängig. Einige Behörden erlauben unter berechtigtem Interesse, andere fordern Einwilligung.',
    burdenMinimal: 'Funktional, sicherheitsbezogen oder in den meisten Lesarten zwingend erforderlich. Oft von der Einwilligung befreit.',
    categories: 'Kategorien',
    categoriesBody: '<span class="font-mono">advertising</span>, <span class="font-mono">analytics</span>, <span class="font-mono">marketing</span>, <span class="font-mono">tag_manager</span>, <span class="font-mono">social</span>, <span class="font-mono">session_recording</span>, <span class="font-mono">fingerprinting</span> — benötigen normalerweise Einwilligung. <span class="font-mono">functional</span>, <span class="font-mono">security</span>, <span class="font-mono">consent</span> — normalerweise einwilligungsfrei. <span class="font-mono">data_leak</span> — Drittanbieter-Aufrufe, die IP / User-Agent exfiltrieren, selbst wenn die Ressource gutartig aussieht (Schriften, Videos, Bibliotheken); mehrere EU-Entscheidungen behandeln diese als personenbezogene Datenübertragungen unabhängig von der Einwilligung.',
    beforeConsentTitle: 'Vor Einwilligung',
    beforeConsentBody: '„Vor Einwilligung\" bedeutet, dass der Cookie gesetzt oder die Anfrage ausgelöst wurde, <em>bevor der Benutzer auf Akzeptieren / Ablehnen / Verwalten</em> im Einwilligungs-Banner klickte — oder, wenn kein Banner angezeigt wurde, vor jeder Benutzerinteraktion überhaupt. Dies ist der DSGVO-relevante Moment: Tracking, das vor der Einwilligung stattfindet, kann sich generell nicht auf Einwilligung als Rechtsbasis stützen.',
    caveatTitle: 'Ein Vorbehalt zur Genauigkeit.',
    caveatBody: 'Diese Aufteilung ist ein bestmöglicher Zeitstempel-Vergleich: ConsentTheater zeichnet auf, wann der Benutzer auf eine Banner-Schaltfläche klickte, und markiert jedes erfasste Cookie / jede Anfrage als davor oder danach. Browser geben kein sauberes „Einwilligungsstatus geändert\"-Signal, daher können Drittanbieter-Skripte, die asynchron laden, bei Einwilligungsänderung erneut versuchen oder ihre Schreibvorgänge bündeln, je nach Zeitpunkt auf beiden Seiten der Grenze landen. Behandeln Sie die Vor-/Nach-Aufteilung als informativ — nützliche Beweise, kein juristisches Urteil. Im Zweifel konsultieren Sie den rohen HAR-Export für die echte Netzwerkreihenfolge.',
    footerLegal: 'ConsentTheater zeichnet auf, was bei einem einzelnen Scan beobachtet wurde; es stellt keine Compliance-Urteile. Ob die obigen Beobachtungen eine DSGVO-/ePrivacy-Verletzung darstellen, ist eine Rechtsfrage für eine Datenschutzbehörde, ein Gericht oder Ihren DSB.',
    footerPlaybill: 'Bericht erstellt durch die ConsentTheater-Browser-Erweiterung. Quellcode:',
    tableBurden: 'Last',
    tableName: 'Name',
    tableDomain: 'Domain',
    tableCompany: 'Unternehmen',
    tableService: 'Dienst',
    tableHostname: 'Hostname',
    tableCategory: 'Kategorie'
  },
  it: {
    toolbar: `Usa <span class="font-medium text-foreground">Stampa → Salva come PDF</span> del tuo browser per esportare questo rapporto.`,
    print: 'Stampa / Salva come PDF',
    title: 'Rapporto di scansione ConsentTheater',
    site: 'Sito',
    origin: 'Origine',
    scannedAt: 'Scansionato il',
    localTime: 'Ora locale',
    liveSnapshot: 'Istantanea dal vivo',
    liveSnapshotBody: '<strong>Questa è un\'istantanea dal vivo, non una scansione Test.</strong> ConsentTheater ha costruito questo rapporto dai cookie e host di tracciamento visibili nella pagina ora — non ha divisione prima/dopo consenso perché non è stato eseguito un Test di cancella-e-ricarica. Fai clic su <em>Test</em> nella barra laterale per catturare il rapporto basato sulla timeline (con divisione pre-consenso vs post-consenso e una traccia di rete HAR corrispondente).',
    summary: 'Riepilogo',
    cookiesBeforeConsent: 'Cookie prima del consenso',
    requestsBeforeConsent: 'Richieste prima del consenso',
    dataLeakRequests: 'Richieste di fug di dati',
    totalObservations: 'Osservazioni totali',
    cookiesOnPage: 'Cookie su questa pagina',
    thirdPartyHosts: 'Host di terze parti',
    consentBanner: 'Banner di consenso',
    bannerNotDetected: 'Nessun banner di consenso è stato rilevato su questa pagina durante la scansione.',
    bannerDetected: 'Rilevato',
    bannerAccept: 'Accetta',
    bannerReject: 'Rifiuta',
    bannerManage: 'Gestisci',
    bannerPresent: 'presente',
    bannerMissing: 'assente',
    userClicked: 'L\'utente ha cliccato',
    bannerTextExcerpt: 'Estratto del testo del banner',
    howToRead: 'Come leggere le due sezioni successive',
    howToReadBody: 'Di seguito elenchiamo i cookie e le richieste di terze parti catturati <em>prima</em> che il banner di consenso fosse risolto (o prima di qualsiasi interazione dell\'utente, se non è apparso alcun banner). La divisione è un confronto di timestamp best-effort — i browser non espongono un segnale chiaro di "stato di consenso cambiato", quindi gli script asincroni, ritentati o in batch possono cadere da entrambe le parti del limite. Usalo come prova, non come verdetto. Per l\'ordine di rete reale, consulta l\'export HAR corrispondente.',
    cookiesSetBefore: 'Cookie impostati prima del consenso',
    requestsFiredBefore: 'Richieste attivate prima del consenso',
    noCookiesBefore: 'Nessun cookie è stato impostato prima che l\'utente risolvesse il banner di consenso.',
    noRequestsBefore: 'Nessuna richiesta di terze parti è stata attivata prima che l\'utente risolvesse il banner di consenso.',
    cookiesOnPageTitle: 'Cookie su questa pagina',
    thirdPartyHostsTitle: 'Host di terze parti contattati',
    noCookiesOnPage: 'Nessun cookie è attualmente impostato su questa pagina.',
    noThirdPartyHosts: 'Nessun host di tracciamento di terze parti è stato ancora contattato.',
    dataLeakTitle: 'Richieste di fug di dati',
    dataLeakBody: 'Richieste categorizzate come <span class="font-mono">data_leak</span> nel catalogo Playbill. Queste esfiltrano IP / user-agent a terze parti anche quando la richiesta sembra benigna (fonti web, video incorporati, librerie ospitate). Molteplici decisioni dell\'UE (DPA austriaco 2022, LG München 2022) trattano questi trasferimenti come dati personali indipendentemente dal consenso.',
    cookiesSetAfter: 'Cookie impostati dopo il consenso',
    otherThirdParty: 'Altre richieste di terze parti',
    legend: 'Legenda',
    consentBurden: 'Onere di consenso',
    consentBurdenDesc: 'Cosa richiede ogni tracker ai sensi del GDPR / ePrivacy. Le stesse etichette sono usate nel catalogo <span class="font-mono">@consenttheater/playbill</span>.',
    burdenStrict: 'Profilazione cross-site, retargeting ad-tech, fingerprinting, registrazione sessione. Richiede sempre consenso preventivo, informato e libero.',
    burdenRequired: 'Tracciamento standard di analisi / marketing. Consenso richiesto in quasi tutte le interpretazioni.',
    burdenContested: 'Adiacente al tracciamento o dipendente dalla giurisdizione. Alcune autorità lo consentono sotto interesse legittimo, altre richiedono consenso.',
    burdenMinimal: 'Funzionale, di sicurezza o strettamente necessario nella maggior parte delle letture. Spesso esente dal consenso.',
    categories: 'Categorie',
    categoriesBody: '<span class="font-mono">advertising</span>, <span class="font-mono">analytics</span>, <span class="font-mono">marketing</span>, <span class="font-mono">tag_manager</span>, <span class="font-mono">social</span>, <span class="font-mono">session_recording</span>, <span class="font-mono">fingerprinting</span> — richiedono normalmente consenso. <span class="font-mono">functional</span>, <span class="font-mono">security</span>, <span class="font-mono">consent</span> — generalmente esenti. <span class="font-mono">data_leak</span> — chiamate a terze parti che esfiltrano IP / user-agent anche quando la risorsa sembra benigna (font, video, librerie); molteplici decisioni dell\'UE trattano questi trasferimenti come dati personali indipendentemente dal consenso.',
    beforeConsentTitle: 'Prima del consenso',
    beforeConsentBody: '"Prima del consenso" significa che il cookie è stato impostato o la richiesta attivata <em>prima che l\'utente cliccasse su Accetta / Rifiuta / Gestisci</em> sul banner di consenso — o, se non è stato mostrato alcun banner, prima di qualsiasi interazione dell\'utente. Questo è il momento rilevante per il GDPR: il tracciamento che avviene prima del consenso generalmente non può basarsi sul consenso come base legale.',
    caveatTitle: 'Una riserva sulla precisione.',
    caveatBody: 'Questa divisione è un confronto di timestamp best-effort: ConsentTheater registra quando l\'utente ha cliccato un pulsante del banner e contrassegna ogni cookie / richiesta catturato come prima o dopo quel momento. I browser non espongono un segnale chiaro di "stato di consenso cambiato", quindi gli script di terze parti che si caricano in modo asincrono, riprovano al cambio di consenso o raggruppano le loro scritture possono cadere da entrambe le parti del limite a seconda del momento. Tratta la divisione prima/dopo come informativa — prova utile, non un verdetto legale. In caso di dubbio, consulta l\'export HAR grezzo per l\'ordine di rete reale.',
    footerLegal: 'ConsentTheater registra ciò che è stato osservato durante una singola scansione; non emette verdetti di conformità. Se le osservazioni sopra costituiscono una violazione del GDPR / ePrivacy è una questione legale per un\'Autorità di Protezione dei Dati, un tribunale o il tuo DPO.',
    footerPlaybill: 'Rapporto generato dall\'estensione del browser ConsentTheater. Codice sorgente:',
    tableBurden: 'Onere',
    tableName: 'Nome',
    tableDomain: 'Dominio',
    tableCompany: 'Società',
    tableService: 'Servizio',
    tableHostname: 'Host',
    tableCategory: 'Categoria'
  }
};