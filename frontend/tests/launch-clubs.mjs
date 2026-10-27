// Club roster for the launch film fixtures. The live site has 43 clubs; the first
// twelve keep the regression cases (missing logo, featured order). The rest fill the count.
const FEATURED = [
  ["Codecraft", "/media/logo/missing.png", true],
  ["QPWFLFC", "/other%20photo/WFL-logo.png", true],
  ["ChemXplore", "/other%20photo/WFL-crest.svg", true],
  ["Physics club", "/other%20photo/physics-club-logo.jpg", false],
  ["QPWFLBC", "/other%20photo/basketball-club-logo.jpg", false],
  ["AI & Economics & Ethics", "/other%20photo/wfl-ai-research.png", true],
  ["Phonology Choir", "/other%20photo/WFL-logo.png", true],
  ["Wishers", "/other%20photo/WFL-logo.png", true],
  ["R&J", "/other%20photo/WFL-logo.png", true],
  ["Fencing Club", "/other%20photo/WFL-crest.svg", false],
  ["Golf Club", "/other%20photo/WFL-crest.svg", false],
  ["Art Club", "/other%20photo/WFL-crest.svg", false],
];

const MORE = [
  "OpenSTEAM CLUB",
  "ORCAFE",
  "Blueprint",
  "Badminton Club",
  "Table Tennis Club",
  "TheOrcas",
  "WFL Econ.club",
  "QFWFLiS Chinese & English Debate Team",
  "Hindi Zone",
  "QWFLPSY",
  "O BI0",
  "Yuzu Anime",
  "Baking Club",
  "Eco Club",
  "American Sign Language Club",
  "Fitness Boxing",
  "Lingual Fusion",
  "Peer Counseling Club",
  "Shutter story",
  "MEW Community",
  "Girls' Basketball School Team",
  "EPC Club",
  "Volleyball Club",
  "Creative Photography Club",
  "MUN",
  "History Club",
  "Frame & Story",
  "PARFUM D’AURORE",
  "Analog Interaction Design Lab",
  "Lacrosse Club",
  "Frisbee Club",
];

const LIVE = "https://qpwflhsclub.com";

function toAbsolute(origin, url) {
  if (!url) return `${origin}/other%20photo/WFL-crest.svg`;
  try {
    return new URL(url, origin).href;
  } catch {
    return `${origin}/other%20photo/WFL-crest.svg`;
  }
}

export function launchClubs() {
  const featured = FEATURED.map(([clubNameEn, clubItem, greatClub], id) => ({
    id,
    clubNameEn,
    clubItem,
    greatClub,
  }));
  return featured.concat(
    MORE.map((clubNameEn, i) => ({
      id: featured.length + i,
      clubNameEn,
      clubItem: "/other%20photo/WFL-crest.svg",
      greatClub: false,
    })),
  );
}

/** Live roster from qpwflhsclub.com, with logo URLs pointed at production. */
export async function loadLiveClubs(origin = LIVE) {
  const response = await fetch(`${origin}/api/club/all`);
  const result = await response.json();
  const rows = Array.isArray(result) ? result : result?.data;
  if (!Array.isArray(rows) || !rows.length) throw new Error("No clubs from the live API");
  return rows.map((club) => ({ ...club, clubItem: toAbsolute(origin, club.clubItem) }));
}
