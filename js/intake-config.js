/* ══════════════════════════════════════════════════════════════
   intake-config.js
   ─────────────────
   Supabase credentials, project list, dropdown options,
   label maps, translations (ar/en), and global state.
   
   EDIT HERE when you need to:
   - Add/remove a project from the dropdown  → NOS_PROJECTS
   - Add a new dropdown field                → DROPDOWN_KEYS
   - Change field labels                     → AR_LABELS / EN_LABELS
   - Change any UI text                      → T.ar / T.en
   ══════════════════════════════════════════════════════════════ */

// ── Supabase ─────────────────────────────────────────────────
var SB_URL = 'https://biwrdwxgfyhnltzddlwu.supabase.co';
var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpd3Jkd3hnZnlobmx0emRkbHd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTczMTYsImV4cCI6MjA4OTc5MzMxNn0.EMOV5v3cGaDEqQJusnyrWTWdSPPwKeyuguPzxJvtKdQ';

// ── Projects & Dropdowns ─────────────────────────────────────
var NOS_PROJECTS = [
  'Jirian',
  'Sky Ridge Elite',
  'Sky Ridge Executives',
  'Zomra',
  'ISLA',
  'Upviews',
  'Sadaf'
];

var DROPDOWN_KEYS = {
  project: NOS_PROJECTS
};

// ── Field Labels (used by buildDynamicFields) ────────────────
var AR_LABELS = {
  project:'المشروع',
  property_type:'نوع الوحدة',
  payment_term:'طريقة السداد'
};
var EN_LABELS = {
  project:'Project',
  property_type:'Property Type',
  payment_term:'Payment Method'
};

// ── Translations ─────────────────────────────────────────────
var T = {
  ar: {
    brandSub         : 'أهلاً بك! سجّل هنا وسيتواصل معك أحد مستشارينا قريباً',
    formTitle        : 'استمارة تحديث بيانات العميل',
    formDesc         : 'يرجى تحديث بياناتك الشخصية وبيانات التواصل للتأكد من صحة سجلاتنا.',
    lblBasic         : 'المعلومات الأساسية',
    lblName          : 'الاسم الكامل',
    lblPhone         : 'رقم التليفون الأساسي',
    lblNewPhone      : 'رقم التليفون الجديد (لو عايز تغيّر رقمك الأساسي)',
    lblPhone2        : 'رقم التليفون الإضافي',
    lblEmail         : 'البريد الإلكتروني الأساسي',
    lblEmail2        : 'البريد الإلكتروني الإضافي',
    lblOptional      : '(اختياري)',
    lblNotes         : 'ملاحظات إضافية',
    lblDetails       : 'تفاصيل الاهتمام',
    btnSubmit        : 'إرسال الطلب',
    btnSending       : 'جارٍ الإرسال...',
    errRequired      : 'هذا الحقل مطلوب',
    errPhone         : 'أدخل رقماً صحيحاً (مثال: +201234567890)',
    errEmail         : 'أدخل بريداً إلكترونياً صحيحاً',
    successTitle     : 'تم إرسال طلبك بنجاح!',
    successMsg       : 'شكراً لك. سيتواصل معك أحد ممثلينا في أقرب وقت ممكن.',
    lblPrivacy       : 'أوافق على الإقرار أعلاه',
    waText           : 'أو تواصل معنا مباشرة عبر واتساب',
    waLabel          : 'تواصل معنا عبر واتساب',
    errPrivacy       : 'يجب الموافقة على الإقرار للمتابعة',
    nfTitle          : 'الرابط غير صحيح',
    nfSub            : 'هذا الرابط غير صالح أو انتهت صلاحيته. تواصل مع المبيعات للحصول على الرابط الصحيح.',
    errNotFound      : 'الرقم ده مش متسجل عندنا. استخدم الرقم المسجل باسمك.',
    errPhoneBlocked  : '⚠️ الرقم ده مش متسجل عندنا — استخدم الرقم المسجل باسمك',
    lblKida          : 'هل عندك أبناء؟',
    lblKidsCount     : 'كم عدد أبنائك؟',
    lblSonsSection   : 'بيانات الأبناء',
    lblHobbies       : 'هواياتك',
    lblJobTitle      : 'المسمى الوظيفي',
    phJobTitle       : 'مثال: مهندس، محاسب، طبيب...',
    errGeneral       : 'حدث خطأ. يرجى المحاولة مرة أخرى.',
    footerTxt        : 'مدعوم بواسطة Nations of Sky Portal',
    namePlaceholder  : 'مثال: محمد أحمد',
    lblChannelSection: 'وسيلة التواصل المفضلة',
    lblChCall        : 'مكالمة هاتفية',
    lblChWa          : 'واتساب',
    lblChEmail       : 'البريد الإلكتروني',
    lblChSms         : 'رسالة نصية',
    lblAckTitle      : 'إقرار العميل',
    lblEditHobby     : 'تعديل',
    kidName          : 'الاسم',
    kidAge           : 'السن',
    kidHobby         : 'الهواية',
    kidLabel         : 'الابن',
    dir              : 'rtl',
    lang             : 'ar'
  },
  en: {
    brandSub         : 'Welcome! Register here and one of our consultants will reach out shortly.',
    formTitle        : 'Client Data Update Form',
    formDesc         : 'Please update your personal and contact information to ensure our records are accurate.',
    lblBasic         : 'Basic Information',
    lblName          : 'Full Name',
    lblPhone         : 'Primary Phone Number',
    lblNewPhone      : 'New Phone Number (if you want to change your primary number)',
    lblPhone2        : 'Secondary Phone Number',
    lblEmail         : 'Primary Email Address',
    lblEmail2        : 'Secondary Email Address',
    lblOptional      : '(Optional)',
    lblNotes         : 'Additional Notes',
    lblDetails       : 'Interest Details',
    btnSubmit        : 'Submit Request',
    btnSending       : 'Sending...',
    errRequired      : 'This field is required',
    errPhone         : 'Please enter a valid number (e.g. +201234567890)',
    errEmail         : 'Please enter a valid email address',
    successTitle     : 'Request Submitted Successfully!',
    successMsg       : 'Thank you. One of our representatives will contact you as soon as possible.',
    lblPrivacy       : 'I agree to the above acknowledgment',
    waText           : 'Or contact us directly via WhatsApp',
    waLabel          : 'Contact us on WhatsApp',
    errPrivacy       : 'You must agree to the acknowledgment to continue',
    nfTitle          : 'Invalid Link',
    nfSub            : 'This link is invalid or has expired. Please contact sales to get the correct link.',
    errNotFound      : 'This number is not registered with us. Please use the number registered under your name.',
    errPhoneBlocked  : '⚠️ This number is not registered with us — please use the number registered under your name',
    lblKida          : 'Do you have children?',
    lblKidsCount     : 'How many children?',
    lblSonsSection   : "Children's Details",
    lblHobbies       : 'Your hobbies',
    lblJobTitle      : 'Job title',
    phJobTitle       : 'e.g. Engineer, Accountant, Doctor...',
    errGeneral       : 'An error occurred. Please try again.',
    footerTxt        : 'Powered by Nations of Sky Portal',
    namePlaceholder  : 'e.g. John Smith',
    lblChannelSection: 'Preferred Communication Channel',
    lblChCall        : 'Mobile Call',
    lblChWa          : 'WhatsApp',
    lblChEmail       : 'Email',
    lblChSms         : 'SMS',
    lblAckTitle      : 'Client Acknowledgment',
    lblEditHobby     : 'Edit',
    kidName          : 'Name',
    kidAge           : 'Age',
    kidHobby         : 'Hobby',
    kidLabel         : 'Child',
    dir              : 'ltr',
    lang             : 'en'
  }
};

// ── Global State ─────────────────────────────────────────────
var campaignId     = null;
var matchedClients = [];
var selectedIds    = [];
var campaignData   = null;
var isSubmitting   = false;
var currentLang    = 'ar';

var kidaValue       = null;
var phoneLookupDone = false;
var phoneNotFound   = false;

// Anti-Duplicate
var submittedPhones = {};

// Rate Limiting
var RATE_LIMIT_MS  = 60000;
var lastSubmitTime = 0;

// Auto-save Draft key
var DRAFT_KEY = 'intake_draft_' + (new URLSearchParams(window.location.search).get('c') || 'x');
