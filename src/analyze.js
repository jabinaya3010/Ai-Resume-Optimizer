// Client-side keyword extraction and resume-to-job matching. No backend needed.

const STOP = new Set(
  `a about above after all also an and any are as at be been being but by can could do does for from had has have he her his how if in into is it its may more most must no not of on or our out over should so some such than that the their them then there these they this those to up us use used using was we were what when where which who will with within would you your able across including per etc work working strong good great well team role join looking required preferred plus years year experience candidate candidates ability skills knowledge understanding responsible responsibilities requirements qualification qualifications job description company`.split(
    /\s+/
  )
);

const SKILLS = [
  { label: "Java", terms: ["java"] },
  { label: "JavaScript", terms: ["javascript", "es6"] },
  { label: "TypeScript", terms: ["typescript"] },
  { label: "Python", terms: ["python"] },
  { label: "React", terms: ["react", "react.js", "reactjs"] },
  { label: "Redux", terms: ["redux"] },
  { label: "Angular", terms: ["angular"] },
  { label: "Node.js", terms: ["node.js", "nodejs", "node"] },
  { label: "HTML", terms: ["html", "html5"] },
  { label: "CSS", terms: ["css", "css3"] },
  { label: "Tailwind CSS", terms: ["tailwind"] },
  { label: "Bootstrap", terms: ["bootstrap"] },
  { label: "Spring Boot", terms: ["spring boot", "springboot"] },
  { label: "Spring MVC", terms: ["spring mvc"] },
  { label: "Spring Security", terms: ["spring security"] },
  { label: "Hibernate / JPA", terms: ["hibernate", "jpa"] },
  { label: "JDBC", terms: ["jdbc"] },
  { label: "REST APIs", terms: ["rest api", "rest apis", "restful", "rest"] },
  { label: "JWT", terms: ["jwt"] },
  { label: "Microservices", terms: ["microservices", "microservice"] },
  { label: "SQL", terms: ["sql"] },
  { label: "MySQL", terms: ["mysql"] },
  { label: "PostgreSQL", terms: ["postgresql", "postgres"] },
  { label: "MongoDB", terms: ["mongodb"] },
  { label: "Docker", terms: ["docker"] },
  { label: "Kubernetes", terms: ["kubernetes"] },
  { label: "AWS", terms: ["aws"] },
  { label: "Git", terms: ["git", "github"] },
  { label: "Maven", terms: ["maven"] },
  { label: "JUnit", terms: ["junit"] },
  { label: "Mockito", terms: ["mockito"] },
  { label: "Postman", terms: ["postman"] },
  { label: "Swagger", terms: ["swagger", "openapi"] },
  { label: "Jira", terms: ["jira"] },
  { label: "CI/CD", terms: ["ci/cd", "jenkins"] },
  { label: "Linux", terms: ["linux"] },
  { label: "Agile / Scrum", terms: ["agile", "scrum"] },
  { label: "OOP", terms: ["oop", "object-oriented", "object oriented"] },
  { label: "Data Structures & Algorithms", terms: ["data structures", "algorithms"] },
  { label: "Multithreading", terms: ["multithreading"] },
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (text, term) =>
  new RegExp(`(^|[^a-z0-9])${esc(term)}(?![a-z0-9])`).test(text);

export function analyze(resumeRaw, jdRaw) {
  const resume = resumeRaw.toLowerCase();
  const jd = jdRaw.toLowerCase();

  // 1. Known technical skills mentioned in the job description (weight 3)
  const jdSkills = SKILLS.filter((s) => s.terms.some((t) => has(jd, t)));
  const skillMatched = jdSkills.filter((s) => s.terms.some((t) => has(resume, t))).map((s) => s.label);
  const skillMissing = jdSkills.filter((s) => !s.terms.some((t) => has(resume, t))).map((s) => s.label);

  // 2. Other repeated keywords in the job description (weight 1)
  const known = new Set(SKILLS.flatMap((s) => s.terms));
  const counts = {};
  (jd.match(/[a-z][a-z0-9+#.]{2,}/g) || []).forEach((w) => {
    const word = w.replace(/\.+$/, "");
    if (word.length < 3 || STOP.has(word) || known.has(word)) return;
    counts[word] = (counts[word] || 0) + 1;
  });
  const words = Object.entries(counts)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([w]) => w);
  const wordMatched = words.filter((w) => has(resume, w));
  const wordMissing = words.filter((w) => !has(resume, w));

  const total = skillMatched.length * 3 + skillMissing.length * 3 + words.length;
  const earned = skillMatched.length * 3 + wordMatched.length;
  const score = total === 0 ? null : Math.round((earned / total) * 100);

  // 3. Resume quality checks
  const checks = [
    { ok: /@/.test(resume), label: "Email address", tip: "Add a professional email address at the top." },
    { ok: has(resume, "github") || has(resume, "linkedin"), label: "GitHub / LinkedIn", tip: "Add full GitHub and LinkedIn URLs." },
    { ok: has(resume, "summary") || has(resume, "objective"), label: "Summary section", tip: "Add a 2-3 line professional summary." },
    { ok: has(resume, "skills"), label: "Skills section", tip: "Add a clearly labelled Skills section." },
    { ok: has(resume, "projects") || has(resume, "experience"), label: "Projects or experience", tip: "Add a Projects or Experience section." },
    { ok: has(resume, "education"), label: "Education section", tip: "Add an Education section." },
    { ok: /\d+\s?(%|\+|ms|x)|\b\d{2,}\b/.test(resume.replace(/\+?\d{2}[\s-]?\d{8,}/g, "")), label: "Numbers and results", tip: "Add measurable results to bullets, such as users, endpoints, or load time." },
    { ok: /https?:\/\/|\.com|\.app|\.io/.test(resume), label: "Project links", tip: "Add GitHub and live demo links for each project." },
  ];

  return { score, skillMatched, skillMissing, wordMatched, wordMissing, checks };
}
