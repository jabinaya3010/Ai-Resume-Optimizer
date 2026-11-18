import { useRef, useState } from "react";
import { analyze } from "./analyze.js";
import { SAMPLE_RESUME, SAMPLE_JD } from "./sample.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.mjs",
  import.meta.url
).toString();

const tone = (score) => (score >= 80 ? "good" : score >= 50 ? "mid" : "low");

function ScoreRing({ score }) {
  const circumference = 2 * Math.PI * 48;
  return (
    <div className={`score-ring ${tone(score)}`}>
      <svg viewBox="0 0 112 112" role="img" aria-label={`Match score ${score} out of 100`}>
        <circle className="ring-track" cx="56" cy="56" r="48" />
        <circle
          className="ring-progress"
          cx="56"
          cy="56"
          r="48"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (circumference * score) / 100}
          transform="rotate(-90 56 56)"
        />
      </svg>
      <div className="ring-value">
        <strong>{score}%</strong>
        <span>match</span>
      </div>
    </div>
  );
}

function Chips({ items, kind }) {
  if (!items.length) return <p className="empty-list">No keywords found</p>;
  return (
    <ul className="chips">
      {items.map((item) => <li key={item} className={kind}>{item}</li>)}
    </ul>
  );
}

async function extractPdf(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  return pages.join("\n\n");
}

async function extractDocx(file) {
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

export default function App() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInput = useRef(null);

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileError("");
    setResult(null);
    setLoadingFile(true);
    setFileName("");
    try {
      const extension = file.name.split(".").pop().toLowerCase();
      let text = "";
      if (extension === "pdf") text = await extractPdf(file);
      else if (extension === "docx") text = await extractDocx(file);
      else if (["txt", "md"].includes(extension)) text = await file.text();
      else throw new Error("Please choose a PDF, DOCX, TXT, or MD file.");
      if (!text.trim()) {
        throw new Error("No readable text was found. If this is a scanned PDF, run OCR on it and upload it again.");
      }
      setResume(text);
      setFileName(file.name);
    } catch (error) {
      setFileError(error.message || "Could not read this file. Please try another file.");
    } finally {
      setLoadingFile(false);
      event.target.value = "";
    }
  };

  const run = () => {
    setResult(analyze(resume, jd));
    setCopied(false);
  };

  const loadSample = () => {
    setResume(SAMPLE_RESUME);
    setJd(SAMPLE_JD);
    setFileName("Sample resume loaded");
    setFileError("");
    setResult(analyze(SAMPLE_RESUME, SAMPLE_JD));
  };

  const clearResume = () => {
    setResume("");
    setFileName("");
    setResult(null);
    setFileError("");
  };

  const missing = result ? [...result.skillMissing, ...result.wordMissing] : [];
  const copyMissing = async () => {
    try {
      await navigator.clipboard.writeText(missing.join(", "));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="app-shell">
      <nav className="topbar">
        <a className="brand" href="#" aria-label="CareerCraft home">
          <span className="brand-mark">✦</span>
          <span>CareerCraft</span>
        </a>
        <span className="topbar-note"><span className="live-dot" /> Resume insights</span>
      </nav>

      <section className="hero">
        <div className="eyebrow"><span>✧</span> YOUR NEXT CAREER MOVE STARTS HERE</div>
        <h1>Make your resume<br /><span>match the opportunity.</span></h1>
        <p>Compare your resume with a job description, uncover missing keywords, and make your next application stronger.</p>
        <div className="hero-points">
          <span><i>✓</i> ATS keyword check</span>
          <span><i>✓</i> Skill gap insights</span>
          <span><i>✓</i> Resume checklist</span>
        </div>
      </section>

      <section className="workspace" aria-label="Resume analysis form">
        <div className="section-heading">
          <div>
            <span className="step-label">STEP 01 — ADD YOUR DETAILS</span>
            <h2>Let's get you application-ready</h2>
          </div>
          <button className="sample-button" onClick={loadSample}>Try sample ↗</button>
        </div>

        <div className="input-grid">
          <article className="input-card">
            <div className="card-heading">
              <div className="card-icon resume-icon">▤</div>
              <div><h3>Your resume</h3><p>Upload a file or paste your resume text</p></div>
            </div>
            <button className="upload-zone" onClick={() => fileInput.current?.click()} type="button" disabled={loadingFile}>
              <span className="upload-icon">{loadingFile ? "◌" : "↑"}</span>
              <strong>{loadingFile ? "Reading your file…" : "Choose a resume file"}</strong>
              <span>PDF, Word (.docx), TXT or MD · Max file size depends on your browser</span>
              <span className="browse-link">Browse files</span>
            </button>
            <input
              ref={fileInput}
              className="visually-hidden"
              type="file"
              accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={onFile}
            />
            {fileName && <div className="file-status"><span>✓</span><span>{fileName}</span><button onClick={clearResume} type="button" aria-label="Remove resume">×</button></div>}
            {fileError && <p className="file-error" role="alert">{fileError}</p>}
            <div className="or-divider"><span>OR PASTE TEXT</span></div>
            <textarea
              value={resume}
              onChange={(event) => { setResume(event.target.value); setFileName(""); setResult(null); }}
              placeholder="Paste your resume content here…"
              rows={9}
              aria-label="Resume text"
            />
            <div className="char-count">{resume.length.toLocaleString()} characters</div>
          </article>

          <article className="input-card">
            <div className="card-heading">
              <div className="card-icon job-icon">⌕</div>
              <div><h3>Job description</h3><p>Paste the role you're applying for</p></div>
            </div>
            <div className="jd-tip"><span>✦</span><span>Tip: Include the complete job description for more useful keyword insights.</span></div>
            <textarea
              className="jd-textarea"
              value={jd}
              onChange={(event) => { setJd(event.target.value); setResult(null); }}
              placeholder={"Paste the job description here…\n\nInclude responsibilities, required skills, qualifications, and preferred experience."}
              rows={16}
              aria-label="Job description"
            />
            <div className="char-count">{jd.length.toLocaleString()} characters</div>
          </article>
        </div>

        <div className="form-actions">
          <button className="analyze-button" onClick={run} disabled={!resume.trim() || !jd.trim()}>
            Analyze my resume <span>→</span>
          </button>
          <p>Your text is analyzed in this browser session.</p>
        </div>
      </section>

      {result && (
        <section className="results" aria-live="polite">
          <div className="results-heading">
            <div><span className="step-label">STEP 02 — YOUR RESULTS</span><h2>Resume match report</h2></div>
            <span className="report-tag">✦ Analysis complete</span>
          </div>
          {result.score === null ? (
            <p className="empty-report">No recognizable keywords found in the job description. Paste the full description and try again.</p>
          ) : (
            <>
              <div className="score-panel">
                <ScoreRing score={result.score} />
                <div className="score-copy">
                  <span className={`score-label ${tone(result.score)}`}>{result.score >= 80 ? "EXCELLENT ALIGNMENT" : result.score >= 50 ? "ROOM TO IMPROVE" : "NEEDS ATTENTION"}</span>
                  <h3>{result.score >= 80 ? "You're looking like a strong match." : result.score >= 50 ? "You're part of the way there." : "Let's strengthen your application."}</h3>
                  <p>You match <strong>{result.skillMatched.length} of {result.skillMatched.length + result.skillMissing.length}</strong> technical skills identified in this job description.</p>
                </div>
              </div>

              <div className="insight-grid">
                <article className="insight-card">
                  <div className="insight-title"><span className="status-icon success">✓</span><h3>Skills you already have</h3></div>
                  <Chips items={result.skillMatched} kind="ok" />
                  <h4>Other keywords found</h4>
                  <Chips items={result.wordMatched} kind="ok" />
                </article>
                <article className="insight-card">
                  <div className="insight-title"><span className="status-icon warning">!</span><h3>Skills to consider adding</h3></div>
                  <Chips items={result.skillMissing} kind="miss" />
                  <h4>Other keywords missing</h4>
                  <Chips items={result.wordMissing} kind="miss" />
                  {missing.length > 0 && <button className="copy-button" onClick={copyMissing}>{copied ? "✓ Copied keywords" : "Copy missing keywords"}</button>}
                </article>
              </div>

              <article className="checklist-card">
                <div className="insight-title"><span className="status-icon checklist-icon">☷</span><h3>Resume quality checklist</h3></div>
                <div className="checklist-grid">
                  {result.checks.map((check) => (
                    <div key={check.label} className={`check-item ${check.ok ? "pass" : "fail"}`}>
                      <span>{check.ok ? "✓" : "!"}</span>
                      <div><strong>{check.ok ? check.label : check.label + " — needs attention"}</strong>{!check.ok && <p>{check.tip}</p>}</div>
                    </div>
                  ))}
                </div>
              </article>
              <p className="disclaimer">Use these results as guidance, not a guarantee of ATS performance. Only include skills and experience you genuinely have.</p>
            </>
          )}
        </section>
      )}
      <footer>CareerCraft <span>·</span> Build a clearer path to your next opportunity.</footer>
    </main>
  );
}
