import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  answerExam,
  BASE_BANK,
  checkPractice,
  createExam,
  emptyStore,
  fingerprint,
  grade,
  importQuestions,
  nextPractice,
  parseCsv,
  remainingSeconds,
  restoreStore,
  startPractice,
  SUBJECTS,
  submitExam,
  validateQuestion,
  type Question,
} from "../src/model";
const bank = BASE_BANK;
describe("피부 문제은행의 등록 품질과 출처", () => {
  it("1,000개 고유 문항: 개념 400 + 수치 변형 600, 과목별 200", () => {
    expect(bank).toHaveLength(1000);
    expect(new Set(bank.map(q => q.id)).size).toBe(1000);
    expect(new Set(bank.map(fingerprint)).size).toBe(1000);
    expect(new Set(bank.map(q => q.question.normalize("NFKC").replace(/\s+/g,""))).size).toBe(1000);
    SUBJECTS.forEach(s => expect(bank.filter(q => q.subject === s)).toHaveLength(200));
    for (const q of bank) {
      expect(() => validateQuestion(q)).not.toThrow();
      expect(q.type).toBe("original");
      expect(q.year).toBeNull(); expect(q.session).toBeNull();
      expect(q.verificationStatus).toBe("reviewed");
      expect(q.reviewNote).toContain("외부");
      expect(q.rights).toContain("CC BY 4.0");
      expect(q.explanation.length).toBeGreaterThan(30);
    }
  });
});
describe("은행 확대와 기존 기록 호환", () => {
  it("기존 100개 문항의 ID·본문·보기·정답·해설·메타데이터를 보존한다", () => {
    expect(createHash("sha256").update(JSON.stringify(bank.slice(0,100))).digest("hex")).toBe("ed3c2d7d49fd61f54a5e51edadce72a4f7a25ab3d589eba25731de31ca25b518");
  });
  it("개념 400개와 계산 10유형×60조건을 구분하고 동일 조건을 중복 등록하지 않는다", () => {
    expect(bank.filter(q=>!q.calculation)).toHaveLength(400);
    const calculated=bank.filter(q=>q.calculation);
    expect(calculated).toHaveLength(600);
    const families=new Set(calculated.map(q=>q.family)); expect(families.size).toBe(10);
    for(const family of families) {
      const items=calculated.filter(q=>q.family===family); expect(items).toHaveLength(60);
      expect(new Set(items.map(q=>JSON.stringify(q.calculation!.values))).size).toBe(60);
      expect(new Set(items.map(q=>q.calculation!.kind)).size).toBe(1);
    }
  });
});
describe("모의시험 및 절대 시간", () => {
  it("60개 고유 문항을 전체 풀에서 추출하며 검증 대기는 제외한다", () => {
    const exam = createExam(
      [...bank, { ...bank[0], id: "pending", verificationStatus: "pending" }],
      "main",
      1000,
    );
    expect(exam.questions).toHaveLength(60);
    expect(new Set(exam.questions.map((q) => q.id)).size).toBe(60);
    expect(exam.questions.every(q => SUBJECTS.includes(q.subject))).toBe(true);
    expect(exam.deadline).toBe(3601000);
    expect(exam.questions.some((q) => q.id === "pending")).toBe(false);
  });
  it("기본 모의시험에서는 같은 숫자 변형 유형을 중복 출제하지 않는다", () => {
    for (let round = 0; round < 20; round++) {
      const exam = createExam(bank, "main");
      const families = exam.questions.flatMap((q) =>
        q.family ? [q.family] : [],
      );
      expect(new Set(families).size).toBe(families.length);
    }
  });
  it("수입 문항의 유형이 60개 미만이어도 문항 수가 충분하면 60문항 시험을 구성한다", () => {
    const imported = bank.map((q) => ({ ...q, family: `only-${q.subject}` }));
    const exam = createExam(imported, "main");
    expect(exam.questions).toHaveLength(60);
    expect(new Set(exam.questions.map((q) => q.id)).size).toBe(60);
  });
  it("검수 완료 고유 ID가 60개 미만이면 시작을 차단한다", () => {
    expect(() => createExam(bank.slice(0,59), "main")).toThrow();
    expect(() => createExam([...bank.slice(0,59),bank[0]], "main")).toThrow();
    expect(() => createExam(bank.map(q => ({...q, verificationStatus: "pending"})), "main")).toThrow();
  });
  it("35개 정답은 불합격, 36개 정답은 60점 합격이며 과락이 없다", () => {
    const e = createExam(bank, "main");
    e.questions.slice(0, 35).forEach((q) => (e.answers[q.id] = q.answer));
    expect(grade(e).passed).toBe(false);
    expect(grade(e).score).toBe(58.3);
    e.answers[e.questions[35].id] = e.questions[35].answer;
    expect(grade(e)).toMatchObject({
      correct: 36,
      wrong: 24,
      unanswered: 24,
      score: 60,
      passed: true,
    });
    SUBJECTS.forEach((s) => {
      const sub = grade(e).subjects.find((x) => x.subject === s)!;
      expect(sub.total).toBe(e.questions.filter(q => q.subject === s).length);
    });
  });
  it("답안 변경을 허용하고 종료 시각 이후 변경은 차단한다", () => {
    let state = { ...emptyStore(), exam: createExam(bank, "main", 1000) };
    const id = state.exam.questions[0].id;
    let s = answerExam(state, id, 1, 2000);
    s = answerExam(s, id, 2, 3000);
    expect(s.exam?.answers[id]).toBe(2);
    s = answerExam(s, id, 3, 3601000);
    expect(s.exam).toBeNull();
    expect(s.results[0].answers[id]).toBe(2);
    expect(s.results[0].reason).toBe("timeout");
  });
  it("새로고침 후 절대 시각으로 복원하고 백그라운드 지연을 더하지 않는다", () => {
    const s = { ...emptyStore(), exam: createExam(bank, "main", 1000) };
    const restored = restoreStore(JSON.stringify(s));
    expect(remainingSeconds(restored.exam!.deadline, 1000)).toBe(3600);
    expect(remainingSeconds(restored.exam!.deadline, 1801000)).toBe(1800);
    expect(remainingSeconds(restored.exam!.deadline, 3600999)).toBe(1);
    expect(remainingSeconds(restored.exam!.deadline, 3601000)).toBe(0);
    expect(remainingSeconds(restored.exam!.deadline, 9999999)).toBe(0);
  });
  it("제출은 한 번만 기록되고 미응답은 오답노트에 들어간다", () => {
    const s = { ...emptyStore(), exam: createExam(bank, "main", 1000) };
    const submitted = submitExam(s, 4000);
    expect(submitted.attempts).toHaveLength(60);
    expect(submitted.wrongIds).toHaveLength(60);
    expect(submitted.results).toHaveLength(1);
    expect(submitExam(submitted, 5000)).toEqual(submitted);
  });
});
describe("랜덤 학습", () => {
  it("한 과목의 모든 문항을 순회하기 전에는 중복이 없다", () => {
    let p = startPractice(bank, "main", "피부미용학");
    const ids = new Set<string>();
    for (let i = 0; i < 200; i++) {
      expect(ids.has(p.currentId)).toBe(false);
      ids.add(p.currentId);
      p = nextPractice(p, bank);
    }
    expect(ids.size).toBe(200);
    expect(p.subject).toBe("피부미용학");
  });
  it("즉시 채점·연속 정답·통계를 저장하며 중복 채점을 방지한다", () => {
    const p = startPractice(bank, "main");
    const q = bank.find((q) => q.id === p.currentId)!;
    const s = checkPractice(
      {
        ...emptyStore(),
        wrongIds: [q.id],
        practice: { ...p, selected: q.answer },
      },
      bank,
      1234,
    );
    expect(s.practice).toMatchObject({
      revealed: true,
      streak: 1,
      correct: 1,
      answered: 1,
    });
    expect(s.attempts).toHaveLength(1);
    expect(s.wrongIds).not.toContain(q.id);
    expect(checkPractice(s, bank, 3000)).toEqual(s);
    const next = nextPractice(s.practice!, bank);
    const q2 = bank.find((q) => q.id === next.currentId)!;
    const wrong = checkPractice(
      { ...s, practice: { ...next, selected: (q2.answer % 4) + 1 } },
      bank,
    );
    expect(wrong.practice?.streak).toBe(0);
    expect(wrong.wrongIds).toContain(q2.id);
  });
  it("오답만 선택한 복습에서는 해당 문항만 출제하며 1개 문제도 재학습할 수 있다", () => {
    const p = startPractice(bank, "main", "전체", [bank[0].id]);
    expect(p.currentId).toBe(bank[0].id);
    expect(nextPractice({ ...p, revealed: true }, bank)).toMatchObject({
      currentId: bank[0].id,
      revealed: false,
    });
  });
});
describe("가져오기 및 복구", () => {
  const example = {
    ...bank[0],
    id: "CUSTOM-001",
    question: "사용자가 작성한 고유한 질문",
  };
  it("JSON은 검증 대기로 등록하며 ID 및 보기 순서가 다른 동일 문항을 중복 제거한다", () => {
    expect(importQuestions([example], bank).added[0].verificationStatus).toBe(
      "pending",
    );
    expect(
      importQuestions(
        [
          bank[0],
          {
            ...bank[0],
            id: "OTHER",
            choices: [...bank[0].choices].reverse(),
            answer: 5 - bank[0].answer,
          },
        ],
        bank,
      ),
    ).toMatchObject({ added: [], duplicates: 2 });
  });
  it("CSV의 쉼표·줄바꿈·따옴표를 보존하며 JSON과 동등한 문항을 읽는다", () => {
    const q = { ...example, question: '쉼표, 따옴표 "테스트"\n다음 줄' };
    const { choices, ...rest } = q;
    const entries = {
      ...rest,
      choice1: choices[0],
      choice2: choices[1],
      choice3: choices[2],
      choice4: choices[3],
    };
    const escape = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const csv =
      Object.keys(entries).join(",") +
      "\n" +
      Object.values(entries).map(escape).join(",");
    const parsed = parseCsv(csv);
    expect(importQuestions(parsed, bank).added[0].question).toBe(q.question);
  });
  it("가짜 연도, 잘못된 정답, 중복 보기, 위험한 출처 URL, 미완결 CSV는 차단한다", () => {
    for (const value of [
      { ...example, year: 2020 },
      { ...example, answer: 5 },
      { ...example, choices: ["a", "a", "b", "c"] },
      { ...example, sourceUrl: "javascript:alert(1)" },
      { ...example, sourceUrl: "https://example.com", session: "1" },
    ])
      expect(() => importQuestions([value], bank)).toThrow();
    expect(() => parseCsv('id,question\n"open')).toThrow();
    expect(() => parseCsv("id,id\nx,x")).toThrow();
    expect(() => parseCsv("id,question\none")).toThrow();
  });
  it("1개 오류라도 전체 등록을 중단한다", () => {
    expect(() =>
      importQuestions(
        [example, { ...example, id: "invalid", answer: 99 }],
        bank,
      ),
    ).toThrow("2번 문항");
  });
  it("존재하는 기록은 보존하고 손상된 저장소 형식은 거부한다", () => {
    expect(restoreStore(null)).toEqual(emptyStore());
    expect(restoreStore(JSON.stringify(emptyStore()))).toEqual(emptyStore());
    expect(() => restoreStore("{bad")).toThrow();
    expect(() =>
      restoreStore(
        JSON.stringify({ ...emptyStore(), exam: { questions: [] } }),
      ),
    ).toThrow();
    expect(() =>
      restoreStore(
        JSON.stringify({ ...emptyStore(), practice: { currentId: "invalid" } }),
      ),
    ).toThrow();
  });
});
