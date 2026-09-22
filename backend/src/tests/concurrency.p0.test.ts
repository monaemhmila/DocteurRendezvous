import mongoose from "mongoose";
import dotenv from "dotenv";
import { Appointment } from "../modules/appointments/appointment.model";
import { appointmentService } from "../modules/appointments/appointment.service";
import { Patient } from "../modules/patients/patient.model";
import { User } from "../modules/users/user.model";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai-test";

async function runP0ConcurrencyTests() {
  console.log("🧪 Starting P0 Concurrency & Overlap Prevention Test Suite...\n");

  await mongoose.connect(MONGO_URI);
  await Appointment.syncIndexes();

  const tenantA = new mongoose.Types.ObjectId().toString();
  const tenantB = new mongoose.Types.ObjectId().toString();

  // Setup Doctor A (Tenant A), Doctor B (Tenant A), Doctor C (Tenant B)
  const docA = await User.create({
    tenantId: tenantA,
    email: `docA_${Date.now()}@test.com`,
    passwordHash: "hash123",
    firstName: "Doctor",
    lastName: "One",
    role: "clinic_owner",
  });

  const docB = await User.create({
    tenantId: tenantA,
    email: `docB_${Date.now()}@test.com`,
    passwordHash: "hash123",
    firstName: "Doctor",
    lastName: "Two",
    role: "dentist",
  });

  const docC = await User.create({
    tenantId: tenantB,
    email: `docC_${Date.now()}@test.com`,
    passwordHash: "hash123",
    firstName: "Doctor",
    lastName: "Three",
    role: "clinic_owner",
  });

  // Setup Patients
  const patientA = await Patient.create({
    tenantId: tenantA,
    firstName: "Patient",
    lastName: "A",
    phone: "+21620000001",
  });

  const patientB = await Patient.create({
    tenantId: tenantA,
    firstName: "Patient",
    lastName: "B",
    phone: "+21620000002",
  });

  const patientC = await Patient.create({
    tenantId: tenantB,
    firstName: "Patient",
    lastName: "C",
    phone: "+21620000003",
  });

  const TEST_DATE = "2026-11-20";

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      throw new Error(`❌ ASSERTION FAILED: ${msg}`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 1 — Chevauchement simple : 09:00->10:00 vs 09:30->10:30
  // ───────────────────────────────────────────────────────────────────────────
  totalTests++;
  console.log("▶ TEST 1 — Chevauchement simple (09:00->10:00 vs 09:30->10:30)...");
  {
    await Appointment.deleteMany({ tenantId: tenantA });

    const appt1 = await appointmentService.createAppointment(
      {
        patientId: patientA._id as any,
        doctorId: docA._id.toString(),
        date: TEST_DATE,
        startTime: "09:00",
        endTime: "10:00",
        durationMin: 60,
        treatment: "Soins",
      },
      tenantA
    );
    assert(!!appt1, "Premier RDV créé avec succès");

    let errorThrown = false;
    try {
      await appointmentService.createAppointment(
        {
          patientId: patientB._id as any,
          doctorId: docA._id.toString(),
          date: TEST_DATE,
          startTime: "09:30",
          endTime: "10:30",
          durationMin: 60,
          treatment: "Détartrage",
        },
        tenantA
      );
    } catch (err: any) {
      errorThrown = true;
      assert(err.message === "Double_Booking_Error", `Erreur attendue Double_Booking_Error, reçu ${err.message}`);
    }
    assert(errorThrown, "Le deuxième rendez-vous chevauchant 09:30->10:30 a été rejeté");
    console.log("✅ TEST 1 PASSED: Chevauchement simple 09:30->10:30 correctement rejeté.");
    passedTests++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 2 — Même heure de début : 09:00->09:30 vs 09:00->10:00
  // ───────────────────────────────────────────────────────────────────────────
  totalTests++;
  console.log("\n▶ TEST 2 — Même heure de début (09:00->09:30 vs 09:00->10:00)...");
  {
    await Appointment.deleteMany({ tenantId: tenantA });

    await appointmentService.createAppointment(
      {
        patientId: patientA._id as any,
        doctorId: docA._id.toString(),
        date: TEST_DATE,
        startTime: "09:00",
        endTime: "09:30",
        durationMin: 30,
        treatment: "Consultation",
      },
      tenantA
    );

    let errorThrown = false;
    try {
      await appointmentService.createAppointment(
        {
          patientId: patientB._id as any,
          doctorId: docA._id.toString(),
          date: TEST_DATE,
          startTime: "09:00",
          endTime: "10:00",
          durationMin: 60,
          treatment: "Extraction",
        },
        tenantA
      );
    } catch (err: any) {
      errorThrown = true;
      assert(err.message === "Double_Booking_Error", `Erreur attendue Double_Booking_Error, reçu ${err.message}`);
    }
    assert(errorThrown, "Deuxième réservation à la même heure de début refusée");
    console.log("✅ TEST 2 PASSED: Même heure de début correctement rejetée.");
    passedTests++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 3 — Chevauchement interne : 09:00->11:00 vs 10:00->10:30
  // ───────────────────────────────────────────────────────────────────────────
  totalTests++;
  console.log("\n▶ TEST 3 — Chevauchement interne (09:00->11:00 vs 10:00->10:30)...");
  {
    await Appointment.deleteMany({ tenantId: tenantA });

    await appointmentService.createAppointment(
      {
        patientId: patientA._id as any,
        doctorId: docA._id.toString(),
        date: TEST_DATE,
        startTime: "09:00",
        endTime: "11:00",
        durationMin: 120,
        treatment: "Chirurgie",
      },
      tenantA
    );

    let errorThrown = false;
    try {
      await appointmentService.createAppointment(
        {
          patientId: patientB._id as any,
          doctorId: docA._id.toString(),
          date: TEST_DATE,
          startTime: "10:00",
          endTime: "10:30",
          durationMin: 30,
          treatment: "Contrôle",
        },
        tenantA
      );
    } catch (err: any) {
      errorThrown = true;
      assert(err.message === "Double_Booking_Error", `Erreur attendue Double_Booking_Error, reçu ${err.message}`);
    }
    assert(errorThrown, "Rendez-vous interne 10:00->10:30 rejeté");
    console.log("✅ TEST 3 PASSED: Chevauchement interne correctement rejeté.");
    passedTests++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 4 — Chevauchement inverse : 10:00->11:00 vs 09:30->10:30
  // ───────────────────────────────────────────────────────────────────────────
  totalTests++;
  console.log("\n▶ TEST 4 — Chevauchement inverse (10:00->11:00 vs 09:30->10:30)...");
  {
    await Appointment.deleteMany({ tenantId: tenantA });

    await appointmentService.createAppointment(
      {
        patientId: patientA._id as any,
        doctorId: docA._id.toString(),
        date: TEST_DATE,
        startTime: "10:00",
        endTime: "11:00",
        durationMin: 60,
        treatment: "Prothèse",
      },
      tenantA
    );

    let errorThrown = false;
    try {
      await appointmentService.createAppointment(
        {
          patientId: patientB._id as any,
          doctorId: docA._id.toString(),
          date: TEST_DATE,
          startTime: "09:30",
          endTime: "10:30",
          durationMin: 60,
          treatment: "Détartrage",
        },
        tenantA
      );
    } catch (err: any) {
      errorThrown = true;
      assert(err.message === "Double_Booking_Error", `Erreur attendue Double_Booking_Error, reçu ${err.message}`);
    }
    assert(errorThrown, "Rendez-vous chevauchant inverse 09:30->10:30 rejeté");
    console.log("✅ TEST 4 PASSED: Chevauchement inverse correctement rejeté.");
    passedTests++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 5 — Rendez-vous adjacent autorisé : 09:00->09:30 vs 09:30->10:00
  // ───────────────────────────────────────────────────────────────────────────
  totalTests++;
  console.log("\n▶ TEST 5 — Rendez-vous adjacent autorisé (09:00->09:30 vs 09:30->10:00)...");
  {
    await Appointment.deleteMany({ tenantId: tenantA });

    const appt1 = await appointmentService.createAppointment(
      {
        patientId: patientA._id as any,
        doctorId: docA._id.toString(),
        date: TEST_DATE,
        startTime: "09:00",
        endTime: "09:30",
        durationMin: 30,
        treatment: "Consultation",
      },
      tenantA
    );

    const appt2 = await appointmentService.createAppointment(
      {
        patientId: patientB._id as any,
        doctorId: docA._id.toString(),
        date: TEST_DATE,
        startTime: "09:30",
        endTime: "10:00",
        durationMin: 30,
        treatment: "Détartrage",
      },
      tenantA
    );

    assert(!!appt1 && !!appt2, "Les deux rendez-vous adjacents ont été acceptés");
    const count = await Appointment.countDocuments({ tenantId: tenantA, date: TEST_DATE });
    assert(count === 2, "Exactement 2 rendez-vous présents en base");
    console.log("✅ TEST 5 PASSED: Créneaux adjacents autorisés sans faux positif.");
    passedTests++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 6 — Concurrence massive réelle : 20 requêtes simultanées (Promise.all)
  // ───────────────────────────────────────────────────────────────────────────
  totalTests++;
  console.log("\n▶ TEST 6 — Concurrence massive réelle (20 requêtes simultanées pour 09:00->10:00)...");
  {
    await Appointment.deleteMany({ tenantId: tenantA });

    const promises = Array.from({ length: 20 }, (_, i) =>
      appointmentService
        .createAppointment(
          {
            patientId: patientA._id as any,
            doctorId: docA._id.toString(),
            date: TEST_DATE,
            startTime: "09:00",
            endTime: "10:00",
            durationMin: 60,
            treatment: `Concurrent-${i}`,
          },
          tenantA
        )
        .then(() => ({ status: "fulfilled" as const }))
        .catch((err) => ({ status: "rejected" as const, error: err.message }))
    );

    const results = await Promise.all(promises);
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const rejected = results.filter((r) => r.status === "rejected").length;

    console.log(`   Résultats: ${successful} succès, ${rejected} rejets`);
    assert(successful === 1, `Exactement 1 réservation réussie attendue, reçu ${successful}`);
    assert(rejected === 19, `Exactement 19 rejets attendus, reçu ${rejected}`);

    const countInDb = await Appointment.countDocuments({ tenantId: tenantA, date: TEST_DATE });
    assert(countInDb === 1, `Exactement 1 document en base, trouvé ${countInDb}`);

    console.log("✅ TEST 6 PASSED: Concurrence massive réelle verrouillée à 100%.");
    passedTests++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 7 — Concurrence réelle avec 4 intervalles distincts chevauchants
  // Request A: 09:00->10:00
  // Request B: 09:30->10:30
  // Request C: 09:45->10:15
  // Request D: 09:15->09:45
  // ───────────────────────────────────────────────────────────────────────────
  totalTests++;
  console.log("\n▶ TEST 7 — Concurrence réelle avec 4 intervalles différents chevauchants simultanés...");
  {
    await Appointment.deleteMany({ tenantId: tenantA });

    const intervals = [
      { startTime: "09:00", endTime: "10:00", durationMin: 60, name: "A (09:00-10:00)" },
      { startTime: "09:30", endTime: "10:30", durationMin: 60, name: "B (09:30-10:30)" },
      { startTime: "09:20", endTime: "09:50", durationMin: 30, name: "C (09:20-09:50)" },
      { startTime: "09:25", endTime: "09:40", durationMin: 15, name: "D (09:25-09:40)" },
    ];

    const promises = intervals.map((intv) =>
      appointmentService
        .createAppointment(
          {
            patientId: patientA._id as any,
            doctorId: docA._id.toString(),
            date: TEST_DATE,
            startTime: intv.startTime,
            endTime: intv.endTime,
            durationMin: intv.durationMin,
            treatment: intv.name,
          },
          tenantA
        )
        .then((doc) => ({ status: "fulfilled" as const, name: intv.name, doc }))
        .catch((err) => ({ status: "rejected" as const, name: intv.name, error: err.message }))
    );

    const results = await Promise.all(promises);
    const successful = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    console.log(`   Résultats: ${successful.length} succès, ${rejected.length} rejets`);
    assert(successful.length === 1, `Exactement 1 réservation compatible attendue, reçu ${successful.length}`);
    assert(rejected.length === 3, `Exactement 3 rejets attendus, reçu ${rejected.length}`);

    // Verify in database
    const apptsInDb = await Appointment.find({ tenantId: tenantA, date: TEST_DATE }).lean();
    assert(apptsInDb.length === 1, `Exactement 1 document en base, trouvé ${apptsInDb.length}`);

    console.log(`✅ TEST 7 PASSED: 4 intervalles concurrents résolus sans chevauchement (Gagnant: ${successful[0]?.name}).`);
    passedTests++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 8 — Isolation multi-tenant (Tenant A vs Tenant B sur le même créneau)
  // ───────────────────────────────────────────────────────────────────────────
  totalTests++;
  console.log("\n▶ TEST 8 — Isolation multi-tenant (Tenant A vs Tenant B simultanés sur 09:00->10:00)...");
  {
    await Appointment.deleteMany({ tenantId: { $in: [tenantA, tenantB] } });

    const [resA, resB] = await Promise.all([
      appointmentService.createAppointment(
        {
          patientId: patientA._id as any,
          doctorId: docA._id.toString(),
          date: TEST_DATE,
          startTime: "09:00",
          endTime: "10:00",
          durationMin: 60,
          treatment: "Tenant A Booking",
        },
        tenantA
      ),
      appointmentService.createAppointment(
        {
          patientId: patientC._id as any,
          doctorId: docC._id.toString(),
          date: TEST_DATE,
          startTime: "09:00",
          endTime: "10:00",
          durationMin: 60,
          treatment: "Tenant B Booking",
        },
        tenantB
      ),
    ]);

    assert(!!resA && !!resB, "Les réservations des deux tenants distincts ont réussi");
    const countA = await Appointment.countDocuments({ tenantId: tenantA, date: TEST_DATE });
    const countB = await Appointment.countDocuments({ tenantId: tenantB, date: TEST_DATE });
    assert(countA === 1 && countB === 1, "Chaque tenant possède son rendez-vous isolé");

    console.log("✅ TEST 8 PASSED: Isolation multi-tenant respectée sous concurrence.");
    passedTests++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 9 — Isolation praticien (Doc A vs Doc B sur le même tenant à 09:00->10:00)
  // ───────────────────────────────────────────────────────────────────────────
  totalTests++;
  console.log("\n▶ TEST 9 — Isolation multi-praticien (Doc A vs Doc B même tenant à 09:00->10:00)...");
  {
    await Appointment.deleteMany({ tenantId: tenantA });

    const [resDocA, resDocB] = await Promise.all([
      appointmentService.createAppointment(
        {
          patientId: patientA._id as any,
          doctorId: docA._id.toString(),
          date: TEST_DATE,
          startTime: "09:00",
          endTime: "10:00",
          durationMin: 60,
          treatment: "Doc A Slot",
        },
        tenantA
      ),
      appointmentService.createAppointment(
        {
          patientId: patientB._id as any,
          doctorId: docB._id.toString(),
          date: TEST_DATE,
          startTime: "09:00",
          endTime: "10:00",
          durationMin: 60,
          treatment: "Doc B Slot",
        },
        tenantA
      ),
    ]);

    assert(!!resDocA && !!resDocB, "Les deux praticiens du même tenant ont pu être réservés au même horaire");
    const count = await Appointment.countDocuments({ tenantId: tenantA, date: TEST_DATE });
    assert(count === 2, "Les 2 rendez-vous existent pour les 2 praticiens");

    console.log("✅ TEST 9 PASSED: Isolation par praticien respectée.");
    passedTests++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 10 — Annulation libère immédiatement les slots
  // ───────────────────────────────────────────────────────────────────────────
  totalTests++;
  console.log("\n▶ TEST 10 — Annulation et libération de créneau...");
  {
    await Appointment.deleteMany({ tenantId: tenantA });

    const appt = await appointmentService.createAppointment(
      {
        patientId: patientA._id as any,
        doctorId: docA._id.toString(),
        date: TEST_DATE,
        startTime: "09:00",
        endTime: "10:00",
        durationMin: 60,
        treatment: "To Cancel",
      },
      tenantA
    );

    // Cancel the appointment
    await appointmentService.updateStatus(appt._id.toString(), "cancelled", tenantA);

    // Now booking an overlapping slot (09:30->10:30) MUST succeed
    const newAppt = await appointmentService.createAppointment(
      {
        patientId: patientB._id as any,
        doctorId: docA._id.toString(),
        date: TEST_DATE,
        startTime: "09:30",
        endTime: "10:30",
        durationMin: 60,
        treatment: "New Booking After Cancellation",
      },
      tenantA
    );

    assert(!!newAppt, "Nouveau rendez-vous créé après annulation");
    console.log("✅ TEST 10 PASSED: L'annulation libère immédiatement les créneaux.");
    passedTests++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 11 — Protection lors de la modification (updateAppointment)
  // ───────────────────────────────────────────────────────────────────────────
  totalTests++;
  console.log("\n▶ TEST 11 — Protection contre les chevauchements lors de la modification...");
  {
    await Appointment.deleteMany({ tenantId: tenantA });

    // Create Appt 1 at 09:00->10:00
    await appointmentService.createAppointment(
      {
        patientId: patientA._id as any,
        doctorId: docA._id.toString(),
        date: TEST_DATE,
        startTime: "09:00",
        endTime: "10:00",
        durationMin: 60,
        treatment: "Fixed Appt 1",
      },
      tenantA
    );

    // Create Appt 2 at 14:00->15:00
    const appt2 = await appointmentService.createAppointment(
      {
        patientId: patientB._id as any,
        doctorId: docA._id.toString(),
        date: TEST_DATE,
        startTime: "14:00",
        endTime: "15:00",
        durationMin: 60,
        treatment: "Appt 2 to Reschedule",
      },
      tenantA
    );

    // Attempt to reschedule Appt 2 to 09:30->10:30 (overlaps Appt 1)
    let errorThrown = false;
    try {
      await appointmentService.updateAppointment(
        appt2._id.toString(),
        {
          startTime: "09:30",
          endTime: "10:30",
        },
        tenantA
      );
    } catch (err: any) {
      errorThrown = true;
      assert(err.message === "Double_Booking_Error", `Erreur attendue Double_Booking_Error, reçu ${err.message}`);
    }

    assert(errorThrown, "La modification vers un créneau chevauchant a été rejetée");

    // Reschedule to a non-overlapping slot (11:00->12:00) MUST succeed
    const updated = await appointmentService.updateAppointment(
      appt2._id.toString(),
      {
        startTime: "11:00",
        endTime: "12:00",
      },
      tenantA
    );

    assert(updated?.startTime === "11:00", "Modification vers créneau libre réussie");
    console.log("✅ TEST 11 PASSED: Modification/Reprogrammation strictement protégée contre les chevauchements.");
    passedTests++;
  }

  // Cleanup
  await Appointment.deleteMany({ tenantId: { $in: [tenantA, tenantB] } });
  await Patient.deleteMany({ tenantId: { $in: [tenantA, tenantB] } });
  await User.deleteMany({ tenantId: { $in: [tenantA, tenantB] } });

  console.log(`\n🎉 ALL ${passedTests}/${totalTests} P0 CONCURRENCY & OVERLAP TESTS PASSED SUCCESSFULLY!`);
}

runP0ConcurrencyTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("P0 Test Suite Error:", err);
    process.exit(1);
  });
