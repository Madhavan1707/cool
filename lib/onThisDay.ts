// A small, curated, offline "on this day" set — no network, so the site keeps
// its "nothing is sent anywhere" promise. Skewed toward wondrous firsts
// (discoveries, flight, space) rather than tragedies, to match the empty
// state's sense of awe. Phrased in the present tense so each reads as timeless:
// the point is that these already have a shape in the space, always did.
// Keyed by "MM-DD". Easy to extend; dates without an entry just fall back to
// the year and today's date.

export interface HistoricEvent {
  text: string;
  year: number;
}

const EVENTS: Record<string, HistoricEvent> = {
  "01-01": { text: "the euro enters circulation", year: 2002 },
  "01-27": { text: "Wolfgang Amadeus Mozart is born", year: 1756 },
  "02-11": { text: "Nelson Mandela walks free", year: 1990 },
  "02-12": { text: "Charles Darwin is born", year: 1809 },
  "02-18": { text: "Pluto is discovered", year: 1930 },
  "03-10": { text: "the first telephone call is made", year: 1876 },
  "03-14": { text: "Albert Einstein is born", year: 1879 },
  "04-12": { text: "Yuri Gagarin, the first human in space", year: 1961 },
  "04-15": { text: "Leonardo da Vinci is born", year: 1452 },
  "04-25": { text: "the Hubble Space Telescope is deployed", year: 1990 },
  "05-20": { text: "Lindbergh begins his solo Atlantic flight", year: 1927 },
  "05-25": { text: "Star Wars opens in theaters", year: 1977 },
  "05-29": { text: "Everest is climbed for the first time", year: 1953 },
  "06-16": { text: "Valentina Tereshkova, the first woman in space", year: 1963 },
  "07-04": { text: "the Declaration of Independence is adopted", year: 1776 },
  "07-08": { text: "the Declaration of Independence is first read in public", year: 1776 },
  "07-14": { text: "the storming of the Bastille", year: 1789 },
  "07-16": { text: "Apollo 11 launches toward the Moon", year: 1969 },
  "07-20": { text: "the first humans walk on the Moon", year: 1969 },
  "08-28": { text: "Martin Luther King Jr. shares his dream", year: 1963 },
  "10-12": { text: "Columbus reaches the Americas", year: 1492 },
  "10-14": { text: "Chuck Yeager breaks the sound barrier", year: 1947 },
  "10-29": { text: "the first message crosses the ARPANET", year: 1969 },
  "11-09": { text: "the Berlin Wall falls", year: 1989 },
  "11-24": { text: "On the Origin of Species is published", year: 1859 },
  "12-17": { text: "the Wright brothers make the first powered flight", year: 1903 },
  "12-27": { text: "Louis Pasteur is born", year: 1822 },
};

/** The curated event for a given month (1-12) and day (1-31), or null if none. */
export function onThisDay(month: number, day: number): HistoricEvent | null {
  const key = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return EVENTS[key] ?? null;
}
