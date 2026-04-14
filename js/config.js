// ============================================================
// CONFIG — Supabase + Constants
// ============================================================
// Admin password is stored securely in Supabase app_settings table
var SUPABASE_URL  = 'https://biwrdwxgfyhnltzddlwu.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpd3Jkd3hnZnlobmx0emRkbHd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTczMTYsImV4cCI6MjA4OTc5MzMxNn0.EMOV5v3cGaDEqQJusnyrWTWdSPPwKeyuguPzxJvtKdQ';
var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

var COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1'];

var DEFAULT_COLUMNS = [
  {key:'contract_id',    label:'Contract ID',      visible:true,  order:0},
  {key:'customer',       label:'Customer',         visible:true,  order:1},
  {key:'project',        label:'Project',          visible:true,  order:2},
  {key:'unit',           label:'Unit',             visible:true,  order:3},
  {key:'property_type',  label:'Property Type',    visible:true,  order:4},
  {key:'contract_date',  label:'Contract Date',    visible:true,  order:5},
  {key:'payment_term',   label:'Payment Term',     visible:true,  order:6},
  {key:'actual_price',   label:'Actual Price',     visible:true,  order:7},
  {key:'contract_status',label:'Contract Status',  visible:true,  order:8},
  {key:'approval_status',label:'Approval Status',  visible:true,  order:9}
];

var ADMIN_PAGES = [
  {id:'dashboard',   label:'Dashboard',          icon:'layout-dashboard'},
  {id:'campaigns',   label:'Campaigns',          icon:'target'},
  {id:'upload',      label:'Upload & Distribute', icon:'upload'},
  {id:'qa',          label:'Q&A Inbox',           icon:'message-circle-question'},
  {id:'reports',     label:'Reports & Export',    icon:'file-bar-chart'},
  {id:'team',        label:'Team Management',     icon:'users'},
  {id:'my-clients',  label:'All Clients',         icon:'contact'},
  {id:'cleanup',     label:'Data Cleanup',        icon:'trash-2'}
];

var EMP_PAGES = [
  {id:'my-clients',    label:'My Clients',     icon:'contact'},
  {id:'ask-question',  label:'Ask a Question', icon:'send'},
  {id:'my-questions',  label:'My Questions',   icon:'messages-square'},
  {id:'notifications', label:'Notifications',  icon:'bell'}
];
