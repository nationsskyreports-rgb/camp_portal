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
    brandSub         : 'منزلك أكثر من مجرد وحدة سكنية — هو بداية حياة جديدة لك ولعائلتك.\nنريد أن نتعرف عليكم أكثر حتى نبني معًا مجتمعًا يعكس اهتماماتكم ويناسب أسلوب حياتكم.',
    formTitle        : 'ساعدنا نصمم مجتمعك',
    formDesc         : 'إجاباتك تساعدنا في تصميم أنشطة وخدمات تجعل كل يوم داخل مجتمعنا أكثر راحة ومتعة.',
    formTime         : 'لن يستغرق الأمر أكثر من ٣ دقائق',
    lblBasic         : 'المعلومات الأساسية',
    lblLifestyle     : 'العائلة وأسلوب الحياة',
    lblName          : 'الاسم الكامل',
    lblPhone         : 'رقم التليفون الأساسي',
    lblNewPhone      : 'رقم التليفون الجديد (لو عايز تغيّر رقمك الأساسي)',
    lblPhone2        : 'رقم التليفون الإضافي',
    lblEmail         : 'البريد الإلكتروني',
    lblEmail2        : 'بريد إلكتروني إضافي',
    lblOptional      : '(اختياري)',
    lblNotes         : 'حابب تضيف أي حاجة تانية؟',
    lblDetails       : 'تفاصيل الاهتمام',
    btnSubmit        : 'إرسال',
    btnSending       : 'جارٍ الإرسال...',
    errRequired      : 'هذا الحقل مطلوب',
    errPhone         : 'أدخل رقماً صحيحاً (مثال: +201234567890)',
    errEmail         : 'أدخل بريداً إلكترونياً صحيحاً',
    successTitle     : 'شكرًا لمشاركتك!',
    successMsg       : 'كل إجابة تقربنا خطوة من بناء المجتمع الذي تستحقه عائلتك.',
    lblPrivacy       : 'أوافق على مشاركة هذه المعلومات لتطوير الخدمات المجتمعية',
    waText           : 'أو تواصل معنا مباشرة عبر واتساب',
    waLabel          : 'تواصل معنا عبر واتساب',
    errPrivacy       : 'يجب الموافقة على الإقرار للمتابعة',
    nfTitle          : 'الرابط غير صحيح',
    nfSub            : 'هذا الرابط غير صالح أو انتهت صلاحيته. تواصل مع المبيعات للحصول على الرابط الصحيح.',
    errNotFound      : 'الرقم ده مش متسجل عندنا. استخدم الرقم المسجل باسمك.',
    errPhoneBlocked  : 'الرقم ده مش متسجل عندنا — استخدم الرقم المسجل باسمك',
    lblKida          : 'هل عندك أبناء؟',
    lblKidsCount     : 'كم عدد أبنائك؟',
    lblSonsSection   : 'بيانات الأبناء',
    lblHobbies       : 'ايه أكتر هواية أو نشاط بتحبه؟',
    lblJobTitle      : 'مجال عملك',
    phJobTitle       : 'مثال: مهندس، محاسب، طبيب...',
    errGeneral       : 'حدث خطأ. يرجى المحاولة مرة أخرى.',
    footerTxt        : 'Nations of Sky — Building Communities',
    namePlaceholder  : 'مثال: محمد أحمد',
    lblChannelSection: 'ايه أحسن طريقة نتواصل بيها معاك؟',
    lblChCall        : 'مكالمة هاتفية',
    lblChWa          : 'واتساب',
    lblChEmail       : 'البريد الإلكتروني',
    lblChSms         : 'رسالة نصية',
    lblAckTitle      : 'إقرار المشاركة',
    lblAckTextAr     : 'أوافق على مشاركة هذه المعلومات لمساعدة Nations of Sky في تطوير الخدمات والأنشطة المجتمعية. بياناتي لن تُستخدم لأغراض تسويقية أو تُشارك مع أطراف خارجية.',
    lblAckTextEn     : 'I agree to share this information to help Nations of Sky improve community services and activities. My data will not be used for marketing purposes or shared with third parties.',
    lblEditHobby     : 'تعديل',
    kidName          : 'الاسم',
    kidAge           : 'السن',
    kidHobby         : 'الهواية أو النشاط المفضل',
    kidLabel         : 'الابن',
    dir              : 'rtl',
    lang             : 'ar'
  },
  en: {
    brandSub         : 'Your home is more than a property — it\'s where your family\'s next chapter begins.\nWe\'d love to get to know you better so we can build a community that truly reflects your lifestyle.',
    formTitle        : 'Help Us Shape Your Community',
    formDesc         : 'Your answers help us design activities and services that make everyday life here more comfortable and enjoyable.',
    formTime         : 'It only takes 3 minutes',
    lblBasic         : 'Basic Information',
    lblLifestyle     : 'Family & Lifestyle',
    lblName          : 'Full Name',
    lblPhone         : 'Primary Phone Number',
    lblNewPhone      : 'New Phone Number (if you want to change your primary number)',
    lblPhone2        : 'Secondary Phone Number',
    lblEmail         : 'Email Address',
    lblEmail2        : 'Secondary Email',
    lblOptional      : '(Optional)',
    lblNotes         : 'Anything else you\'d like to add?',
    lblDetails       : 'Interest Details',
    btnSubmit        : 'Submit',
    btnSending       : 'Sending...',
    errRequired      : 'This field is required',
    errPhone         : 'Please enter a valid number (e.g. +201234567890)',
    errEmail         : 'Please enter a valid email address',
    successTitle     : 'Thank you for sharing!',
    successMsg       : 'Every answer brings us one step closer to building the community your family deserves.',
    lblPrivacy       : 'I agree to share this information to improve community services',
    waText           : 'Or contact us directly via WhatsApp',
    waLabel          : 'Contact us on WhatsApp',
    errPrivacy       : 'You must agree to the acknowledgment to continue',
    nfTitle          : 'Invalid Link',
    nfSub            : 'This link is invalid or has expired. Please contact sales to get the correct link.',
    errNotFound      : 'This number is not registered with us. Please use the number registered under your name.',
    errPhoneBlocked  : 'This number is not registered with us — please use the number registered under your name',
    lblKida          : 'Do you have children?',
    lblKidsCount     : 'How many children?',
    lblSonsSection   : "Children's Details",
    lblHobbies       : 'What\'s your favorite hobby or activity?',
    lblJobTitle      : 'Your field of work',
    phJobTitle       : 'e.g. Engineer, Accountant, Doctor...',
    errGeneral       : 'An error occurred. Please try again.',
    footerTxt        : 'Nations of Sky — Building Communities',
    namePlaceholder  : 'e.g. John Smith',
    lblChannelSection: 'What\'s the best way to reach you?',
    lblChCall        : 'Mobile Call',
    lblChWa          : 'WhatsApp',
    lblChEmail       : 'Email',
    lblChSms         : 'SMS',
    lblAckTitle      : 'Participation Agreement',
    lblAckTextAr     : 'أوافق على مشاركة هذه المعلومات لمساعدة Nations of Sky في تطوير الخدمات والأنشطة المجتمعية. بياناتي لن تُستخدم لأغراض تسويقية أو تُشارك مع أطراف خارجية.',
    lblAckTextEn     : 'I agree to share this information to help Nations of Sky improve community services and activities. My data will not be used for marketing purposes or shared with third parties.',
    lblEditHobby     : 'Edit',
    kidName          : 'Name',
    kidAge           : 'Age',
    kidHobby         : 'Favorite hobby or activity',
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
