import { useState, useEffect } from "react";

export default function ShareReport() {
  const [formattedText, setFormattedText] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 1. قراءة المعرف من الرابط
    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get("id");
    if (!id) {
      setFormattedText("❌ لم يتم تمرير معرف التقرير في الرابط.");
      return;
    }

    // 2. جلب التقرير جاهزاً من الواجهة الخلفية
    fetch(`/api/reports/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFormattedText(data.text);
        } else {
          setFormattedText("❌ تعذر العثور على التقرير. قد يكون الرابط غير صحيح أو منتهي الصلاحية.");
        }
      })
      .catch(e => {
        console.error("خطأ في جلب التقرير:", e);
        setFormattedText("❌ حدث خطأ أثناء تحميل التقرير. تأكد من اتصالك بالإنترنت.");
      });
  }, []);

  const handleCopy = () => {
    if (!formattedText) return;
    navigator.clipboard.writeText(formattedText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 text-slate-900" dir="rtl">
      <div className="max-w-md mx-auto my-10 p-6 bg-white shadow-2xl rounded-2xl border border-gray-100 text-right">
        <h2 className="text-xl font-bold text-gray-800 text-center mb-1">📋 معالج التنسيق العمودي الفخم</h2>
        <p className="text-xs text-gray-400 text-center mb-6">يحول النص المسترسل إلى خطوط عمودية مصفوفة بالمسطرة</p>

        <button
          onClick={handleCopy}
          className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all ${
            copied ? "bg-emerald-600 scale-95 shadow-inner" : "bg-blue-600 hover:bg-blue-700 shadow-lg"
          }`}
        >
          {copied ? "✓ تم نسخ التقرير العمودي!" : "اضغط هنا لنسخ التقرير المرتب 🚀"}
        </button>

        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs whitespace-pre-wrap text-gray-700 leading-relaxed max-h-80 overflow-y-auto font-mono">
          <p className="font-bold text-gray-400 text-center border-b pb-2 mb-2 font-sans">👁️ معاينة مظهر التقرير العمودي قبل لصقه</p>
          {formattedText || "جاري قراءة وتفكيك بيانات التقرير..."}
        </div>
      </div>
    </div>
  );
}
