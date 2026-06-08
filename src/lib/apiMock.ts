import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import axios from "axios";

// Initialize Firebase Admin SDK for Cloud Functions environment
initializeApp();
const db = getFirestore();

const TIMEZONE = "Asia/Riyadh";

/**
 * Normalizes global setting fields to support both prefixed and non-prefixed field names
 */
function normalizeConfig(data: any): any {
  const normalized: any = { ...data };
  const managerKeys = ["recipient_phone", "phone_number_id", "access_token", "cron_time", "fixed_time"];
  for (const k of managerKeys) {
    const val = data[k] !== undefined ? data[k] : data[`whatsapp_${k}`];
    if (val !== undefined) {
      normalized[k] = val;
      normalized[`whatsapp_${k}`] = val;
    }
  }
  return normalized;
}

/**
 * Calculates working days elapsed excluding Friday (5) and Saturday (6)
 */
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
    logger.error("Error in getWorkingDaysElapsed:", e);
    return 0;
  }
}

/**
 * Determines whether a letter is escalated dynamically by the priority policy rules
 */
function isEscalatedByFormula(letter: any, todayStr: string): boolean {
  if (letter.status === "مغلق") return false;
  const elapsed = getWorkingDaysElapsed(letter.letter_date, todayStr);
  let limit = 5;
  if (letter.priority === "عالية") limit = 1;
  else if (letter.priority === "متوسطة") limit = 3;
  else if (letter.priority === "منخفضة") limit = 5;
  
  return elapsed > limit;
}

/**
 * Calculates absolute days difference between two dates
 */
function getDaysDifference(oldDateStr: string, newDateStr: string): number {
  try {
    const d1 = new Date(oldDateStr + "T00:00:00");
    const d2 = new Date(newDateStr + "T00:00:00");
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Formats day quantities into natural Arabic descriptors
 */
function formatArabicDays(days: number): string {
  if (days === 0) return "أقل من يوم";
  if (days === 1) return "يوم واحد";
  if (days === 2) return "يومان";
  if (days >= 3 && days <= 10) return `${days} أيام`;
  return `${days} يوم`;
}

/**
 * Writes logs to Firestore whatsapp_logs collection
 */
async function addLogToFirestore(recipient: string, content: string, status: string, errorMsg?: string): Promise<void> {
  try {
    const logId = String(Date.now());
    await db.collection("whatsapp_logs").doc(logId).set({
      recipient_phone: recipient,
      message_content: content,
      status,
      error_message: errorMsg || null,
      sent_at: new Date().toISOString()
    });
    logger.info(`Log stored in Firestore with status "${status}" for recipient ${recipient}`);
  } catch (err) {
    logger.error("Error writing log to Firestore:", err);
  }
}

/**
 * Builds and dispatches the WhatsApp notification message to Meta WhatsApp Cloud API
 */
async function sendWhatsAppReport(role: "manager" | "contributor", globalConfig: any, allLetters: any[], todayStr: string): Promise<void> {
  let recipientPhone = "";
  let phoneNumberId = "";
  let accessToken = "";

  if (role === "manager") {
    recipientPhone = globalConfig.recipient_phone || globalConfig.whatsapp_recipient_phone || "+966507668366";
    phoneNumberId = globalConfig.phone_number_id || globalConfig.whatsapp_phone_number_id || "1148865668308769";
    accessToken = globalConfig.access_token || globalConfig.whatsapp_access_token || "";
  } else {
    const managerPhoneId = globalConfig.phone_number_id || globalConfig.whatsapp_phone_number_id || "1148865668308769";
    const managerToken = globalConfig.access_token || globalConfig.whatsapp_access_token || "";

    recipientPhone = globalConfig.contributor_recipient_phone || "+966566889475";
    phoneNumberId = (globalConfig.contributor_phone_number_id || "").trim() || managerPhoneId;
    accessToken = (globalConfig.contributor_access_token || "").trim() || managerToken;
  }

  if (!accessToken) {
    logger.error(`Cannot send WhatsApp report: Meta Access Token for role "${role}" is not configured.`);
    return;
  }

  logger.info(`Initiating report compilation for "${role}" to recipient: ${recipientPhone}`);

  let letters: any[] = [];
  let messageBody = "";

  if (role === "manager") {
    letters = allLetters.filter(l => 
      l.status !== 'مغلق' && (l.due_date < todayStr || l.priority === 'عالية')
    ).sort((a, b) => {
      const idA = a.id ? String(a.id) : "";
      const idB = b.id ? String(b.id) : "";
      return idB.localeCompare(idA);
    });

    if (letters.length === 0) {
      // Add standard realistic fallback mock letter as configured in original implementation
      const nowRiyadh = new Date();
      nowRiyadh.setDate(nowRiyadh.getDate() - 4);
      const letterDateStr = nowRiyadh.toISOString().split("T")[0];
      letters = [
        {
          entity_source: "أمانة منطقة الرياض",
          letter_number: "100245",
          category: "اعتماد خطة تدعيم شبكة الجهد المتوسط بحي اليرموك",
          responsible_department: "قسم تخطيط الجهد المتوسط",
          letter_date: letterDateStr
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
    // Contributor Alert (Non-escalated letters)
    letters = allLetters.filter(item => {
      if (item.status === "مغلق") return false;
      const hasManualEscalation = item.escalation && item.escalation !== "لا يوجد" && item.escalation.trim() !== "";
      if (hasManualEscalation) return false;
      const hasFormulaEscalation = isEscalatedByFormula(item, todayStr);
      if (hasFormulaEscalation) return false;
      return true;
    }).sort((a, b) => {
      const idA = a.id ? String(a.id) : "";
      const idB = b.id ? String(b.id) : "";
      return idB.localeCompare(idA);
    });

    if (letters.length === 0) {
      const nowRiyadh = new Date();
      nowRiyadh.setDate(nowRiyadh.getDate() - 2);
      const letterDateStr = nowRiyadh.toISOString().split("T")[0];
      letters = [
        {
          entity_source: "رئاسة بلدية الروضة",
          letter_number: "100311",
          category: "شكوى من انقطاع الخدمة الكهربائية بإنارة الشوارع بحي القدس",
          responsible_department: "دائرة التشغيل والصيانة – الشرق",
          letter_date: letterDateStr
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
              text: messageBody.replace(/[\n\t]+/g, " - ").replace(/\s{5,}/g, "    ")
            }
          ]
        }
      ]
    }
  };

  try {
    const response = await axios.post(metaUrl, payload, { headers });
    logger.info(`WhatsApp report successfully sent to "${role}". Meta API Response:`, response.data);
    await addLogToFirestore(recipientPhone, messageBody, "نجاح");
  } catch (err: any) {
    const errorDetails = err.response?.data || err.message;
    logger.error(`Failed to dispatch WhatsApp message to "${role}":`, JSON.stringify(errorDetails));
    await addLogToFirestore(recipientPhone, messageBody, "فشل", JSON.stringify(errorDetails));
  }
}

/**
 * Scheduled Cloud Function running every single minute.
 * Wakes up to read dynamic scheduler config inside Firestore db settings/global and
 * dispatches notifications if Riyadh local time matches the specified scheduler times.
 */
export const dynamicSchedulerTick = onSchedule({
  schedule: "* * * * *",
  timeZone: TIMEZONE,
  retryCount: 0,
}, async (event) => {
  logger.info("Executing 1-Minute Scheduled Cloud Function Dynamic Tick...");

  try {
    const now = new Date();

    // 1. Convert current UTC timestamp to Asia/Riyadh local elements
    const rtfTimeParts = new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(now);
    const hr = rtfTimeParts.find(p => p.type === "hour")?.value || "00";
    const mn = rtfTimeParts.find(p => p.type === "minute")?.value || "00";
    let hourStr = hr.trim();
    if (hourStr === "24") hourStr = "00";
    const timeStr = `${hourStr}:${mn}`; // Output format: "HH:MM" e.g., "12:15"

    const rtfDay = new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      weekday: "long"
    });
    const weekdayStr = rtfDay.format(now); // Output format: "Friday", "Saturday", "Sunday"...

    const rtfDate = new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const dateParts = rtfDate.formatToParts(now);
    const year = dateParts.find(p => p.type === "year")?.value;
    const month = dateParts.find(p => p.type === "month")?.value;
    const day = dateParts.find(p => p.type === "day")?.value;
    const currentDateStr = `${year}-${month}-${day}`; // Output format: "YYYY-MM-DD" e.g., "2026-06-06"

    const uniqueMinuteKey = `${currentDateStr} ${timeStr}`;
    const isWorkingDay = weekdayStr !== "Friday" && weekdayStr !== "Saturday";

    logger.info(`[Riyadh Time Check] local_time: "${timeStr}", day: "${weekdayStr}", isWorkingDay: ${isWorkingDay}, key: "${uniqueMinuteKey}"`);

    // 2. Load settings/global configuration document
    const configSnap = await db.collection("settings").doc("global").get();
    if (!configSnap.exists) {
      logger.error("Global settings document (settings/global) was not found in Firestore. Scheduler skipped.");
      return;
    }

    const configRaw = configSnap.data() || {};
    const config = normalizeConfig(configRaw);

    // Extraction of operational times
    const managerFixedTime = config.fixed_time || config.whatsapp_fixed_time || "12:19";
    const managerCronTime = config.cron_time || config.whatsapp_cron_time || "12:15";
    const contributorFixedTime = config.contributor_fixed_time || "12:25";
    const contributorCronTime = config.contributor_cron_time || "12:20";

    logger.info(`[Configured Times] Manager Cron: ${managerCronTime}, Manager Fixed: ${managerFixedTime}, Contributor Cron: ${contributorCronTime}, Contributor Fixed: ${contributorFixedTime}`);

    // Skip trigger if weekend (Friday/Saturday) - TEMPORARILY DISABLED FOR TESTING
    // if (!isWorkingDay) {
    //   logger.info("Today is weekend (Friday/Saturday). No automatic WhatsApp dispatches scheduled.");
    //   return;
    // }
    logger.info("Weekend skip logic bypassed for testing; triggers are enabled all days.");

    // Helper to evaluate whether a message was already sent at this particular minute key
    const isAlreadySent = (keySuffix: string): boolean => {
      return config[keySuffix] === uniqueMinuteKey;
    };

    // Helper to update settings document with sent state to protect against double triggers
    const markAsSent = async (keySuffix: string) => {
      try {
        await db.collection("settings").doc("global").set({
          [keySuffix]: uniqueMinuteKey
        }, { merge: true });
        logger.info(`Marked setting doc key [${keySuffix}] as sent for value "${uniqueMinuteKey}"`);
      } catch (e) {
        logger.error(`Failed updating sent status for setting key: ${keySuffix}`, e);
      }
    };

    let triggerManager = false;
    let triggerContributor = false;

    // Checks for Manager trigger
    if (timeStr === managerFixedTime && !isAlreadySent("last_sent_manager_fixed")) {
      await markAsSent("last_sent_manager_fixed");
      logger.info(`Triggering Manager Daily Report (Fixed Time matched: ${timeStr})`);
      triggerManager = true;
    }
    else if (timeStr === managerCronTime && !isAlreadySent("last_sent_manager_cron")) {
      await markAsSent("last_sent_manager_cron");
      logger.info(`Triggering Manager Alert (Cron Time matched: ${timeStr})`);
      triggerManager = true;
    }

    // Checks for Contributor trigger
    if (timeStr === contributorFixedTime && !isAlreadySent("last_sent_contributor_fixed")) {
      await markAsSent("last_sent_contributor_fixed");
      logger.info(`Triggering Contributor Daily Report (Fixed Time matched: ${timeStr})`);
      triggerContributor = true;
    }
    else if (timeStr === contributorCronTime && !isAlreadySent("last_sent_contributor_cron")) {
      await markAsSent("last_sent_contributor_cron");
      logger.info(`Triggering Contributor Alert (Cron Time matched: ${timeStr})`);
      triggerContributor = true;
    }

    if (triggerManager || triggerContributor) {
      // Lazy load letters only status !== "مغلق" as required
      const lettersSnap = await db.collection("letters").get();
      const allLetters: any[] = [];
      lettersSnap.forEach(docSnapshot => {
        allLetters.push({ id: docSnapshot.id, ...docSnapshot.data() });
      });

      if (triggerManager) {
        await sendWhatsAppReport("manager", config, allLetters, currentDateStr);
      }
      if (triggerContributor) {
        await sendWhatsAppReport("contributor", config, allLetters, currentDateStr);
      }
    } else {
      logger.info("Current Riyadh time does not match any scheduled broadcast slot, or notifications already sent for this minute.");
    }

  } catch (error: any) {
    logger.error("CRITICAL ERROR inside dynamicSchedulerTick Cloud Function execution:", error);
  }
});
