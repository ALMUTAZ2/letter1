import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Resend } from "resend";
import dotenv from "dotenv";
import axios from "axios";
import { readFileSync, writeFileSync } from "fs";

// Firebase Server sdk setup
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, deleteDoc } from "firebase/firestore";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Firebase config from file safely
const firebaseConfig = JSON.parse(readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf-8"));
const firebaseApp = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const app = express();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const TIMEZONE = "Asia/Riyadh";

const getSeededLetters = () => {
  const now = new Date();
  const formatYMD = (d: Date) => d.toISOString().split("T")[0];
  const addDaysHelper = (d: Date, days: number) => {
    const res = new Date(d);
    res.setDate(res.getDate() + days);
    return res;
  };
  
  return [
    {
      id: 1,
      entity_source: "أمانة منطقة الرياض",
      letter_number: "100245",
      letter_date: formatYMD(addDaysHelper(now, -4)),
      category: "اعتماد خطة تدعيم شبكة الجهد المتوسط بحي اليرموك",
      responsible_department: "دائرة تخطيط الشبكات",
      owner: "م. فيصل المطيري",
      priority: "عالية",
      due_date: formatYMD(addDaysHelper(now, -3)),
      status: "جديد",
      escalation: "حرج جداً لدواعٍ فنية",
      notes: "تم مراجعة المخططات المبادئية للحي وتحتاج تصديق المدير المالي للمنطقة الشرقية.",
      action_taken: "بانتظار الرد",
      created_at: new Date(addDaysHelper(now, -4)).toISOString(),
      updated_at: new Date(addDaysHelper(now, -4)).toISOString()
    },
    {
      id: 2,
      entity_source: "هيئة تطوير بوابة الدرعية",
      letter_number: "100289",
      letter_date: formatYMD(addDaysHelper(now, -3)),
      category: "طلب موافقة فنية لربط محطة تحويل فرعية تابعة لمشروع تجاري",
      responsible_department: "دائرة التشغيل والصيانة – الشرق",
      owner: "أ. خالد القحطاني",
      priority: "عالية",
      due_date: formatYMD(addDaysHelper(now, -2)),
      status: "جديد",
      escalation: "طلب عاجل من الهيئة",
      notes: "توصية بربط المحطة مع مغذي المغرزات الرئيسي لتحقيق التكرارية المطلوبة.",
      action_taken: "بانتظار الرد",
      created_at: new Date(addDaysHelper(now, -3)).toISOString(),
      updated_at: new Date(addDaysHelper(now, -3)).toISOString()
    },
    {
      id: 3,
      entity_source: "رئاسة بلدية الروضة",
      letter_number: "100311",
      letter_date: formatYMD(addDaysHelper(now, -2)),
      category: "شكوى من انقطاع الخدمة الكهربائية بإنارة الشوارع بحي القدس",
      responsible_department: "دائرة التشغيل والصيانة – الشرق",
      owner: "م. سامر العنزي",
      priority: "متوسطة",
      due_date: formatYMD(addDaysHelper(now, 1)),
      status: "الحاقي",
      escalation: "لا يوجد",
      notes: "جاري فحص كابلات الجهد المنخفض بالحي لتفادي التكرار وسحب خط بديل.",
      action_taken: "بانتظار الرد",
      created_at: new Date(addDaysHelper(now, -2)).toISOString(),
      updated_at: new Date(addDaysHelper(now, -2)).toISOString()
    },
    {
      id: 4,
      entity_source: "وزارة الاستثمار",
      letter_number: "100192",
      letter_date: formatYMD(addDaysHelper(now, -10)),
      category: "تحديث اشتراطات ربط الطاقة للمشروعات ذات الهوية الأجنبية بالرياض",
      responsible_department: "دائرة دعم التشغيل والصيانة",
      owner: "م. ناصر الحارثي",
      priority: "منخفضة",
      due_date: formatYMD(addDaysHelper(now, -5)),
      status: "مغلق",
      escalation: "لا يوجد",
      notes: "تم إرسال الخطاب الصادر واستلام إشعار تأكيد الاستلام من الوزارة بنجاح وتم إرفاق رقم الصادر المعتمد.",
      outgoing_letter_number: "ص-209-X",
      outgoing_letter_date: formatYMD(addDaysHelper(now, -6)),
      action_taken: "تم الرد",
      close_date: formatYMD(addDaysHelper(now, -6)),
      created_at: new Date(addDaysHelper(now, -10)).toISOString(),
      updated_at: new Date(addDaysHelper(now, -10)).toISOString()
    }
  ];
};

// ---------------------- Firestore Operations Helpers on server ----------------------

async function ensureSeedAndSetup() {
  try {
    // We do not seed default letters automatically anymore, as we want a clean look displaying only user-entered letters.
    // We clean up existing default templates from Firestore on startup (IDs 1, 2, 3, 4) to keep the app pristine.
    const seededIds = ["1", "2", "3", "4"];
    for (const id of seededIds) {
      const docRef = doc(firestoreDb, "letters", id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data && (data.entity_source === "أمانة منطقة الرياض" || data.entity_source === "هيئة تطوير بوابة الدرعية" || data.entity_source === "رئاسة بلدية الروضة" || data.entity_source === "وزارة الاستثمار")) {
          await deleteDoc(docRef);
          console.log(`[Server] Deleted template letter matching ID: ${id}`);
        }
      }
    }
  } catch (err) {
    console.error("[Server Init] Letters cleanup/checks failed:", err);
  }

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
      await setDoc(doc(firestoreDb, "settings", "global"), initialSettings);
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
      const data = docSnap.data();
      const normalized = { ...data };
      
      const mapKeys = [
        ["recipient_phone", "whatsapp_recipient_phone"],
        ["phone_number_id", "whatsapp_phone_number_id"],
        ["access_token", "whatsapp_access_token"],
        ["cron_time", "whatsapp_cron_time"],
        ["fixed_time", "whatsapp_fixed_time"],
      ];

      for (const [unprefixed, prefixed] of mapKeys) {
        const val = data[unprefixed] !== undefined ? data[unprefixed] : data[prefixed];
        if (val !== undefined) {
          normalized[unprefixed] = val;
          normalized[prefixed] = val;
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

async function getSettingFromFirestore(key: string, defaultValue: string): Promise<string> {
  const settings = await getSettingsFromFirestore();
  return settings[key] !== undefined ? String(settings[key]) : defaultValue;
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

// ---------------------- Working Days Logic ----------------------

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
      // 5: Friday, 6: Saturday
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

// ---------------------- Master WhatsApp Dispatcher ----------------------

async function sendWhatsAppReport(role: "manager" | "contributor" = "manager", toPhone?: string) {
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

  const now = toZonedTime(new Date(), TIMEZONE);
  const todayStr = format(now, "yyyy-MM-dd");

  const getDaysDifference = (oldDateStr: string, newDateStr: string) => {
    try {
      const d1 = new Date(oldDateStr + "T00:00:00");
      const d2 = new Date(newDateStr + "T00:00:00");
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 ? diffDays : 0;
    } catch (e) {
      return 0;
    }
  };

  const formatArabicDays = (days: number): string => {
    if (days === 0) return "أقل من يوم";
    if (days === 1) return "يوم واحد";
    if (days === 2) return "يومان";
    if (days >= 3 && days <= 10) return `${days} أيام`;
    return `${days} يوم`;
  };

  const allLetters = await getLettersFromFirestore();
  let letters: any[] = [];
  let messageBody = "";

  if (role === "manager") {
    letters = allLetters.filter(l => 
      l.status !== 'مغلق' && (l.due_date < todayStr || l.priority === 'عالية')
    ).sort((a,b) => b.id - a.id);

    if (letters.length === 0) {
      letters = [
        {
          entity_source: "أمانة منطقة الرياض",
          letter_number: "100245",
          category: "اعتماد خطة تدعيم شبكة الجهد المتوسط بحي اليرموك",
          responsible_department: "قسم تخطيط الجهد المتوسط",
          letter_date: format(addDays(now, -4), "yyyy-MM-dd")
        }
      ];
    }

    messageBody = `سعادة مدير الإدارة\n\nنود إشعاركم بوجود خطابات *متأخرة وذات أولوية عالية و مصعدة* ⚠️\nتستلزم المتابعة واتخاذ الإجراء اللازم:\n`;

    letters.forEach((item, index) => {
      const topic = item.category || "بلا موضوع";
      const source = item.entity_source || "غير محدد";
      const dept = item.responsible_department || "غير محدد";
      const letterDateStr = item.letter_date || todayStr;
      const waitingDays = getDaysDifference(letterDateStr, todayStr);

      messageBody += `\n📌 *رقم الخطاب:* ${item.letter_number}`;
      messageBody += `\n🏢 *الجهة الوارد منها:* ${source}`;
      messageBody += `\n📝 *الموضوع:* ${topic}`;
      messageBody += `\n👥 *الجهة المسؤولة:* ${dept}`;
      messageBody += `\n⏳ *مدة الانتظار:* ${formatArabicDays(waitingDays)}`;

      if (index < letters.length - 1) {
        messageBody += `\n\n━━━━━━━━━━━━━━━━━━`;
      }
    });
  } else {
    // Contributor: Non-escalated
    letters = allLetters.filter(item => {
      if (item.status === "مغلق") return false;
      const hasManualEscalation = item.escalation && item.escalation !== "لا يوجد" && item.escalation.trim() !== "";
      if (hasManualEscalation) return false;
      const hasFormulaEscalation = isEscalatedByFormula(item, todayStr);
      if (hasFormulaEscalation) return false;
      return true;
    }).sort((a,b) => b.id - a.id);

    if (letters.length === 0) {
      letters = [
        {
          entity_source: "رئاسة بلدية الروضة",
          letter_number: "100311",
          category: "شكوى من انقطاع الخدمة الكهربائية بإنارة الشوارع بحي القدس",
          responsible_department: "دائرة التشغيل والصيانة – الشرق",
          letter_date: format(addDays(now, -2), "yyyy-MM-dd")
        }
      ];
    }

    messageBody = `سعادة المساهم\n\nنود إشعاركم بتقرير خطابات المنصة *غير المصعّدة* 📌\nتستلزم المراقبة المستمرة واتخاذ الإجراء اللازم:\n`;

    letters.forEach((item, index) => {
      const topic = item.category || "بلا موضوع";
      const source = item.entity_source || "غير محدد";
      const dept = item.responsible_department || "غير محدد";
      const letterDateStr = item.letter_date || todayStr;
      const waitingDays = getDaysDifference(letterDateStr, todayStr);

      messageBody += `\n📌 *رقم الخطاب:* ${item.letter_number}`;
      messageBody += `\n🏢 *الجهة الوارد منها:* ${source}`;
      messageBody += `\n📝 *الموضوع:* ${topic}`;
      messageBody += `\n👥 *الجهة المسؤولة:* ${dept}`;
      messageBody += `\n⏳ *مدة الانتظار:* ${formatArabicDays(waitingDays)}`;
      messageBody += `\n🟢 *حالة التصعيد:* غير مصعد`;

      if (index < letters.length - 1) {
        messageBody += `\n\n━━━━━━━━━━━━━━━━━━`;
      }
    });
  }

  messageBody += `\n\n━━━━━━━━━━━━━━━━━━`;
  messageBody += `\n\n🤖 _تم إعداد هذا الإشعار آلياً لغرض المتابعة اليومية._`;

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
    type: "text",
    text: {
      preview_url: false,
      body: messageBody
    }
  };

  try {
    const metaResponse = await axios.post(metaUrl, payload, { headers });
    await addLogToFirestore(recipientPhone, messageBody, "نجاح");
    return { success: true, data: metaResponse.data, message_content: messageBody };
  } catch (err: any) {
    const errorDetails = err.response?.data || err.message;
    console.error(`WhatsApp dispatch failure details:`, JSON.stringify(errorDetails));
    await addLogToFirestore(recipientPhone, messageBody, "فشل", true, JSON.stringify(errorDetails));
    return { success: false, error: errorDetails, message_content: messageBody };
  }
}

// ---------------------- Master Riyadh Time Scheduler ----------------------

let masterTickTask: any = null;

export async function runSchedulerCheck() {
  try {
    const nowRiyadh = toZonedTime(new Date(), TIMEZONE);
    const currentHour = nowRiyadh.getHours();
    const currentMinute = nowRiyadh.getMinutes();
    
    const rtfDay = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, weekday: 'long' });
    const weekdayStr = rtfDay.format(new Date());
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

    if (isWorkingDay) {
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
  if (masterTickTask) {
    masterTickTask.stop();
    masterTickTask = null;
  }

  console.log("[Scheduler] Booting 1-Minute Master Scheduler...");
  masterTickTask = cron.schedule("* * * * *", async () => {
    await runSchedulerCheck();
  });
}

// Auxiliary controller configurations (retained for backward route compatibility)
export function scheduleFixedWhatsAppJob() {}
export function scheduleWhatsAppJob() {}
export function scheduleFixedContributorJob() {}
export function scheduleContributorJob() {}

// ---------------------- Full-Stack Server Deployment ----------------------

async function startServer() {
  await ensureSeedAndSetup();
  startMasterSchedule();

  app.use(express.json());

  // auth hook
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

  // letters cruds
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

  // dashboard stats
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

  // reports aggregations
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

  // Reminders Cron alerts (dispatched at 8 AM)
  cron.schedule("0 8 * * *", async () => {
    console.log("[Scheduler Alert] Triggering daily limits reminders check...");
    const now = toZonedTime(new Date(), TIMEZONE);
    const todayStr = format(now, "yyyy-MM-dd");
    const in1Day = format(addDays(now, 1), "yyyy-MM-dd");
    const in3Days = format(addDays(now, 3), "yyyy-MM-dd");

    const letters = await getLettersFromFirestore();
    const lettersToRemind = letters.filter(l => 
      l.status !== 'مغلق' && (l.due_date === todayStr || l.due_date === in1Day || l.due_date === in3Days)
    );

    if (lettersToRemind.length > 0 && resend) {
      for (const letter of lettersToRemind) {
        await resend.emails.send({
          from: 'Letters Tracker <onboarding@resend.dev>',
          to: 'manager@example.com',
          subject: `تذكير: خطاب رقم ${letter.letter_number} يستحق الرد قريباً`,
          html: `<div dir="rtl">
            <h2>تذكير بموعد استحقاق خطاب</h2>
            <p>الجهة: ${letter.entity_source}</p>
            <p>رقم الخطاب: ${letter.letter_number}</p>
            <p>تاريخ الاستحقاق: ${letter.due_date}</p>
            <p>الأولوية: ${letter.priority}</p>
          </div>`
        });
      }
    }
  }, { timezone: TIMEZONE });

  // daily manager email summary (dispatched at 8 PM)
  cron.schedule("0 20 * * *", async () => {
    console.log("[Scheduler Alert] Dispatching daily summary reports...");
    const now = toZonedTime(new Date(), TIMEZONE);
    const tomorrowStr = format(addDays(now, 1), "yyyy-MM-dd");
    const todayStr = format(now, "yyyy-MM-dd");

    const letters = await getLettersFromFirestore();
    const openLetters = letters.filter(l => l.status !== 'مغلق');

    const dueTomorrow = openLetters.filter(l => l.due_date === tomorrowStr);
    const overdue = openLetters.filter(l => l.due_date < todayStr);
    const highPriority = openLetters.filter(l => l.priority === 'عالية');

    if (resend) {
      await resend.emails.send({
        from: 'Letters Tracker <onboarding@resend.dev>',
        to: 'manager@example.com',
        subject: 'الملخص اليومي لمنصة تتبع الخطابات',
        html: `<div dir="rtl">
          <h2>الملخص اليومي</h2>
          <h3>خطابات تستحق غداً (${dueTomorrow.length}):</h3>
          <ul>${dueTomorrow.map(l => `<li>${l.letter_number} - ${l.entity_source}</li>`).join('')}</ul>
          <h3>خطابات متأخرة (${overdue.length}):</h3>
          <ul>${overdue.map(l => `<li>${l.letter_number} - ${l.entity_source}</li>`).join('')}</ul>
          <h3>خطابات عالية الأهمية (${highPriority.length}):</h3>
          <ul>${highPriority.map(l => `<li>${l.letter_number} - ${l.entity_source}</li>`).join('')}</ul>
        </div>`
      });
    }
  }, { timezone: TIMEZONE });

  // WhatsApp configurations fetch
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
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/whatsapp-config", async (req, res) => {
    try {
      const body = req.body;
      const dataToSave: any = {};
      
      const mapKeys = [
        ["recipient_phone", "whatsapp_recipient_phone"],
        ["phone_number_id", "whatsapp_phone_number_id"],
        ["access_token", "whatsapp_access_token"],
        ["cron_time", "whatsapp_cron_time"],
        ["fixed_time", "whatsapp_fixed_time"],
      ];

      for (const [key, val] of Object.entries(body)) {
        if (val !== undefined) {
          dataToSave[key] = val;
          for (const [unprefixed, prefixed] of mapKeys) {
            if (key === unprefixed) {
              dataToSave[prefixed] = val;
            } else if (key === prefixed) {
              dataToSave[unprefixed] = val;
            }
          }
        }
      }

      await setDoc(doc(firestoreDb, "settings", "global"), dataToSave, { merge: true });
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
    const { to_phone, role } = req.body;
    const result = await sendWhatsAppReport(role || "manager", to_phone);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  });

  // Vite development or production routing
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server executing natively on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();

export default app;
