// Niesen Cup – Team-Datenbank
// Stärke r (0–100) bestimmt Sterne und Lostöpfe. Werte sind Schätzungen und dürfen gern angepasst werden.
// Nationalteams: f = Flaggen-Code (Datei in assets/flags/<f>.svg)
// Clubs: c = [Hauptfarbe, Zweitfarbe], w = Titel des deutschen Wikipedia-Artikels (für das Wappen)

const N = (id, name, f, r) => ({ id: 'n-' + id, name, short: id, flag: f, r });
const C = (lg, id, name, c, r, w) => ({ id: lg + '-' + id.toLowerCase(), name, short: id, colors: c, r, wiki: w });

export const NATIONS = [
  // UEFA
  N('FRA','Frankreich','fr',92), N('ESP','Spanien','es',92), N('ENG','England','gb-eng',90), N('POR','Portugal','pt',88),
  N('GER','Deutschland','de',87), N('NED','Niederlande','nl',86), N('ITA','Italien','it',85), N('BEL','Belgien','be',84),
  N('CRO','Kroatien','hr',83), N('DEN','Dänemark','dk',80), N('SUI','Schweiz','ch',80), N('NOR','Norwegen','no',80),
  N('TUR','Türkei','tr',80), N('AUT','Österreich','at',79), N('SWE','Schweden','se',78), N('POL','Polen','pl',77),
  N('SRB','Serbien','rs',77), N('UKR','Ukraine','ua',77), N('CZE','Tschechien','cz',77), N('SCO','Schottland','gb-sct',76),
  N('HUN','Ungarn','hu',76), N('WAL','Wales','gb-wls',75), N('GRE','Griechenland','gr',75), N('SVK','Slowakei','sk',74),
  N('ROU','Rumänien','ro',74), N('GEO','Georgien','ge',74), N('SVN','Slowenien','si',73), N('IRL','Irland','ie',73),
  N('ALB','Albanien','al',72), N('BIH','Bosnien-Herzegowina','ba',71), N('NIR','Nordirland','gb-nir',70), N('ISL','Island','is',70),
  N('ISR','Israel','il',70), N('FIN','Finnland','fi',70), N('MKD','Nordmazedonien','mk',69), N('MNE','Montenegro','me',69),
  N('KOS','Kosovo','xk',66), N('BUL','Bulgarien','bg',64), N('KAZ','Kasachstan','kz',63), N('ARM','Armenien','am',63),
  N('BLR','Belarus','by',63), N('AZE','Aserbaidschan','az',62), N('CYP','Zypern','cy',62), N('LUX','Luxemburg','lu',62),
  N('LTU','Litauen','lt',59), N('FRO','Färöer','fo',58), N('EST','Estland','ee',58), N('LVA','Lettland','lv',58),
  N('MDA','Moldau','md',57), N('MLT','Malta','mt',55), N('AND','Andorra','ad',50), N('GIB','Gibraltar','gi',50),
  N('LIE','Liechtenstein','li',50), N('SMR','San Marino','sm',45),
  // CONMEBOL
  N('ARG','Argentinien','ar',91), N('BRA','Brasilien','br',89), N('URU','Uruguay','uy',82), N('COL','Kolumbien','co',81),
  N('ECU','Ecuador','ec',78), N('PAR','Paraguay','py',75), N('CHI','Chile','cl',74), N('VEN','Venezuela','ve',73),
  N('PER','Peru','pe',72), N('BOL','Bolivien','bo',68),
  // CONCACAF
  N('USA','USA','us',79), N('MEX','Mexiko','mx',79), N('CAN','Kanada','ca',76), N('PAN','Panama','pa',72),
  N('CRC','Costa Rica','cr',71), N('JAM','Jamaika','jm',70), N('HON','Honduras','hn',68), N('SLV','El Salvador','sv',66),
  N('GUA','Guatemala','gt',66), N('HAI','Haiti','ht',66), N('CUW','Curaçao','cw',66), N('TRI','Trinidad & Tobago','tt',64),
  N('SUR','Suriname','sr',63), N('NCA','Nicaragua','ni',60), N('DOM','Dominikanische Rep.','do',60), N('CUB','Kuba','cu',55),
  // CAF
  N('MAR','Marokko','ma',81), N('SEN','Senegal','sn',79), N('CIV','Elfenbeinküste','ci',77), N('NGA','Nigeria','ng',76),
  N('EGY','Ägypten','eg',76), N('ALG','Algerien','dz',76), N('CMR','Kamerun','cm',74), N('GHA','Ghana','gh',74),
  N('MLI','Mali','ml',74), N('TUN','Tunesien','tn',73), N('COD','DR Kongo','cd',73), N('RSA','Südafrika','za',72),
  N('BFA','Burkina Faso','bf',72), N('CPV','Kap Verde','cv',71), N('GUI','Guinea','gn',70), N('GAB','Gabun','ga',69),
  N('ZAM','Sambia','zm',68), N('ANG','Angola','ao',68), N('UGA','Uganda','ug',66), N('BEN','Benin','bj',66),
  N('EQG','Äquatorialguinea','gq',66), N('LBY','Libyen','ly',64), N('MTN','Mauretanien','mr',64), N('KEN','Kenia','ke',63),
  N('MAD','Madagaskar','mg',63), N('MOZ','Mosambik','mz',63), N('NAM','Namibia','na',62), N('TAN','Tansania','tz',62),
  N('ZIM','Simbabwe','zw',62), N('TOG','Togo','tg',62), N('GAM','Gambia','gm',62), N('SLE','Sierra Leone','sl',61),
  N('CGO','Kongo','cg',61), N('SDN','Sudan','sd',60), N('RWA','Ruanda','rw',60), N('ETH','Äthiopien','et',58),
  // AFC
  N('JPN','Japan','jp',79), N('KOR','Südkorea','kr',77), N('IRN','Iran','ir',75), N('AUS','Australien','au',75),
  N('KSA','Saudi-Arabien','sa',72), N('UZB','Usbekistan','uz',71), N('QAT','Katar','qa',70), N('IRQ','Irak','iq',70),
  N('JOR','Jordanien','jo',70), N('UAE','VAE','ae',69), N('OMA','Oman','om',66), N('CHN','China','cn',65),
  N('SYR','Syrien','sy',64), N('PLE','Palästina','ps',64), N('IDN','Indonesien','id',64), N('BHR','Bahrain','bh',63),
  N('THA','Thailand','th',63), N('VIE','Vietnam','vn',63), N('TJK','Tadschikistan','tj',61), N('KGZ','Kirgisistan','kg',60),
  N('LBN','Libanon','lb',60), N('PRK','Nordkorea','kp',60), N('MAS','Malaysia','my',60), N('KUW','Kuwait','kw',60),
  N('IND','Indien','in',58),
  // OFC
  N('NZL','Neuseeland','nz',66), N('FIJ','Fidschi','fj',50)
];

export const BUNDESLIGA = [
  C('bl','FCB','FC Bayern München',['#DC052D','#FFFFFF'],88,'FC_Bayern_München'),
  C('bl','BVB','Borussia Dortmund',['#FDE100','#000000'],83,'Borussia_Dortmund'),
  C('bl','B04','Bayer 04 Leverkusen',['#E32221','#000000'],82,'Bayer_04_Leverkusen'),
  C('bl','RBL','RB Leipzig',['#DD0741','#FFFFFF'],82,'RB_Leipzig'),
  C('bl','SGE','Eintracht Frankfurt',['#E1000F','#000000'],80,'Eintracht_Frankfurt'),
  C('bl','VFB','VfB Stuttgart',['#E32219','#FFFFFF'],80,'VfB_Stuttgart'),
  C('bl','SCF','SC Freiburg',['#E2001A','#000000'],77,'SC_Freiburg'),
  C('bl','TSG','TSG Hoffenheim',['#1961B5','#FFFFFF'],77,'TSG_1899_Hoffenheim'),
  C('bl','BMG','Borussia Mönchengladbach',['#000000','#FFFFFF'],76,'Borussia_Mönchengladbach'),
  C('bl','M05','1. FSV Mainz 05',['#C3141E','#FFFFFF'],75,'1._FSV_Mainz_05'),
  C('bl','FCU','1. FC Union Berlin',['#EB1923','#FFFFFF'],75,'1._FC_Union_Berlin'),
  C('bl','SVW','SV Werder Bremen',['#1D9053','#FFFFFF'],75,'SV_Werder_Bremen'),
  C('bl','HSV','Hamburger SV',['#0A3F86','#FFFFFF'],75,'Hamburger_SV'),
  C('bl','KOE','1. FC Köln',['#ED1C24','#FFFFFF'],74,'1._FC_Köln'),
  C('bl','FCA','FC Augsburg',['#BA3733','#46714D'],74,'FC_Augsburg'),
  C('bl','S04','FC Schalke 04',['#004D9D','#FFFFFF'],74,'FC_Schalke_04'),
  C('bl','SCP','SC Paderborn 07',['#005CA9','#000000'],71,'SC_Paderborn_07'),
  C('bl','SVE','SV Elversberg',['#000000','#FFFFFF'],71,'SV_07_Elversberg')
];

export const PREMIER = [
  C('pl','ARS','Arsenal',['#EF0107','#FFFFFF'],87,'FC_Arsenal'),
  C('pl','LIV','Liverpool',['#C8102E','#FFFFFF'],87,'FC_Liverpool'),
  C('pl','MCI','Manchester City',['#6CABDD','#FFFFFF'],87,'Manchester_City'),
  C('pl','CHE','Chelsea',['#034694','#FFFFFF'],84,'FC_Chelsea'),
  C('pl','MUN','Manchester United',['#DA291C','#FBE122'],82,'Manchester_United'),
  C('pl','NEW','Newcastle United',['#241F20','#FFFFFF'],82,'Newcastle_United'),
  C('pl','AVL','Aston Villa',['#670E36','#95BFE5'],81,'Aston_Villa'),
  C('pl','TOT','Tottenham Hotspur',['#FFFFFF','#132257'],81,'Tottenham_Hotspur'),
  C('pl','BHA','Brighton & Hove Albion',['#0057B8','#FFFFFF'],78,'Brighton_&_Hove_Albion'),
  C('pl','NFO','Nottingham Forest',['#DD0000','#FFFFFF'],78,'Nottingham_Forest'),
  C('pl','BOU','AFC Bournemouth',['#DA291C','#000000'],77,'AFC_Bournemouth'),
  C('pl','CRY','Crystal Palace',['#1B458F','#C4122E'],77,'Crystal_Palace'),
  C('pl','BRE','Brentford',['#E30613','#FFFFFF'],76,'FC_Brentford'),
  C('pl','EVE','Everton',['#003399','#FFFFFF'],76,'FC_Everton'),
  C('pl','FUL','Fulham',['#FFFFFF','#000000'],76,'FC_Fulham'),
  C('pl','LEE','Leeds United',['#FFFFFF','#1D428A'],74,'Leeds_United'),
  C('pl','SUN','Sunderland',['#EB172B','#FFFFFF'],73,'AFC_Sunderland'),
  C('pl','COV','Coventry City',['#77B5E7','#FFFFFF'],72,'Coventry_City'),
  C('pl','IPS','Ipswich Town',['#0044A9','#FFFFFF'],72,'Ipswich_Town'),
  C('pl','HUL','Hull City',['#F5A12D','#000000'],70,'Hull_City')
];

export const LALIGA = [
  C('ll','RMA','Real Madrid',['#FFFFFF','#FEBE10'],88,'Real_Madrid'),
  C('ll','FCB','FC Barcelona',['#A50044','#004D98'],88,'FC_Barcelona'),
  C('ll','ATM','Atlético Madrid',['#CB3524','#FFFFFF'],83,'Atlético_Madrid'),
  C('ll','ATH','Athletic Bilbao',['#EE2523','#FFFFFF'],80,'Athletic_Bilbao'),
  C('ll','VIL','FC Villarreal',['#FFE667','#005187'],80,'FC_Villarreal'),
  C('ll','BET','Real Betis',['#00954C','#FFFFFF'],79,'Real_Betis_Sevilla'),
  C('ll','RSO','Real Sociedad',['#0067B1','#FFFFFF'],78,'Real_Sociedad_San_Sebastián'),
  C('ll','SEV','FC Sevilla',['#FFFFFF','#D81E05'],75,'FC_Sevilla'),
  C('ll','VAL','FC Valencia',['#FFFFFF','#EE3524'],75,'FC_Valencia'),
  C('ll','CEL','Celta Vigo',['#8AC3EE','#FFFFFF'],75,'Celta_Vigo'),
  C('ll','OSA','CA Osasuna',['#D91A21','#0A346F'],74,'CA_Osasuna'),
  C('ll','RAY','Rayo Vallecano',['#FFFFFF','#E53027'],74,'Rayo_Vallecano'),
  C('ll','GET','FC Getafe',['#005999','#FFFFFF'],73,'FC_Getafe'),
  C('ll','ESP','Espanyol Barcelona',['#007FC8','#FFFFFF'],73,'Espanyol_Barcelona'),
  C('ll','ALA','Deportivo Alavés',['#0761AF','#FFFFFF'],72,'Deportivo_Alavés'),
  C('ll','LEV','UD Levante',['#004D98','#B4053F'],71,'UD_Levante'),
  C('ll','ELC','FC Elche',['#FFFFFF','#05642C'],71,'FC_Elche'),
  C('ll','DEP','Deportivo La Coruña',['#0055A4','#FFFFFF'],71,'Deportivo_La_Coruña'),
  C('ll','MAL','FC Málaga',['#0A63B4','#FFFFFF'],70,'FC_Málaga'),
  C('ll','RAC','Racing Santander',['#00A650','#FFFFFF'],70,'Racing_Santander')
];

export const SERIEA = [
  C('sa','INT','Inter Mailand',['#010E80','#000000'],86,'Inter_Mailand'),
  C('sa','NAP','SSC Neapel',['#12A0D7','#FFFFFF'],85,'SSC_Neapel'),
  C('sa','JUV','Juventus Turin',['#000000','#FFFFFF'],84,'Juventus_Turin'),
  C('sa','MIL','AC Mailand',['#FB090B','#000000'],84,'AC_Mailand'),
  C('sa','ATA','Atalanta Bergamo',['#1E71B8','#000000'],81,'Atalanta_Bergamo'),
  C('sa','ROM','AS Rom',['#8E1F2F','#F0BC42'],81,'AS_Rom'),
  C('sa','LAZ','Lazio Rom',['#87D8F7','#FFFFFF'],79,'Lazio_Rom'),
  C('sa','BOL','FC Bologna',['#1A2F48','#A21C26'],78,'FC_Bologna'),
  C('sa','COM','Como 1907',['#003DA5','#FFFFFF'],78,'Como_1907'),
  C('sa','FIO','AC Florenz',['#482E92','#FFFFFF'],77,'AC_Florenz'),
  C('sa','TOR','FC Turin',['#8A1E03','#FFFFFF'],74,'FC_Turin'),
  C('sa','UDI','Udinese Calcio',['#000000','#FFFFFF'],73,'Udinese_Calcio'),
  C('sa','CAG','Cagliari Calcio',['#C8102E','#002350'],72,'Cagliari_Calcio'),
  C('sa','GEN','CFC Genua',['#A51E36','#002147'],72,'CFC_Genua_1893'),
  C('sa','PAR','Parma Calcio',['#FFD200','#1B4094'],72,'Parma_Calcio_1913'),
  C('sa','SAS','US Sassuolo',['#00A752','#000000'],72,'US_Sassuolo_Calcio'),
  C('sa','MON','AC Monza',['#E30613','#FFFFFF'],71,'AC_Monza'),
  C('sa','LEC','US Lecce',['#FFED00','#D7141A'],70,'US_Lecce'),
  C('sa','FRO','Frosinone Calcio',['#FFDE00','#0047AB'],70,'Frosinone_Calcio'),
  C('sa','VEN','FC Venedig',['#FF6600','#000000'],70,'FC_Venedig')
];

export const LIGUE1 = [
  C('l1','PSG','Paris Saint-Germain',['#004170','#DA291C'],88,'Paris_Saint-Germain'),
  C('l1','OM','Olympique Marseille',['#2FAEE0','#FFFFFF'],80,'Olympique_Marseille'),
  C('l1','ASM','AS Monaco',['#E51B22','#FFFFFF'],79,'AS_Monaco'),
  C('l1','LOSC','OSC Lille',['#E01E13','#20325F'],78,'OSC_Lille'),
  C('l1','OL','Olympique Lyon',['#FFFFFF','#14387F'],78,'Olympique_Lyon'),
  C('l1','RCL','RC Lens',['#FFD700','#E30613'],77,'RC_Lens'),
  C('l1','REN','Stade Rennes',['#E13327','#000000'],76,'Stade_Rennes'),
  C('l1','NICE','OGC Nizza',['#C8102E','#000000'],75,'OGC_Nizza'),
  C('l1','RCS','Racing Straßburg',['#009FE3','#FFFFFF'],75,'Racing_Straßburg'),
  C('l1','SB29','Stade Brest',['#E30613','#FFFFFF'],73,'Stade_Brest'),
  C('l1','TFC','FC Toulouse',['#5B2D8E','#FFFFFF'],72,'FC_Toulouse'),
  C('l1','PFC','Paris FC',['#1B2A4A','#FFFFFF'],71,'Paris_FC'),
  C('l1','ANG','SCO Angers',['#000000','#FFFFFF'],70,'SCO_Angers'),
  C('l1','AUX','AJ Auxerre',['#FFFFFF','#0055A4'],70,'AJ_Auxerre'),
  C('l1','HAC','Le Havre AC',['#6CABDD','#002D72'],70,'Le_Havre_AC'),
  C('l1','FCL','FC Lorient',['#F58220','#000000'],70,'FC_Lorient'),
  C('l1','ESTAC','ES Troyes AC',['#005BAC','#FFFFFF'],69,'ES_Troyes_AC'),
  C('l1','LMFC','Le Mans FC',['#E30613','#F7D117'],68,'Le_Mans_FC')
];

const EXTRA = [
  C('eu','SLB','Benfica Lissabon',['#E83030','#FFFFFF'],82,'Benfica_Lissabon'),
  C('eu','FCP','FC Porto',['#003893','#FFFFFF'],81,'FC_Porto'),
  C('eu','SCP','Sporting Lissabon',['#008057','#FFFFFF'],81,'Sporting_Lissabon'),
  C('eu','PSV','PSV Eindhoven',['#ED1C24','#FFFFFF'],80,'PSV_Eindhoven'),
  C('eu','GAL','Galatasaray',['#A90432','#FDB912'],80,'Galatasaray_Istanbul'),
  C('eu','AJA','Ajax Amsterdam',['#D2122E','#FFFFFF'],79,'Ajax_Amsterdam'),
  C('eu','FEN','Fenerbahçe',['#002D72','#FFED00'],79,'Fenerbahçe_Istanbul'),
  C('eu','FEY','Feyenoord',['#E30613','#FFFFFF'],78,'Feyenoord_Rotterdam'),
  C('eu','CLU','FC Brügge',['#0067CE','#000000'],77,'FC_Brügge'),
  C('eu','CEL','Celtic Glasgow',['#018749','#FFFFFF'],76,'Celtic_Glasgow'),
  C('eu','RBS','RB Salzburg',['#D0021B','#FFFFFF'],75,'FC_Red_Bull_Salzburg')
];

const pick = (list, ids) => ids.map((s) => list.find((t) => t.short === s));
export const EUROPA = [
  ...pick(LALIGA, ['RMA', 'FCB', 'ATM', 'ATH']),
  ...pick(PREMIER, ['ARS', 'LIV', 'MCI', 'CHE', 'MUN', 'NEW', 'AVL', 'TOT']),
  ...pick(BUNDESLIGA, ['FCB', 'BVB', 'B04', 'RBL', 'SGE', 'VFB']),
  ...pick(SERIEA, ['INT', 'NAP', 'JUV', 'MIL', 'ATA', 'ROM']),
  ...pick(LIGUE1, ['PSG', 'OM', 'ASM', 'LOSC']),
  ...EXTRA
];

// Modi / Team-Pools mit Regel-Vorbild
// tiebreak: 'gd' = Punkte → Tordifferenz → Tore → direkter Vergleich
//           'h2h' = Punkte → direkter Vergleich → Tordifferenz → Tore
export const POOLS = {
  nations:    { id: 'nations',    name: 'Nationalteams',   icon: '🌍', teams: NATIONS,    tiebreak: 'h2h', koName: 'WM-K.o.-Runde',         kind: 'nation' },
  europa:     { id: 'europa',     name: 'Europa-Topclubs', icon: '⭐', teams: EUROPA,     tiebreak: 'gd',  koName: 'Champions-League-K.o.', kind: 'club' },
  bundesliga: { id: 'bundesliga', name: 'Bundesliga',      flag: 'de', teams: BUNDESLIGA, tiebreak: 'gd',  koName: 'DFB-Pokal-Modus',       kind: 'club' },
  premier:    { id: 'premier',    name: 'Premier League',  flag: 'gb-eng', teams: PREMIER, tiebreak: 'gd', koName: 'FA-Cup-Modus',          kind: 'club' },
  laliga:     { id: 'laliga',     name: 'La Liga',         flag: 'es', teams: LALIGA,     tiebreak: 'h2h', koName: 'Copa-del-Rey-Modus',    kind: 'club' },
  seriea:     { id: 'seriea',     name: 'Serie A',         flag: 'it', teams: SERIEA,     tiebreak: 'h2h', koName: 'Coppa-Italia-Modus',    kind: 'club' },
  ligue1:     { id: 'ligue1',     name: 'Ligue 1',         flag: 'fr', teams: LIGUE1,     tiebreak: 'gd',  koName: 'Coupe-de-France-Modus', kind: 'club' }
};

const ALL = new Map();
for (const p of Object.values(POOLS)) for (const t of p.teams) ALL.set(t.id, t);
export const teamById = (id) => ALL.get(id) || null;

export function stars(r) {
  if (r >= 88) return 5; if (r >= 84) return 4.5; if (r >= 79) return 4; if (r >= 75) return 3.5;
  if (r >= 70) return 3; if (r >= 65) return 2.5; if (r >= 58) return 2; return 1.5;
}
export function starText(r) {
  const s = stars(r); return '★'.repeat(Math.floor(s)) + (s % 1 ? '½' : '');
}
