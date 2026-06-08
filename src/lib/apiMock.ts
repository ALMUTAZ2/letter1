import { Letter, User, DashboardStats, Priority, Status } from "../types";
import { db } from "./firebase";
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import axios from "axios";

const MOCK_USERS: User[] = [
{ id: 1, email: "manager@example.com", name: "المدير العام", role: "manager" },
{ id: 2, email: "staff@example.com", name: "موظف المتابعة", role: "staff" }
];

const getSeededLetters = (): Letter[] => {
const now = new Date();
const formatYMD = (d: Date) => d.toISOString().split("T")[0];
const addDays = (d: Date, days: number) => {
const res = new Date(d);
res.setDate(res.getDate() + days);
return res;
};

return [
{
id: 1,
entity_source: "أمانة منطقة الرياض",
letter_number: "100245",
letter_date: formatYMD(addDays(now, -4)),
category: "اعتماد خطة تدعيم شبكة الجهد المتوسط بحي اليرموك",
responsible_department: "دائرة تخطيط الشبكات",
owner: "م. فيصل المطيري",
priority: "عالية",
due_date: formatYMD(addDays(now, -3)),
status: "جديد",
escalation: "حرج جداً لدواعٍ فنية",
notes: "تم مراجعة المخططات المبادئية للحي وتحتاج تصديق المدير المالي للمنطقة الشرقية.",
action_taken: "بانتظار الرد",
created_at: new Date(addDays(now, -4)).toISOString(),
updated_at: new Date(addDays(now, -4)).toISOString()
},
{
id: 2,
entity_source: "هيئة تطوير بوابة الدرعية",
letter_number: "100289",
letter_date: formatYMD(addDays(now, -3)),
category: "طلب موافقة فنية لربط محطة تحويل فرعية تابعة لمشروع تجاري",
responsible_department: "دائرة التشغيل والصيانة – الشرق",
owner: "أ. خالد القحطاني",
priority: "عالية",
due_date: formatYMD(addDays(now, -2)),
status: "جديد",
escalation: "طلب عاجل من الهيئة",
notes: "توصية بربط المحطة مع مغذي المغرزات الرئيسي لتحقيق التكرارية المطلوبة.",
action_taken: "بانتظار الرد",
created_at: new Date(addDays(now, -3)).toISOString(),
updated_at: new Date(addDays(now, -3)).toISOString()
},
{
id: 3,
entity_source: "رئاسة بلدية الروضة",
letter_number: "100311",
letter_date: formatYMD(addDays(now, -2)),
category: "شكوى من انقطاع الخدمة الكهربائية بإنارة الشوارع بحي القدس",
responsible_department: "دائرة التشغيل والصيانة – الشرق",
owner: "م. سامر العنزي",
priority: "متوسطة",
due_date: formatYMD(addDays(now, 1)),
status: "الحاقي",
escalation: "لا يوجد",
notes: "جاري فحص كابلات الجهد المنخفض بالحي لتفادي التكرار وسحب خط بديل.",
action_taken: "بانتظار الرد",
created_at: new Date(addDays(now, -2)).toISOString(),
updated_at: new Date(addDays(now, -2)).toISOString()
},
{
id: 4,
entity_source: "وزارة الاستثمار",
letter_number: "100192",
letter_date: formatYMD(addDays(now, -10)),
category: "تحديث اشتراطات ربط الطاقة للمشروعات ذات الهوية الأجنبية بالرياض",
responsible_department: "دائرة دعم التشغيل والصيانة",
owner: "م. ناصر الحارثي",
priority: "منخفضة",
due_date: formatYMD(addDays(now, -5)),
status: "مغلق",
escalation: "لا يوجد",
notes: "تم إرسال الخطاب الصادر واستلام إشعار تأكيد الاستلام من الوزارة بنجاح وتم إرفاق رقم الصادر المعتمد.",
outgoing_letter_number: "ص-209-X",
outgoing_letter_date: formatYMD(addDays(now, -6)),
action_taken: "تم الرد",
close_date: formatYMD(addDays(now, -6)),
created_at: new Date(addDays(now, -10)).toISOString(),
updated_at: new Date(addDays(now, -10)).toISOString()
}
];
};

async function ensureFirestoreSeeded(): Promise {
try {
const seededIds = ["1", "2", "3", "4"];
for (const id of seededIds) {
const docRef = doc(db, "letters", id);
const snap = await getDoc(docRef);
if (snap.exists()) {
const data = snap.data();
if (data && (data.entity_source === "أمانة منطقة الرياض" || data.entity_source === "هيئة تطوير بوابة الدرعية" || data.entity_source === "رئاسة بلدية الروضة" || data.entity_source === "وزارة الاستثمار")) {
await deleteDoc(docRef);
console.log("Deleted default template letter matching ID: " + id);
}
}
}

```
const localS = localStorage.getItem("mock_letters");
if (localS) {
  const parsedS = JSON.parse(localS) as any[];
  const filteredS = parsedS.filter(l => 
    l.id !== 1 && l.id !== 2 && l.id !== 3 && l.id !== 4
  );
  if (filteredS.length !== parsedS.length) {
    localStorage.setItem("mock_letters", JSON.stringify(filteredS));
  }
}

```

} catch (err) {
console.warn("Could not clean up template letters:", err);
}

try {
const settingsSnap = await getDoc(doc(db, "settings", "global"));
if (!settingsSnap.exists()) {
console.log("Seeding Cloud Firestore with default settings...");
const defaultSettings = {
recipient_phone: "+966507668366",
phone_number_id: "1148865668308769",
access_token: "EAAOZASL5k18gBRkPFCnEzJOs1yxklW16txxkX3dOtxz8lLGZC8wNRmMlZAoEbNlhpCIOGDt2cvh16TWdbRxyOSiA1FNPBonyyj3oGQCIimcIpNexQT0pVx0N0hsZBO3GtvaDAXDiTEtDeqVE4fJPu1EzPE5RwyxejsLrEmtK1dyDWli1s13Ecpp3Gd384XSbpQZDZD",
cron_time: "12:15",
fixed_time: "12:19",
contributor_recipient_phone: "+966566889475",
contributor_phone_number_id: "1148865668308769",
contributor_access_token: "EAAOZASL5k18gBRkPFCnEzJOs1yxklW16txxkX3dOtxz8lLGZC8wNRmMlZAoEbNlhpCIOGDt2cvh16TWdbRxyOSiA1FNPBonyyj3oGQCIimcIpNexQT0pVx0N0hsZBO3GtvaDAXDiTEtDeqVE4fJPu1EzPE5RwyxejsLrEmtK1dyDWli1s13Ecpp3Gd384XSbpQZDZD",
contributor_cron_time: "12:20",
contributor_fixed_time: "12:25"
};
await setDoc(doc(db, "settings", "global"), defaultSettings);
}
} catch (err) {
console.warn("Could not seed settings due to rules or connectivity:", err);
}
}

async function getFirestoreLetters(): Promise<Letter[]> {
await ensureFirestoreSeeded();
try {
const snapshot = await getDocs(collection(db, "letters"));
const letters: Letter[] = [];
snapshot.forEach((d) => {
letters.push(d.data() as Letter);
});
return letters.sort((a,b) => b.id - a.id);
} catch (err) {
console.error("Firestore getFirestoreLetters failed, returning localStorage fallback:", err);
const lettersStr = localStorage.getItem("mock_letters");
if (!lettersStr) {
localStorage.setItem("mock_letters", JSON.stringify([]));
return [];
}
return JSON.parse(lettersStr);
}
}

async function saveFirestoreLetter(letter: Letter): Promise {
try {
await setDoc(doc(db, "letters", String(letter.id)), letter);
} catch (err) {
console.error("Firestore saveFirestoreLetter failed, using localStorage fallback:", err);
const fallbackLetters = localStorage.getItem("mock_letters") ? JSON.parse(localStorage.getItem("mock_letters")!) : [];
const filtered = (fallbackLetters as Letter[]).filter(l => l.id !== letter.id);
filtered.push(letter);
localStorage.setItem("mock_letters", JSON.stringify(filtered));
}
}

async function deleteFirestoreLetter(id: number): Promise {
try {
await deleteDoc(doc(db, "letters", String(id)));
} catch (err) {
console.error("Firestore deleteFirestoreLetter failed, using localStorage fallback:", err);
const fallbackLetters = localStorage.getItem("mock_letters") ? JSON.parse(localStorage.getItem("mock_letters")!) : [];
const filtered = (fallbackLetters as Letter[]).filter(l => l.id !== id);
localStorage.setItem("mock_letters", JSON.stringify(filtered));
}
}

async function getFirestoreConfig(): Promise {
await ensureFirestoreSeeded();
try {
const snap = await getDoc(doc(db, "settings", "global"));
if (snap.exists()) {
const data = snap.data() || {};
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
console.error("Firestore getFirestoreConfig failed:", err);
}
const configStr = localStorage.getItem("mock_config");
if (!configStr) {
const base = {
recipient_phone: "+966507668366",
phone_number_id: "1148865668308769",
access_token: "EAAOZASL5k18gBRkPFCnEzJOs1yxklW16txxkX3dOtxz8lLGZC8wNRmMlZAoEbNlhpCIOGDt2cvh16TWdbRxyOSiA1FNPBonyyj3oGQCIimcIpNexQT0pVx0N0hsZBO3GtvaDAXDiTEtDeqVE4fJPu1EzPE5RwyxejsLrEmtK1dyDWli1s13Ecpp3Gd384XSbpQZDZD",
cron_time: "12:15",
fixed_time: "12:19",
contributor_recipient_phone: "+966566889475",
contributor_phone_number_id: "1148865668308769",
contributor_access_token: "EAAOZASL5k18gBRkPFCnEzJOs1yxklW16txxkX3dOtxz8lLGZC8wNRmMlZAoEbNlhpCIOGDt2cvh16TWdbRxyOSiA1FNPBonyyj3oGQCIimcIpNexQT0pVx0N0hsZBO3GtvaDAXDiTEtDeqVE4fJPu1EzPE5RwyxejsLrEmtK1dyDWli1s13Ecpp3Gd384XSbpQZDZD",
contributor_cron_time: "12:20",
contributor_fixed_time: "12:25"
};
localStorage.setItem("mock_config", JSON.stringify(base));
return base;
}
return JSON.parse(configStr);
}

async function saveFirestoreConfig(config: any): Promise {
try {
await setDoc(doc(db, "settings", "global"), config, { merge: true });
} catch (err) {
console.error("Firestore saveFirestoreConfig failed:", err);
}
localStorage.setItem("mock_config", JSON.stringify(config));
}

async function getFirestoreLogs(): Promise<any[]> {
try {
const snap = await getDocs(collection(db, "whatsapp_logs"));
const logs: any[] = [];
snap.forEach((d) => {
logs.push({ id: d.id, ...d.data() });
});
return logs.sort((a,b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()).slice(0, 50);
} catch (err) {
console.error("Firestore getFirestoreLogs failed:", err);
const logsStr = localStorage.getItem("mock_whatsapp_logs") || "[]";
return JSON.parse(logsStr);
}
}

async function addFirestoreLog(logItem: any): Promise {
const logObj = {
sent_at: new Date().toISOString(),
...logItem
};
try {
const logDocId = String(Date.now());
await setDoc(doc(db, "whatsapp_logs", logDocId), logObj);
} catch (err) {
console.error("Firestore addFirestoreLog failed:", err);
}
const currentLogs = localStorage.getItem("mock_whatsapp_logs") ? JSON.parse(localStorage.getItem("mock_whatsapp_logs")!) : [];
currentLogs.unshift(logObj);
localStorage.setItem("mock_whatsapp_logs", JSON.stringify(currentLogs.slice(0, 50)));
}

function getWorkingDaysElapsed(startDateStr: string, endDateStr: string): number {
try {
const current = new Date(startDateStr + "T00:00:00");
const target = new Date(endDateStr + "T00:00:00");
if (isNaN(current.getTime()) || isNaN(target.getTime())) return 0;
if (current >= target) return 0;

```
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

```

} catch (e) {
return 0;
}
}

function isDueThisWeek(dueDateStr: string): boolean {
try {
const due = new Date(dueDateStr + "T00:00:00");
if (isNaN(due.getTime())) return false;

```
const now = new Date();
const start = new Date(now);
start.setDate(now.getDate() - now.getDay());
start.setHours(0,0,0,0);

const end = new Date(start);
end.setDate(start.getDate() + 6);
end.setHours(23,59,59,999);

return due >= start && due <= end;

```

} catch (e) {
return false;
}
}

export async function handleMockRequest(url: string, init?: RequestInit): Promise {
const cleanUrl = url.split("?")[0];
const urlObj = new URL(url, window.location.origin);
const method = init?.method?.toUpperCase() || "GET";

const jsonResponse = (data: any, status = 200) => {
return new Response(JSON.stringify(data), {
status,
headers: { "Content-Type": "application/json" }
});
};

if (cleanUrl === "/api/auth/me") {
const emailHeader = init?.headers ? (init.headers as Record<string, string>)["x-user-email"] : undefined;
let selectedEmail = emailHeader || localStorage.getItem("mock_current_email") || "manager@example.com";
localStorage.setItem("mock_current_email", selectedEmail);
const found = MOCK_USERS.find(u => u.email === selectedEmail) || MOCK_USERS[0];
return jsonResponse(found);
}

if (cleanUrl === "/api/stats") {
const letters = await getFirestoreLetters();
const todayStr = new Date().toISOString().split("T")[0];

```
const openLetters = letters.filter(l => l.status !== "مغلق");
const totalOpen = openLetters.length;
const overdueLetters = openLetters.filter(l => l.due_date < todayStr);
const dueTodayLetters = openLetters.filter(l => l.due_date === todayStr);
const dueThisWeekLetters = openLetters.filter(l => isDueThisWeek(l.due_date));

const priorityCountsMap = openLetters.reduce((acc, current) => {
  acc[current.priority] = (acc[current.priority] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

const priorityCounts = Object.entries(priorityCountsMap).map(([priority, count]) => ({
  priority,
  count
}));

return jsonResponse({
  totalOpen,
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

```

}

if (cleanUrl === "/api/letters") {
const letters = await getFirestoreLetters();

```
if (method === "GET") {
  const status = urlObj.searchParams.get("status");
  const priority = urlObj.searchParams.get("priority");
  const department = urlObj.searchParams.get("department");
  const search = urlObj.searchParams.get("search");
  const startDate = urlObj.searchParams.get("startDate");
  const endDate = urlObj.searchParams.get("endDate");
  
  let filtered = [...letters];
  
  if (status) filtered = filtered.filter(l => l.status === status);
  if (priority) filtered = filtered.filter(l => l.priority === priority);
  if (department) filtered = filtered.filter(l => l.responsible_department === department);
  if (search) {
    const query = search.toLowerCase();
    filtered = filtered.filter(l => 
      l.letter_number.toLowerCase().includes(query) ||
      l.entity_source.toLowerCase().includes(query) ||
      l.category.toLowerCase().includes(query) ||
      (l.responsible_department && l.responsible_department.toLowerCase().includes(query))
    );
  }
  if (startDate && endDate) {
    filtered = filtered.filter(l => l.letter_date >= startDate && l.letter_date <= endDate);
  }
  
  return jsonResponse(filtered.sort((a, b) => b.id - a.id));
}

if (method === "POST" && init?.body) {
  const body = JSON.parse(init.body as string);
  const letters = await getFirestoreLetters();
  const newId = letters.length > 0 ? Math.max(...letters.map(l => l.id)) + 1 : 1;
  
  const newLetter: Letter = {
    id: newId,
    entity_source: body.entity_source,
    letter_number: body.letter_number,
    letter_date: body.letter_date,
    category: body.category || "",
    responsible_department: body.responsible_department || "",
    owner: body.owner || "",
    priority: body.priority || "متوسطة",
    due_date: body.due_date,
    status: body.status || "جديد",
    escalation: body.escalation || "لا يوجد",
    notes: body.notes || "",
    outgoing_letter_number: body.outgoing_letter_number || "",
    outgoing_letter_date: body.outgoing_letter_date || "",
    action_taken: body.action_taken || "بانتظار الرد",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  await saveFirestoreLetter(newLetter);
  return jsonResponse({ id: newId }, 201);
}

```

}

const letterIdMatch = url.match(//api/letters/(\d+)/);
if (letterIdMatch) {
const id = parseInt(letterIdMatch[1]);
const letters = await getFirestoreLetters();

```
if (method === "DELETE") {
  await deleteFirestoreLetter(id);
  return jsonResponse({ success: true });
}

if (method === "PUT" && init?.body) {
  const body = JSON.parse(init.body as string);
  const existingLetter = letters.find(l => l.id === id);
  if (existingLetter) {
    const updated = {
      ...existingLetter,
      ...body,
      updated_at: new Date().toISOString()
    };
    await saveFirestoreLetter(updated);
  }
  return jsonResponse({ success: true });
}

```

}

if (cleanUrl === "/api/reports") {
const letters = await getFirestoreLetters();
const todayStr = new Date().toISOString().split("T")[0];
const closedLetters = letters.filter(l => l.status === "مغلق" && l.close_date);

```
let totalResponseTime = 0;
closedLetters.forEach(l => {
  const start = new Date(l.letter_date);
  const end = new Date(l.close_date!);
  totalResponseTime += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
});

const avgResponseTime = closedLetters.length > 0 ? (totalResponseTime / closedLetters.length).toFixed(1) : "0.0";

const statusCountsMap = letters.reduce((acc, l) => {
  acc[l.status] = (acc[l.status] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

const statusCounts = Object.entries(statusCountsMap).map(([status, count]) => ({
  status,
  count
}));

const overdueCount = letters.filter(l => l.status !== "مغلق" && l.due_date < todayStr).length;
const total = letters.length;
const overduePercentage = total > 0 ? ((overdueCount / total) * 100).toFixed(1) : "0";

const deptMap: Record<string, Record<string, number>> = {};
letters.forEach(l => {
  const dept = l.responsible_department || "غير مححدد";
  if (!deptMap[dept]) deptMap[dept] = {};
  deptMap[dept][l.status] = (deptMap[dept][l.status] || 0) + 1;
});

const departmentStatusCounts: any[] = [];
Object.entries(deptMap).forEach(([department, statuses]) => {
  Object.entries(statuses).forEach(([status, count]) => {
    departmentStatusCounts.push({
      department,
      status,
      count
    });
  });
});

return jsonResponse({
  avgResponseTime,
  statusCounts,
  total,
  overduePercentage,
  departmentStatusCounts
});

```

}

if (cleanUrl === "/api/whatsapp-config") {
if (method === "GET") {
const config = await getFirestoreConfig();
const logs = await getFirestoreLogs();
return jsonResponse({
...config,
logs
});
}

```
if (method === "POST" && init?.body) {
  const body = JSON.parse(init.body as string);
  const config = await getFirestoreConfig();
  const updated = {
    ...config,
    ...body
  };
  await saveFirestoreConfig(updated);
  return jsonResponse({ success: true });
}

```

}

if (cleanUrl === "/api/send-whatsapp-test") {
if (method === "POST" && init?.body) {
const body = JSON.parse(init.body as string);
const config = await getFirestoreConfig();
const role = body.role || "manager";
const recipient = body.to_phone || (role === "manager" ? config.recipient_phone : config.contributor_recipient_phone);

```
  const letters = await getFirestoreLetters();
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });

  const getDaysDifference = (oldDateStr: string, newDateStr: string): number => {
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
    if (days >= 3 && days <= 10) return days + " أيام";
    return days + " يوم";
  };

  const isEscalatedByFormula = (letter: any, todayStr: string): boolean => {
    if (letter.status === "مغلق") return false;
    const elapsed = getWorkingDaysElapsed(letter.letter_date, todayStr);
    let limit = 5;
    if (letter.priority === "عالية") limit = 1;
    else if (letter.priority === "متوسطة") limit = 3;
    else if (letter.priority === "منخفضة") limit = 5;
    
    return elapsed > limit;
  };

  let filteredLetters: any[] = [];
  let content = "";

  if (role === "manager") {
    filteredLetters = letters.filter(l => 
      l.status !== 'مغلق' && (l.due_date < todayStr || l.priority === 'عالية')
    ).sort((a,b) => b.id - a.id);

    if (filteredLetters.length === 0) {
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      const letterDateStr = fourDaysAgo.toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });
      filteredLetters = [
        {
          entity_source: "أمانة منطقة الرياض",
          letter_number: "100245",
          category: "اعتماد خطة تدعيم شبكة الجهد المتوسط بحي اليرموك",
          responsible_department: "قسم تخطيط الجهد المتوسط",
          letter_date: letterDateStr
        }
      ];
    }

    content = "سعادة مدير الإدارة\n\nنود إشعاركم بوجود خطابات متأخرة وذات أولوية عالية و مصعدة ⚠️\nتستلزم المتابعة واتخاذ الإجراء اللازم:\n";

    filteredLetters.forEach((item, index) => {
      const topic = item.category || "بلا موضوع";
      const source = item.entity_source || "غير محدد";
      const dept = item.responsible_department || "غير محدد";
      const letterDateStr = item.letter_date || todayStr;
      const waitingDays = getDaysDifference(letterDateStr, todayStr);

      content += "\n📌 رقم الخطاب: " + item.letter_number;
      content += "\n🏢 الجهة الوارد منها: " + source;
      content += "\n📝 الموضوع: " + topic;
      content += "\n👥 الجهة المسؤولة: " + dept;
      content += "\n⏳ مدة الانتظار: " + formatArabicDays(waitingDays);

      if (index < filteredLetters.length - 1) {
        content += "\n\n---";
      }
    });
  } else {
    filteredLetters = letters.filter(item => {
      if (item.status === "مغلق") return false;
      const hasManualEscalation = item.escalation && item.escalation !== "لا يوجد" && item.escalation.trim() !== "";
      if (hasManualEscalation) return false;
      const hasFormulaEscalation = isEscalatedByFormula(item, todayStr);
      if (hasFormulaEscalation) return false;
      return true;
    }).sort((a,b) => b.id - a.id);

    if (filteredLetters.length === 0) {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const letterDateStr = twoDaysAgo.toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });
      filteredLetters = [
        {
          entity_source: "رئاسة بلدية الروضة",
          letter_number: "100311",
          category: "شكوى من انقطاع الخدمة الكهربائية بإنارة الشوارع بحي القدس",
          responsible_department: "دائرة التشغيل والصيانة – الشرق",
          letter_date: letterDateStr
        }
      ];
    }

    content = "سعادة المساهم\n\nنود إشعاركم بتقرير خطابات المنصة غير المصعّدة 📌\nتستلزم المراقبة المستمرة واتخاذ الإجراء اللازم:\n";

    filteredLetters.forEach((item, index) => {
      const topic = item.category || "بلا موضوع";
      const source = item.entity_source || "غير محدد";
      const dept = item.responsible_department || "غير محدد";
      const letterDateStr = item.letter_date || todayStr;
      const waitingDays = getDaysDifference(letterDateStr, todayStr);

      content += "\n📌 رقم الخطاب: " + item.letter_number;
      content += "\n🏢 الجهة الوارد منها: " + source;
      content += "\n📝 الموضوع: " + topic;
      content += "\n👥 الجهة المسؤولة: " + dept;
      content += "\n⏳ مدة الانتظار: " + formatArabicDays(waitingDays);
      content += "\n🟢 حالة التصعيد: غير مصعد";

      if (index < filteredLetters.length - 1) {
        content += "\n\n---";
      }
    });
  }
  
  let success = true;
  let logStatus = "نجاح";
  let error_message = "";

  if (config.access_token && config.phone_number_id) {
    try {
      let formattedPhone = recipient.trim().replace(/\D/g, "");
      if (formattedPhone.startsWith("00")) {
        formattedPhone = formattedPhone.substring(2);
      }
      const metaUrl = "[https://graph.facebook.com/v18.0/](https://graph.facebook.com/v18.0/)" + config.phone_number_id + "/messages";
      
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
                  text: content
                }
              ]
            }
          ]
        }
      };

      const headers = {
        "Authorization": "Bearer " + config.access_token,
        "Content-Type": "application/json"
      };
      
      await axios.post(metaUrl, payload, { headers });
    } catch (xhrError: any) {
      success = false;
      logStatus = "فشل";
      error_message = xhrError.response?.data ? JSON.stringify(xhrError.response.data) : xhrError.message;
    }
  }

  await addFirestoreLog({
    recipient_phone: recipient,
    message_content: content,
    status: logStatus,
    error_message: error_message || null
  });
  
  return jsonResponse({
    success,
    message_content: content
  });
}

```

}

if (cleanUrl === "/api/scheduler-tick") {
return jsonResponse({ success: true });
}

return jsonResponse({ error: "Endpoint not found in mock" }, 404);
}

export function setupFetchInterceptor() {
const originalFetch = window.fetch || globalThis.fetch;

const customFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise {
const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

```
if (url.startsWith("/api/")) {
  return handleMockRequest(url, init);
}

return originalFetch(input, init);

```

};

try {
window.fetch = customFetch;
} catch (e) {
try {
Object.defineProperty(window, "fetch", {
value: customFetch,
writable: true,
configurable: true
});
} catch (e2) {
try {
(globalThis as any).fetch = customFetch;
} catch (e3) {
console.error("Failed to intercept global fetch properties:", e3);
}
}
}
}
