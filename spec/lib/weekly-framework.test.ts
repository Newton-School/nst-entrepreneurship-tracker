import { describe, it, expect } from "vitest";
import {
  SEM3,
  SEM4,
  SEMESTERS,
  semesterHealth,
  type Semester,
  type Week,
} from "@/lib/weekly-framework";

const week = (over: Partial<Week> = {}): Week => ({ n: 1, title: "Week", ...over });
const semester = (weeks: Week[]): Semester => ({
  id: "S3",
  number: 3,
  title: "Semester 3",
  theme: "Theme",
  weeks,
});

describe("semesterHealth", () => {
  it("reports zeroes for a semester with no weeks", () => {
    expect(semesterHealth(semester([]))).toEqual({
      weeks: 0,
      masterclasses: 0,
      founderReviews: 0,
      events: 0,
      deliverables: 0,
      checkpoints: 0,
    });
  });

  it("counts one week per entry", () => {
    expect(semesterHealth(semester([week(), week({ n: 2 })])).weeks).toBe(2);
  });

  it("counts a TPF masterclass whatever its casing", () => {
    const s = semester([week({ tpf: "TPF Masterclass" }), week({ n: 2, tpf: "masterclass prep" })]);
    expect(semesterHealth(s).masterclasses).toBe(2);
  });

  it("ignores TPF involvement that is not a masterclass", () => {
    expect(semesterHealth(semester([week({ tpf: "TPF office hours" })])).masterclasses).toBe(0);
  });

  it("ignores a week with no TPF involvement at all", () => {
    expect(semesterHealth(semester([week()])).masterclasses).toBe(0);
  });

  it("counts a founder review named in the week title", () => {
    expect(semesterHealth(semester([week({ title: "Founder Review 1" })])).founderReviews).toBe(1);
  });

  it("counts a demo day as a founder review", () => {
    expect(semesterHealth(semester([week({ title: "Demo Day" })])).founderReviews).toBe(1);
  });

  it("counts a founder review named only in the evaluation", () => {
    expect(
      semesterHealth(semester([week({ evaluation: "Founder review panel" })])).founderReviews,
    ).toBe(1);
  });

  it("counts a week once even when the title and the evaluation both name a founder review", () => {
    const s = semester([week({ title: "Founder Review", evaluation: "Founder review panel" })]);
    expect(semesterHealth(s).founderReviews).toBe(1);
  });

  it("counts only weeks that carry an event", () => {
    const s = semester([week({ event: "Investor day" }), week({ n: 2 })]);
    expect(semesterHealth(s).events).toBe(1);
  });

  it("sums deliverables across weeks rather than counting the weeks", () => {
    const s = semester([week({ deliverables: ["a", "b"] }), week({ n: 2, deliverables: ["c"] })]);
    expect(semesterHealth(s).deliverables).toBe(3);
  });

  it("treats a week with no deliverables as zero", () => {
    expect(semesterHealth(semester([week(), week({ n: 2, deliverables: [] })])).deliverables).toBe(
      0,
    );
  });

  it("counts only weeks that carry an evaluation as checkpoints", () => {
    const s = semester([week({ evaluation: "Rubric" }), week({ n: 2 })]);
    expect(semesterHealth(s).checkpoints).toBe(1);
  });
});

describe("SEMESTERS", () => {
  it("runs semester 3 and then semester 4", () => {
    expect(SEMESTERS).toEqual([SEM3, SEM4]);
    expect(SEMESTERS.map((s) => s.id)).toEqual(["S3", "S4"]);
    expect(SEMESTERS.map((s) => s.number)).toEqual([3, 4]);
  });

  it("gives every semester sixteen weeks numbered one to sixteen", () => {
    for (const s of SEMESTERS) {
      expect(s.weeks).toHaveLength(16);
      expect(s.weeks.map((w) => w.n)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    }
  });

  it("titles every week", () => {
    for (const s of SEMESTERS) {
      for (const w of s.weeks) expect(w.title.trim()).not.toBe("");
    }
  });

  it("gives every week an evaluation checkpoint", () => {
    for (const s of SEMESTERS) {
      expect(semesterHealth(s).checkpoints).toBe(s.weeks.length);
    }
  });

  it("closes each semester with a founder review or demo day", () => {
    for (const s of SEMESTERS) {
      expect(semesterHealth(s).founderReviews).toBeGreaterThan(0);
    }
  });

  it("never counts more masterclasses or events than there are weeks", () => {
    for (const s of SEMESTERS) {
      const health = semesterHealth(s);
      expect(health.masterclasses).toBeLessThanOrEqual(health.weeks);
      expect(health.events).toBeLessThanOrEqual(health.weeks);
    }
  });
});
