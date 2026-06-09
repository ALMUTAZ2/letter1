var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  runSchedulerCheck: () => runSchedulerCheck,
  scheduleContributorJob: () => scheduleContributorJob,
  scheduleFixedContributorJob: () => scheduleFixedContributorJob,
  scheduleFixedWhatsAppJob: () => scheduleFixedWhatsAppJob,
  scheduleWhatsAppJob: () => scheduleWhatsAppJob,
  startMasterSchedule: () => startMasterSchedule
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_path = __toESM(require("path"), 1);
var import_node_cron = __toESM(require("node-cron"), 1);
var import_date_fns = require("date-fns");
var import_date_fns_tz = require("date-fns-tz");
var import_resend = require("resend");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_axios = __toESM(require("axios"), 1);
var import_fs = require("fs");
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");
import_dotenv.default.config();
var firebaseConfig = JSON.parse((0, import_fs.readFileSync)(import_path.default.join(process.cwd(), "firebase-applet-config.json"), "utf-8"));
var firebaseApp = (0, import_app.initializeApp)(firebaseConfig);
var firestoreDb = (0, import_firestore.getFirestore)(firebaseApp, firebaseConfig.firestoreDatabaseId);
var resend = process.env.RESEND_API_KEY ? new import_resend.Resend(process.env.RESEND_API_KEY) : null;
var TIMEZONE = "Asia/Riyadh";
async function ensureSeedAndSetup() {
  try {
    const seededIds = ["1", "2", "3", "4"];
    for (const id of seededIds) {
      const docRef = (0, import_firestore.doc)(firestoreDb, "letters", id);
      const snap = await (0, import_firestore.getDoc)(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data && (data.entity_source === "\u0623\u0645\u0627\u0646\u0629 \u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0631\u064A\u0627\u0636" || data.entity_source === "\u0647\u064A\u0626\u0629 \u062A\u0637\u0648\u064A\u0631 \u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u062F\u0631\u0639\u064A\u0629" || data.entity_source === "\u0631\u0626\u0627\u0633\u0629 \u0628\u0644\u062F\u064A\u0629 \u0627\u0644\u0631\u0648\u0636\u0629" || data.entity_source === "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u0627\u0633\u062A\u062B\u0645\u0627\u0631")) {
          await (0, import_firestore.deleteDoc)(docRef);
          console.log(`[Server] Deleted template letter matching ID: ${id}`);
        }
      }
    }
  } catch (err) {
    console.error("[Server Init] Letters cleanup/checks failed:", err);
  }
  try {
    const usersSnap = await (0, import_firestore.getDocs)((0, import_firestore.collection)(firestoreDb, "users"));
    if (usersSnap.empty) {
      console.log("[Server Init] Seeding Firestore users...");
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(firestoreDb, "users", "1"), { email: "manager@example.com", name: "\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645", role: "manager" });
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(firestoreDb, "users", "2"), { email: "staff@example.com", name: "\u0645\u0648\u0638\u0641 \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629", role: "staff" });
    }
  } catch (err) {
    console.error("[Server Init] Users seeding failed:", err);
  }
  try {
    const settingsSnap = await (0, import_firestore.getDoc)((0, import_firestore.doc)(firestoreDb, "settings", "global"));
    if (!settingsSnap.exists()) {
      console.log("[Server Init] Seeding Firestore default configurations...");
      const initialSettings = {
        whatsapp_recipient_phone: "+966507668366",
        whatsapp_phone_number_id: "1148865668308769",
        whatsapp_access_token: "EAAOZASL5k18gBRkPFCnEzJOs1yxklW16txxkX3dOtxz8lLGZC8wNRmMlZAoEbNlhpCIOGDt2cvh16TWdbRxyOSiA1FNPBonyyj3oGQCIimcIpNexQT0pVx0N0hsZBO3GtvaDAXDiTEtDeqVE4fJPu1EzPE5RwyxejsLrEmtK1dyDWli1s13Ecpp3Gd384XSbpQZDZD",
        whatsapp_cron_time: "12:15",
        whatsapp_fixed_time: "12:19",
        contributor_recipient_phone: "+966566889475",
        contributor_phone_number_id: "1148865668308769",
        contributor_access_token: "EAAOZASL5k18gBRkPFCnEzJOs1yxklW16txxkX3dOtxz8lLGZC8wNRmMlZAoEbNlhpCIOGDt2cvh16TWdbRxyOSiA1FNPBonyyj3oGQCIimcIpNexQT0pVx0N0hsZBO3GtvaDAXDiTEtDeqVE4fJPu1EzPE5RwyxejsLrEmtK1dyDWli1s13Ecpp3Gd384XSbpQZDZD",
        contributor_cron_time: "12:20",
        contributor_fixed_time: "12:25"
      };
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(firestoreDb, "settings", "global"), initialSettings);
    }
  } catch (err) {
    console.error("[Server Init] Settings seeding failed:", err);
  }
}
async function getLettersFromFirestore() {
  await ensureSeedAndSetup();
  try {
    const snapshot = await (0, import_firestore.getDocs)((0, import_firestore.collection)(firestoreDb, "letters"));
    const list = [];
    snapshot.forEach((d) => {
      list.push(d.data());
    });
    return list;
  } catch (err) {
    console.error("Error reading from Firestore:", err);
    return [];
  }
}
async function getSettingsFromFirestore() {
  await ensureSeedAndSetup();
  try {
    const docSnap = await (0, import_firestore.getDoc)((0, import_firestore.doc)(firestoreDb, "settings", "global"));
    if (docSnap.exists()) {
      const data = docSnap.data() || {};
      const normalized = { ...data };
      const managerKeys = ["recipient_phone", "phone_number_id", "access_token", "cron_time", "fixed_time"];
      for (const k of managerKeys) {
        const val = data[k] !== void 0 ? data[k] : data[`whatsapp_${k}`];
        if (val !== void 0) {
          normalized[k] = val;
          normalized[`whatsapp_${k}`] = val;
        }
      }
      return normalized;
    }
  } catch (err) {
    console.error("Error reading global settings from Firestore:", err);
  }
  return {
    whatsapp_recipient_phone: "+966507668366",
    whatsapp_phone_number_id: "1148865668308769",
    whatsapp_access_token: "EAAOZASL5k18gBRkPFCnEzJOs1yxklW16txxkX3dOtxz8lLGZC8wNRmMlZAoEbNlhpCIOGDt2cvh16TWdbRxyOSiA1FNPBonyyj3oGQCIimcIpNexQT0pVx0N0hsZBO3GtvaDAXDiTEtDeqVE4fJPu1EzPE5RwyxejsLrEmtK1dyDWli1s13Ecpp3Gd384XSbpQZDZD",
    whatsapp_cron_time: "12:15",
    whatsapp_fixed_time: "12:19",
    contributor_recipient_phone: "+966566889475",
    contributor_phone_number_id: "1148865668308769",
    contributor_access_token: "EAAOZASL5k18gBRkPFCnEzJOs1yxklW16txxkX3dOtxz8lLGZC8wNRmMlZAoEbNlhpCIOGDt2cvh16TWdbRxyOSiA1FNPBonyyj3oGQCIimcIpNexQT0pVx0N0hsZBO3GtvaDAXDiTEtDeqVE4fJPu1EzPE5RwyxejsLrEmtK1dyDWli1s13Ecpp3Gd384XSbpQZDZD",
    contributor_cron_time: "12:20",
    contributor_fixed_time: "12:25"
  };
}
async function getLogsFromFirestore() {
  try {
    const snapshot = await (0, import_firestore.getDocs)((0, import_firestore.collection)(firestoreDb, "whatsapp_logs"));
    const logs = [];
    snapshot.forEach((d) => {
      logs.push({ id: d.id, ...d.data() });
    });
    return logs.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()).slice(0, 50);
  } catch (err) {
    console.error("Error reading logs from Firestore:", err);
    return [];
  }
}
async function addLogToFirestore(recipient, content, status, isFailure = false, errorMsg) {
  try {
    const logId = String(Date.now());
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(firestoreDb, "whatsapp_logs", logId), {
      recipient_phone: recipient,
      message_content: content,
      status,
      error_message: errorMsg || null,
      sent_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    console.error("Error writing log to Firestore:", err);
  }
}
function getWorkingDaysElapsed(startDateStr, endDateStr) {
  try {
    const current = /* @__PURE__ */ new Date(startDateStr + "T00:00:00");
    const target = /* @__PURE__ */ new Date(endDateStr + "T00:00:00");
    if (isNaN(current.getTime()) || isNaN(target.getTime())) return 0;
    if (current >= target) return 0;
    let workingDays = 0;
    const date = new Date(current);
    while (date < target) {
      date.setDate(date.getDate() + 1);
      const day = date.getDay();
      if (day !== 5 && day !== 6) {
        workingDays++;
      }
    }
    return workingDays;
  } catch (e) {
    return 0;
  }
}
function isEscalatedByFormula(letter, todayStr) {
  if (letter.status === "\u0645\u063A\u0644\u0642") return false;
  const elapsed = getWorkingDaysElapsed(letter.letter_date, todayStr);
  let limit = 5;
  if (letter.priority === "\u0639\u0627\u0644\u064A\u0629") limit = 1;
  else if (letter.priority === "\u0645\u062A\u0648\u0633\u0637\u0629") limit = 3;
  else if (letter.priority === "\u0645\u0646\u062E\u0641\u0636\u0629") limit = 5;
  return elapsed > limit;
}
async function sendWhatsAppReport(role = "manager", toPhone) {
  const globalConfig = await getSettingsFromFirestore();
  let recipientPhone = "";
  let phoneNumberId = "";
  let accessToken = "";
  if (role === "manager") {
    recipientPhone = toPhone || globalConfig.whatsapp_recipient_phone || "+966507668366";
    phoneNumberId = globalConfig.whatsapp_phone_number_id || "1148865668308769";
    accessToken = globalConfig.whatsapp_access_token || "";
  } else {
    const managerPhoneId = globalConfig.whatsapp_phone_number_id || "1148865668308769";
    const managerToken = globalConfig.whatsapp_access_token || "";
    recipientPhone = toPhone || globalConfig.contributor_recipient_phone || "+966566889475";
    phoneNumberId = (globalConfig.contributor_phone_number_id || "").trim() || managerPhoneId;
    accessToken = (globalConfig.contributor_access_token || "").trim() || managerToken;
  }
  console.log(`Sending WhatsApp (${role}) Report to: ${recipientPhone} via ID: ${phoneNumberId}`);
  const now = (0, import_date_fns_tz.toZonedTime)(/* @__PURE__ */ new Date(), TIMEZONE);
  const todayStr = (0, import_date_fns.format)(now, "yyyy-MM-dd");
  const getDaysDifference = (oldDateStr, newDateStr) => {
    try {
      const d1 = /* @__PURE__ */ new Date(oldDateStr + "T00:00:00");
      const d2 = /* @__PURE__ */ new Date(newDateStr + "T00:00:00");
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.round(diffTime / (1e3 * 60 * 60 * 24));
      return diffDays >= 0 ? diffDays : 0;
    } catch (e) {
      return 0;
    }
  };
  const formatArabicDays = (days) => {
    if (days === 0) return "\u0623\u0642\u0644 \u0645\u0646 \u064A\u0648\u0645";
    if (days === 1) return "\u064A\u0648\u0645 \u0648\u0627\u062D\u062F";
    if (days === 2) return "\u064A\u0648\u0645\u0627\u0646";
    if (days >= 3 && days <= 10) return `${days} \u0623\u064A\u0627\u0645`;
    return `${days} \u064A\u0648\u0645`;
  };
  const allLetters = await getLettersFromFirestore();
  let letters = [];
  let messageBody = "";
  if (role === "manager") {
    letters = allLetters.filter(
      (l) => l.status !== "\u0645\u063A\u0644\u0642" && (l.due_date < todayStr || l.priority === "\u0639\u0627\u0644\u064A\u0629")
    ).sort((a, b) => b.id - a.id);
    if (letters.length === 0) {
      letters = [
        {
          entity_source: "\u0623\u0645\u0627\u0646\u0629 \u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0631\u064A\u0627\u0636",
          letter_number: "100245",
          category: "\u0627\u0639\u062A\u0645\u0627\u062F \u062E\u0637\u0629 \u062A\u062F\u0639\u064A\u0645 \u0634\u0628\u0643\u0629 \u0627\u0644\u062C\u0647\u062F \u0627\u0644\u0645\u062A\u0648\u0633\u0637 \u0628\u062D\u064A \u0627\u0644\u064A\u0631\u0645\u0648\u0643",
          responsible_department: "\u0642\u0633\u0645 \u062A\u062E\u0637\u064A\u0637 \u0627\u0644\u062C\u0647\u062F \u0627\u0644\u0645\u062A\u0648\u0633\u0637",
          letter_date: (0, import_date_fns.format)((0, import_date_fns.addDays)(now, -4), "yyyy-MM-dd")
        }
      ];
    }
    messageBody = `\u0633\u0639\u0627\u062F\u0629 \u0645\u062F\u064A\u0631 \u0627\u0644\u0625\u062F\u0627\u0631\u0629

\u0646\u0648\u062F \u0625\u0634\u0639\u0627\u0631\u0643\u0645 \u0628\u0648\u062C\u0648\u062F \u062E\u0637\u0627\u0628\u0627\u062A *\u0645\u062A\u0623\u062E\u0631\u0629 \u0648\u0630\u0627\u062A \u0623\u0648\u0644\u0648\u064A\u0629 \u0639\u0627\u0644\u064A\u0629 \u0648 \u0645\u0635\u0639\u062F\u0629* \u26A0\uFE0F
\u062A\u0633\u062A\u0644\u0632\u0645 \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0648\u0627\u062A\u062E\u0627\u0630 \u0627\u0644\u0625\u062C\u0631\u0627\u0621 \u0627\u0644\u0644\u0627\u0632\u0645:
`;
    letters.forEach((item, index) => {
      const topic = item.category || "\u0628\u0644\u0627 \u0645\u0648\u0636\u0648\u0639";
      const source = item.entity_source || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F";
      const dept = item.responsible_department || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F";
      const letterDateStr = item.letter_date || todayStr;
      const waitingDays = getDaysDifference(letterDateStr, todayStr);
      messageBody += `
\u{1F4CC} *\u0631\u0642\u0645 \u0627\u0644\u062E\u0637\u0627\u0628:* ${item.letter_number}`;
      messageBody += `
\u{1F3E2} *\u0627\u0644\u062C\u0647\u0629 \u0627\u0644\u0648\u0627\u0631\u062F \u0645\u0646\u0647\u0627:* ${source}`;
      messageBody += `
\u{1F4DD} *\u0627\u0644\u0645\u0648\u0636\u0648\u0639:* ${topic}`;
      messageBody += `
\u{1F465} *\u0627\u0644\u062C\u0647\u0629 \u0627\u0644\u0645\u0633\u0624\u0648\u0644\u0629:* ${dept}`;
      messageBody += `
\u23F3 *\u0645\u062F\u0629 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631:* ${formatArabicDays(waitingDays)}`;
      if (index < letters.length - 1) {
        messageBody += `

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`;
      }
    });
  } else {
    letters = allLetters.filter((item) => {
      if (item.status === "\u0645\u063A\u0644\u0642") return false;
      const hasManualEscalation = item.escalation && item.escalation !== "\u0644\u0627 \u064A\u0648\u062C\u062F" && item.escalation.trim() !== "";
      if (hasManualEscalation) return false;
      const hasFormulaEscalation = isEscalatedByFormula(item, todayStr);
      if (hasFormulaEscalation) return false;
      return true;
    }).sort((a, b) => b.id - a.id);
    if (letters.length === 0) {
      letters = [
        {
          entity_source: "\u0631\u0626\u0627\u0633\u0629 \u0628\u0644\u062F\u064A\u0629 \u0627\u0644\u0631\u0648\u0636\u0629",
          letter_number: "100311",
          category: "\u0634\u0643\u0648\u0649 \u0645\u0646 \u0627\u0646\u0642\u0637\u0627\u0639 \u0627\u0644\u062E\u062F\u0645\u0629 \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629 \u0628\u0625\u0646\u0627\u0631\u0629 \u0627\u0644\u0634\u0648\u0627\u0631\u0639 \u0628\u062D\u064A \u0627\u0644\u0642\u062F\u0633",
          responsible_department: "\u062F\u0627\u0626\u0631\u0629 \u0627\u0644\u062A\u0634\u063A\u064A\u0644 \u0648\u0627\u0644\u0635\u064A\u0627\u0646\u0629 \u2013 \u0627\u0644\u0634\u0631\u0642",
          letter_date: (0, import_date_fns.format)((0, import_date_fns.addDays)(now, -2), "yyyy-MM-dd")
        }
      ];
    }
    messageBody = `\u0633\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u0633\u0627\u0647\u0645

\u0646\u0648\u062F \u0625\u0634\u0639\u0627\u0631\u0643\u0645 \u0628\u062A\u0642\u0631\u064A\u0631 \u062E\u0637\u0627\u0628\u0627\u062A \u0627\u0644\u0645\u0646\u0635\u0629 *\u063A\u064A\u0631 \u0627\u0644\u0645\u0635\u0639\u0651\u062F\u0629* \u{1F4CC}
\u062A\u0633\u062A\u0644\u0632\u0645 \u0627\u0644\u0645\u0631\u0627\u0642\u0628\u0629 \u0627\u0644\u0645\u0633\u062A\u0645\u0631\u0629 \u0648\u0627\u062A\u062E\u0627\u0630 \u0627\u0644\u0625\u062C\u0631\u0627\u0621 \u0627\u0644\u0644\u0627\u0632\u0645:
`;
    letters.forEach((item, index) => {
      const topic = item.category || "\u0628\u0644\u0627 \u0645\u0648\u0636\u0648\u0639";
      const source = item.entity_source || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F";
      const dept = item.responsible_department || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F";
      const letterDateStr = item.letter_date || todayStr;
      const waitingDays = getDaysDifference(letterDateStr, todayStr);
      messageBody += `
\u{1F4CC} *\u0631\u0642\u0645 \u0627\u0644\u062E\u0637\u0627\u0628:* ${item.letter_number}`;
      messageBody += `
\u{1F3E2} *\u0627\u0644\u062C\u0647\u0629 \u0627\u0644\u0648\u0627\u0631\u062F \u0645\u0646\u0647\u0627:* ${source}`;
      messageBody += `
\u{1F4DD} *\u0627\u0644\u0645\u0648\u0636\u0648\u0639:* ${topic}`;
      messageBody += `
\u{1F465} *\u0627\u0644\u062C\u0647\u0629 \u0627\u0644\u0645\u0633\u0624\u0648\u0644\u0629:* ${dept}`;
      messageBody += `
\u23F3 *\u0645\u062F\u0629 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631:* ${formatArabicDays(waitingDays)}`;
      messageBody += `
\u{1F7E2} *\u062D\u0627\u0644\u0629 \u0627\u0644\u062A\u0635\u0639\u064A\u062F:* \u063A\u064A\u0631 \u0645\u0635\u0639\u062F`;
      if (index < letters.length - 1) {
        messageBody += `

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`;
      }
    });
  }
  messageBody += `

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`;
  messageBody += `

\u{1F916} _\u062A\u0645 \u0625\u0639\u062F\u0627\u062F \u0647\u0630\u0627 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0622\u0644\u064A\u0627\u064B \u0644\u063A\u0631\u0636 \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629._`;
  let formattedPhone = recipientPhone.trim().replace(/\D/g, "");
  if (formattedPhone.startsWith("00")) {
    formattedPhone = formattedPhone.substring(2);
  }
  const metaUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: formattedPhone,
    type: "template",
    template: {
      name: "daily_letters_report",
      language: {
        code: "ar"
      },
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: messageBody
            }
          ]
        }
      ]
    }
  };
  try {
    const metaResponse = await import_axios.default.post(metaUrl, payload, { headers });
    await addLogToFirestore(recipientPhone, messageBody, "\u0646\u062C\u0627\u062D");
    return { success: true, data: metaResponse.data, message_content: messageBody };
  } catch (err) {
    const errorDetails = err.response?.data || err.message;
    console.error(`WhatsApp dispatch failure details:`, JSON.stringify(errorDetails));
    await addLogToFirestore(recipientPhone, messageBody, "\u0641\u0634\u0644", true, JSON.stringify(errorDetails));
    return { success: false, error: errorDetails, message_content: messageBody };
  }
}
var masterTickTask = null;
async function runSchedulerCheck() {
  try {
    const nowRiyadh = (0, import_date_fns_tz.toZonedTime)(/* @__PURE__ */ new Date(), TIMEZONE);
    const currentHour = nowRiyadh.getHours();
    const currentMinute = nowRiyadh.getMinutes();
    const rtfDay = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, weekday: "long" });
    const weekdayStr = rtfDay.format(nowRiyadh);
    const isWorkingDay = weekdayStr !== "Friday" && weekdayStr !== "Saturday";
    const currentDateStr = (0, import_date_fns.format)(nowRiyadh, "yyyy-MM-dd");
    const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;
    const uniqueMinuteKey = `${currentDateStr} ${timeStr}`;
    const config = await getSettingsFromFirestore();
    const managerFixedTime = config.whatsapp_fixed_time || "12:19";
    const managerCronTime = config.whatsapp_cron_time || "12:15";
    const contributorFixedTime = config.contributor_fixed_time || "12:25";
    const contributorCronTime = config.contributor_cron_time || "12:20";
    const isAlreadySent = (key) => {
      return config[key] === uniqueMinuteKey;
    };
    const markAsSent = async (key) => {
      try {
        await (0, import_firestore.setDoc)((0, import_firestore.doc)(firestoreDb, "settings", "global"), { [key]: uniqueMinuteKey }, { merge: true });
      } catch (e) {
        console.error(`Failed to mark sent for settings key ${key}:`, e);
      }
    };
    console.log(`[Scheduler Tick] Riyadh Local: ${timeStr}, Day: ${weekdayStr} (Working: ${isWorkingDay})`);
    if (true) {
      if (timeStr === managerFixedTime && !isAlreadySent("last_sent_manager_fixed")) {
        await markAsSent("last_sent_manager_fixed");
        console.log(`[Scheduler] Triggering Manager Fixed Report at ${timeStr}`);
        await sendWhatsAppReport("manager");
      }
      if (timeStr === managerCronTime && !isAlreadySent("last_sent_manager_cron")) {
        await markAsSent("last_sent_manager_cron");
        console.log(`[Scheduler] Triggering Manager Alert at ${timeStr}`);
        await sendWhatsAppReport("manager");
      }
      if (timeStr === contributorFixedTime && !isAlreadySent("last_sent_contributor_fixed")) {
        await markAsSent("last_sent_contributor_fixed");
        console.log(`[Scheduler] Triggering Contributor Fixed Report at ${timeStr}`);
        await sendWhatsAppReport("contributor");
      }
      if (timeStr === contributorCronTime && !isAlreadySent("last_sent_contributor_cron")) {
        await markAsSent("last_sent_contributor_cron");
        console.log(`[Scheduler] Triggering Contributor Alert at ${timeStr}`);
        await sendWhatsAppReport("contributor");
      }
    }
  } catch (err) {
    console.error("[Scheduler Error] Exception in master check:", err);
  }
}
function startMasterSchedule() {
  if (masterTickTask) {
    masterTickTask.stop();
    masterTickTask = null;
  }
  console.log("[Scheduler] Booting 1-Minute Master Scheduler...");
  masterTickTask = import_node_cron.default.schedule("* * * * *", async () => {
    await runSchedulerCheck();
  });
}
function scheduleFixedWhatsAppJob() {
}
function scheduleWhatsAppJob() {
}
function scheduleFixedContributorJob() {
}
function scheduleContributorJob() {
}
async function startServer() {
  await ensureSeedAndSetup();
  startMasterSchedule();
  const app = (0, import_express.default)();
  app.use(import_express.default.json());
  app.get("/api/auth/me", async (req, res) => {
    const email = req.headers["x-user-email"] || "manager@example.com";
    try {
      const snap = await (0, import_firestore.getDocs)((0, import_firestore.collection)(firestoreDb, "users"));
      let user = null;
      snap.forEach((d) => {
        const u = d.data();
        if (u.email === email) user = u;
      });
      res.json(user || { email, role: "staff" });
    } catch (e) {
      res.json({ email, role: "staff" });
    }
  });
  app.get("/api/letters", async (req, res) => {
    const { status, priority, department, search, startDate, endDate } = req.query;
    try {
      let filtered = await getLettersFromFirestore();
      if (status) filtered = filtered.filter((l) => l.status === status);
      if (priority) filtered = filtered.filter((l) => l.priority === priority);
      if (department) filtered = filtered.filter((l) => l.responsible_department === department);
      if (search) {
        const q = String(search).toLowerCase();
        filtered = filtered.filter(
          (l) => l.letter_number.toLowerCase().includes(q) || l.entity_source.toLowerCase().includes(q) || l.category && l.category.toLowerCase().includes(q) || l.responsible_department && l.responsible_department.toLowerCase().includes(q)
        );
      }
      if (startDate && endDate) {
        filtered = filtered.filter((l) => l.letter_date >= startDate && l.letter_date <= endDate);
      }
      res.json(filtered.sort((a, b) => b.id - a.id));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/letters", async (req, res) => {
    const {
      entity_source,
      letter_number,
      letter_date,
      category,
      responsible_department,
      owner,
      priority,
      due_date,
      status,
      escalation,
      notes,
      outgoing_letter_number,
      outgoing_letter_date
    } = req.body;
    try {
      const letters = await getLettersFromFirestore();
      const newId = letters.length > 0 ? Math.max(...letters.map((l) => l.id)) + 1 : 1;
      const newLetter = {
        id: newId,
        entity_source,
        letter_number,
        letter_date,
        category: category || "",
        responsible_department: responsible_department || "",
        owner: owner || "",
        priority: priority || "\u0645\u062A\u0648\u0633\u0637\u0629",
        due_date,
        status: status || "\u062C\u062F\u064A\u062F",
        escalation: escalation || "\u0644\u0627 \u064A\u0648\u062C\u062F",
        notes: notes || "",
        outgoing_letter_number: outgoing_letter_number || "",
        outgoing_letter_date: outgoing_letter_date || "",
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(firestoreDb, "letters", String(newId)), newLetter);
      res.status(201).json({ id: newId });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  app.put("/api/letters/:id", async (req, res) => {
    const { id } = req.params;
    const body = req.body;
    try {
      const docRef = (0, import_firestore.doc)(firestoreDb, "letters", String(id));
      const docSnap = await (0, import_firestore.getDoc)(docRef);
      if (docSnap.exists()) {
        const updated = {
          ...docSnap.data(),
          ...body,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        };
        await (0, import_firestore.setDoc)(docRef, updated);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Letter not found" });
      }
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  app.delete("/api/letters/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await (0, import_firestore.deleteDoc)((0, import_firestore.doc)(firestoreDb, "letters", String(id)));
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  app.get("/api/stats", async (req, res) => {
    try {
      const letters = await getLettersFromFirestore();
      const now = (0, import_date_fns_tz.toZonedTime)(/* @__PURE__ */ new Date(), TIMEZONE);
      const todayStr = (0, import_date_fns.format)(now, "yyyy-MM-dd");
      const weekStart = (0, import_date_fns.format)((0, import_date_fns.startOfWeek)(now), "yyyy-MM-dd");
      const weekEnd = (0, import_date_fns.format)((0, import_date_fns.endOfWeek)(now), "yyyy-MM-dd");
      const openLetters = letters.filter((l) => l.status !== "\u0645\u063A\u0644\u0642");
      const overdueLetters = openLetters.filter((l) => l.due_date < todayStr);
      const dueTodayLetters = openLetters.filter((l) => l.due_date === todayStr);
      const isDueThisWeekHelper = (dStr) => {
        return dStr >= weekStart && dStr <= weekEnd;
      };
      const dueThisWeekLetters = openLetters.filter((l) => isDueThisWeekHelper(l.due_date));
      const priorityMap = openLetters.reduce((acc, curr) => {
        acc[curr.priority] = (acc[curr.priority] || 0) + 1;
        return acc;
      }, {});
      const priorityCounts = Object.entries(priorityMap).map(([priority, count]) => ({
        priority,
        count
      }));
      res.json({
        totalOpen: openLetters.length,
        overdue: overdueLetters.length,
        dueToday: dueTodayLetters.length,
        dueThisWeek: dueThisWeekLetters.length,
        recentLetters: [...letters].sort((a, b) => b.id - a.id).slice(0, 5),
        openLetters: [...openLetters].sort((a, b) => b.id - a.id),
        overdueLetters: [...overdueLetters].sort((a, b) => b.id - a.id),
        dueTodayLetters: [...dueTodayLetters].sort((a, b) => b.id - a.id),
        dueThisWeekLetters: [...dueThisWeekLetters].sort((a, b) => b.id - a.id),
        priorityCounts
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/reports", async (req, res) => {
    try {
      const letters = await getLettersFromFirestore();
      const closedLetters = letters.filter((l) => l.status === "\u0645\u063A\u0644\u0642" && l.close_date);
      let totalResponseTime = 0;
      closedLetters.forEach((l) => {
        const start = new Date(l.letter_date);
        const end = new Date(l.close_date);
        totalResponseTime += (end.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24);
      });
      const avgResponseTime = closedLetters.length > 0 ? (totalResponseTime / closedLetters.length).toFixed(1) : 0;
      const statusMap = letters.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
      }, {});
      const statusCounts = Object.entries(statusMap).map(([status, count]) => ({ status, count }));
      const now = (0, import_date_fns_tz.toZonedTime)(/* @__PURE__ */ new Date(), TIMEZONE);
      const todayStr = (0, import_date_fns.format)(now, "yyyy-MM-dd");
      const overdueCount = letters.filter((l) => l.status !== "\u0645\u063A\u0644\u0642" && l.due_date < todayStr).length;
      const deptMap = {};
      letters.forEach((l) => {
        const d = l.responsible_department || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F";
        if (!deptMap[d]) deptMap[d] = {};
        deptMap[d][l.status] = (deptMap[d][l.status] || 0) + 1;
      });
      const departmentStatusCounts = [];
      Object.entries(deptMap).forEach(([department, statuses]) => {
        Object.entries(statuses).forEach(([status, count]) => {
          departmentStatusCounts.push({ department, status, count });
        });
      });
      res.json({
        avgResponseTime,
        statusCounts,
        total: letters.length,
        overduePercentage: letters.length > 0 ? (overdueCount / letters.length * 100).toFixed(1) : 0,
        departmentStatusCounts
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  import_node_cron.default.schedule("0 8 * * *", async () => {
    console.log("[Scheduler Alert] Triggering daily limits reminders check...");
    const now = (0, import_date_fns_tz.toZonedTime)(/* @__PURE__ */ new Date(), TIMEZONE);
    const todayStr = (0, import_date_fns.format)(now, "yyyy-MM-dd");
    const in1Day = (0, import_date_fns.format)((0, import_date_fns.addDays)(now, 1), "yyyy-MM-dd");
    const in3Days = (0, import_date_fns.format)((0, import_date_fns.addDays)(now, 3), "yyyy-MM-dd");
    const letters = await getLettersFromFirestore();
    const lettersToRemind = letters.filter(
      (l) => l.status !== "\u0645\u063A\u0644\u0642" && (l.due_date === todayStr || l.due_date === in1Day || l.due_date === in3Days)
    );
    if (lettersToRemind.length > 0 && resend) {
      for (const letter of lettersToRemind) {
        await resend.emails.send({
          from: "Letters Tracker <onboarding@resend.dev>",
          to: "manager@example.com",
          subject: `\u062A\u0630\u0643\u064A\u0631: \u062E\u0637\u0627\u0628 \u0631\u0642\u0645 ${letter.letter_number} \u064A\u0633\u062A\u062D\u0642 \u0627\u0644\u0631\u062F \u0642\u0631\u064A\u0628\u0627\u064B`,
          html: `<div dir="rtl">
            <h2>\u062A\u0630\u0643\u064A\u0631 \u0628\u0645\u0648\u0639\u062F \u0627\u0633\u062A\u062D\u0642\u0627\u0642 \u062E\u0637\u0627\u0628</h2>
            <p>\u0627\u0644\u062C\u0647\u0629: ${letter.entity_source}</p>
            <p>\u0631\u0642\u0645 \u0627\u0644\u062E\u0637\u0627\u0628: ${letter.letter_number}</p>
            <p>\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642: ${letter.due_date}</p>
            <p>\u0627\u0644\u0623\u0648\u0644\u0648\u064A\u0629: ${letter.priority}</p>
          </div>`
        });
      }
    }
  }, { timezone: TIMEZONE });
  import_node_cron.default.schedule("0 20 * * *", async () => {
    console.log("[Scheduler Alert] Dispatching daily summary reports...");
    const now = (0, import_date_fns_tz.toZonedTime)(/* @__PURE__ */ new Date(), TIMEZONE);
    const tomorrowStr = (0, import_date_fns.format)((0, import_date_fns.addDays)(now, 1), "yyyy-MM-dd");
    const todayStr = (0, import_date_fns.format)(now, "yyyy-MM-dd");
    const letters = await getLettersFromFirestore();
    const openLetters = letters.filter((l) => l.status !== "\u0645\u063A\u0644\u0642");
    const dueTomorrow = openLetters.filter((l) => l.due_date === tomorrowStr);
    const overdue = openLetters.filter((l) => l.due_date < todayStr);
    const highPriority = openLetters.filter((l) => l.priority === "\u0639\u0627\u0644\u064A\u0629");
    if (resend) {
      await resend.emails.send({
        from: "Letters Tracker <onboarding@resend.dev>",
        to: "manager@example.com",
        subject: "\u0627\u0644\u0645\u0644\u062E\u0635 \u0627\u0644\u064A\u0648\u0645\u064A \u0644\u0645\u0646\u0635\u0629 \u062A\u062A\u0628\u0639 \u0627\u0644\u062E\u0637\u0627\u0628\u0627\u062A",
        html: `<div dir="rtl">
          <h2>\u0627\u0644\u0645\u0644\u062E\u0635 \u0627\u0644\u064A\u0648\u0645\u064A</h2>
          <h3>\u062E\u0637\u0627\u0628\u0627\u062A \u062A\u0633\u062A\u062D\u0642 \u063A\u062F\u0627\u064B (${dueTomorrow.length}):</h3>
          <ul>${dueTomorrow.map((l) => `<li>${l.letter_number} - ${l.entity_source}</li>`).join("")}</ul>
          <h3>\u062E\u0637\u0627\u0628\u0627\u062A \u0645\u062A\u0623\u062E\u0631\u0629 (${overdue.length}):</h3>
          <ul>${overdue.map((l) => `<li>${l.letter_number} - ${l.entity_source}</li>`).join("")}</ul>
          <h3>\u062E\u0637\u0627\u0628\u0627\u062A \u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u0623\u0647\u0645\u064A\u0629 (${highPriority.length}):</h3>
          <ul>${highPriority.map((l) => `<li>${l.letter_number} - ${l.entity_source}</li>`).join("")}</ul>
        </div>`
      });
    }
  }, { timezone: TIMEZONE });
  app.get("/api/whatsapp-config", async (req, res) => {
    try {
      const config = await getSettingsFromFirestore();
      const logs = await getLogsFromFirestore();
      res.json({
        recipient_phone: config.whatsapp_recipient_phone || "+966507668366",
        phone_number_id: config.whatsapp_phone_number_id || "1148865668308769",
        access_token: config.whatsapp_access_token || "",
        cron_time: config.whatsapp_cron_time || "12:15",
        fixed_time: config.whatsapp_fixed_time || "12:19",
        contributor_recipient_phone: config.contributor_recipient_phone || "+966566889475",
        contributor_phone_number_id: config.contributor_phone_number_id || "1148865668308769",
        contributor_access_token: config.contributor_access_token || "",
        contributor_cron_time: config.contributor_cron_time || "12:20",
        contributor_fixed_time: config.contributor_fixed_time || "12:25",
        logs
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/whatsapp-config", async (req, res) => {
    try {
      const body = req.body;
      for (const [key, val] of Object.entries(body)) {
        if (val !== void 0) {
          await (0, import_firestore.setDoc)((0, import_firestore.doc)(firestoreDb, "settings", "global"), { [key]: val }, { merge: true });
        }
      }
      await runSchedulerCheck();
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app.all("/api/scheduler-tick", async (req, res) => {
    try {
      await runSchedulerCheck();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/send-whatsapp-test", async (req, res) => {
    const { to_phone, role } = req.body;
    const result = await sendWhatsAppReport(role || "manager", to_phone);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(import_express.default.static(import_path.default.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(process.cwd(), "dist", "index.html"));
    });
  }
  const PORT = 3e3;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server executing natively on http://0.0.0.0:${PORT}`);
  });
}
startServer();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runSchedulerCheck,
  scheduleContributorJob,
  scheduleFixedContributorJob,
  scheduleFixedWhatsAppJob,
  scheduleWhatsAppJob,
  startMasterSchedule
});
//# sourceMappingURL=test.cjs.map
