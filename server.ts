import express from "express";
import path from "path";
import cron from "node-cron";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Resend } from "resend";
import dotenv from "dotenv";
import axios from "axios";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

// Firebase Server SDK Setup
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, deleteDoc, addDoc } from "firebase/firestore";

dotenv.config();

const firebaseApp = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
console.log("[Server] Firebase configuration loaded statically.");

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const TIMEZONE = "Asia/Riyadh";

async function ensureSeedAndSetup() {
  try {
    const usersSnap = await getDocs(collection(firestoreDb, "users"));
    if (usersSnap.empty) {
      console.log("[Server Init] Seeding Firestore users...");
      await setDoc(doc(firestoreDb, "users", "1"), { email: "manager@example.com", name: "المدير العام", role: "manager" });
      await setDoc(doc(firestoreDb, "users", "2"), { email: "staff@example.com", name: "موظف المتابعة", role: "staff" });
    }
  } catch (err) {
    console.error("[Server Init] Users seeding failed:", err);
  }

  try {
    const settingsSnap = await getDoc(doc(firestoreDb, "settings", "global"));
    const newToken = "EAAOZASL5k18gBRiMDPF0ttY0PJXYxRl88FwPLdZBGuZAZBGeOLOMJmB6ZBlswxSiPOmxqxE4LhFXKAgsgHfcPLGOMgh9wdbBZAiuXde0OuC1kS9SQ7e6fyLTc8Uc8bp6ZC5UYyAFBEP2LdziTSZBsMa9HYZA8ZBfO80VMiYssz1fRtaWXYzNeQMZCgLIYCTShh7zwZDZD";
    const oldTokens = [
      "EAAOZASL5k18gBRgxcQrOPMZCLIqwZC9zdJdnRiSXiKcIs6EKhe2AiSwzrFrx9HkEb5APXZAVQ3DDOQqqcWxAlE8CzQZCuCZAiwlPWKyo2RfnpaeYvuqnmlZC4X3hT7nDOJ4IVGzitWmdIfBID3VXr3JAdSSjEdBZBfAAvBgOI9OygbmD78pGmmbaZAKiQCRgVtQZDZD",
      "EAAOZASL5k18gBRkPFCnEzJOs1yxklW16txxkX3dOtxz8lLGZC8wNRmMlZAoEbNlhpCIOGDt2cvh16TWdbRxyOSiA1FNPBonyyj3oGQCIimcIpNexQT0pVx0N0hsZBO3GtvaDAXDiTEtDeqVE4fJPu1EzPE5RwyxejsLrEmtK1dyDWli1s13Ecpp3Gd384XSbpQZDZD"
    ];

    if (!settingsSnap.exists()) {
      console.log("[Server Init] Seeding Firestore default configurations...");
      const initialSettings = {
        whatsapp_recipient_phone: "+966507668366",
        whatsapp_phone_number_id: "1148865668308769",
        whatsapp_access_token: newToken,
        whatsapp_cron_time: "12:15",
        whatsapp_fixed_time: "12:19",
        contributor_recipient_phone: "+966566889475",
        contributor_phone_number_id: "1148865668308769",
        contributor_access_token: newToken,
        contributor_cron_time: "12:20",
        contributor_fixed_time: "12:25"
      };
      await setDoc(doc(firestoreDb, "settings", "global"), initialSettings);
    } else {
      const currentData = settingsSnap.data() || {};
      const updates: any = {};
      let needsUpdate = false;

      // Migrate ONLY if the actual token stored matches one of the old/expired tokens
      const fieldsToCheck = [
        "whatsapp_access_token",
        "contributor_access_token",
        "access_token"
      ];

      for (const field of fieldsToCheck) {
        const val = currentData[field];
        if (val && oldTokens.includes(val.trim())) {
          updates[field] = newToken;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        console.log("[Server Init] Overwriting expired old token in Firestore settings...");
        await setDoc(doc(firestoreDb, "settings", "global"), updates, { merge: true });
      }
    }
  } catch (err) {
    console.error("[Server Init] Settings seeding failed:", err);
  }
}

async function getLettersFromFirestore(): Promise<any[]> {
  await ensureSeedAndSetup();
  try {
    const snapshot = await getDocs(collection(firestoreDb, "letters"));
    const list: any[] = [];
    snapshot.forEach((d) => {
      list.push(d.data());
    });
    return list;
  } catch (err) {
    console.error("Error reading from Firestore:", err);
    return [];
  }
}

async function getSettingsFromFirestore(): Promise<any> {
  await ensureSeedAndSetup();
  try {
    const docSnap = await getDoc(doc(firestoreDb, "settings", "global"));
    if (docSnap.exists()) {
      const data = docSnap.data() || {};
      const normalized: any = { ...data };

      const managerKeys = ["recipient_phone", "phone_number_id", "access_token", "cron_time", "fixed_time"];
      for (const k of managerKeys) {
        const val = data[k] !== undefined ? data[k] : data["whatsapp_" + k];
        if (val !== undefined) {
          normalized[k] = val;
          normalized["whatsapp_" + k] = val;
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
    whatsapp_access_token: "EAAOZASL5k18gBRiMDPF0ttY0PJXYxRl88FwPLdZBGuZAZBGeOLOMJmB6ZBlswxSiPOmxqxE4LhFXKAgsgHfcPLGOMgh9wdbBZAiuXde0OuC1kS9SQ7e6fyLTc8Uc8bp6ZC5UYyAFBEP2LdziTSZBsMa9HYZA8ZBfO80VMiYssz1fRtaWXYzNeQMZCgLIYCTShh7zwZDZD",
    whatsapp_cron_time: "12:15",
    whatsapp_fixed_time: "12:19",
    contributor_recipient_phone: "+966566889475",
    contributor_phone_number_id: "1148865668308769",
    contributor_access_token: "EAAOZASL5k18gBRiMDPF0ttY0PJXYxRl88FwPLdZBGuZAZBGeOLOMJmB6ZBlswxSiPOmxqxE4LhFXKAgsgHfcPLGOMgh9wdbBZAiuXde0OuC1kS9SQ7e6fyLTc8Uc8bp6ZC5UYyAFBEP2LdziTSZBsMa9HYZA8ZBfO80VMiYssz1fRtaWXYzNeQMZCgLIYCTShh7zwZDZD",
    contributor_cron_time: "12:20",
    contributor_fixed_time: "12:25"
  };
}

async function getLogsFromFirestore(): Promise<any[]> {
  try {
    const snapshot = await getDocs(collection(firestoreDb, "whatsapp_logs"));
    const logs: any[] = [];
    snapshot.forEach(d => {
      logs.push({ id: d.id, ...d.data() });
    });
    return logs.sort((a,b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()).slice(0, 50);
  } catch (err) {
    console.error("Error reading logs from Firestore:", err);
    return [];
  }
}

async function addLogToFirestore(recipient: string, content: string, status: string, isFailure = false, errorMsg?: string): Promise<void> {
  try {
    const logId = String(Date.now());
    await setDoc(doc(firestoreDb, "whatsapp_logs", logId), {
      recipient_phone: recipient,
      message_content: content,
      status,
      error_message: errorMsg || null,
      sent_at: new Date().toISOString()
    });
  } catch (err) {
    console.error("Error writing log to Firestore:", err);
  }
}

function getWorkingDaysElapsed(startDateStr: string, endDateStr: string): number {
  try {
    const current = new Date(startDateStr + "T00:00:00");
    const target = new Date(endDateStr + "T00:00:00");
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

function isEscalatedByFormula(letter: any, todayStr: string): boolean {
  if (letter.status === "مغلق") return false;
  const elapsed = getWorkingDaysElapsed(letter.letter_date, todayStr);
  let limit = 5;
  if (letter.priority === "عالية") limit = 1;
  else if (letter.priority === "متوسطة") limit = 3;
  else if (letter.priority === "منخفضة") limit = 5;

  return elapsed > limit;
}

export async function sendWhatsAppReport(role: "manager" | "contributor" = "manager", toPhone?: string) {
  const globalConfig = await getSettingsFromFirestore();

  let recipientPhone = "";
  let phoneNumberId = "";
  let accessToken = "";

  if (role === "manager") {
    recipientPhone = toPhone || globalConfig.whatsapp_recipient_phone || globalConfig.recipient_phone || "+966507668366";
    phoneNumberId = globalConfig.whatsapp_phone_number_id || globalConfig.phone_number_id || "1148865668308769";
    accessToken = (globalConfig.whatsapp_access_token || globalConfig.access_token || "EAAOZASL5k18gBRiMDPF0ttY0PJXYxRl88FwPLdZBGuZAZBGeOLOMJmB6ZBlswxSiPOmxqxE4LhFXKAgsgHfcPLGOMgh9wdbBZAiuXde0OuC1kS9SQ7e6fyLTc8Uc8bp6ZC5UYyAFBEP2LdziTSZBsMa9HYZA8ZBfO80VMiYssz1fRtaWXYzNeQMZCgLIYCTShh7zwZDZD").trim();
  } else {
    const managerPhoneId = globalConfig.whatsapp_phone_number_id || globalConfig.phone_number_id || "1148865668308769";
    const managerToken = (globalConfig.whatsapp_access_token || globalConfig.access_token || "EAAOZASL5k18gBRiMDPF0ttY0PJXYxRl88FwPLdZBGuZAZBGeOLOMJmB6ZBlswxSiPOmxqxE4LhFXKAgsgHfcPLGOMgh9wdbBZAiuXde0OuC1kS9SQ7e6fyLTc8Uc8bp6ZC5UYyAFBEP2LdziTSZBsMa9HYZA8ZBfO80VMiYssz1fRtaWXYzNeQMZCgLIYCTShh7zwZDZD").trim();

    recipientPhone = toPhone || globalConfig.contributor_recipient_phone || "+966566889475";
    phoneNumberId = (globalConfig.contributor_phone_number_id || "").trim() || managerPhoneId;
    accessToken = (globalConfig.contributor_access_token || managerToken).trim();
  }

  console.log(`Sending Pure 21-Param Chunked Template Report to: ${recipientPhone}`);

  const now = toZonedTime(new Date(), TIMEZONE);
  const todayStr = format(now, "yyyy-MM-dd");

  const getDaysDifference = (oldDateStr: string, newDateStr: string) => {
    try {
      const d1 = new Date(oldDateStr + "T00:00:00");
      const d2 = new Date(newDateStr + "T00:00:00");
      return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    } catch (e) { return 0; }
  };

  const formatArabicDays = (days: number): string => {
    if (days === 0) return "أقل من يوم";
    if (days === 1) return "يوم واحد";
    if (days === 2) return "يومان";
    if (days >= 3 && days <= 10) return `${days} أيام`;
    return `${days} يوم`;
  };

  const allLetters = await getLettersFromFirestore();
  let filteredLetters: any[] = [];
  
  if (role === "manager") {
    filteredLetters = allLetters.filter(l =>
      l.status !== 'مغلق' && (l.due_date < todayStr || l.priority === 'عالية')
    );
  } else {
    filteredLetters = allLetters.filter(l =>
      l.status !== 'مغلق' && !isEscalatedByFormula(l, todayStr)
    );
  }

  filteredLetters = filteredLetters.sort((a, b) => b.id - a.id);

  const totalCount = filteredLetters.length;
  if (totalCount === 0) return { success: true, message: "No letters to report." };

  let overallSuccess = true;
  let lastError = "";

  if (accessToken && phoneNumberId) {
    let formattedPhone = recipientPhone.trim().replace(/\D/g, "");
    if (formattedPhone.startsWith("00")) formattedPhone = formattedPhone.substring(2);

    const metaUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    const headers = { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" };

    if (role === "contributor") {
      let verticalText = `عزيزي المساهم\n`;
      verticalText += `نود إشعاركم بوجود خطابات *غير مصعدة بعدد ( ${filteredLetters.length} ) خطابات* ⚠️\n`;
      verticalText += `تستلزم المتابعة المستمرة واتخاذ الإجراء اللازم\n\n`;
      verticalText += `تفاصيل الخطابات:\n`;

      filteredLetters.forEach((item, idx) => {
        const topic = (item.category || "بلا موضوع").trim();
        const source = (item.entity_source || "غير محدد").trim();
        const dept = (item.responsible_department || "غير محدد").trim();
        const waitingDays = getDaysDifference(item.letter_date || todayStr, todayStr);
        let durationStr = formatArabicDays(waitingDays);
        if (waitingDays < 0) durationStr = `${waitingDays} يوم`;

        verticalText += `📌 *رقم الخطاب:* ${item.letter_number}\n🏢 *الجهة:* ${source}\n📝 *الموضوع:* ${topic}\n👥 *المسؤول:* ${dept}\n⏳ *المدة:* ${durationStr}\n🟢 *التصعيد:* غير مصعد`;
        
        if (idx < filteredLetters.length - 1) {
          verticalText += `\n\n`;
        }
      });
      
      verticalText += `\n\n🤖 _تم إعداد هذا التقرير آلياً لغرض المتابعة اليومية._`;

      let reportDocId = "report_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
      try {
        const reportDocRef = doc(firestoreDb, "settings", reportDocId);
        await setDoc(reportDocRef, {
          text: verticalText,
          createdAt: new Date().toISOString()
        });
      } catch (err: any) {
        console.error("Firestore Reports Error:", err);
        reportDocId = "";
      }

      const appUrl = globalConfig.app_url || "https://ais-pre-7e7ueomjufef2e4zagaeqs-415170015555.europe-west2.run.app";
      const link = reportDocId ? `${appUrl}/share-report?id=${reportDocId}` : "";

      const CHUNK_SIZE = filteredLetters.length > 0 ? filteredLetters.length : 1;
      for (let chunkIndex = 0; chunkIndex < filteredLetters.length; chunkIndex += CHUNK_SIZE) {
        const currentChunk = filteredLetters.slice(chunkIndex, chunkIndex + CHUNK_SIZE);

        let horizontalText = "";
        currentChunk.forEach((item, idx) => {
          const topic = (item.category || "بلا موضوع").trim();
          const source = (item.entity_source || "غير محدد").trim();
          const dept = (item.responsible_department || "غير محدد").trim();
          const waitingDays = getDaysDifference(item.letter_date || todayStr, todayStr);
          let durationStr = formatArabicDays(waitingDays);
          if (waitingDays < 0) durationStr = `${waitingDays} يوم`;

          horizontalText += `📌${item.letter_number}|🏢${source}|📝${topic}|👥${dept}|⏳${durationStr}|🟢غير مصعد`;
          
          if (idx < currentChunk.length - 1) {
            horizontalText += ` ーーーー `;
          }
        });

        let chunkCountStr = String(totalCount);

        let whatsappParam2 = horizontalText;
        if (link) {
            whatsappParam2 += ` ーーーー 🔗 لنسخ التقرير، افتح الرابط: ${link}`;
        }

        // WhatsApp templates cannot contain newlines or multiple consecutive spaces in parameters
        whatsappParam2 = whatsappParam2.replace(/[\n\r\t]/g, " ").replace(/ {2,}/g, " ").trim();
        chunkCountStr = chunkCountStr.replace(/[\n\r\t]/g, " ").replace(/ {2,}/g, " ").trim();

        const parametersPayload = [
          { type: "text", text: chunkCountStr.substring(0, 1024) },
          { type: "text", text: whatsappParam2.substring(0, 1024) }
        ];

        const payload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: "daily_letters_report_contributor",
            language: { code: "ar" },
            components: [
              { 
                type: "body", 
                parameters: parametersPayload 
              }
            ]
          }
        };

        try {
          await axios.post(metaUrl, payload, { headers });
          console.log(`[Meta API] Contributor Pack sent successfully.`);
          
          await addLogToFirestore(
            recipientPhone,
            `تم إرسال تقرير المساهم بنجاح. يحتوي على ${currentChunk.length} خطاب.`,
            "نجاح",
            false
          );
        } catch (xhrError: any) {
          overallSuccess = false;
          const errMessage = xhrError.response?.data ? JSON.stringify(xhrError.response.data) : xhrError.message;
          lastError = errMessage;
          console.error("Meta API Contributor Error:", errMessage);

          await addLogToFirestore(
            recipientPhone,
            `فشل إرسال تقرير المساهم.`,
            "فشل",
            true,
            errMessage
          );
        }
      }
    } else {
      const CHUNK_SIZE = 4;

      for (let chunkIndex = 0; chunkIndex < filteredLetters.length; chunkIndex += CHUNK_SIZE) {
        const currentChunk = filteredLetters.slice(chunkIndex, chunkIndex + CHUNK_SIZE);

        let templateParams: string[] = Array(21).fill("‎");

        if (totalCount > CHUNK_SIZE) {
          templateParams[0] = `(${chunkIndex + 1} إلى ${Math.min(chunkIndex + CHUNK_SIZE, totalCount)}) من أصل ${totalCount}`;
        } else {
          templateParams[0] = String(totalCount);
        }

        for (let i = 0; i < CHUNK_SIZE; i++) {
          if (currentChunk[i]) {
            const item = currentChunk[i];
            const topic = (item.category || "بلا موضوع").trim();
            const source = (item.entity_source || "غير محدد").trim();
            const dept = (item.responsible_department || "غير محدد").trim();
            const waitingDays = getDaysDifference(item.letter_date || todayStr, todayStr);

            const baseIndex = 1 + (i * 5);

            templateParams[baseIndex]     = String(item.letter_number).trim();
            templateParams[baseIndex + 1] = String(source).trim();
            templateParams[baseIndex + 2] = String(topic).trim();
            templateParams[baseIndex + 3] = String(dept).trim();
            templateParams[baseIndex + 4] = formatArabicDays(waitingDays);
          } else {
            break;
          }
        }

        const parametersPayload = templateParams.map(text => ({ type: "text", text: text }));

        const payload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: "daily_letters_report",
            language: { code: "ar" },
            components: [{ type: "body", parameters: parametersPayload }]
          }
        };

        try {
          await axios.post(metaUrl, payload, { headers });
          console.log(`[Meta API] Clean Pack ${chunkIndex / CHUNK_SIZE + 1} sent successfully.`);

          await addLogToFirestore(
            recipientPhone,
            `تم إرسال حزمة التقرير (21 متغير) بنجاح للدفعة ${chunkIndex / CHUNK_SIZE + 1} لعدد ${currentChunk.length} خطابات من المنصة.`,
            "نجاح",
            false
          );
        } catch (xhrError: any) {
          overallSuccess = false;
          const errMessage = xhrError.response?.data ? JSON.stringify(xhrError.response.data) : xhrError.message;
          lastError = errMessage;
          console.error("Meta API Pure Parameter Error:", errMessage);

          await addLogToFirestore(
            recipientPhone,
            `فشل إرسال حزمة التقرير (21 متغير) للدفعة ${chunkIndex / CHUNK_SIZE + 1}`,
            "فشل",
            true,
            errMessage
          );
        }
      }
    }
  } else {
    overallSuccess = false;
    lastError = "Missing access token or phone number ID in WhatsApp configuration.";
  }

  return { success: overallSuccess, error: lastError, message_content: overallSuccess ? "تم الإرسال بنجاح" : "فشل" };
}

let masterTickTask: any = null;

export async function runSchedulerCheck() {
  try {
    const nowRiyadh = toZonedTime(new Date(), TIMEZONE);
    const currentHour = nowRiyadh.getHours();
    const currentMinute = nowRiyadh.getMinutes();
    
    const rtfDay = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, weekday: 'long' });
    const weekdayStr = rtfDay.format(nowRiyadh);
    const isWorkingDay = weekdayStr !== "Friday" && weekdayStr !== "Saturday";

    const currentDateStr = format(nowRiyadh, "yyyy-MM-dd");
    const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;
    const uniqueMinuteKey = `${currentDateStr} ${timeStr}`;

    const config = await getSettingsFromFirestore();

    const managerFixedTime = config.whatsapp_fixed_time || "12:19";
    const managerCronTime = config.whatsapp_cron_time || "12:15";
    const contributorFixedTime = config.contributor_fixed_time || "12:25";
    const contributorCronTime = config.contributor_cron_time || "12:20";

    const isAlreadySent = (key: string): boolean => {
      return config[key] === uniqueMinuteKey;
    };

    const markAsSent = async (key: string) => {
      try {
        await setDoc(doc(firestoreDb, "settings", "global"), { [key]: uniqueMinuteKey }, { merge: true });
      } catch (e) {
        console.error(`Failed to mark sent for settings key ${key}:`, e);
      }
    };

    console.log(`[Scheduler Tick] Riyadh Local: ${timeStr}, Day: ${weekdayStr} (Working: ${isWorkingDay})`);

    // We can run report dispatches on scheduled minutes (independent of weekday checking if desired, or skip on Fri/Sat if strictly requested)
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

export function startMasterSchedule() {
  if (process.env.VERCEL) {
    console.log("[Scheduler] Skipping node-cron boot on Vercel, relying on /api/scheduler-tick");
    return;
  }
  if (masterTickTask) {
    masterTickTask.stop();
    masterTickTask = null;
  }

  console.log("[Scheduler] Booting 1-Minute Master Scheduler...");
  masterTickTask = cron.schedule("* * * * *", async () => {
    await runSchedulerCheck();
  });
}

export function scheduleFixedWhatsAppJob() {}
export function scheduleWhatsAppJob() {}
export function scheduleFixedContributorJob() {}
export function scheduleContributorJob() {}

const app = express();
app.use(express.json());

// Run seed asynchronously without blocking
ensureSeedAndSetup().catch(console.error);
startMasterSchedule();

// Keep everything below in app as routes, and wrap the Vite/listen logic


  app.get("/api/auth/me", async (req, res) => {
    const email = req.headers["x-user-email"] || "manager@example.com";
    try {
      const snap = await getDocs(collection(firestoreDb, "users"));
      let user: any = null;
      snap.forEach(d => {
        const u = d.data();
        if (u.email === email) user = u;
      });
      res.json(user || { email, role: "staff" });
    } catch (e) {
      res.json({ email, role: "staff" });
    }
  });

  app.get("/api/reports/:id", async (req, res) => {
    try {
      const docRef = doc(firestoreDb, "settings", req.params.id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        res.json({ success: true, text: snap.data().text });
      } else {
        res.status(404).json({ success: false, error: "Report not found" });
      }
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/letters", async (req, res) => {
    const { status, priority, department, search, startDate, endDate } = req.query;
    try {
      let filtered = await getLettersFromFirestore();

      if (status) filtered = filtered.filter(l => l.status === status);
      if (priority) filtered = filtered.filter(l => l.priority === priority);
      if (department) filtered = filtered.filter(l => l.responsible_department === department);
      if (search) {
        const q = String(search).toLowerCase();
        filtered = filtered.filter(l => 
          l.letter_number.toLowerCase().includes(q) ||
          l.entity_source.toLowerCase().includes(q) ||
          (l.category && l.category.toLowerCase().includes(q)) ||
          (l.responsible_department && l.responsible_department.toLowerCase().includes(q))
        );
      }
      if (startDate && endDate) {
        filtered = filtered.filter(l => l.letter_date >= startDate && l.letter_date <= endDate);
      }

      res.json(filtered.sort((a,b) => b.id - a.id));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/letters", async (req, res) => {
    const {
      entity_source, letter_number, letter_date, category,
      responsible_department, owner, priority, due_date,
      status, escalation, notes, outgoing_letter_number, outgoing_letter_date
    } = req.body;

    try {
      const letters = await getLettersFromFirestore();
      const newId = letters.length > 0 ? Math.max(...letters.map(l => l.id)) + 1 : 1;

      const newLetter = {
        id: newId,
        entity_source,
        letter_number,
        letter_date,
        category: category || "",
        responsible_department: responsible_department || "",
        owner: owner || "",
        priority: priority || "متوسطة",
        due_date,
        status: status || "جديد",
        escalation: escalation || "لا يوجد",
        notes: notes || "",
        outgoing_letter_number: outgoing_letter_number || "",
        outgoing_letter_date: outgoing_letter_date || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await setDoc(doc(firestoreDb, "letters", String(newId)), newLetter);
      res.status(201).json({ id: newId });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/letters/:id", async (req, res) => {
    const { id } = req.params;
    const body = req.body;

    try {
      const docRef = doc(firestoreDb, "letters", String(id));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const updated = {
          ...docSnap.data(),
          ...body,
          updated_at: new Date().toISOString()
        };
        await setDoc(docRef, updated);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Letter not found" });
      }
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete("/api/letters/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await deleteDoc(doc(firestoreDb, "letters", String(id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/stats", async (req, res) => {
    try {
      const letters = await getLettersFromFirestore();
      const now = toZonedTime(new Date(), TIMEZONE);
      const todayStr = format(now, "yyyy-MM-dd");
      const weekStart = format(startOfWeek(now), "yyyy-MM-dd");
      const weekEnd = format(endOfWeek(now), "yyyy-MM-dd");

      const openLetters = letters.filter(l => l.status !== "مغلق");
      const overdueLetters = openLetters.filter(l => l.due_date < todayStr);
      const dueTodayLetters = openLetters.filter(l => l.due_date === todayStr);
      
      const isDueThisWeekHelper = (dStr: string) => {
        return dStr >= weekStart && dStr <= weekEnd;
      };
      
      const dueThisWeekLetters = openLetters.filter(l => isDueThisWeekHelper(l.due_date));

      const priorityMap = openLetters.reduce((acc, curr) => {
        acc[curr.priority] = (acc[curr.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const priorityCounts = Object.entries(priorityMap).map(([priority, count]) => ({
        priority,
        count
      }));

      res.json({
        totalOpen: openLetters.length,
        overdue: overdueLetters.length,
        dueToday: dueTodayLetters.length,
        dueThisWeek: dueThisWeekLetters.length,
        recentLetters: [...letters].sort((a,b) => b.id - a.id).slice(0, 5),
        openLetters: [...openLetters].sort((a,b) => b.id - a.id),
        overdueLetters: [...overdueLetters].sort((a,b) => b.id - a.id),
        dueTodayLetters: [...dueTodayLetters].sort((a,b) => b.id - a.id),
        dueThisWeekLetters: [...dueThisWeekLetters].sort((a,b) => b.id - a.id),
        priorityCounts
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/reports", async (req, res) => {
    try {
      const letters = await getLettersFromFirestore();
      const closedLetters = letters.filter(l => l.status === "مغلق" && l.close_date);

      let totalResponseTime = 0;
      closedLetters.forEach(l => {
        const start = new Date(l.letter_date);
        const end = new Date(l.close_date);
        totalResponseTime += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      });

      const avgResponseTime = closedLetters.length > 0 ? (totalResponseTime / closedLetters.length).toFixed(1) : 0;
      
      const statusMap = letters.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const statusCounts = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

      const now = toZonedTime(new Date(), TIMEZONE);
      const todayStr = format(now, "yyyy-MM-dd");
      const overdueCount = letters.filter(l => l.status !== "مغلق" && l.due_date < todayStr).length;

      const deptMap: Record<string, Record<string, number>> = {};
      letters.forEach(l => {
        const d = l.responsible_department || "غير محدد";
        if (!deptMap[d]) deptMap[d] = {};
        deptMap[d][l.status] = (deptMap[d][l.status] || 0) + 1;
      });

      const departmentStatusCounts: any[] = [];
      Object.entries(deptMap).forEach(([department, statuses]) => {
        Object.entries(statuses).forEach(([status, count]) => {
          departmentStatusCounts.push({ department, status, count });
        });
      });

      res.json({
        avgResponseTime,
        statusCounts,
        total: letters.length,
        overduePercentage: letters.length > 0 ? ((overdueCount / letters.length) * 100).toFixed(1) : 0,
        departmentStatusCounts
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

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
        phone_number_id_contributor: config.contributor_phone_number_id || "1148865668308769",
        access_token_contributor: config.contributor_access_token || "",
        contributor_cron_time: config.contributor_cron_time || "12:20",
        contributor_fixed_time: config.contributor_fixed_time || "12:25",
        logs
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/whatsapp-config", async (req, res) => {
    try {
      const body = req.body;
      const updates: any = {};

      for (const [key, val] of Object.entries(body)) {
        if (val !== undefined) {
          updates[key] = val;
        }
      }

      // Sync prefixed versions of the configurations as well for compatibility and back-checking
      if (updates.access_token !== undefined) {
        updates.whatsapp_access_token = updates.access_token;
        updates.contributor_access_token = updates.access_token;
      }
      if (updates.phone_number_id !== undefined) {
        updates.whatsapp_phone_number_id = updates.phone_number_id;
        updates.contributor_phone_number_id = updates.phone_number_id;
      }
      if (updates.recipient_phone !== undefined) {
        updates.whatsapp_recipient_phone = updates.recipient_phone;
      }
      if (updates.cron_time !== undefined) {
        updates.whatsapp_cron_time = updates.cron_time;
        updates.contributor_cron_time = updates.cron_time;
      }
      if (updates.fixed_time !== undefined) {
        updates.whatsapp_fixed_time = updates.fixed_time;
        updates.contributor_fixed_time = updates.fixed_time;
      }

      await setDoc(doc(firestoreDb, "settings", "global"), updates, { merge: true });
      
      await runSchedulerCheck();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.all("/api/scheduler-tick", async (req, res) => {
    try {
      await runSchedulerCheck();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/send-whatsapp-test", async (req, res) => {
    try {
      const { to_phone, role } = req.body;
      const result = await sendWhatsAppReport(role || "manager", to_phone);
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (e: any) {
      console.error("Unhandled Exception in sendWhatsAppReport:", e);
      res.status(500).json({ success: false, error: e.message, stack: e.stack });
    }
  });

  async function startDevServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server executing natively on http://0.0.0.0:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startDevServer();
} else {
  // On Vercel, serve static files (Vite build output) as fallback for unmatched routes
  app.use(express.static(path.join(process.cwd(), "dist")));
}

export default app;
