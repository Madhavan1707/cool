// A curated, offline "on this day" set — no network, so the site keeps its
// "nothing is sent anywhere" promise. Skewed toward wondrous firsts
// (discoveries, flight, space, art) rather than tragedies, to match the empty
// state's sense of awe. Phrased in the present tense so each reads as timeless:
// the point is that these already have a shape in the space, always did.
// Keyed by "MM-DD". Dates without an entry fall back to the year and today.

export interface HistoricEvent {
  text: string;
  year: number;
}

const EVENTS: Record<string, HistoricEvent> = {
  "01-03": { text: "J.R.R. Tolkien is born", year: 1892 },
  "01-04": { text: "Isaac Newton is born", year: 1643 },
  "01-15": { text: "Wikipedia goes live", year: 2001 },
  "01-17": { text: "Benjamin Franklin is born", year: 1706 },
  "01-24": { text: "the first Macintosh goes on sale", year: 1984 },
  "01-27": { text: "Wolfgang Amadeus Mozart is born", year: 1756 },
  "01-31": { text: "Explorer 1, the first U.S. satellite, launches", year: 1958 },
  "02-04": { text: "Facebook launches", year: 2004 },
  "02-09": { text: "the Beatles first appear on Ed Sullivan", year: 1964 },
  "02-11": { text: "Nelson Mandela walks free", year: 1990 },
  "02-12": { text: "Charles Darwin is born", year: 1809 },
  "02-18": { text: "Pluto is discovered", year: 1930 },
  "02-20": { text: "John Glenn orbits the Earth", year: 1962 },
  "02-22": { text: "George Washington is born", year: 1732 },
  "02-28": { text: "the double helix of DNA is worked out", year: 1953 },
  "03-02": { text: "Dr. Seuss is born", year: 1904 },
  "03-06": { text: "Michelangelo is born", year: 1475 },
  "03-10": { text: "the first telephone call is made", year: 1876 },
  "03-13": { text: "Uranus is discovered", year: 1781 },
  "03-14": { text: "Albert Einstein is born", year: 1879 },
  "04-12": { text: "Yuri Gagarin, the first human in space", year: 1961 },
  "04-15": { text: "Leonardo da Vinci is born", year: 1452 },
  "04-22": { text: "the first Earth Day", year: 1970 },
  "04-23": { text: "William Shakespeare is born, by tradition", year: 1564 },
  "04-25": { text: "the Hubble Space Telescope is deployed", year: 1990 },
  "04-30": { text: "the World Wide Web enters the public domain", year: 1993 },
  "05-06": { text: "Roger Bannister runs the first sub-four-minute mile", year: 1954 },
  "05-20": { text: "Lindbergh begins his solo Atlantic flight", year: 1927 },
  "05-24": { text: "the first telegraph message is sent", year: 1844 },
  "05-25": { text: "Star Wars opens in theaters", year: 1977 },
  "05-29": { text: "Everest is climbed for the first time", year: 1953 },
  "06-16": { text: "Valentina Tereshkova, the first woman in space", year: 1963 },
  "06-19": { text: "Juneteenth — freedom reaches Galveston", year: 1865 },
  "06-25": { text: "the first color television broadcast", year: 1951 },
  "06-26": { text: "the first draft of the human genome is announced", year: 2000 },
  "07-04": { text: "the Declaration of Independence is adopted", year: 1776 },
  "07-08": { text: "the Declaration of Independence is first read in public", year: 1776 },
  "07-14": { text: "the storming of the Bastille", year: 1789 },
  "07-16": { text: "Apollo 11 launches toward the Moon", year: 1969 },
  "07-20": { text: "the first humans walk on the Moon", year: 1969 },
  "07-24": { text: "Machu Picchu is brought to the world's attention", year: 1911 },
  "08-01": { text: "MTV launches", year: 1981 },
  "08-28": { text: "Martin Luther King Jr. shares his dream", year: 1963 },
  "09-08": { text: "Star Trek premieres", year: 1966 },
  "09-17": { text: "the United States Constitution is signed", year: 1787 },
  "10-01": { text: "Walt Disney World opens", year: 1971 },
  "10-04": { text: "Sputnik, the first satellite, launches", year: 1957 },
  "10-12": { text: "Columbus reaches the Americas", year: 1492 },
  "10-14": { text: "Chuck Yeager breaks the sound barrier", year: 1947 },
  "10-29": { text: "the first message crosses the ARPANET", year: 1969 },
  "10-31": { text: "Martin Luther posts his Ninety-Five Theses", year: 1517 },
  "11-07": { text: "Marie Curie is born", year: 1867 },
  "11-09": { text: "the Berlin Wall falls", year: 1989 },
  "11-18": { text: "Mickey Mouse debuts in Steamboat Willie", year: 1928 },
  "11-24": { text: "On the Origin of Species is published", year: 1859 },
  "12-01": { text: "Rosa Parks refuses to give up her seat", year: 1955 },
  "12-10": { text: "the first Nobel Prizes are awarded", year: 1901 },
  "12-17": { text: "the Wright brothers make the first powered flight", year: 1903 },
  "12-27": { text: "Louis Pasteur is born", year: 1822 },
};

/** The curated event for a given month (1-12) and day (1-31), or null if none. */
export function onThisDay(month: number, day: number): HistoricEvent | null {
  const key = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return EVENTS[key] ?? null;
}
