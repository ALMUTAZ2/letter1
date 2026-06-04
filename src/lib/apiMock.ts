import { Letter, User, DashboardStats, Priority, Status } from "../types";

// Seed data
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

// Database state managers
const getLocalLetters = (): Letter[] => {
  const letters = localStorage.getItem("mock_letters");
  if (!letters) {
    const seed = getSeededLetters();
    localStorage.setItem("mock_letters", JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(letters);
};

const setLocalLetters = (letters: Letter[]) => {
  localStorage.setItem("mock_letters", JSON.stringify(letters));
};

const getLocalConfig = () => {
  const config = localStorage.getItem("mock_config");
  if (!config) {
    const seed = {
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
    localStorage.setItem("mock_config", JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(config);
};

const setLocalConfig = (config: any) => {
  localStorage.setItem("mock_config", JSON.stringify(config));
};

const getLocalLogs = () => {
  const logs = localStorage.getItem("mock_whatsapp_logs");
  if (!logs) {
    const seed: any[] = [];
    localStorage.setItem("mock_whatsapp_logs", JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(logs);
};

const addLocalLog = (logItem: any) => {
  const logs = getLocalLogs();
  logs.unshift({
    id: Date.now(),
    sent_at: new Date().toISOString(),
    ...logItem
  });
  localStorage.setItem("mock_whatsapp_logs", JSON.stringify(logs.slice(0, 50)));
};

// Working days logic
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

// Check if letter is due this week
function isDueThisWeek(dueDateStr: string): boolean {
  try {
    const due = new Date(dueDateStr + "T00:00:00");
    if (isNaN(due.getTime())) return false;
    
    const now = new Date();
    // Start of current week (Sunday)
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0,0,0,0);
    
    // End of current week (Saturday)
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23,59,59,999);
    
    return due >= start && due <= end;
  } catch (e) {
    return false;
  }
}

// Handle client-side fetch interception
export async function handleMockRequest(url: string, init?: RequestInit): Promise<Response> {
  const cleanUrl = url.split("?")[0];
  const urlObj = new URL(url, window.location.origin);
  const method = init?.method?.toUpperCase() || "GET";
  
  // Custom Response Generator
  const jsonResponse = (data: any, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" }
    });
  };

  // 1. Authentication
  if (cleanUrl === "/api/auth/me") {
    // Check custom role header
    const emailHeader = init?.headers ? (init.headers as Record<string, string>)["x-user-email"] : undefined;
    let selectedEmail = emailHeader || localStorage.getItem("mock_current_email") || "manager@example.com";
    
    // Save state
    localStorage.setItem("mock_current_email", selectedEmail);
    
    const found = MOCK_USERS.find(u => u.email === selectedEmail) || MOCK_USERS[0];
    return jsonResponse(found);
  }

  // 2. Dashboard Statistics
  if (cleanUrl === "/api/stats") {
    const letters = getLocalLetters();
    const todayStr = new Date().toISOString().split("T")[0];
    
    const openLetters = letters.filter(l => l.status !== "مغلق");
    const totalOpen = openLetters.length;
    const overdueLetters = openLetters.filter(l => l.due_date < todayStr);
    const dueTodayLetters = openLetters.filter(l => l.due_date === todayStr);
    const dueThisWeekLetters = openLetters.filter(l => isDueThisWeek(l.due_date));
    
    // Priority counts for open letters
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
  }

  // 3. Letters CRUD
  if (cleanUrl === "/api/letters") {
    const letters = getLocalLetters();
    
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
      const letters = getLocalLetters();
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
      
      letters.unshift(newLetter);
      setLocalLetters(letters);
      return jsonResponse({ id: newId }, 201);
    }
  }

  // Letters detail path: /api/letters/:id
  const letterIdMatch = url.match(/\/api\/letters\/(\d+)/);
  if (letterIdMatch) {
    const id = parseInt(letterIdMatch[1]);
    const letters = getLocalLetters();
    
    if (method === "DELETE") {
      const remaining = letters.filter(l => l.id !== id);
      setLocalLetters(remaining);
      return jsonResponse({ success: true });
    }
    
    if (method === "PUT" && init?.body) {
      const body = JSON.parse(init.body as string);
      const updated = letters.map(l => {
        if (l.id === id) {
          return {
            ...l,
            ...body,
            updated_at: new Date().toISOString()
          };
        }
        return l;
      });
      setLocalLetters(updated);
      return jsonResponse({ success: true });
    }
  }

  // 4. Reports API
  if (cleanUrl === "/api/reports") {
    const letters = getLocalLetters();
    const todayStr = new Date().toISOString().split("T")[0];
    const closedLetters = letters.filter(l => l.status === "مغلق" && l.close_date);
    
    let totalResponseTime = 0;
    closedLetters.forEach(l => {
      const start = new Date(l.letter_date);
      const end = new Date(l.close_date!);
      totalResponseTime += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    });
    
    const avgResponseTime = closedLetters.length > 0 ? (totalResponseTime / closedLetters.length).toFixed(1) : "0.0";
    
    // Status counts
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
    
    // Department status counts
    const deptMap: Record<string, Record<string, number>> = {};
    letters.forEach(l => {
      const dept = l.responsible_department || "غير محدد";
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
  }

  // 5. WhatsApp API settings and configuration
  if (cleanUrl === "/api/whatsapp-config") {
    if (method === "GET") {
      const config = getLocalConfig();
      const logs = getLocalLogs();
      return jsonResponse({
        ...config,
        logs
      });
    }
    
    if (method === "POST" && init?.body) {
      const body = JSON.parse(init.body as string);
      const config = getLocalConfig();
      const updated = {
        ...config,
        ...body
      };
      setLocalConfig(updated);
      return jsonResponse({ success: true });
    }
  }

  // 6. Test WhatsApp report sending
  if (cleanUrl === "/api/send-whatsapp-test") {
    if (method === "POST" && init?.body) {
      const body = JSON.parse(init.body as string);
      const config = getLocalConfig();
      const role = body.role || "manager";
      const recipient = body.to_phone || (role === "manager" ? config.recipient_phone : config.contributor_recipient_phone);
      
      const letters = getLocalLetters();
      const openLetters = letters.filter(l => l.status !== "مغلق");
      
      const content = `سعادة مدير الإدارة\n\nنود إشعاركم بوجود خطابات نشطة تتطلب معالجة فورية.\nإجمالي المفتوحة: ${openLetters.length} خطاباً.`;
      
      // Simulate WhatsApp response
      const success = true;
      const logStatus = "نجاح";
      
      addLocalLog({
        recipient_phone: recipient,
        message_content: content,
        status: logStatus
      });
      
      return jsonResponse({
        success,
        message_content: content
      });
    }
  }

  if (cleanUrl === "/api/scheduler-tick") {
    return jsonResponse({ success: true });
  }

  // Fallback
  return jsonResponse({ error: "Endpoint not found in mock" }, 404);
}

// Global fetch override setup
export function setupFetchInterceptor() {
  const originalFetch = window.fetch || globalThis.fetch;

  const customFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    
    if (url.startsWith("/api/")) {
      // Force standalone offline mock directly if enabled in localStorage
      if (localStorage.getItem("use_offline_mock") === "true") {
        return handleMockRequest(url, init);
      }
      
      try {
        const response = await originalFetch(input, init);
        
        // Double check if we got a valid JSON api response
        // Sometimes platforms like Vercel return a status 200/404 html wrapper (SPA index.html rule fallback)
        const contentType = response.headers.get("content-type") || "";
        if (response.status === 404 || contentType.includes("text/html")) {
          throw new Error("HTML markup or 404 received instead of REST API JSON");
        }
        
        return response;
      } catch (err) {
        console.warn("Backend server API unreachable. Falling back dynamically to client-side localStorage offline DB!", err);
        localStorage.setItem("use_offline_mock", "true");
        return handleMockRequest(url, init);
      }
    }
    
    return originalFetch(input, init);
  };

  try {
    // Attempt standard assignment first
    window.fetch = customFetch;
  } catch (e) {
    try {
      // Attempt using Object.defineProperty on window
      Object.defineProperty(window, "fetch", {
        value: customFetch,
        writable: true,
        configurable: true
      });
    } catch (e2) {
      try {
        // Fallback to globalThis
        (globalThis as any).fetch = customFetch;
      } catch (e3) {
        console.error("Failed to intercept global fetch properties:", e3);
      }
    }
  }
}
