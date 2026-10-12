import assert from "node:assert";
import { normalizeAnalysis } from "./ai.vision.normalize";

console.log("🧪 Running ai.vision.normalize test suite...");

const base = {
  isEvaluable: true,
  evaluableReason: "",
  anatomicalLevel: "Coupe axiale TDM cervico-thoracique",
  summary: "x",
  structures: ["trachée"],
  recommendations: [],
  disclaimer: "d",
};

const finding = (o: object) => ({
  type: "observation",
  location: "trachée",
  laterality: "midline",
  description: "Axe trachéal médian.",
  isNormal: true,
  severity: "low",
  ...o,
});

// Test 1: ne traite pas 'anormal' comme normal (régression)
{
  const a = normalizeAnalysis({
    ...base,
    findings: [
      finding({
        type: "abnormality",
        description: "Densité anormale du corps vertébral.",
        isNormal: false,
        severity: "high",
      }),
    ],
  });
  assert.strictEqual(a.findings[0]?.isNormal, false, "Test 1 failed: isNormal should be false");
  assert.strictEqual(a.findings[0]?.severity, "high", "Test 1 failed: severity should be high");
  console.log("✅ Test 1: ne traite pas 'anormal' comme normal");
}

// Test 2: garde une lésion 'bien définie' non normale
{
  const a = normalizeAnalysis({
    ...base,
    findings: [
      finding({
        type: "abnormality",
        description: "Lésion ostéolytique bien définie.",
        isNormal: false,
        severity: "moderate",
      }),
    ],
  });
  assert.strictEqual(a.findings[0]?.isNormal, false, "Test 2 failed: isNormal should be false for osteolytic lesion");
  console.log("✅ Test 2: garde une lésion 'bien définie' non normale");
}

// Test 3: signale normal + gravité élevée sans minimiser
{
  const a = normalizeAnalysis({
    ...base,
    findings: [finding({ severity: "moderate" })],
  });
  assert.strictEqual(a.reviewRequired, true, "Test 3 failed: reviewRequired should be true");
  assert.strictEqual(a.findings[0]?.severity, "moderate", "Test 3 failed: severity should stay moderate");
  assert.ok(a.issues.includes("normal_with_elevated_severity"), "Test 3 failed: issues should contain normal_with_elevated_severity");
  console.log("✅ Test 3: signale normal + gravité élevée sans minimiser");
}

// Test 4: force un artefact en faible/normal via le champ type
{
  const a = normalizeAnalysis({
    ...base,
    findings: [
      finding({
        type: "artifact",
        isNormal: false,
        severity: "high",
      }),
    ],
  });
  assert.strictEqual(a.findings[0]?.isNormal, true, "Test 4 failed: artifact isNormal should be true");
  assert.strictEqual(a.findings[0]?.severity, "low", "Test 4 failed: artifact severity should be low");
  console.log("✅ Test 4: force un artefact en faible/normal via le champ type");
}

// Test 5: valeur de gravité inconnue : jamais présentée comme normale
{
  const a = normalizeAnalysis({
    ...base,
    findings: [finding({ severity: "faible" })],
  });
  assert.strictEqual(a.findings[0]?.isNormal, false, "Test 5 failed: unknown severity should not be normal");
  assert.strictEqual(a.reviewRequired, true, "Test 5 failed: reviewRequired should be true for unknown severity");
  console.log("✅ Test 5: valeur de gravité inconnue : jamais présentée comme normale");
}

// Test 6: non évaluable : pas de findings, motif exigé
{
  const a = normalizeAnalysis({
    ...base,
    isEvaluable: false,
    findings: [finding({})],
  });
  assert.strictEqual(a.findings.length, 0, "Test 6 failed: findings should be empty for non evaluable");
  assert.ok(a.issues.includes("not_evaluable_without_reason"), "Test 6 failed: issues should include not_evaluable_without_reason");
  console.log("✅ Test 6: non évaluable : pas de findings, motif exigé");
}

// Test 7: sortie illisible : non évaluable, pas 'RAS'
{
  const a = normalizeAnalysis("texte libre");
  assert.strictEqual(a.isEvaluable, false, "Test 7 failed: isEvaluable should be false");
  assert.strictEqual(a.reviewRequired, true, "Test 7 failed: reviewRequired should be true");
  console.log("✅ Test 7: sortie illisible : non évaluable, pas 'RAS'");
}

// Test 8: région obligatoire absente → ajoutée « non évaluée »
{
  const a = normalizeAnalysis({
    ...base,
    examType: "ct_cervicothoracic",
    coverage: [{ region: "spine", status: "evaluated" }],
    findings: [],
  });
  const vessels = a.coverage.find((c) => c.region === "vessels");
  assert.strictEqual(vessels?.status, "not_evaluated", "Test 8 failed: vessels should be not_evaluated");
  assert.strictEqual(vessels?.enforced, true, "Test 8 failed: vessels should be enforced");
  assert.ok(a.issues.includes("coverage_incomplete"), "Test 8 failed: coverage_incomplete expected");
  console.log("✅ Test 8: région obligatoire absente → « non évaluée »");
}

// Test 9: stries → tissus mous ne peuvent pas être « évalués », négation signalée
{
  const a = normalizeAnalysis({
    ...base,
    examType: "ct_cervicothoracic",
    limitationCodes: ["streak_artifact"],
    coverage: [{ region: "soft_tissues", status: "evaluated" }],
    findings: [finding({ region: "soft_tissues", description: "Absence de masse." })],
  });
  assert.strictEqual(a.coverage.find((c) => c.region === "soft_tissues")?.status, "partially_evaluated", "Test 9 failed");
  assert.ok(a.findings[0]?.flags.includes("negative_on_limited_region"), "Test 9 failed: negation should be flagged");
  assert.strictEqual(a.reviewRequired, true, "Test 9 failed");
  console.log("✅ Test 9: stries → tissus mous partiellement évalués, négation signalée");
}

// Test 10: risque potentiel « high » → plafonné à « moderate »
{
  const a = normalizeAnalysis({
    ...base,
    examType: "dental_panoramic",
    findings: [finding({ type: "observation", basis: "risk", region: "third_molars", toothFDI: [48], isNormal: false, severity: "high" })],
  });
  assert.strictEqual(a.findings[0]?.severity, "moderate", "Test 10 failed: risk must be capped");
  assert.ok(a.findings[0]?.flags.includes("risk_severity_capped"), "Test 10 failed");
  console.log("✅ Test 10: risque potentiel plafonné à « modérée »");
}

// Test 11: anomalie observée « high » conservée
{
  const a = normalizeAnalysis({
    ...base,
    examType: "dental_panoramic",
    findings: [finding({ type: "abnormality", basis: "observed", region: "periapical", toothFDI: [36], isNormal: false, severity: "high" })],
  });
  assert.strictEqual(a.findings[0]?.severity, "high", "Test 11 failed");
  console.log("✅ Test 11: anomalie observée « élevée » conservée");
}

// Test 12: dentaire sans FDI → signalé ; FDI invalide filtré
{
  const a = normalizeAnalysis({
    ...base,
    examType: "dental_panoramic",
    findings: [finding({ type: "abnormality", basis: "observed", region: "teeth", toothFDI: [19, 99], isNormal: false, severity: "moderate" })],
  });
  assert.deepStrictEqual(a.findings[0]?.toothFDI, [], "Test 12 failed: invalid FDI must be filtered");
  assert.ok(a.findings[0]?.flags.includes("missing_fdi"), "Test 12 failed: missing_fdi expected");
  console.log("✅ Test 12: FDI obligatoire et validé");
}

// Test 13: OPG → limite caries proximales imposée, dents jamais « évaluées »
{
  const a = normalizeAnalysis({
    ...base,
    examType: "dental_panoramic",
    coverage: [{ region: "teeth", status: "evaluated" }],
    findings: [],
  });
  assert.ok(a.limitationCodes.includes("low_sensitivity_proximal_caries"), "Test 13 failed");
  assert.strictEqual(a.coverage.find((c) => c.region === "teeth")?.status, "partially_evaluated", "Test 13 failed");
  console.log("✅ Test 13: OPG → sensibilité limitée imposée");
}

// Test 14: étage « cervical » + ceinture scapulaire → incohérent
{
  const a = normalizeAnalysis({
    ...base,
    examType: "ct_neck",
    coverage: [{ region: "shoulder_girdle", status: "evaluated" }],
    findings: [],
  });
  assert.ok(a.issues.includes("level_inconsistent_shoulder_girdle_on_neck_ct"), "Test 14 failed");
  console.log("✅ Test 14: cervical + ceinture scapulaire → reviewRequired");
}

// Test 15: synthèse dérivée des champs structurés, dans la langue demandée
{
  const a = normalizeAnalysis({ ...base, examType: "ct_cervicothoracic", findings: [] }, "en");
  assert.ok(a.summary.startsWith("Cervicothoracic CT."), "Test 15 failed: " + a.summary);
  assert.ok(!a.summary.includes("x"), "Test 15 failed: model summary must not be reused");
  console.log("✅ Test 15: synthèse dérivée (pas de texte libre du modèle)");
}

console.log("\n🎉 All 15 normalization unit tests passed successfully!");

